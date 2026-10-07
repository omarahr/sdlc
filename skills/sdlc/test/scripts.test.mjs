import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync, spawn } from 'node:child_process'
import { mkdirSync, writeFileSync, readFileSync, existsSync, chmodSync, mkdtempSync, utimesSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { SKILL_DIR, scratch } from './harness.mjs'

const STATE = join(SKILL_DIR, 'state-write.py')
const RECEIPT = join(SKILL_DIR, 'suite-receipt.py')
// the modes the script accepts, from the one file that names them, so this test cannot assert a list
// that has quietly stopped being the script's own
const GIT_MODES = JSON.parse(readFileSync(join(SKILL_DIR, 'git-modes.json'), 'utf8')).gitModes
let python = true
try { execFileSync('python3', ['--version']) } catch { python = false }
const opts = { skip: !python && 'python3 not installed' }
// the Go-mapping test needs the go toolchain; not every runner image ships one
let goToolchain = true
try { execFileSync('go', ['version']) } catch { goToolchain = false }
const goOpts = { skip: !goToolchain && 'go not installed' }

const git = (repo, ...args) => execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8' }).trim()
// `git merge-base --is-ancestor` exits non-zero rather than answering, so the negative case needs catching
const notAncestor = (repo, ...refs) => {
  try { git(repo, 'merge-base', '--is-ancestor', ...refs); return false } catch { return true }
}
const json = (repo, name) => JSON.parse(readFileSync(join(repo, '.sdlc', name), 'utf8'))
const req = (id, status = 'todo', extra = {}) => ({ id, specRef: '§1', quote: `quote ${id}`, acceptance: `check ${id}`, status, flags: [], ...extra })
const slice = (id, extra = {}) => ({ id, title: `Slice ${id}`, requirements: [], dependsOn: [], kind: 'spec', status: 'todo', phase: 'plan', counters: { planRevisions: 0, fixRounds: 0, ladderStep: 0, parkCycles: 0 }, ...extra })

// the bare remote behind a fixture({ remote: true }) repo, for tests that need a second clone
const remotes = new Map()

function fixture({ config = {}, reqs = [], slices = [], milestones = [], remote = false } = {}) {
  const repo = scratch('sdlc-scripts-')
  git(repo, 'init', '-q', '-b', 'main')
  git(repo, 'config', 'user.email', 'test@example.com')
  git(repo, 'config', 'user.name', 'Test')
  mkdirSync(join(repo, '.sdlc'))
  mkdirSync(join(repo, 'src'))
  writeFileSync(join(repo, 'spec.md'), '# Bookmarks service\n')
  writeFileSync(join(repo, 'src', 'app.txt'), 'v1\n')
  const files = {
    'config.json': { specPath: 'spec.md', gitMode: 'direct', defaultBranch: 'main', commitFormat: '', ...config },
    'requirements.json': reqs,
    'slices.json': slices,
    'milestones.json': milestones,
  }
  for (const [name, value] of Object.entries(files)) writeFileSync(join(repo, '.sdlc', name), JSON.stringify(value, null, 2))
  writeFileSync(join(repo, '.sdlc', 'log.jsonl'), '{"ts":"2026-01-12T10:00:00Z","type":"bootstrap","detail":"ledger"}\n')
  writeFileSync(join(repo, '.sdlc', 'DECISIONS.md'), '# Decisions\n### ADR-1\n')
  git(repo, 'add', '-A')
  git(repo, 'commit', '-q', '-m', 'init')
  if (remote) {
    const bare = scratch('sdlc-remote-')
    git(bare, 'init', '-q', '--bare', '-b', 'main', bare)
    git(repo, 'remote', 'add', 'origin', bare)
    git(repo, 'push', '-q', '-u', 'origin', 'main')
    remotes.set(repo, bare)
  }
  return repo
}

// a second clone of the remote, so a test can move origin/main without touching the repo under test
function publisher(bare) {
  const pub = scratch('sdlc-pub-')
  execFileSync('git', ['clone', '-q', bare, pub], { encoding: 'utf8' })
  git(pub, 'config', 'user.email', 'test@example.com')
  git(pub, 'config', 'user.name', 'Test')
  return pub
}

const pushFile = (dir, file, text, message) => {
  writeFileSync(join(dir, file), text)
  git(dir, 'add', '-A')
  git(dir, 'commit', '-q', '-m', message)
  git(dir, 'push', '-q', 'origin', 'HEAD')
}

// .sdlc state written and committed the way a bootstrap or a state commit writes it
const commitState = (repo, files, message) => {
  for (const [name, value] of Object.entries(files)) writeFileSync(join(repo, '.sdlc', name), JSON.stringify(value, null, 2))
  git(repo, 'add', '-A')
  git(repo, 'commit', '-q', '--allow-empty', '-m', message)
}

const stackConfig = run => ({ specPath: 'spec.md', gitMode: 'stack', defaultBranch: 'main', commitFormat: '', runBranch: `sdlc/run-${run}` })

// cut <branch> from the current HEAD with a commit of its own, so two candidate bases are two shas
// rather than two names a wrong answer could be compared against
const seed = (repo, branch, text) => {
  git(repo, 'checkout', '-q', '-b', branch)
  writeFileSync(join(repo, 'src', 'app.txt'), text)
  git(repo, 'commit', '-q', '-am', text.trim())
}

// the human half of a milestone, as GitHub does it by default: squash-merge the branch into the default
// branch and delete the branch. The squash is load-bearing — the branch's commits are never ancestors of
// main, so `git branch -d` refuses the branch forever — and the deletion is what removes the remote-tracking
// ref, which is the state a later run inherits. `keep` leaves the remote branch standing, which is the state
// a repo with delete-branch-on-merge turned off is in, and the only state with a remote branch left to delete.
function mergeOnMain(pub, branch, message, { keep = false } = {}) {
  git(pub, 'fetch', '-q', 'origin')
  git(pub, 'merge', '-q', '--squash', `origin/${branch}`)
  git(pub, 'commit', '-q', '-m', message)
  git(pub, 'push', '-q', 'origin', 'HEAD:main')
  if (!keep) git(pub, 'push', '-q', 'origin', '--delete', branch)
}

// one shipped milestone and the next run's bootstrap on top of it, which is the state every prune test
// starts from: run 1 shipped M-1, a human squash-merged it, and run 2 wants to cut a branch of its own.
// Deliberately does not fetch — the repo under test's origin/<defaultBranch> is the caller's business,
// since what the prune fetches for itself is one of the things under test.
function shippedM1(repo, { keep = false } = {}) {
  const pub = publisher(remotes.get(repo))
  git(repo, 'checkout', '-q', '-b', 'sdlc/run-1')
  commitState(repo, {}, 'run 1 bootstrap')
  git(repo, 'push', '-q', '-u', 'origin', 'sdlc/run-1')
  git(repo, 'checkout', '-q', '-b', 'sdlc/M-1')
  writeFileSync(join(repo, 'src', 'run1.txt'), 'run 1 shipped work\n')
  git(repo, 'add', '-A')
  git(repo, 'commit', '-q', '-m', 'M-1 work')
  git(repo, 'push', '-q', '-u', 'origin', 'sdlc/M-1')
  const tip = git(repo, 'rev-parse', 'sdlc/M-1')
  mergeOnMain(pub, 'sdlc/M-1', 'M-1 (#1)', { keep })
  return { pub, tip }
}

// run 2's bootstrap: the next run's run branch, carrying its own ledger
function run2(repo, files) {
  git(repo, 'checkout', '-q', 'main')
  git(repo, 'merge', '-q', '--ff-only', 'origin/main')
  git(repo, 'checkout', '-q', '-b', 'sdlc/run-2')
  commitState(repo, { 'config.json': stackConfig(2), ...files }, 'run 2 bootstrap')
}

function call(script, repo, args, input) {
  const r = spawnSync('python3', [script, args[0], '--repo', repo, ...args.slice(1)], { input: input === undefined ? undefined : JSON.stringify(input), encoding: 'utf8' })
  return { code: r.status, out: JSON.parse(r.stdout.trim().split('\n').pop()) }
}

test('patch-slice creates the slice branch, merges the patch, marks requirements, writes STATUS.md and commits', opts, () => {
  const repo = fixture({ reqs: [req('R-001'), req('R-002', 'done')], slices: [slice('S-001', { requirements: ['R-001', 'R-002'] }), slice('S-002')] })
  const r = call(STATE, repo, ['patch-slice', '--slice', 'S-001'], { status: 'in_progress', phase: 'tests', counters: { planRevisions: 1 } })
  assert.equal(r.code, 0)
  assert.deepEqual([r.out.ok, r.out.branch], [true, 'sdlc/S-001'])
  assert.equal(git(repo, 'branch', '--show-current'), 'sdlc/S-001')
  const s = json(repo, 'slices.json')[0]
  assert.deepEqual([s.status, s.phase, s.title], ['in_progress', 'tests', 'Slice S-001'])
  assert.deepEqual(s.counters, { planRevisions: 1 }, 'counters replace the whole object')
  assert.deepEqual(json(repo, 'requirements.json').map(x => x.status), ['in_progress', 'done'])
  assert.equal(git(repo, 'status', '--porcelain'), '')
  assert.equal(git(repo, 'log', '-1', '--format=%s'), 'chore(sdlc): state S-001 counters phase status [S-001]')
  const status = readFileSync(join(repo, '.sdlc', 'STATUS.md'), 'utf8')
  assert.match(status, /^# SDLC status: Bookmarks service\n/)
  assert.match(status, /Requirements: 1\/2 done · 0 parked · 0 stubbed · 0 obsolete/)
  assert.match(status, /Slices: 0\/2 done · current: S-001 Slice S-001 · awaiting merge: none/)
  assert.match(status, /ADRs: 1 · Spec proposals: 0/)
  assert.match(status, /- 2026-01-12T10:00:00Z bootstrap ledger/)

  // a second patch on the existing branch commits again, and an empty change commits nothing
  call(STATE, repo, ['patch-slice', '--slice', 'S-001'], { phase: 'implement' })
  assert.equal(json(repo, 'slices.json')[0].phase, 'implement')
  assert.equal(git(repo, 'rev-list', '--count', 'main..sdlc/S-001'), '2')
})

test('patch-slice uses the commit format, and branches from an awaiting-merge dependency', opts, () => {
  const repo = fixture({
    config: { commitFormat: '{type}: [PROJ-123] {subject}' },
    slices: [slice('S-001', { status: 'awaiting-merge' }), slice('S-002', { dependsOn: ['S-001'] })],
  })
  git(repo, 'checkout', '-q', '-b', 'sdlc/S-001')
  writeFileSync(join(repo, 'src', 'app.txt'), 'v2\n')
  git(repo, 'commit', '-q', '-am', 'slice one')
  git(repo, 'checkout', '-q', 'main')
  const r = call(STATE, repo, ['patch-slice', '--slice', 'S-002'], { status: 'in_progress' })
  assert.equal(r.code, 0)
  assert.equal(readFileSync(join(repo, 'src', 'app.txt'), 'utf8'), 'v2\n')
  assert.equal(git(repo, 'log', '-1', '--format=%s'), 'chore: [PROJ-123] state S-002 status [S-002] (sdlc)')
})

test('patch-slice fails without committing when the slice or the input is wrong', opts, () => {
  const repo = fixture({ slices: [slice('S-001')] })
  const head = git(repo, 'rev-parse', 'HEAD')
  const missing = call(STATE, repo, ['patch-slice', '--slice', 'S-009'], { phase: 'tests' })
  assert.equal(missing.code, 2)
  assert.match(missing.out.error, /no slice S-009/)
  assert.equal(call(STATE, repo, ['patch-slice', '--slice', 'S-001'], ['not', 'an', 'object']).code, 2)
  assert.equal(git(repo, 'rev-parse', 'main'), head)
})

test('status lists what needs a human eye', opts, () => {
  const repo = fixture({ slices: [slice('S-001', { status: 'parked', notes: 'needs an API key\nmore' }), slice('S-002', { status: 'awaiting-merge', pr: 'https://example.com/pr/7' }), slice('S-003', { status: 'rejected' })] })
  assert.equal(call(STATE, repo, ['status']).code, 0)
  const status = readFileSync(join(repo, '.sdlc', 'STATUS.md'), 'utf8')
  assert.match(status, /Slices: 0\/2 done · current: none · awaiting merge: S-002/)
  assert.match(status, /- S-001 parked: needs an API key\n/)
  assert.match(status, /- S-002 awaiting merge: https:\/\/example\.com\/pr\/7/)
})

test('add-requirements assigns the next ids and refuses a quote already in the ledger unless it is distinct', opts, () => {
  const repo = fixture({ reqs: [req('R-001'), req('R-007')] })
  const r = call(STATE, repo, ['add-requirements', '--lens', 'structures'], [
    { specRef: '§2', quote: 'New  statement', acceptance: 'a check' },
    { specRef: '§1', quote: 'Quote R-001', acceptance: 'another behavior' },
  ])
  assert.deepEqual(r.out.added, [{ id: 'R-008', specRef: '§2' }])
  assert.deepEqual(r.out.duplicates.map(d => d.existing), ['R-001'])
  const added = json(repo, 'requirements.json')[2]
  assert.deepEqual([added.status, added.notes, added.evidence.commit], ['todo', 'added by the completeness critic (structures)', ''])
  const again = call(STATE, repo, ['add-requirements', '--distinct'], [
    { specRef: '§1', quote: 'quote R-001', acceptance: 'another behavior' },
    { specRef: '§1', quote: 'quote R-001', acceptance: 'check R-001' },
  ])
  assert.deepEqual(again.out.added.map(a => a.id), ['R-009'])
  assert.equal(again.out.duplicates.length, 1)
  assert.equal(call(STATE, repo, ['add-requirements'], [{ quote: 'no acceptance' }]).code, 2)
})

test('critics adding at the same time never lose an entry or reuse an id', opts, async () => {
  const repo = fixture({ reqs: [req('R-001')] })
  const one = lens => new Promise(resolve => {
    const p = spawn('python3', [STATE, 'add-requirements', '--repo', repo, '--lens', lens], { stdio: ['pipe', 'ignore', 'ignore'] })
    p.on('exit', resolve)
    p.stdin.end(JSON.stringify([1, 2, 3, 4, 5].map(n => ({ specRef: '§3', quote: `${lens} ${n}`, acceptance: 'x' })).concat([{ specRef: '§3', quote: 'shared sentence', acceptance: 'x' }])))
  })
  await Promise.all(['statements', 'structures', 'cross-cutting'].map(one))
  const ids = json(repo, 'requirements.json').map(r => r.id)
  assert.equal(ids.length, 1 + 15 + 1, 'the shared sentence is added once')
  assert.equal(new Set(ids).size, ids.length)
  assert.equal(existsSync(join(repo, '.sdlc', 'sdlc-ledger.lock')), false)
})

test('a receipt covers the same code through state commits and a squash merge, and not a code change', opts, () => {
  const repo = fixture({ slices: [slice('S-001')] })
  git(repo, 'checkout', '-q', '-b', 'sdlc/S-001')
  writeFileSync(join(repo, 'src', 'app.txt'), 'v2\n')
  git(repo, 'commit', '-q', '-am', 'feat')
  assert.equal(call(RECEIPT, repo, ['check', '--slice', 'S-001']).out.valid, false)
  const w = call(RECEIPT, repo, ['write', '--slice', 'S-001', '--ref', 'HEAD', '--seconds', '312.4', '--result', 'pass'])
  assert.deepEqual([w.out.ok, w.out.seconds, w.out.commands], [true, 312, ['build', 'lint', 'test', 'typecheck']])

  // the receipt and other state are committed: still the same code
  git(repo, 'add', '-A')
  git(repo, 'commit', '-q', '-m', 'chore(sdlc): state')
  const ok = call(RECEIPT, repo, ['check', '--slice', 'S-001', '--ref', 'sdlc/S-001'])
  assert.deepEqual([ok.out.valid, ok.out.seconds], [true, 312])

  // merged and the branch deleted: the next slice gets its baseline without running the suite
  git(repo, 'checkout', '-q', 'main')
  git(repo, 'merge', '-q', '--squash', 'sdlc/S-001')
  git(repo, 'commit', '-q', '-m', 'feat(S-001): slice')
  git(repo, 'branch', '-q', '-D', 'sdlc/S-001')
  const base = call(RECEIPT, repo, ['baseline', '--ref', 'main'])
  assert.deepEqual([base.out.valid, base.out.seconds], [true, 312])

  // a code change invalidates both
  writeFileSync(join(repo, 'src', 'app.txt'), 'v3\n')
  git(repo, 'commit', '-q', '-am', 'feat: more')
  const stale = call(RECEIPT, repo, ['check', '--slice', 'S-001'])
  assert.equal(stale.out.valid, false)
  assert.match(stale.out.reason, /differs from the code that was tested/)
  assert.equal(call(RECEIPT, repo, ['baseline', '--ref', 'main']).out.valid, false)

  // a measured baseline is found again
  call(RECEIPT, repo, ['baseline-write', '--ref', 'main', '--seconds', '290'])
  assert.deepEqual(call(RECEIPT, repo, ['baseline', '--ref', 'main']).out, { valid: true, seconds: 290, source: '.sdlc/test-baseline.json' })
})

test('a failed or partial receipt never stands in for the final check', opts, () => {
  const repo = fixture({ slices: [slice('S-001')] })
  call(RECEIPT, repo, ['write', '--slice', 'S-001', '--ref', 'HEAD', '--seconds', '100', '--result', 'fail'])
  assert.match(call(RECEIPT, repo, ['check', '--slice', 'S-001']).out.reason, /did not pass/)
  assert.equal(call(RECEIPT, repo, ['baseline', '--ref', 'main']).out.valid, false)
  call(RECEIPT, repo, ['write', '--slice', 'S-001', '--ref', 'HEAD', '--seconds', '100', '--result', 'pass', '--commands', 'test,build'])
  assert.match(call(RECEIPT, repo, ['check', '--slice', 'S-001']).out.reason, /did not cover: lint, typecheck/)
  call(RECEIPT, repo, ['write', '--slice', 'S-001', '--ref', 'HEAD', '--seconds', '100', '--result', 'pass'])
  assert.equal(call(RECEIPT, repo, ['check', '--slice', 'S-001', '--ref', 'no-such-ref']).code, 2)
})

test('stack mode cuts a slice branch from its milestone branch, creating and pushing that branch when it is absent', opts, () => {
  const repo = fixture({
    config: { gitMode: 'stack', defaultBranch: 'main', runBranch: 'sdlc/run-1' },
    slices: [slice('S-014', { requirements: [] })],
    milestones: [{ id: 'M-2', title: 'Sessions', status: 'pending', slices: ['S-014'], fixSlices: [] }],
    remote: true,
  })
  git(repo, 'checkout', '-q', '-b', 'sdlc/run-1')
  writeFileSync(join(repo, 'src', 'app.txt'), 'run work\n')
  git(repo, 'commit', '-q', '-am', 'run work')
  const run = git(repo, 'rev-parse', 'sdlc/run-1')
  const r = call(STATE, repo, ['patch-slice', '--slice', 'S-014'], { status: 'in_progress' })
  assert.equal(r.code, 0)
  // the milestone branch was created from the run branch...
  assert.equal(git(repo, 'branch', '--list', 'sdlc/M-2').trim(), 'sdlc/M-2')
  // ...and pushed, so the milestone pull request has a base on the remote
  assert.match(git(repo, 'ls-remote', '--heads', 'origin', 'sdlc/M-2'), /^(\w+)\trefs\/heads\/sdlc\/M-2$/)
  // ...and the slice was cut from the milestone branch, not from main or the run branch
  assert.equal(git(repo, 'merge-base', '--is-ancestor', 'sdlc/M-2', 'sdlc/S-014'), '')
  assert.equal(git(repo, 'rev-parse', 'sdlc/M-2'), git(repo, 'rev-parse', 'sdlc/S-014^'))
  // main is a different commit from the base, so the assertion above is not vacuous;
  // the milestone branch itself is the run branch, plus nothing
  assert.notEqual(git(repo, 'rev-parse', 'main'), run)
  assert.equal(git(repo, 'rev-parse', 'sdlc/M-2'), run)
})

test('stack mode cuts an audit fix slice from the run branch, since it belongs to no milestone', opts, () => {
  const repo = fixture({
    config: { gitMode: 'stack', defaultBranch: 'main', runBranch: 'sdlc/run-1' },
    slices: [slice('S-fix-1', { kind: 'fix' })],
    milestones: [{ id: 'M-1', title: 'Done', status: 'verified', slices: [], fixSlices: [] }],
  })
  git(repo, 'checkout', '-q', '-b', 'sdlc/run-1')
  writeFileSync(join(repo, 'src', 'app.txt'), 'run work\n')
  git(repo, 'commit', '-q', '-am', 'run work')
  const r = call(STATE, repo, ['patch-slice', '--slice', 'S-fix-1'], { status: 'in_progress' })
  assert.equal(r.code, 0)
  assert.equal(git(repo, 'rev-parse', 'sdlc/run-1'), git(repo, 'rev-parse', 'sdlc/S-fix-1^'))
  assert.equal(git(repo, 'branch', '--list', 'sdlc/M-1').trim(), '')
  // main and the run branch are different commits, so cutting from main would not satisfy the assertion above
  assert.notEqual(git(repo, 'rev-parse', 'main'), git(repo, 'rev-parse', 'sdlc/run-1'))
})

test('stack mode uses a milestone fix slice as an ordinary milestone slice', opts, () => {
  const repo = fixture({
    config: { gitMode: 'stack', defaultBranch: 'main', runBranch: 'sdlc/run-1' },
    slices: [slice('S-fix-M-2-1', { kind: 'fix' })],
    milestones: [{ id: 'M-2', title: 'Sessions', status: 'fixing', slices: [], fixSlices: ['S-fix-M-2-1'] }],
  })
  git(repo, 'branch', 'sdlc/run-1')
  assert.equal(call(STATE, repo, ['patch-slice', '--slice', 'S-fix-M-2-1'], { status: 'in_progress' }).code, 0)
  assert.equal(git(repo, 'rev-parse', 'sdlc/M-2'), git(repo, 'rev-parse', 'sdlc/S-fix-M-2-1^'))
})

test('stack mode cuts a fix slice whose milestone is already verified from the run branch, and creates no milestone branch', opts, () => {
  const repo = fixture({
    config: { gitMode: 'stack', defaultBranch: 'main', runBranch: 'sdlc/run-1' },
    slices: [slice('S-fix-M-1-1', { kind: 'fix' })],
    milestones: [
      { id: 'M-1', title: 'Shipped', status: 'verified', slices: [], fixSlices: ['S-fix-M-1-1'] },
      { id: 'M-2', title: 'Sessions', status: 'pending', slices: [], fixSlices: [] },
    ],
  })
  git(repo, 'branch', 'sdlc/run-1')
  // M-1 shipped: its branch was deleted after its pull request merged
  const r = call(STATE, repo, ['patch-slice', '--slice', 'S-fix-M-1-1'], { status: 'in_progress' })
  assert.equal(r.code, 0, r.out.error)
  assert.equal(git(repo, 'rev-parse', 'sdlc/run-1'), git(repo, 'rev-parse', 'sdlc/S-fix-M-1-1^'))
  // the owning milestone decides the base, so no other milestone's branch is conjured up
  assert.equal(git(repo, 'branch', '--list', 'sdlc/M-1').trim(), '')
  assert.equal(git(repo, 'branch', '--list', 'sdlc/M-2').trim(), '')
  assert.equal(git(repo, 'branch', '--show-current'), 'sdlc/S-fix-M-1-1')
  assert.equal(git(repo, 'status', '--porcelain'), '')
})

test('stack mode bases the slice on a dependency awaiting merge, as pr mode does', opts, () => {
  const repo = fixture({
    config: { gitMode: 'stack', defaultBranch: 'main', runBranch: 'sdlc/run-1' },
    // the dependency is the slice awaiting merge, and S-015 builds on it
    slices: [slice('S-014', { status: 'awaiting-merge', pr: 'u' }), slice('S-015', { dependsOn: ['S-014'] })],
    milestones: [{ id: 'M-2', title: 'Sessions', status: 'pending', slices: ['S-014', 'S-015'], fixSlices: [] }],
  })
  git(repo, 'checkout', '-q', '-b', 'sdlc/run-1')
  git(repo, 'checkout', '-q', '-b', 'sdlc/M-2')
  git(repo, 'checkout', '-q', '-b', 'sdlc/S-014')
  // S-014 gets its own commit, so the dependency branch and the milestone branch are different commits:
  // otherwise this test passes whichever base is chosen
  writeFileSync(join(repo, 'src', 'app.txt'), 'slice fourteen\n')
  git(repo, 'commit', '-q', '-am', 'slice fourteen')
  assert.notEqual(git(repo, 'rev-parse', 'sdlc/S-014'), git(repo, 'rev-parse', 'sdlc/M-2'))
  assert.equal(call(STATE, repo, ['patch-slice', '--slice', 'S-015'], { status: 'in_progress' }).code, 0)
  assert.equal(git(repo, 'rev-parse', 'sdlc/S-014'), git(repo, 'rev-parse', 'sdlc/S-015^'))
  // the dependency's work is in the slice, which the milestone branch alone would not have
  assert.equal(readFileSync(join(repo, 'src', 'app.txt'), 'utf8'), 'slice fourteen\n')
})

test('stack mode ignores an awaiting-merge dependency whose branch is gone, and uses the milestone branch', opts, () => {
  const repo = fixture({
    config: { gitMode: 'stack', defaultBranch: 'main', runBranch: 'sdlc/run-1' },
    // S-014 says it is awaiting a merge, but its branch is gone: the state and the repo disagree
    slices: [slice('S-014', { status: 'awaiting-merge', pr: 'u' }), slice('S-015', { dependsOn: ['S-014'] })],
    milestones: [{ id: 'M-2', title: 'Sessions', status: 'pending', slices: ['S-014', 'S-015'], fixSlices: [] }],
  })
  git(repo, 'checkout', '-q', '-b', 'sdlc/run-1')
  git(repo, 'checkout', '-q', '-b', 'sdlc/M-2')
  assert.equal(call(STATE, repo, ['patch-slice', '--slice', 'S-015'], { status: 'in_progress' }).code, 0)
  assert.equal(git(repo, 'rev-parse', 'sdlc/M-2'), git(repo, 'rev-parse', 'sdlc/S-015^'))
})

test('stack mode finds the milestone that owns the slice, not the first one', opts, () => {
  const repo = fixture({
    config: { gitMode: 'stack', defaultBranch: 'main', runBranch: 'sdlc/run-1' },
    slices: [
      slice('S-021'), slice('S-022', { kind: 'fix' }), slice('S-030b'), slice('S-fix-M-3-1', { kind: 'fix' }),
    ],
    milestones: [
      { id: 'M-1', title: 'Search', status: 'pending', slices: [], fixSlices: [] },
      { id: 'M-2', title: 'Sessions', status: 'pending', slices: ['S-020', 'S-021'], fixSlices: ['S-022'] },
      { id: 'M-3', title: 'Sharing', status: 'pending', slices: ['S-030'], fixSlices: [] },
    ],
  })
  // every candidate base gets its own commit, so "fell back to the run branch" and "used the
  // wrong milestone" are both distinguishable from "used the owning milestone"
  const seed = (branch, text) => {
    git(repo, 'checkout', '-q', '-b', branch)
    writeFileSync(join(repo, 'src', 'app.txt'), text)
    git(repo, 'commit', '-q', '-am', text.trim())
  }
  seed('sdlc/run-1', 'run\n')
  seed('sdlc/M-2', 'm2\n')
  seed('sdlc/M-3', 'm3\n')
  const base = id => {
    assert.equal(call(STATE, repo, ['patch-slice', '--slice', id], { status: 'in_progress' }).code, 0)
    return git(repo, 'rev-parse', `sdlc/${id}^`)
  }
  // a slice listed in a milestone's `slices`
  assert.equal(base('S-021'), git(repo, 'rev-parse', 'sdlc/M-2'))
  // a slice listed in a milestone's `fixSlices`
  assert.equal(base('S-022'), git(repo, 'rev-parse', 'sdlc/M-2'))
  // S-030b is a split child of S-030, which only M-3 lists
  assert.equal(base('S-030b'), git(repo, 'rev-parse', 'sdlc/M-3'))
  // S-fix-M-3-1 belongs to M-3 by its name alone
  assert.equal(base('S-fix-M-3-1'), git(repo, 'rev-parse', 'sdlc/M-3'))
  // the first milestone owns none of these, so it never becomes a base
  assert.equal(git(repo, 'branch', '--list', 'sdlc/M-1').trim(), '')
})

// ---------- suite slot ----------
// The gate holds the suite slot for the whole of a full-suite run, so two agents on one repo never
// interleave two full suites. The holder here is a real background process the way the gate's is, and
// the probe (--timeout 0) is the non-blocking way everything else asks about the slot.
const slotProbe = (repo, ...args) => spawnSync('python3', [RECEIPT, 'slot', '--repo', repo, ...args], { encoding: 'utf8' })
// the holder prints one line the moment it has the slot, so the test waits for that rather than sleeping.
// The backstop kills a holder that never acquires, so a blocked acquire path cannot hang the suite
const holdSlot = repo => new Promise((resolve, reject) => {
  const p = spawn('python3', [RECEIPT, 'slot', '--repo', repo], { stdio: ['ignore', 'pipe', 'pipe'] })
  const backstop = setTimeout(() => p.kill('SIGKILL'), 5000)
  let out = '', err = ''
  p.stdout.on('data', c => { out += c; if (out.includes('\n')) { clearTimeout(backstop); resolve({ p, line: out.split('\n')[0] }) } })
  p.stderr.on('data', c => { err += c })
  p.on('exit', () => { clearTimeout(backstop); reject(new Error(`the slot holder exited before it held the slot: ${out}${err}`)) })
})
// the holder's exit, with a kill so a holder that never notices its release cannot hang the suite
const holderExit = p => new Promise(resolve => {
  const t = setTimeout(() => p.kill('SIGKILL'), 5000)
  p.once('exit', code => { clearTimeout(t); resolve(code) })
})

test('the suite slot is exclusive, and slot-release frees it from another process', opts, async () => {
  const repo = fixture({ slices: [slice('S-001')] })
  const { p: holder, line } = await holdSlot(repo)
  try {
    assert.deepEqual(JSON.parse(line), { ok: true, held: true })
    assert.equal(existsSync(join(repo, '.sdlc', 'suite.lock')), true)

    // while it is held: the probe exits 1, and its JSON names no lock file
    const busy = slotProbe(repo, '--timeout', '0')
    assert.equal(busy.status, 1)
    assert.deepEqual(JSON.parse(busy.stdout.trim()), { ok: false, busy: true })
    assert.doesNotMatch(busy.stdout, /suite\.lock/)
    // and a bounded wait gives up within its budget rather than hanging behind the holder
    const t0 = Date.now()
    const timed = slotProbe(repo, '--timeout', '0.2')
    assert.equal(timed.status, 1)
    assert.ok(Date.now() - t0 >= 50, 'the bounded wait did not wait at all')
    assert.ok(Date.now() - t0 < 2000, 'the bounded wait outlived its timeout')

    // slot-release, run from this process rather than the holder's, frees the slot
    const rel = call(RECEIPT, repo, ['slot-release'])
    assert.equal(rel.code, 0)
    assert.deepEqual([rel.out.ok, rel.out.released], [true, true])
    const free = slotProbe(repo, '--timeout', '0')
    assert.equal(free.status, 0, free.stderr)
    assert.deepEqual(JSON.parse(free.stdout.trim()), { ok: true, busy: false })

    // and the holder noticed the release and exited on its own, so nothing is left holding
    assert.equal(await holderExit(holder), 0)
  } finally {
    holder.kill()
  }
})

test('the suite slot is self-healing: it works without .sdlc and after a killed holder', opts, async () => {
  const repo = scratch('sdlc-slot-')
  // releasing a slot nobody ever took answers rather than failing
  assert.deepEqual(call(RECEIPT, repo, ['slot-release']).out, { ok: true, released: false })
  const { p: holder } = await holdSlot(repo)
  assert.equal(existsSync(join(repo, '.sdlc', 'suite.lock')), true, 'slot did not create .sdlc/')
  holder.kill('SIGKILL')
  await holderExit(holder)
  // the killed holder's lock died with it, so the slot is free again despite the leftover file
  assert.equal(slotProbe(repo, '--timeout', '0').status, 0)
})

test('stack mode aborts a conflicting merge of the default branch into the run branch', opts, () => {
  const repo = fixture({
    config: { gitMode: 'stack', defaultBranch: 'main', runBranch: 'sdlc/run-1' },
    slices: [slice('S-014')],
    milestones: [{ id: 'M-2', title: 'Sessions', status: 'pending', slices: ['S-014'], fixSlices: [] }],
    remote: true,
  })
  git(repo, 'checkout', '-q', '-b', 'sdlc/run-1')
  writeFileSync(join(repo, 'src', 'app.txt'), 'run work\n')
  git(repo, 'commit', '-q', '-am', 'run work')
  // the remote's main moves to the same line differently: the merge cannot be resolved automatically
  const pub = publisher(remotes.get(repo))
  pushFile(pub, 'src/app.txt', 'v2\n', 'main moved')
  git(repo, 'fetch', '-q', 'origin')
  const run = git(repo, 'rev-parse', 'sdlc/run-1')
  const r = call(STATE, repo, ['patch-slice', '--slice', 'S-014'], { status: 'in_progress' })
  assert.equal(r.code, 2)
  assert.match(r.out.error, /conflict/i)
  assert.match(r.out.error, /sdlc\/run-1/)
  assert.match(r.out.error, /origin\/main/)
  // nothing is left half-merged: no MERGE_HEAD, no conflicted file, the run branch unmoved
  assert.equal(existsSync(join(git(repo, 'rev-parse', '--absolute-git-dir'), 'MERGE_HEAD')), false)
  assert.equal(git(repo, 'status', '--porcelain'), '')
  assert.equal(git(repo, 'rev-parse', 'sdlc/run-1'), run)
  // and no milestone branch was left behind
  assert.equal(git(repo, 'branch', '--list', 'sdlc/M-2').trim(), '')
})

test('stack mode merges the default branch into the run branch when it moves without conflicting', opts, () => {
  const repo = fixture({
    config: { gitMode: 'stack', defaultBranch: 'main', runBranch: 'sdlc/run-1' },
    slices: [slice('S-014')],
    milestones: [{ id: 'M-2', title: 'Sessions', status: 'pending', slices: ['S-014'], fixSlices: [] }],
    remote: true,
  })
  git(repo, 'checkout', '-q', '-b', 'sdlc/run-1')
  writeFileSync(join(repo, 'src', 'run.txt'), 'run work\n')
  git(repo, 'add', '-A')
  git(repo, 'commit', '-q', '-m', 'run work')
  // the remote's main moves on a different file: fast-forward is impossible, but the merge is clean
  const pub = publisher(remotes.get(repo))
  pushFile(pub, 'src/app.txt', 'v2\n', 'main moved')
  git(repo, 'fetch', '-q', 'origin')
  const r = call(STATE, repo, ['patch-slice', '--slice', 'S-014'], { status: 'in_progress' })
  assert.equal(r.code, 0, r.out.error)
  // the milestone branch carries both sides: origin/main's commit and the run branch's
  assert.equal(git(repo, 'merge-base', '--is-ancestor', 'origin/main', 'sdlc/M-2'), '')
  assert.equal(git(repo, 'merge-base', '--is-ancestor', 'sdlc/run-1', 'sdlc/M-2'), '')
  assert.equal(git(repo, 'rev-parse', 'sdlc/M-2'), git(repo, 'rev-parse', 'sdlc/S-014^'))
  assert.equal(git(repo, 'status', '--porcelain'), '')
})

test('stack mode refuses to cut a slice when there is no run branch to fall back on', opts, () => {
  const repo = fixture({
    config: { gitMode: 'stack', defaultBranch: 'main', runBranch: '' },
    slices: [slice('S-fix-1', { kind: 'fix' })],
    milestones: [{ id: 'M-1', title: 'Done', status: 'verified', slices: [], fixSlices: [] }],
  })
  // a slice must never land on the default branch in stack mode, so say so rather than cutting from main
  const r = call(STATE, repo, ['patch-slice', '--slice', 'S-fix-1'], { status: 'in_progress' })
  assert.equal(r.code, 2)
  assert.match(r.out.error, /runBranch/)
  assert.equal(git(repo, 'branch', '--list', 'sdlc/S-fix-1').trim(), '')
  assert.equal(json(repo, 'slices.json')[0].status, 'todo')
})

test('pr, direct and mr mode are untouched by the stack arm', opts, () => {
  for (const mode of ['pr', 'direct', 'mr']) {
    const repo = fixture({ config: { gitMode: mode, defaultBranch: 'main', runBranch: '' }, slices: [slice('S-001')] })
    assert.equal(call(STATE, repo, ['patch-slice', '--slice', 'S-001'], { status: 'in_progress' }).code, 0)
    assert.equal(git(repo, 'rev-parse', 'main'), git(repo, 'rev-parse', 'sdlc/S-001^'), `${mode} mode changed its base`)
  }
})

test('direct and mr mode never pull the default branch, unlike pr mode', opts, () => {
  for (const mode of ['direct', 'mr']) {
    // the pr arm checks out the default branch and pulls it; direct and mr must not, or a slice would
    // silently be built on a default branch that moved without the run saying so
    const repo = fixture({
      config: { gitMode: mode, defaultBranch: 'main', runBranch: '' },
      slices: [slice('S-001')],
      remote: true,
    })
    const local = git(repo, 'rev-parse', 'main')
    const pub = publisher(remotes.get(repo))
    pushFile(pub, 'src/app.txt', 'v2\n', 'main moved')
    assert.equal(call(STATE, repo, ['patch-slice', '--slice', 'S-001'], { status: 'in_progress' }).code, 0)
    // the local default branch is left exactly where it was, and the slice starts from that tip
    assert.equal(git(repo, 'rev-parse', 'main'), local, `${mode} mode moved the local default branch`)
    assert.equal(git(repo, 'rev-parse', 'sdlc/S-001^'), local, `${mode} mode cut the slice from a pulled default branch`)
  }
})

test('a dependency whose branch exists but which is not awaiting merge is not used as a base', opts, () => {
  const repo = fixture({
    config: { gitMode: 'stack', defaultBranch: 'main', runBranch: 'sdlc/run-1' },
    // S-014 is done and S-020 is in progress: both have branches, but neither is awaiting a merge,
    // so neither may become the base of S-015
    slices: [
      slice('S-014', { status: 'done' }), slice('S-020', { status: 'in_progress' }),
      slice('S-015', { dependsOn: ['S-014', 'S-020'] }),
    ],
    milestones: [{ id: 'M-2', title: 'Sessions', status: 'pending', slices: ['S-014', 'S-015', 'S-020'], fixSlices: [] }],
  })
  git(repo, 'checkout', '-q', '-b', 'sdlc/run-1')
  git(repo, 'checkout', '-q', '-b', 'sdlc/M-2')
  git(repo, 'checkout', '-q', '-b', 'sdlc/S-014')
  writeFileSync(join(repo, 'src', 'app.txt'), 'fourteen\n')
  git(repo, 'commit', '-q', '-am', 'fourteen')
  git(repo, 'checkout', '-q', '-b', 'sdlc/S-020', 'sdlc/S-014')
  writeFileSync(join(repo, 'src', 'app.txt'), 'twenty\n')
  git(repo, 'commit', '-q', '-am', 'twenty')
  git(repo, 'checkout', '-q', 'sdlc/run-1')
  const milestone = git(repo, 'rev-parse', 'sdlc/M-2')
  assert.equal(call(STATE, repo, ['patch-slice', '--slice', 'S-015'], { status: 'in_progress' }).code, 0)
  assert.equal(git(repo, 'rev-parse', 'sdlc/S-015^'), milestone)
  assert.notEqual(milestone, git(repo, 'rev-parse', 'sdlc/S-014'))
  assert.notEqual(milestone, git(repo, 'rev-parse', 'sdlc/S-020'))
})

test('stack mode names the missing run branch rather than letting git fail', opts, () => {
  const repo = fixture({
    config: { gitMode: 'stack', defaultBranch: 'main', runBranch: 'sdlc/run-7' },
    slices: [slice('S-fix-1', { kind: 'fix' })],
    milestones: [{ id: 'M-1', title: 'Done', status: 'verified', slices: [], fixSlices: [] }],
  })
  // sdlc/run-7 is configured but does not exist, and the slice owns no milestone, so nothing
  // checks the run branch before the base is used
  const r = call(STATE, repo, ['patch-slice', '--slice', 'S-fix-1'], { status: 'in_progress' })
  assert.equal(r.code, 2)
  assert.match(r.out.error, /run branch/)
  assert.match(r.out.error, /sdlc\/run-7/)
  assert.doesNotMatch(r.out.error, /fatal:/)
  assert.equal(git(repo, 'branch', '--list', 'sdlc/S-fix-1').trim(), '')
  assert.equal(json(repo, 'slices.json')[0].status, 'todo')
})

test('an unknown gitMode fails loudly instead of committing the slice to the default branch', opts, () => {
  // config.json is written by an agent, so nothing but this check constrains gitMode to the modes named in
  // git-modes.json. An unrecognised one reaches no arm of ensure_slice_branch and behaves like direct: a
  // slice committed to the default branch, with no pull request and no push — the one thing stack mode
  // exists to prevent. The expected list is read from that file, not spelled out here, so that adding a
  // mode does not mean editing this test and drifting from the script it checks.
  for (const mode of ['stak', 'STACK', 'PullRequest']) {
    const repo = fixture({ config: { gitMode: mode, defaultBranch: 'main', runBranch: 'sdlc/run-1' }, slices: [slice('S-014')], milestones: [{ id: 'M-2', status: 'pending', slices: ['S-014'], fixSlices: [] }] })
    const r = call(STATE, repo, ['patch-slice', '--slice', 'S-014'], { status: 'in_progress' })
    assert.equal(r.code, 2, `${mode} must not be silently accepted`)
    assert.match(r.out.error, new RegExp(mode))
    assert.match(r.out.error, new RegExp(GIT_MODES.join(', ')))
    // nothing was committed and no slice branch was cut, so the slice cannot have landed on main
    assert.equal(git(repo, 'branch', '--list', 'sdlc/S-014').trim(), '')
    assert.equal(git(repo, 'branch', '--list', 'sdlc/M-2').trim(), '')
    assert.equal(json(repo, 'slices.json')[0].status, 'todo')
    assert.equal(git(repo, 'rev-parse', 'main'), git(repo, 'rev-parse', 'HEAD'))
  }
  // every known mode is still accepted
  for (const mode of GIT_MODES) {
    const repo = fixture({ config: { gitMode: mode, defaultBranch: 'main', runBranch: 'sdlc/run-1' }, slices: [slice('S-014')] })
    git(repo, 'branch', 'sdlc/run-1')
    assert.equal(call(STATE, repo, ['patch-slice', '--slice', 'S-014'], { status: 'in_progress' }).code, 0, `${mode} mode was rejected`)
  }
  // and an absent gitMode is pre-existing behaviour, unchanged
  const unset = fixture({ config: { gitMode: '' }, slices: [slice('S-014')] })
  assert.equal(call(STATE, unset, ['patch-slice', '--slice', 'S-014'], { status: 'in_progress' }).code, 0)
})

test('after a milestone PR merges, the run branch carries it before the next branch is cut from it', opts, () => {
  // The state nothing on this branch covered, and the gap both of these defects lived in. A merged
  // milestone's branch is deleted, so the next base is the run branch — and milestone-writer.md owned the
  // run branch's advance in prose, in a step that only runs while a milestone is due. A merged milestone
  // is verified everywhere and due never again, so the run branch stayed on the code from before the last
  // milestone shipped. The audit fix slice below belongs to no milestone, so its base is the run branch
  // alone: cut from a stale one it would miss every shipped milestone.
  const repo = fixture({
    config: { gitMode: 'stack', defaultBranch: 'main', runBranch: 'sdlc/run-1' },
    slices: [slice('S-fix-1', { kind: 'fix' })],
    milestones: [{ id: 'M-1', title: 'Shipped', status: 'verified', slices: [], fixSlices: [] }],
    remote: true,
  })
  // the run branch, pushed at bootstrap, carrying no product code
  git(repo, 'checkout', '-q', '-b', 'sdlc/run-1')
  git(repo, 'push', '-q', '-u', 'origin', 'sdlc/run-1')
  // M-1 ships: work lands on main through the milestone branch, which is then deleted
  const pub = publisher(remotes.get(repo))
  pushFile(pub, 'src/shipped.txt', 'M-1 shipped\n', 'feat(M-1): milestone work')
  git(repo, 'fetch', '-q', 'origin')
  const stale = git(repo, 'rev-parse', 'sdlc/run-1')
  assert.notEqual(git(repo, 'rev-parse', 'origin/main'), stale, 'the run branch is stale before the fix, so this test can fail')

  const r = call(STATE, repo, ['patch-slice', '--slice', 'S-fix-1'], { status: 'in_progress' })
  assert.equal(r.code, 0, r.out.error)
  // the slice is based on the run branch, which now carries the shipped milestone
  assert.equal(git(repo, 'rev-parse', 'sdlc/run-1'), git(repo, 'rev-parse', 'sdlc/S-fix-1^'))
  assert.equal(readFileSync(join(repo, 'src', 'shipped.txt'), 'utf8'), 'M-1 shipped\n', 'the slice was cut from a run branch missing the shipped milestone')
  // ...and it was pushed, so origin/sdlc/run-1 is not left behind a local-only advance
  assert.equal(git(repo, 'rev-parse', 'sdlc/run-1'), git(repo, 'rev-parse', 'origin/sdlc/run-1'))
  assert.equal(git(repo, 'status', '--porcelain'), '')
})

test('the run branch is advanced onto the default branch when a milestone branch is cut too', opts, () => {
  // The same transition on the milestone path, which is the one every ordinary slice takes. The run branch
  // has to reach shipped code here as well, or the second milestone's branch — and every slice under it —
  // builds on code from before the first milestone landed.
  const repo = fixture({
    config: { gitMode: 'stack', defaultBranch: 'main', runBranch: 'sdlc/run-1' },
    slices: [slice('S-020')],
    milestones: [{ id: 'M-2', title: 'Sessions', status: 'pending', slices: ['S-020'], fixSlices: [] }],
    remote: true,
  })
  git(repo, 'checkout', '-q', '-b', 'sdlc/run-1')
  git(repo, 'push', '-q', '-u', 'origin', 'sdlc/run-1')
  const pub = publisher(remotes.get(repo))
  pushFile(pub, 'src/shipped.txt', 'M-1 shipped\n', 'feat(M-1): milestone work')
  git(repo, 'fetch', '-q', 'origin')
  assert.notEqual(git(repo, 'rev-parse', 'origin/main'), git(repo, 'rev-parse', 'sdlc/run-1'))

  assert.equal(call(STATE, repo, ['patch-slice', '--slice', 'S-020'], { status: 'in_progress' }).code, 0)
  assert.equal(git(repo, 'merge-base', '--is-ancestor', 'origin/main', 'sdlc/run-1'), '')
  assert.equal(git(repo, 'merge-base', '--is-ancestor', 'origin/main', 'sdlc/M-2'), '')
  assert.equal(readFileSync(join(repo, 'src', 'shipped.txt'), 'utf8'), 'M-1 shipped\n')
  assert.equal(git(repo, 'rev-parse', 'sdlc/run-1'), git(repo, 'rev-parse', 'origin/sdlc/run-1'))
})

test('advancing the run branch merges rather than rebasing, and never force-pushes it', opts, () => {
  // The run branch is published and other people may have read it, so the advance is a merge or a
  // fast-forward and never a rebase or a force. A run branch that moved and then was rebased would make
  // every branch already cut from it unreadable to anyone who fetched it, and a force-push would do the
  // same to the milestone branches cut from it.
  const repo = fixture({
    config: { gitMode: 'stack', defaultBranch: 'main', runBranch: 'sdlc/run-1' },
    slices: [slice('S-fix-1', { kind: 'fix' })],
    milestones: [{ id: 'M-1', title: 'Shipped', status: 'verified', slices: [], fixSlices: [] }],
    remote: true,
  })
  git(repo, 'checkout', '-q', '-b', 'sdlc/run-1')
  writeFileSync(join(repo, 'src', 'run.txt'), 'run work\n')
  git(repo, 'add', '-A')
  git(repo, 'commit', '-q', '-m', 'run work')
  git(repo, 'push', '-q', '-u', 'origin', 'sdlc/run-1')
  const published = git(repo, 'rev-parse', 'origin/sdlc/run-1')
  // the default branch moves on a different file, so the advance cannot fast-forward
  const pub = publisher(remotes.get(repo))
  pushFile(pub, 'src/app.txt', 'v2\n', 'main moved')
  git(repo, 'fetch', '-q', 'origin')

  assert.equal(call(STATE, repo, ['patch-slice', '--slice', 'S-fix-1'], { status: 'in_progress' }).code, 0)
  // the published run-branch commit is still an ancestor: a merge keeps history, a rebase would not
  assert.equal(git(repo, 'merge-base', '--is-ancestor', published, 'sdlc/run-1'), '')
  assert.notEqual(git(repo, 'rev-parse', 'sdlc/run-1'), published, 'the run branch did not advance, so nothing was proven')
  // and the push was accepted as a fast-forward, not forced over anything
  assert.equal(git(repo, 'merge-base', '--is-ancestor', published, 'origin/sdlc/run-1'), '')
  assert.equal(git(repo, 'status', '--porcelain'), '')
})

test('a milestone branch left behind by an earlier attempt does not win over the verified rule', opts, () => {
  // The deletion of a merged milestone's branch is a step in milestone-writer that, like the run branch's
  // advance, nothing ran. Until the branch is gone the branch-exists check answered first, so a slice for a
  // shipped milestone built on that stale branch — which no milestone PR will ever ship, because a verified
  // milestone is due never again. The verified rule is checked first so the stale branch cannot win.
  const repo = fixture({
    config: { gitMode: 'stack', defaultBranch: 'main', runBranch: 'sdlc/run-1' },
    slices: [slice('S-fix-M-1-1', { kind: 'fix' })],
    milestones: [{ id: 'M-1', title: 'Shipped', status: 'verified', slices: [], fixSlices: ['S-fix-M-1-1'] }],
  })
  git(repo, 'branch', 'sdlc/run-1')
  // M-1's branch is still around, holding work the loop will never ship
  git(repo, 'checkout', '-q', '-b', 'sdlc/M-1')
  writeFileSync(join(repo, 'src', 'app.txt'), 'unshipped milestone work\n')
  git(repo, 'commit', '-q', '-am', 'M-1 leftover')
  const stale = git(repo, 'rev-parse', 'sdlc/M-1')
  git(repo, 'checkout', '-q', 'sdlc/run-1')

  assert.equal(call(STATE, repo, ['patch-slice', '--slice', 'S-fix-M-1-1'], { status: 'in_progress' }).code, 0)
  assert.equal(git(repo, 'rev-parse', 'sdlc/S-fix-M-1-1^'), git(repo, 'rev-parse', 'sdlc/run-1'), 'the slice was cut from the stale milestone branch')
  assert.notEqual(git(repo, 'rev-parse', 'sdlc/S-fix-M-1-1^'), stale)
  assert.equal(readFileSync(join(repo, 'src', 'app.txt'), 'utf8'), 'v1\n', "the stale branch's unshipped work leaked into the slice")
})

test("a second run cuts its own M-1 instead of building on the first run's leftover milestone branch", opts, () => {
  // The topology no test on this branch had, and the one the whole-branch review reproduced. Milestone ids
  // restart at M-1 on every run while sdlc/run-<n> counts up, so run 2's first milestone branch carries the
  // exact name run 1's did. Nothing deleted run 1's branch — milestone-writer's Merged step never runs for a
  // milestone that merged — so run 2's branch-exists check answered with run 1's branch, run 2's first slice
  // was cut from it, and run 2's sdlc/M-1 pull request carried run 1's code to main. Two real runs against
  // one bare remote, so the second genuinely collides with the first rather than with a fixture.
  const repo = fixture({ config: stackConfig(1), remote: true })
  const pub = publisher(remotes.get(repo))

  // run 1: bootstrap on sdlc/run-1, one milestone, a human merges it and GitHub deletes the branch
  git(repo, 'checkout', '-q', '-b', 'sdlc/run-1')
  commitState(repo, { 'milestones.json': [{ id: 'M-1', title: 'Run 1', status: 'pending', slices: [], fixSlices: [] }] }, 'run 1 bootstrap')
  git(repo, 'push', '-q', '-u', 'origin', 'sdlc/run-1')
  git(repo, 'checkout', '-q', '-b', 'sdlc/M-1')
  writeFileSync(join(repo, 'src', 'run1.txt'), 'run 1 shipped work\n')
  commitState(repo, { 'milestones.json': [{ id: 'M-1', title: 'Run 1', status: 'verified', attempts: 1, slices: [], fixSlices: [], pr: 'https://example.test/pr/run-1-M-1' }] }, 'M-1 verified')
  git(repo, 'push', '-q', '-u', 'origin', 'sdlc/M-1')
  const run1Milestone = git(repo, 'rev-parse', 'sdlc/M-1')
  mergeOnMain(pub, 'sdlc/M-1', 'M-1: run 1 (#1)')
  git(repo, 'fetch', '-q', '--prune', 'origin')
  // the state the fix has to survive: the work shipped, the remote-tracking ref is gone, and `git branch -d`
  // still refuses the local branch because a squash commit is not an ancestor of it
  assert.equal(git(repo, 'ls-remote', '--heads', 'origin', 'sdlc/M-1'), '', 'the merge should have deleted the remote branch')
  assert.ok(notAncestor(repo, 'sdlc/M-1', 'origin/main'), 'a squash merge leaves the branch unmerged by ancestry')

  // run 2: bootstrap on sdlc/run-2, whose own M-1 collides with what run 1 left behind
  git(repo, 'checkout', '-q', 'main')
  git(repo, 'merge', '-q', '--ff-only', 'origin/main')
  git(repo, 'checkout', '-q', '-b', 'sdlc/run-2')
  commitState(repo, {
    'config.json': stackConfig(2),
    'slices.json': [slice('S-001')],
    'milestones.json': [{ id: 'M-1', title: 'Run 2', status: 'pending', slices: ['S-001'], fixSlices: [] }],
  }, 'run 2 bootstrap')
  git(repo, 'push', '-q', '-u', 'origin', 'sdlc/run-2')

  const r = call(STATE, repo, ['patch-slice', '--slice', 'S-001'], { status: 'in_progress' })
  assert.equal(r.code, 0, r.out.error)

  // run 1's milestone branch is gone: the name now belongs to a branch cut from this run's run branch, at a
  // different commit, so it cannot be the leftover repointed
  const freshMilestone = git(repo, 'rev-parse', 'sdlc/M-1')
  assert.notEqual(freshMilestone, run1Milestone, "run 1's leftover milestone branch survived")
  assert.match(git(repo, 'ls-remote', '--heads', 'origin', 'sdlc/M-1'), new RegExp(`^${freshMilestone}`))
  // and the slice is cut from this run's run branch — the reviewer's own reproduction, `sdlc/S-001^ == sdlc/M-1`,
  // asserted the other way round
  assert.notEqual(git(repo, 'rev-parse', 'sdlc/S-001^'), run1Milestone, "run 2's slice was built on run 1's stale milestone branch")
  assert.equal(git(repo, 'rev-parse', 'sdlc/S-001^'), git(repo, 'rev-parse', 'sdlc/run-2'))
  // run 2's slice carries run 2's ledger, not run 1's: the config on its base names this run's run branch,
  // and the milestone record run 1 shipped — with its pull request url — is not what it was built on
  assert.equal(JSON.parse(git(repo, 'show', 'sdlc/S-001^:.sdlc/config.json')).runBranch, 'sdlc/run-2')
  const onBase = JSON.parse(git(repo, 'show', 'sdlc/S-001^:.sdlc/milestones.json'))
  assert.deepEqual(onBase.map(m => [m.id, m.status, m.slices]), [['M-1', 'pending', ['S-001']]], "run 2 built on run 1's milestone record")
  assert.doesNotMatch(git(repo, 'show', 'sdlc/S-001^:.sdlc/milestones.json'), /run-1-M-1/)
  // run 1's product code did ship, so it belongs on run 2's base: its absence would be a different bug
  assert.equal(readFileSync(join(repo, 'src', 'run1.txt'), 'utf8'), 'run 1 shipped work\n')
  // the replacement milestone branch is this run's own, cut from this run's run branch and pushed for its PR
  assert.equal(freshMilestone, git(repo, 'rev-parse', 'sdlc/S-001^'))
  assert.equal(git(repo, 'status', '--porcelain'), '')
})

test('pruning deletes a shipped milestone branch and nothing else', opts, () => {
  // Each gate needs a case only IT can pass. Without the name filter, run 1's e2e suite — shipped, so
  // content-merged, and left behind — would be deleted. Without the exemption for the branch being cut, this
  // run's own sdlc/M-3 would be deleted between the slice being cut from it and its push request opening.
  // Without the shipped test, the sibling test below shows what would be lost.
  const repo = fixture({ config: stackConfig(1), remote: true })
  const pub = publisher(remotes.get(repo))
  git(repo, 'checkout', '-q', '-b', 'sdlc/run-1')
  commitState(repo, {}, 'run 1 bootstrap')
  git(repo, 'push', '-q', '-u', 'origin', 'sdlc/run-1')

  // run 1's milestone branch and its e2e suite, both merged by a human and both left behind
  git(repo, 'checkout', '-q', '-b', 'sdlc/M-1')
  writeFileSync(join(repo, 'src', 'run1.txt'), 'run 1\n')
  git(repo, 'add', '-A')
  git(repo, 'commit', '-q', '-m', 'M-1 work')
  git(repo, 'push', '-q', '-u', 'origin', 'sdlc/M-1')
  mergeOnMain(pub, 'sdlc/M-1', 'M-1 (#1)')
  git(repo, 'checkout', '-q', '-b', 'sdlc/M-1-e2e')
  mkdirSync(join(repo, 'e2e'))
  writeFileSync(join(repo, 'e2e', 'suite.txt'), 'run 1 suite\n')
  git(repo, 'add', '-A')
  git(repo, 'commit', '-q', '-m', 'e2e suite')
  git(repo, 'push', '-q', '-u', 'origin', 'sdlc/M-1-e2e')
  mergeOnMain(pub, 'sdlc/M-1-e2e', 'e2e suite (#2)')
  git(repo, 'fetch', '-q', '--prune', 'origin')

  // run 2: a shipped milestone branch of its own, and the milestone branch this call is about to cut
  git(repo, 'checkout', '-q', 'main')
  git(repo, 'merge', '-q', '--ff-only', 'origin/main')
  git(repo, 'checkout', '-q', '-b', 'sdlc/run-2')
  commitState(repo, {
    'config.json': stackConfig(2),
    'slices.json': [slice('S-020')],
    'milestones.json': [{ id: 'M-3', title: 'Tags', status: 'pending', slices: ['S-020'], fixSlices: [] }],
  }, 'run 2 bootstrap')
  git(repo, 'checkout', '-q', '-b', 'sdlc/M-2')
  writeFileSync(join(repo, 'src', 'app.txt'), 'milestone work\n')
  git(repo, 'commit', '-q', '-am', 'M-2 work')
  git(repo, 'push', '-q', '-u', 'origin', 'sdlc/M-2')
  mergeOnMain(pub, 'sdlc/M-2', 'M-2 (#3)')
  git(repo, 'fetch', '-q', '--prune', 'origin')
  // and the branch the slice below is about to be cut into: this run's own, so it must survive even though
  // its work has shipped — the milestone is still being worked on, so swapping the branch out is what
  // strands the slices already cut from it
  git(repo, 'checkout', '-q', '-b', 'sdlc/M-3')
  writeFileSync(join(repo, 'src', 'tags.txt'), 'tag work\n')
  git(repo, 'add', '-A')
  git(repo, 'commit', '-q', '-m', 'M-3 work')
  const cutting = git(repo, 'rev-parse', 'sdlc/M-3')
  git(repo, 'push', '-q', '-u', 'origin', 'sdlc/M-3')
  mergeOnMain(pub, 'sdlc/M-3', 'M-3 (#4)')
  git(repo, 'fetch', '-q', '--prune', 'origin')
  git(repo, 'checkout', '-q', 'sdlc/run-2')

  assert.equal(call(STATE, repo, ['patch-slice', '--slice', 'S-020'], { status: 'in_progress' }).code, 0)
  assert.equal(git(repo, 'branch', '--list', 'sdlc/M-1').trim(), '', "the earlier run's shipped milestone branch was not deleted")
  assert.equal(git(repo, 'ls-remote', '--heads', 'origin', 'sdlc/M-1'), '')
  assert.match(git(repo, 'rev-parse', 'sdlc/M-1-e2e'), /^[0-9a-f]{40}$/, 'the e2e suite is not a milestone branch and must survive')
  assert.equal(git(repo, 'branch', '--list', 'sdlc/M-2').trim(), '', "this run's own shipped milestone branch was not deleted either")
  assert.equal(git(repo, 'rev-parse', 'sdlc/M-3'), cutting, 'the branch being cut was deleted out from under the milestone')
  // and it is still the base, so pruning cannot strand the slice mid-milestone
  assert.equal(git(repo, 'rev-parse', 'sdlc/S-020^'), cutting)
})

test('the prune does not delete a remote milestone branch that is ahead of the local one', opts, () => {
  // The destruction the review reproduced, and the one thing this branch's own tests never set up: a
  // remote branch ahead of the local branch. Run 1's M-1 ships and a human squash-merges it; the human then
  // pushes an unreviewed commit straight to origin/sdlc/M-1, which leaves the local branch behind the remote.
  // shipped_into() answers correctly — the LOCAL branch's content is on origin/main, so it is that branch's
  // work that shipped — and `git push origin --delete` then removes whatever the remote points at, taking the
  // human's unmerged commit with it. Nothing on the local side could ever have caught it, which is the point:
  // the two proofs are about two different refs and only one of them was being run.
  const repo = fixture({ config: stackConfig(1), remote: true })
  const { pub } = shippedM1(repo, { keep: true })
  // the human pushes to the remote branch without the loop's knowing
  git(pub, 'fetch', '-q', 'origin')
  git(pub, 'checkout', '-q', '-B', 'sdlc/M-1', 'origin/sdlc/M-1')
  writeFileSync(join(pub, 'src', 'human.txt'), 'unreviewed work a human pushed\n')
  git(pub, 'add', '-A')
  git(pub, 'commit', '-q', '-m', 'human push straight to the milestone branch')
  git(pub, 'push', '-q', 'origin', 'sdlc/M-1')
  const humanSha = git(pub, 'rev-parse', 'sdlc/M-1')
  git(repo, 'fetch', '-q', 'origin')
  // the precondition, stated so the test cannot pass for the wrong reason: the remote IS ahead, and the
  // local branch's own work IS shipped
  assert.notEqual(git(repo, 'rev-parse', 'origin/sdlc/M-1'), git(repo, 'rev-parse', 'sdlc/M-1'), 'the remote is not ahead of the local branch')
  run2(repo, {
    'slices.json': [slice('S-020')],
    'milestones.json': [{ id: 'M-2', title: 'Tags', status: 'pending', slices: ['S-020'], fixSlices: [] }],
  })

  assert.equal(call(STATE, repo, ['patch-slice', '--slice', 'S-020'], { status: 'in_progress' }).code, 0)
  // the remote branch survives, with the human's commit still on it
  assert.match(git(repo, 'ls-remote', '--heads', 'origin', 'sdlc/M-1'), new RegExp(`^${humanSha}`), 'the remote branch was deleted along with the human\'s commit')
  assert.equal(git(repo, 'show', 'origin/sdlc/M-1:src/human.txt'), 'unreviewed work a human pushed')
  // the local delete is proved on its own evidence and still stands: run 1's branch is gone, which is what
  // stops run 2's M-1 from colliding with it
  assert.equal(git(repo, 'branch', '--list', 'sdlc/M-1').trim(), '', "the local branch was not deleted, so the two runs still collide")
  // and the branch run 2 cut for itself is a different commit, not the leftover repointed
  assert.notEqual(git(repo, 'rev-parse', 'sdlc/M-2'), git(repo, 'rev-parse', 'origin/sdlc/M-1'))
})

test('the prune deletes the remote milestone branch only while the remote still holds what it proved', opts, () => {
  // The lease half of the same gate. The remote branch's content is proved shipped, and then a push lands
  // on it before the delete does. Reading origin/<branch> once cannot see that — the ref is already stale
  // by the time the delete runs — so the delete names the sha it proved and git rejects it instead. Without
  // the lease this is the same loss as the test above, one step later and therefore invisible to it.
  const repo = fixture({ config: stackConfig(1), remote: true })
  shippedM1(repo, { keep: true })
  git(repo, 'fetch', '-q', 'origin')
  const proved = git(repo, 'rev-parse', 'origin/sdlc/M-1')
  // the remote branch really is provably shipped, so nothing but the lease can be holding this delete back
  assert.equal(git(repo, 'ls-remote', '--heads', 'origin', 'sdlc/M-1').split('\t')[0], proved)

  // A second clone, standing in for anything else pushing to the remote branch — the loop itself, a
  // teammate, CI. It is not run yet: the hook below runs it at the interception point, which is the whole
  // point. Run here instead, it would push before the prune started, and the prune would simply see a
  // branch that was never shipped and skip it — which is what the previous test covers.
  const late = publisher(remotes.get(repo))
  const real = execFileSync('sh', ['-c', 'command -v git'], { encoding: 'utf8' }).trim()
  const shim = scratch('sdlc-shim-')
  // the late push, as a script: run when the prune asks to delete the branch, not before
  writeFileSync(join(shim, 'late.sh'), `#!/bin/sh
${JSON.stringify(real)} -C "$1" fetch -q origin
${JSON.stringify(real)} -C "$1" checkout -q -B sdlc/M-1 "$2"
printf 'landed after the proof\\n' > "$1/src/late.txt"
${JSON.stringify(real)} -C "$1" add -A
${JSON.stringify(real)} -C "$1" commit -q -m 'a push that lands mid-prune'
${JSON.stringify(real)} -C "$1" push -q origin sdlc/M-1
`)
  // the interception: a git wrapper that fires the late push the moment the delete refspec `:sdlc/M-1`
  // appears, which is the only argument in any push this script makes that says "delete this branch"
  writeFileSync(join(shim, 'git'), `#!/bin/sh
for a in "$@"; do
  case "$a" in
    :sdlc/M-1)
      if [ ! -e "$MARK" ]; then : > "$MARK"; sh "$HOOK" "$REPO" "$PROVED" >/dev/null 2>&1; fi
      ;;
  esac
done
exec ${JSON.stringify(real)} "$@"
`)
  chmodSync(join(shim, 'git'), 0o755)
  chmodSync(join(shim, 'late.sh'), 0o755)
  run2(repo, {
    'slices.json': [slice('S-020')],
    'milestones.json': [{ id: 'M-2', title: 'Tags', status: 'pending', slices: ['S-020'], fixSlices: [] }],
  })

  const r = spawnSync('python3', [STATE, 'patch-slice', '--repo', repo, '--slice', 'S-020'], {
    input: JSON.stringify({ status: 'in_progress' }),
    encoding: 'utf8',
    env: {
      ...process.env, PATH: `${shim}:${process.env.PATH}`,
      MARK: join(shim, 'fired'), HOOK: join(shim, 'late.sh'), REPO: late, PROVED: proved,
    },
  })
  assert.equal(r.status, 0, r.stdout + r.stderr)
  // the push landed mid-prune and the remote branch kept its commit: the leased delete was rejected
  assert.ok(existsSync(join(shim, 'fired')), 'the push never landed mid-prune, so nothing was proved')
  assert.match(git(repo, 'ls-remote', '--heads', 'origin', 'sdlc/M-1'), /^(\w+)\trefs\/heads\/sdlc\/M-1$/, 'the leased delete removed a branch that had moved')
  git(repo, 'fetch', '-q', 'origin')
  assert.equal(git(repo, 'show', 'origin/sdlc/M-1:src/late.txt'), 'landed after the proof', 'the push that landed mid-prune was deleted')
})

test('a milestone branch whose only unshipped change is a file mode is kept', opts, () => {
  // `git rev-parse <rev>:<path>` answers the blob sha, so a chmod +x leaves the two sides byte-identical
  // and shipped_into said yes. The tree entries differ — 100755 on the branch, 100644 on the default
  // branch — and the branch was deleted with the mode change unmerged. ls-tree carries the mode with the
  // content, which is what makes "the same file" mean the same thing to git and to this check.
  const repo = fixture({ config: stackConfig(1), remote: true })
  // the mode is changed in the INDEX only, so the worktree never differs from it and no checkout trips over
  // an unstaged mode change; fileMode off says so explicitly rather than relying on the platform's
  mkdirSync(join(repo, 'scripts'))
  git(repo, 'config', 'core.fileMode', 'false')
  writeFileSync(join(repo, 'scripts', 'tool.sh'), '#!/bin/sh\necho tool\n')
  git(repo, 'add', '-A')
  git(repo, 'commit', '-q', '-m', 'a script')
  git(repo, 'push', '-q', 'origin', 'main')
  git(repo, 'checkout', '-q', '-b', 'sdlc/run-1')
  git(repo, 'push', '-q', '-u', 'origin', 'sdlc/run-1')
  // the milestone flips the mode and changes nothing else, so the two sides hold the same blob
  git(repo, 'checkout', '-q', '-b', 'sdlc/M-1')
  git(repo, 'update-index', '--chmod=+x', 'scripts/tool.sh')
  git(repo, 'commit', '-q', '-m', 'make the script executable')
  git(repo, 'push', '-q', '-u', 'origin', 'sdlc/M-1')
  git(repo, 'checkout', '-q', 'sdlc/run-1')
  git(repo, 'fetch', '-q', 'origin')
  // the precondition: identical blobs, different tree entries, and the mode is the ONLY difference
  assert.equal(git(repo, 'rev-parse', 'sdlc/M-1:scripts/tool.sh'), git(repo, 'rev-parse', 'origin/main:scripts/tool.sh'), 'the blobs differ, so this is not the mode-only case')
  assert.match(git(repo, 'ls-tree', 'sdlc/M-1', '--', 'scripts/tool.sh'), /^100755 blob \w+\sscripts\/tool\.sh$/)
  assert.match(git(repo, 'ls-tree', 'origin/main', '--', 'scripts/tool.sh'), /^100644 blob \w+\sscripts\/tool\.sh$/)
  assert.deepEqual(git(repo, 'diff', '--name-only', 'origin/main', 'sdlc/M-1').split('\n').filter(Boolean), ['scripts/tool.sh'])
  run2(repo, {
    'slices.json': [slice('S-020')],
    'milestones.json': [{ id: 'M-2', title: 'Tags', status: 'pending', slices: ['S-020'], fixSlices: [] }],
  })

  assert.equal(call(STATE, repo, ['patch-slice', '--slice', 'S-020'], { status: 'in_progress' }).code, 0)
  // the mode change is unmerged work nobody accepted, so the branch holding it survives
  assert.match(git(repo, 'rev-parse', 'sdlc/M-1'), /^[0-9a-f]{40}$/, 'the branch was deleted with its file mode unmerged')
  assert.match(git(repo, 'ls-tree', 'sdlc/M-1', '--', 'scripts/tool.sh'), /^100755 /)
  assert.match(git(repo, 'ls-tree', 'origin/main', '--', 'scripts/tool.sh'), /^100644 /, 'the mode change reached the default branch after all')
})

test('a milestone branch checked out in another worktree is not deleted', opts, () => {
  // `git branch -d` refuses a branch another worktree is sitting on and says so; the compare-and-swap that
  // stands in for it after a squash merge does not, and deleted it anyway — leaving that worktree on a
  // dangling HEAD with its files still staged. The guard the first path gets for free is not a guard the
  // second path has, so the set of checked-out branches is read from git rather than assumed to be this one.
  const repo = fixture({ config: stackConfig(1), remote: true })
  shippedM1(repo)
  git(repo, 'fetch', '-q', '--prune', 'origin')
  run2(repo, {
    'slices.json': [slice('S-020')],
    'milestones.json': [{ id: 'M-2', title: 'Tags', status: 'pending', slices: ['S-020'], fixSlices: [] }],
  })
  // run 1's shipped milestone branch, checked out in a worktree of its own
  const wt = scratch('sdlc-wt-')
  git(repo, 'worktree', 'add', '-q', wt, 'sdlc/M-1')
  const tip = git(repo, 'rev-parse', 'sdlc/M-1')
  // the precondition: git's own refusal is real here, so the fallback is the path under test
  assert.throws(() => git(repo, 'branch', '-d', 'sdlc/M-1'), /used by worktree/, 'git -d did not refuse, so the fallback is not what this exercises')

  assert.equal(call(STATE, repo, ['patch-slice', '--slice', 'S-020'], { status: 'in_progress' }).code, 0)
  assert.equal(git(repo, 'rev-parse', 'sdlc/M-1'), tip, 'the branch was deleted out from under the worktree')
  // and that worktree is not left on a dangling HEAD, which is what the deletion costs it
  assert.equal(git(wt, 'rev-parse', '--abbrev-ref', 'HEAD'), 'sdlc/M-1')
  assert.equal(git(wt, 'status', '--porcelain'), '')
  // the branch the call was about to cut is untouched by any of this
  assert.equal(git(repo, 'rev-parse', 'sdlc/S-020^'), git(repo, 'rev-parse', 'sdlc/M-2'))
})

test('a milestone branch with a slice pull request still open against it is not deleted', opts, () => {
  // GitHub closes a pull request whose base branch is deleted. milestone-writer step 5 leaves a slice pull
  // request open while the milestone pull request cycles CI, so this is reachable in ordinary operation and
  // the slice head surviving does not help: the run's awaiting-merge bookkeeping is left pointing at a
  // closed pull request, and nothing in the ledger distinguishes "waiting" from "closed" afterwards.
  //
  // A slice sits at awaiting-merge for exactly as long as its pull request is open, and in stack mode that
  // pull request's base is its milestone branch, so the ledger answers this locally. What it cannot see is
  // a pull request the run did not open or record — a human's — which is why the code says so in the
  // comment rather than implying the check is complete.
  const repo = fixture({ config: stackConfig(1), remote: true })
  shippedM1(repo)
  git(repo, 'fetch', '-q', '--prune', 'origin')
  const tip = git(repo, 'rev-parse', 'sdlc/M-1')
  run2(repo, {
    'slices.json': [slice('S-014', { status: 'awaiting-merge', pr: 'https://example.test/pr/14' }), slice('S-020')],
    'milestones.json': [
      { id: 'M-1', title: 'Run 1', status: 'verified', slices: ['S-014'], fixSlices: [] },
      { id: 'M-2', title: 'Tags', status: 'pending', slices: ['S-020'], fixSlices: [] },
    ],
  })
  // the precondition: shipped, so every other gate passes, and the pull request is the only thing left
  assert.ok(notAncestor(repo, 'sdlc/M-1', 'origin/main'), 'the branch is merged by ancestry, so -d would not fall through')

  assert.equal(call(STATE, repo, ['patch-slice', '--slice', 'S-020'], { status: 'in_progress' }).code, 0)
  assert.equal(git(repo, 'rev-parse', 'sdlc/M-1'), tip, 'the branch was deleted while a slice pull request was open against it')
  // the slice still awaiting merge is what held it, and it is the run's own record that says so
  assert.equal(json(repo, 'slices.json').find(x => x.id === 'S-014').pr, 'https://example.test/pr/14')

  // a slice that is no longer awaiting merge stops holding it: the gate is the ledger, not a permanent veto.
  // The next cut is for a new milestone, which is what runs the prune again.
  git(repo, 'checkout', '-q', 'sdlc/run-2')
  commitState(repo, {
    'slices.json': [slice('S-014', { status: 'done', pr: 'https://example.test/pr/14' }), slice('S-021')],
    'milestones.json': [
      { id: 'M-1', title: 'Run 1', status: 'verified', slices: ['S-014'], fixSlices: [] },
      { id: 'M-3', title: 'Sharing', status: 'pending', slices: ['S-021'], fixSlices: [] },
    ],
  }, 'S-014 merged')
  assert.equal(call(STATE, repo, ['patch-slice', '--slice', 'S-021'], { status: 'in_progress' }).code, 0)
  assert.equal(git(repo, 'branch', '--list', 'sdlc/M-1').trim(), '', 'a merged slice still holds its milestone branch forever')
})

test('a milestone branch that moved between the proof and the delete survives the delete', opts, () => {
  // The compare-and-swap's sha is the whole of its safety. `git update-ref -d <ref>` with no expected value
  // deletes whatever is at the ref, so a branch that moved in the window between the proof and the delete is
  // destroyed — and nothing upstream re-checks, because the proof already said yes about a different commit.
  // Every prune in this file that reaches the fallback exercises the delete; this is the only one that
  // moves the branch underneath it, which is why the sha survived mutation removal until now.
  const repo = fixture({ config: stackConfig(1), remote: true })
  shippedM1(repo)
  git(repo, 'fetch', '-q', '--prune', 'origin')
  run2(repo, {
    'slices.json': [slice('S-020')],
    'milestones.json': [{ id: 'M-2', title: 'Tags', status: 'pending', slices: ['S-020'], fixSlices: [] }],
  })
  const tip = git(repo, 'rev-parse', 'sdlc/M-1')
  // a commit that will land on the branch mid-prune: new work, unmerged. It is built on a side branch
  // named `landed`, which is not a milestone branch name, so the prune never considers it on its own —
  // only as the thing sdlc/M-1 gets repointed at underneath the delete.
  git(repo, 'checkout', '-q', '-b', 'landed', 'sdlc/M-1')
  writeFileSync(join(repo, 'src', 'landed.txt'), 'work that landed mid-prune\n')
  git(repo, 'add', '-A')
  git(repo, 'commit', '-q', '-m', 'a commit that lands mid-prune')
  const landed = git(repo, 'rev-parse', 'landed')
  assert.notEqual(landed, tip, 'the side branch is not ahead, so the move proves nothing')
  git(repo, 'checkout', '-q', 'sdlc/run-2')
  // sdlc/M-1 is left where the prune will prove it shipped; the move happens at the interception point

  // the same interleaving as the lease test, on the local side: a git wrapper that moves the branch the
  // moment the prune asks to delete it. `git update-ref -d <ref> <sha>` is the call under test — the
  // wrapper moves the ref and then runs that command verbatim, so with the sha dropped the very next git
  // call deletes the moved branch and the test sees a lost commit.
  const shim = scratch('sdlc-shim-')
  const real = execFileSync('sh', ['-c', 'command -v git'], { encoding: 'utf8' }).trim()
  writeFileSync(join(shim, 'git'), `#!/bin/sh
prev=
for a in "$@"; do
  case "$a" in
    refs/heads/sdlc/M-1)
      if [ "$prev" = "-d" ] && [ ! -e "$MARK" ]; then
        : > "$MARK"
        ${JSON.stringify(real)} -C "$REPO" update-ref refs/heads/sdlc/M-1 "$LANDED"
      fi
      ;;
  esac
  prev="$a"
done
exec ${JSON.stringify(real)} "$@"
`)
  chmodSync(join(shim, 'git'), 0o755)

  const r = spawnSync('python3', [STATE, 'patch-slice', '--repo', repo, '--slice', 'S-020'], {
    input: JSON.stringify({ status: 'in_progress' }),
    encoding: 'utf8',
    env: { ...process.env, PATH: `${shim}:${process.env.PATH}`, MARK: join(shim, 'fired'), REPO: repo, LANDED: landed },
  })
  assert.equal(r.status, 0, r.stdout + r.stderr)
  assert.ok(existsSync(join(shim, 'fired')), 'the branch never moved mid-prune, so nothing was proved')
  // the branch moved, so the delete's expected sha no longer matches and git refuses it
  assert.equal(git(repo, 'rev-parse', 'sdlc/M-1'), landed, 'a branch that moved between the proof and the delete was destroyed')
  assert.notEqual(landed, tip)
  assert.equal(git(repo, 'show', 'sdlc/M-1:src/landed.txt'), 'work that landed mid-prune')
})

test('the prune fetches the default branch before deciding, so a shipped milestone is not left behind', opts, () => {
  // Without the fetch, origin/<defaultBranch> is whatever this clone last saw. GitHub's delete-branch-on-merge
  // removes the remote branch, so the state a later run inherits is exactly "shipped, and this clone has not
  // looked". A stale origin/main reads as not shipped, the prune under-deletes, and milestone branches
  // accumulate — the defect the prune was added for, returning by the same door. Under-deleting is the safe
  // direction, which is why this one is silent: nothing anywhere reports it.
  const repo = fixture({ config: stackConfig(1), remote: true })
  shippedM1(repo)
  // deliberately NOT fetched: the milestone is shipped on the remote and this clone has not seen it
  const stale = git(repo, 'rev-parse', 'origin/main')
  run2(repo, {
    'slices.json': [slice('S-020')],
    'milestones.json': [{ id: 'M-2', title: 'Tags', status: 'pending', slices: ['S-020'], fixSlices: [] }],
  })
  assert.equal(git(repo, 'rev-parse', 'origin/main'), stale, 'the fixture fetched, so there is no staleness to prove anything against')
  assert.notEqual(git(repo, 'ls-remote', '--heads', 'origin', 'main').split('\t')[0], stale, "the remote's main did not move, so a fetch cannot change the answer")

  assert.equal(call(STATE, repo, ['patch-slice', '--slice', 'S-020'], { status: 'in_progress' }).code, 0)
  // the fetch the prune does for itself has landed
  assert.notEqual(git(repo, 'rev-parse', 'origin/main'), stale, 'the prune did not fetch')
  // and run 1's shipped milestone branch is gone, which is the whole point of the prune
  assert.equal(git(repo, 'branch', '--list', 'sdlc/M-1').trim(), '', 'the shipped milestone branch was left behind because the default branch was read stale')
})

test("an earlier run's milestone branch holding unshipped work is kept, and never built on", opts, () => {
  // Deleting it would lose work nobody accepted, so it stays — and building on it is the leak this change
  // exists to stop, so the run stops instead. Failing loudly beats committing run 1's code onto run 2's
  // milestone branch, which is how run 1's code reached main the first time.
  const repo = fixture({
    config: stackConfig(1),
    slices: [slice('S-001')],
    milestones: [{ id: 'M-1', title: 'Run 2', status: 'pending', slices: ['S-001'], fixSlices: [] }],
    remote: true,
  })
  git(repo, 'checkout', '-q', '-b', 'sdlc/run-1')
  commitState(repo, {}, 'run 1 bootstrap')
  git(repo, 'push', '-q', '-u', 'origin', 'sdlc/run-1')
  git(repo, 'checkout', '-q', '-b', 'sdlc/M-1')
  commitState(repo, { 'milestones.json': [{ id: 'M-1', status: 'pending', slices: [], fixSlices: [] }] }, 'M-1 started')
  writeFileSync(join(repo, 'src', 'unshipped.txt'), 'run 1 work nobody accepted\n')
  git(repo, 'add', '-A')
  git(repo, 'commit', '-q', '-m', 'M-1 work')
  git(repo, 'push', '-q', '-u', 'origin', 'sdlc/M-1')
  const unshipped = git(repo, 'rev-parse', 'sdlc/M-1')
  git(repo, 'fetch', '-q', 'origin')
  assert.ok(notAncestor(repo, 'sdlc/M-1', 'origin/main'), 'the fixture must not be already merged')

  // run 2, which wants that very name for its own first milestone
  git(repo, 'checkout', '-q', 'sdlc/run-1')
  git(repo, 'checkout', '-q', '-b', 'sdlc/run-2')
  commitState(repo, { 'config.json': stackConfig(2) }, 'run 2 bootstrap')
  const r = call(STATE, repo, ['patch-slice', '--slice', 'S-001'], { status: 'in_progress' })
  assert.equal(r.code, 2)
  assert.match(r.out.error, /sdlc\/M-1/)
  assert.match(r.out.error, /sdlc\/run-1/)
  assert.match(r.out.error, /sdlc\/run-2/)
  assert.doesNotMatch(r.out.error, /fatal:/)
  // the unshipped branch is intact, and nothing was cut from it, committed, or pushed
  assert.equal(git(repo, 'rev-parse', 'sdlc/M-1'), unshipped)
  assert.equal(git(repo, 'branch', '--list', 'sdlc/S-001').trim(), '')
  assert.equal(git(repo, 'branch', '--show-current'), 'sdlc/run-2')
  assert.equal(git(repo, 'rev-list', '--count', 'origin/sdlc/run-1..sdlc/run-2'), '1', 'run 2 committed nothing on top')
  assert.equal(json(repo, 'slices.json')[0].status, 'todo')
  assert.equal(git(repo, 'show', 'sdlc/M-1:src/unshipped.txt'), 'run 1 work nobody accepted')
  assert.notEqual(existsSync(join(repo, 'src', 'unshipped.txt')), true, "run 1's unshipped work is on run 2's run branch")
})

// ---------- base-branch ----------
// The read-only command the prompts ask instead of naming a branch in prose. Six prompts used to spell
// this rule out, and two of them got it wrong: commit-state.md picked the branch from a milestone's
// `status`, which is `verified` by the time the milestone-writer commits, and milestone-writer.md
// described an advance nothing ran. One owner, asked rather than deduced.
//
// Every fixture below builds real branches at distinct commits, so "it named the wrong branch" is a
// different sha rather than an unfalsifiable string. A test that cannot see the topology cannot catch a
// wrong branch, which is exactly how those defects survived a green suite.

const baseOf = (repo, id) => call(STATE, repo, ['base-branch', '--slice', id])

test('base-branch names the milestone branch for a slice that belongs to a milestone', opts, () => {
  const repo = fixture({
    config: stackConfig(1),
    slices: [slice('S-021')],
    milestones: [
      { id: 'M-1', title: 'Search', status: 'pending', slices: [], fixSlices: [] },
      { id: 'M-2', title: 'Sessions', status: 'pending', slices: ['S-020', 'S-021'], fixSlices: [] },
    ],
  })
  // three candidate bases, each its own commit, so naming the run branch or main is a wrong answer
  seed(repo, 'sdlc/run-1', 'run\n')
  seed(repo, 'sdlc/M-1', 'm1\n')
  seed(repo, 'sdlc/M-2', 'm2\n')
  const r = baseOf(repo, 'S-021')
  assert.equal(r.code, 0, r.out.error)
  assert.deepEqual([r.out.ok, r.out.branch], [true, 'sdlc/M-2'])
  // and the branch it named is the one the slice was actually cut from, per the code that cuts it
  assert.equal(call(STATE, repo, ['patch-slice', '--slice', 'S-021'], { status: 'in_progress' }).code, 0)
  assert.equal(git(repo, 'rev-parse', 'sdlc/M-2'), git(repo, 'rev-parse', 'sdlc/S-021^'))
  // the branch is checkable, not merely named: a caller goes on to use this name directly
  assert.doesNotThrow(() => git(repo, 'rev-parse', '--verify', 'refs/heads/sdlc/M-2'))
})

test('base-branch names the run branch for an audit fix that belongs to no milestone', opts, () => {
  const repo = fixture({
    config: stackConfig(1),
    slices: [slice('S-fix-1', { kind: 'fix' })],
    milestones: [{ id: 'M-1', title: 'Done', status: 'verified', slices: [], fixSlices: [] }],
  })
  seed(repo, 'sdlc/run-1', 'run\n')
  seed(repo, 'sdlc/M-2', 'm2\n')
  const r = baseOf(repo, 'S-fix-1')
  assert.equal(r.code, 0, r.out.error)
  assert.equal(r.out.branch, 'sdlc/run-1')
  // main is a different commit from the run branch, so answering main here would be visibly wrong:
  // the run's whole guarantee is that a slice never lands on the default branch
  assert.notEqual(git(repo, 'rev-parse', 'main'), git(repo, 'rev-parse', 'sdlc/run-1'))
  assert.notEqual(r.out.branch, 'main')
  // and it agrees with the base patch-slice cuts the slice from
  assert.equal(call(STATE, repo, ['patch-slice', '--slice', 'S-fix-1'], { status: 'in_progress' }).code, 0)
  assert.equal(git(repo, 'rev-parse', 'sdlc/run-1'), git(repo, 'rev-parse', 'sdlc/S-fix-1^'))
})

test('base-branch names the run branch for a fix of a milestone that already shipped', opts, () => {
  // A verified milestone's branch was deleted after its pull request merged, so the fix builds on the
  // run branch. Prompt prose that picked the milestone branch here would hand the integrator a base that
  // does not exist, and gh pr create would create the pull request against the default branch instead.
  const repo = fixture({
    config: stackConfig(1),
    slices: [slice('S-fix-M-1-1', { kind: 'fix' })],
    milestones: [{ id: 'M-1', title: 'Shipped', status: 'verified', slices: [], fixSlices: ['S-fix-M-1-1'] }],
  })
  seed(repo, 'sdlc/run-1', 'run\n')
  const r = baseOf(repo, 'S-fix-M-1-1')
  assert.equal(r.code, 0, r.out.error)
  assert.equal(r.out.branch, 'sdlc/run-1')
})

test('base-branch names the dependency branch for a slice whose dependency is awaiting merge', opts, () => {
  // ensure_slice_branch bases such a slice on the dependency's branch, so the base the integrator opens
  // its pull request against must be that same branch. Answering the milestone branch would put the
  // dependency's open work into this slice's pull request.
  const repo = fixture({
    config: stackConfig(1),
    slices: [slice('S-014', { status: 'awaiting-merge', pr: 'u' }), slice('S-015', { dependsOn: ['S-014'] })],
    milestones: [{ id: 'M-2', title: 'Sessions', status: 'pending', slices: ['S-014', 'S-015'], fixSlices: [] }],
  })
  seed(repo, 'sdlc/run-1', 'run\n')
  seed(repo, 'sdlc/M-2', 'm2\n')
  seed(repo, 'sdlc/S-014', 'fourteen\n')
  const r = baseOf(repo, 'S-015')
  assert.equal(r.code, 0, r.out.error)
  assert.equal(r.out.branch, 'sdlc/S-014')
  assert.notEqual(r.out.branch, 'sdlc/M-2')
  // and the branch it named is where the slice really came from
  assert.equal(call(STATE, repo, ['patch-slice', '--slice', 'S-015'], { status: 'in_progress' }).code, 0)
  assert.equal(git(repo, 'rev-parse', 'sdlc/S-014'), git(repo, 'rev-parse', 'sdlc/S-015^'))
})

test('pr, direct and mr mode answer with the default branch, and stay there', opts, () => {
  for (const mode of ['pr', 'direct', 'mr']) {
    // a milestone and a run branch that exist, so answering either of them in a non-stack mode would
    // be a real mistake this can see rather than a string comparison against a branch that is absent
    const repo = fixture({
      config: { gitMode: mode, defaultBranch: 'trunk', commitFormat: '', runBranch: 'sdlc/run-1' },
      slices: [slice('S-014')],
      milestones: [{ id: 'M-2', title: 'Sessions', status: 'pending', slices: ['S-014'], fixSlices: [] }],
    })
    git(repo, 'branch', '-m', 'main', 'trunk')
    seed(repo, 'sdlc/run-1', 'run\n')
    seed(repo, 'sdlc/M-2', 'm2\n')
    const r = baseOf(repo, 'S-014')
    assert.equal(r.code, 0, r.out.error)
    assert.equal(r.out.branch, 'trunk', `${mode} mode answered ${r.out.branch}`)
    // the default branch, not the run branch it also has configured
    assert.notEqual(r.out.branch, 'sdlc/run-1')
    assert.notEqual(r.out.branch, 'sdlc/M-2')
    // and the slice is still cut from it, so this command changed no behaviour in these three modes
    assert.equal(call(STATE, repo, ['patch-slice', '--slice', 'S-014'], { status: 'in_progress' }).code, 0)
    assert.equal(git(repo, 'rev-parse', 'trunk'), git(repo, 'rev-parse', 'sdlc/S-014^'))
  }
})

test('base-branch names a milestone branch that does not exist yet, without creating it', opts, () => {
  // The first slice of a milestone asks this before its branch exists: ensure_milestone_branch creates
  // that branch when the slice is cut. So the answer must be the name, and the command must not be the
  // thing that creates it — two owners for one branch is the defect this change exists to remove.
  const repo = fixture({
    config: stackConfig(1),
    slices: [slice('S-014')],
    milestones: [{ id: 'M-2', title: 'Sessions', status: 'pending', slices: ['S-014'], fixSlices: [] }],
  })
  seed(repo, 'sdlc/run-1', 'run\n')
  assert.equal(git(repo, 'branch', '--list', 'sdlc/M-2').trim(), '')
  const before = git(repo, 'rev-parse', 'HEAD')
  const r = baseOf(repo, 'S-014')
  assert.equal(r.code, 0, r.out.error)
  assert.equal(r.out.branch, 'sdlc/M-2')
  assert.equal(git(repo, 'branch', '--list', 'sdlc/M-2').trim(), '', 'base-branch created the branch ensure_milestone_branch owns')
  assert.equal(git(repo, 'rev-parse', 'HEAD'), before)
})

test('base-branch reads the repo and changes nothing at all', opts, () => {
  // The whole contract. An integrator asks this mid-ship, with a working tree it must not lose: a
  // command that checked a branch out, committed, or advanced the run branch would be a second owner
  // of a transition, which is how the run branch went stale in the first place.
  //
  // The slice is an audit fix on purpose. Its base IS the run branch, which is the one answer that has a
  // transition behind it — `advance_run_branch` merges the default branch in and pushes — so a fixture
  // whose slice belongs to a milestone would leave that path unexercised and this test would pass a
  // command that quietly advanced the branch. The default branch below has moved, so an advance would
  // really move this one: without that, the assertion could not tell an advance from a no-op.
  const repo = fixture({
    config: stackConfig(1),
    slices: [slice('S-fix-1', { kind: 'fix' })],
    milestones: [{ id: 'M-1', title: 'Shipped', status: 'verified', slices: [], fixSlices: [] }],
    remote: true,
  })
  seed(repo, 'sdlc/run-1', 'run\n')
  writeFileSync(join(repo, 'src', 'dirty.txt'), 'work in progress\n')
  git(repo, 'add', '-A')
  git(repo, 'commit', '-q', '-m', 'unmerged work')
  const pub = publisher(remotes.get(repo))
  // a file the run branch has never touched, so an advance would merge cleanly and MOVE the branch. A
  // conflicting default branch would fail the call loudly instead, which would still catch a side effect
  // but would not show that the branch this test guards against advancing really moved.
  pushFile(pub, 'src/moved.txt', 'main moved on\n', 'main moved')
  git(repo, 'fetch', '-q', 'origin')
  // the fixture must make an advance observable, or this test proves nothing about the run branch
  assert.notEqual(git(repo, 'rev-parse', 'sdlc/run-1'), git(repo, 'rev-parse', 'origin/main'), 'the run branch is already level with the default branch, so advancing it is a no-op this cannot see')
  assert.equal(git(repo, 'status', '--porcelain'), '', 'the fixture left the tree dirty for the wrong reason')
  const before = {
    head: git(repo, 'rev-parse', 'HEAD'),
    current: git(repo, 'branch', '--show-current'),
    branches: git(repo, 'for-each-ref', '--format=%(refname:short)', 'refs/heads'),
    run: git(repo, 'rev-parse', 'sdlc/run-1'),
    porcelain: git(repo, 'status', '--porcelain'),
    log: git(repo, 'rev-list', '--count', 'HEAD'),
  }
  const r = baseOf(repo, 'S-fix-1')
  assert.equal(r.code, 0, r.out.error)
  // and it really is the run-branch answer, so the assertions below are about the branch that moves
  assert.equal(r.out.branch, 'sdlc/run-1')
  assert.equal(git(repo, 'rev-parse', 'HEAD'), before.head, 'base-branch committed')
  assert.equal(git(repo, 'branch', '--show-current'), before.current, 'base-branch checked a branch out')
  assert.equal(git(repo, 'for-each-ref', '--format=%(refname:short)', 'refs/heads'), before.branches, 'base-branch created or deleted a branch')
  assert.equal(git(repo, 'rev-parse', 'sdlc/run-1'), before.run, 'base-branch advanced the run branch onto a default branch that had moved')
  assert.equal(git(repo, 'status', '--porcelain'), before.porcelain)
  assert.equal(git(repo, 'rev-list', '--count', 'HEAD'), before.log)
})

test('base-branch fails loudly rather than printing a plausible branch', opts, () => {
  // An unknown slice is the case a prose rule cannot catch: the agent holds a slice id from its inputs,
  // and every branch name in the file is a legal answer for some other slice. Printing one would send a
  // pull request to a branch that has nothing to do with the work.
  const repo = fixture({
    config: stackConfig(1),
    slices: [slice('S-021')],
    milestones: [{ id: 'M-2', title: 'Sessions', status: 'pending', slices: ['S-021'], fixSlices: [] }],
  })
  seed(repo, 'sdlc/run-1', 'run\n')
  const unknown = baseOf(repo, 'S-999')
  assert.equal(unknown.code, 2)
  assert.equal(unknown.out.ok, false)
  assert.match(unknown.out.error, /S-999/)
  assert.equal(unknown.out.branch, undefined, 'a failed call must not name a branch')

  // stack mode with no run branch to fall back on, for a slice belonging to no milestone
  const bare = fixture({ config: { ...stackConfig(1), runBranch: '' }, slices: [slice('S-fix-1', { kind: 'fix' })] })
  const missing = baseOf(bare, 'S-fix-1')
  assert.equal(missing.code, 2)
  assert.match(missing.out.error, /runBranch/)
  assert.equal(missing.out.branch, undefined, 'a failed call must not fall back to the default branch')

  // a runBranch that is configured but absent: naming it would hand the caller a branch to check out
  const gone = fixture({ config: { ...stackConfig(1), runBranch: 'sdlc/run-7' }, slices: [slice('S-fix-1', { kind: 'fix' })] })
  const absent = baseOf(gone, 'S-fix-1')
  assert.equal(absent.code, 2)
  assert.match(absent.out.error, /sdlc\/run-7/)
  assert.equal(absent.out.branch, undefined)

  // an unrecognised mode reaches no arm and would answer like direct: the default branch, for a mode
  // whose delivery nobody has agreed to
  const odd = fixture({ config: { gitMode: 'stak', defaultBranch: 'main' }, slices: [slice('S-014')] })
  const bad = baseOf(odd, 'S-014')
  assert.equal(bad.code, 2)
  assert.match(bad.out.error, /stak/)
  assert.equal(bad.out.branch, undefined)
})

// ---------- impact ----------
// The diff-to-tests map the verify loop consults instead of running the whole suite. These fixtures are
// plain repos with no .sdlc state, since impact reads only git and the package manifests it finds.
const IMPACT = join(SKILL_DIR, 'impact.py')
const runImpact = (repo, base, head) =>
  spawnSync('python3', [IMPACT, '--repo', repo, '--base', base, '--head', head], { encoding: 'utf8' })

const initRepo = () => {
  const repo = scratch('sdlc-impact-')
  git(repo, 'init', '-q', '-b', 'main')
  git(repo, 'config', 'user.email', 'test@example.com')
  git(repo, 'config', 'user.name', 'Test')
  return repo
}

test('impact maps a changed source file to its package tests and reverse-dependency packages', opts, () => {
  const repo = initRepo()
  const pkg = (dir, name, deps = {}) => {
    mkdirSync(join(repo, dir, 'src'), { recursive: true })
    mkdirSync(join(repo, dir, 'test'), { recursive: true })
    writeFileSync(join(repo, dir, 'package.json'), JSON.stringify({ name, dependencies: deps }))
  }
  pkg('packages/a', '@f/a')
  writeFileSync(join(repo, 'packages/a/src/x.ts'), 'export const x = 1\n')
  writeFileSync(join(repo, 'packages/a/test/x.test.ts'), 'a test of a\n')
  pkg('packages/b', '@f/b', { '@f/a': 'workspace:*' })
  writeFileSync(join(repo, 'packages/b/src/y.ts'), 'export const y = 1\n')
  writeFileSync(join(repo, 'pnpm-workspace.yaml'), 'packages:\n  - packages/*\n')
  git(repo, 'add', '-A')
  git(repo, 'commit', '-q', '-m', 'init')
  git(repo, 'checkout', '-q', '-b', 'feat')
  writeFileSync(join(repo, 'packages/a/src/x.ts'), 'export const x = 2\n')
  git(repo, 'commit', '-q', '-am', 'change')

  const r = runImpact(repo, 'main', 'feat')
  assert.equal(r.status, 0, r.stderr)
  const out = JSON.parse(r.stdout)
  assert.deepEqual(out.changed, ['packages/a/src/x.ts'])
  // a's own test file, and b's package because its dependencies name @f/a — not b's sources, which are unaffected
  assert.deepEqual(out.testFiles, ['packages/a/test/x.test.ts'])
  assert.deepEqual(out.packages, ['packages/a', 'packages/b'])
  assert.equal(r.stderr, '', 'a graph that was built has nothing to note')
})

test('impact follows Go imports to reverse-dependent packages when a go.mod exists', goOpts, () => {
  const repo = initRepo()
  writeFileSync(join(repo, 'go.mod'), 'module example.com/m\n\ngo 1.21\n')
  mkdirSync(join(repo, 'pkg/alpha'), { recursive: true })
  mkdirSync(join(repo, 'pkg/beta'), { recursive: true })
  writeFileSync(join(repo, 'pkg/alpha/alpha.go'), 'package alpha\n\nconst A = 1\n')
  writeFileSync(join(repo, 'pkg/alpha/alpha_test.go'), 'package alpha\n')
  writeFileSync(join(repo, 'pkg/beta/beta.go'), 'package beta\n\nimport "example.com/m/pkg/alpha"\n\nvar B = alpha.A\n')
  git(repo, 'add', '-A')
  git(repo, 'commit', '-q', '-m', 'init')
  git(repo, 'checkout', '-q', '-b', 'feat')
  writeFileSync(join(repo, 'pkg/alpha/alpha.go'), 'package alpha\n\nconst A = 2\n')
  git(repo, 'commit', '-q', '-am', 'change')

  const r = runImpact(repo, 'main', 'feat')
  assert.equal(r.status, 0, r.stderr)
  const out = JSON.parse(r.stdout)
  // beta imports alpha, so it is affected even though nothing under it changed
  assert.deepEqual(out.packages, ['pkg/alpha', 'pkg/beta'])
  assert.deepEqual(out.testFiles, ['pkg/alpha/alpha_test.go'])
  assert.equal(r.stderr, '', 'a graph that was built has nothing to note')
})

test('impact falls back to the test files in the changed paths when no package graph exists', opts, () => {
  const repo = initRepo()
  mkdirSync(join(repo, 'src'))
  writeFileSync(join(repo, 'src/lib.ts'), 'v1\n')
  writeFileSync(join(repo, 'src/lib.test.ts'), 'v1\n')
  git(repo, 'add', '-A')
  git(repo, 'commit', '-q', '-m', 'init')
  git(repo, 'checkout', '-q', '-b', 'feat')
  writeFileSync(join(repo, 'src/lib.ts'), 'v2\n')
  writeFileSync(join(repo, 'src/lib.test.ts'), 'v2\n')
  git(repo, 'commit', '-q', '-am', 'change')

  const r = runImpact(repo, 'main', 'feat')
  // the fallback is still a usable answer, so the caller gets one rather than a failure
  assert.equal(r.status, 0, r.stderr)
  const out = JSON.parse(r.stdout)
  assert.deepEqual([...out.changed].sort(), ['src/lib.test.ts', 'src/lib.ts'])
  assert.deepEqual(out.packages, [])
  assert.deepEqual(out.testFiles, ['src/lib.test.ts'])
  // and stderr carries a one-line note saying the graph was not built
  assert.match(r.stderr, /\S/)
  assert.equal(r.stderr.trim().split('\n').length, 1)
})

test('impact answers exit 0 with a note when the repo or git itself is unusable', opts, () => {
  // --repo at a path that does not exist: the mapping is best effort, so a traceback and exit 1 would
  // break every caller that treats the answer as optional — the fallback contract holds even here
  const gone = join(scratch('sdlc-impact-'), 'nope')
  const r = runImpact(gone, 'main', 'feat')
  assert.equal(r.status, 0, r.stderr)
  const out = JSON.parse(r.stdout)
  assert.deepEqual([out.changed, out.testFiles, out.packages], [[], [], []])
  assert.match(r.stderr, /\S/)
  assert.equal(r.stderr.trim().split('\n').length, 1)
})

// ---------- janitor ----------
// The reaper the state-reader runs once per run. Scratch reaping happens in the REAL temp dir — the
// harness scratch root is itself an `sdlc-` dir under it, so directing the janitor there would delete
// every other test's fixtures — which is why these tests make their own dirs, age them by mtime, and
// clean up whatever survives.
const JANITOR = join(SKILL_DIR, 'janitor.py')
const runJanitor = (repo, ...args) =>
  spawnSync('python3', [JANITOR, '--repo', repo, ...args], { encoding: 'utf8' })
const agedDir = (name, litter = false) => {
  const dir = mkdtempSync(join(tmpdir(), name))
  if (litter) writeFileSync(join(dir, 'litter.txt'), 'stale scratch\n')
  // aging last: writing into the dir bumps its mtime, so the age is set after the contents
  const aged = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000)
  utimesSync(dir, aged, aged)
  return dir
}

test('the janitor reaps an old sdlc- scratch dir in the real temp dir and keeps a fresh one', opts, () => {
  const old = agedDir('sdlc-janitor-old-', true)
  const fresh = mkdtempSync(join(tmpdir(), 'sdlc-janitor-fresh-'))
  try {
    const r = runJanitor(fresh)
    assert.equal(r.status, 0, r.stderr)
    const out = JSON.parse(r.stdout)
    assert.deepEqual(Object.keys(out).sort(), ['notes', 'removedBranches', 'removedDirs'])
    assert.equal(typeof out.removedDirs, 'number')
    assert.ok(Array.isArray(out.removedBranches), 'removedBranches is a list')
    assert.ok(Array.isArray(out.notes), 'notes is a list')
    assert.ok(out.removedDirs >= 1, 'nothing was reaped')
    assert.equal(existsSync(old), false, 'the old scratch dir survived')
    assert.equal(existsSync(fresh), true, 'the fresh scratch dir was reaped')

    // --days raises the age bar: the 8-day-old dir below is within the window and the fresh one is
// not, so survival is compared relative to the dirs themselves rather than to a count that
// real-temp litter from other tests could upset
    const aged = agedDir('sdlc-janitor-dated-')
    try {
      const wider = runJanitor(fresh, '--days', '30')
      assert.equal(wider.status, 0, wider.stderr)
      assert.equal(existsSync(aged), true, 'a dir within the --days window was reaped')
      assert.equal(existsSync(fresh), true, 'the fresh dir was reaped by the wider window')
    } finally {
      rmSync(aged, { recursive: true, force: true })
    }
  } finally {
    rmSync(fresh, { recursive: true, force: true })
    rmSync(old, { recursive: true, force: true })
  }
})

test('the janitor reaps by janitorDays from config.json when --days is not given', opts, () => {
  const repo = fixture({ config: { janitorDays: 30 } })
  const aged = agedDir('sdlc-janitor-cfg-')
  const fresh = mkdtempSync(join(tmpdir(), 'sdlc-janitor-cfgfresh-'))
  try {
    // config.json says 30 days, so the 8-day-old dir survives where the default would reap it;
    // survival is asserted on the dirs themselves, not on a count real-temp litter could upset
    const r = runJanitor(repo)
    assert.equal(r.status, 0, r.stderr)
    assert.equal(existsSync(aged), true, 'config janitorDays was ignored')
    assert.equal(existsSync(fresh), true, 'a fresh dir was reaped')
  } finally {
    rmSync(aged, { recursive: true, force: true })
    rmSync(fresh, { recursive: true, force: true })
  }
})

test('the janitor deletes v-branches of finished and unknown slices and keeps live ones', opts, () => {
  const repo = fixture({
    slices: [
      slice('S-001', { status: 'done' }),
      slice('S-002', { status: 'in_progress' }),
      slice('S-003', { status: 'rejected' }),
      slice('S-004'),
      // a known slice whose row carries no status field is still known, so its branch is kept
      slice('S-005', { status: undefined }),
    ],
  })
  for (const b of ['sdlc/S-001-v1', 'sdlc/S-002-v1', 'sdlc/S-003-v1', 'sdlc/S-004-v1', 'sdlc/S-005-v1', 'sdlc/S-999-v1', 'sdlc/S-004-attempt-1-v1', 'sdlc/S-004', 'sdlc/run-1', 'sdlc/-v1', 'sdlc/S-001-vextra/nested']) {
    git(repo, 'branch', b)
  }
  const r = runJanitor(repo)
  assert.equal(r.status, 0, r.stderr)
  const out = JSON.parse(r.stdout)
  assert.deepEqual(out.removedBranches.sort(), ['sdlc/S-001-v1', 'sdlc/S-003-v1', 'sdlc/S-999-v1'])
  assert.deepEqual(out.notes, [])
  const left = git(repo, 'for-each-ref', '--format=%(refname:short)', 'refs/heads').split('\n').sort()
  // sdlc/-v1 has an empty id (the old crash shape) and the nested name is a foreign branch, not a
  // v-branch: neither is a ledger row, so neither is ever swept
  assert.deepEqual(left, ['main', 'sdlc/-v1', 'sdlc/S-001-vextra/nested', 'sdlc/S-002-v1', 'sdlc/S-004', 'sdlc/S-004-attempt-1-v1', 'sdlc/S-004-v1', 'sdlc/S-005-v1', 'sdlc/run-1'])
})

test('the janitor prunes a stale worktree registration before sweeping, so the branch is not pinned forever', opts, () => {
  // `git branch -D` refuses a branch whose worktree is registered, and a worktree deleted without
  // `git worktree remove` leaves that registration behind forever — the janitor would fail on the
  // same branch every round until a human pruned. The prune before the sweep is the self-heal.
  const repo = fixture({ slices: [slice('S-001', { status: 'done' })] })
  git(repo, 'branch', 'sdlc/S-001-v1')
  const wt = scratch('sdlc-wt-')
  git(repo, 'worktree', 'add', '-q', wt, 'sdlc/S-001-v1')
  rmSync(wt, { recursive: true, force: true })
  // the precondition: the stale registration is what blocks the delete, so the prune is what unblocks it
  assert.throws(() => git(repo, 'branch', '-D', 'sdlc/S-001-v1'), /used by worktree/)
  const r = runJanitor(repo)
  assert.equal(r.status, 0, r.stderr)
  assert.deepEqual(JSON.parse(r.stdout).removedBranches, ['sdlc/S-001-v1'])
  assert.equal(git(repo, 'branch', '--list', 'sdlc/S-001-v1').trim(), '')
})

test('the janitor notes missing or unreadable state instead of deleting, and still runs', opts, () => {
  // no .sdlc/ at all: the reaping is best effort, so exit 0 with a note
  const bare = initRepo()
  const r = runJanitor(bare)
  assert.equal(r.status, 0, r.stderr)
  const out = JSON.parse(r.stdout)
  assert.deepEqual(out.removedBranches, [])
  assert.equal(typeof out.removedDirs, 'number')
  assert.match(out.notes.join(' '), /slices\.json/)

  // an unparseable ledger deletes nothing
  const repo = fixture({ slices: [slice('S-001', { status: 'done' })] })
  writeFileSync(join(repo, '.sdlc', 'slices.json'), '{not json')
  git(repo, 'branch', 'sdlc/S-001-v1')
  const r2 = runJanitor(repo)
  assert.equal(r2.status, 0, r2.stderr)
  const out2 = JSON.parse(r2.stdout)
  assert.equal(git(repo, 'branch', '--list', 'sdlc/S-001-v1').trim(), 'sdlc/S-001-v1', 'an unparseable ledger deleted a branch')
  assert.match(out2.notes.join(' '), /slices\.json/)
})

// ---------- ste-check ----------
// The STE linter the prompts answer to. One clean line and one dirty line per rule ste-style.md
// states, plus the exemptions the prompts rely on — and the rule-source files themselves must pass,
// since they are written in the style they define.
const STE_CHECK = join(SKILL_DIR, 'ste-check.py')
const runSteCheck = (...files) => spawnSync('python3', [STE_CHECK, ...files], { encoding: 'utf8' })
const steSample = (name, text) => {
  const file = join(scratch('sdlc-ste-'), name)
  writeFileSync(file, text)
  return file
}

test('ste-check passes the rule sources it gates', opts, () => {
  const r = runSteCheck(join(SKILL_DIR, 'prompts', 'ste-style.md'), join(SKILL_DIR, 'prompts', '_common.md'))
  assert.equal(r.status, 0, r.stdout)
})

test('ste-check prints one file:line: rule — text line per violation and exits 1', opts, () => {
  const line = 'Run the tests, check the result, commit the branch.'
  const file = steSample('dirty.md', `${line}\n`)
  const r = runSteCheck(file)
  assert.equal(r.status, 1)
  assert.deepEqual(r.stdout.trim().split('\n'), [`${file}:1: multi-clause — ${line}`])
})

test('ste-check keeps the exempt lines clean', opts, () => {
  const clean = steSample('clean.md', [
    'Run the tests.',
    'The suite ran twice today.',
    'Adjust the value, then read the file again.',
    'The SDLC records every ADR in the decisions file.',
    'Never create or switch branches, commit, push or restart anything.',
    'The command `Run it! Please just make sure it is GREAT` stays unflagged.',
    'The <MAINROOT> input names the owner checkout.',
    '<summary>Case detail (n cases)</summary>',
    '<patch as JSON>',
    '# The heading SHOUTS and that is fine',
    '| Column | OTHER |',
    '```',
    'RUN EVERYTHING! please just make sure it is GREAT',
    '```',
    '',
  ].join('\n'))
  const r = runSteCheck(clean)
  assert.equal(r.status, 0, r.stdout)
})

test('ste-check flags each rule on its own line', opts, () => {
  const cases = [
    ['long-sentence', 'Send the report to the reviewer and the planner and the auditor and the gate and the tracker and the bar judge today.'],
    ['exclamation', 'Report the result now!'],
    ['all-caps', 'Never ship the API key in THIS file.'],
    ['all-caps', 'Read <WHOOSIS> from your inputs.'],
    ['all-caps', '<skill> THIS line opens with a raw placeholder.'],
    ['banned-word', 'Please run the suite.'],
    ['multi-clause', 'Run the tests, check the result, commit the branch.'],
  ]
  for (const [rule, line] of cases) {
    const file = steSample('dirty.md', `${line}\n`)
    const r = runSteCheck(file)
    assert.equal(r.status, 1, `${rule}: ${r.stdout}`)
    assert.deepEqual(r.stdout.trim().split('\n'), [`${file}:1: ${rule} — ${line}`], rule)
  }
})
