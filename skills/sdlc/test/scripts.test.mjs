import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync, spawn } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { SKILL_DIR } from './harness.mjs'

const STATE = join(SKILL_DIR, 'state-write.py')
const RECEIPT = join(SKILL_DIR, 'suite-receipt.py')
let python = true
try { execFileSync('python3', ['--version']) } catch { python = false }
const opts = { skip: !python && 'python3 not installed' }

const git = (repo, ...args) => execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8' }).trim()
const json = (repo, name) => JSON.parse(readFileSync(join(repo, '.sdlc', name), 'utf8'))
const req = (id, status = 'todo', extra = {}) => ({ id, specRef: '§1', quote: `quote ${id}`, acceptance: `check ${id}`, status, flags: [], ...extra })
const slice = (id, extra = {}) => ({ id, title: `Slice ${id}`, requirements: [], dependsOn: [], kind: 'spec', status: 'todo', phase: 'plan', counters: { planRevisions: 0, fixRounds: 0, ladderStep: 0, parkCycles: 0 }, ...extra })

// the bare remote behind a fixture({ remote: true }) repo, for tests that need a second clone
const remotes = new Map()

function fixture({ config = {}, reqs = [], slices = [], milestones = [], remote = false } = {}) {
  const repo = mkdtempSync(join(tmpdir(), 'sdlc-scripts-'))
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
    const bare = mkdtempSync(join(tmpdir(), 'sdlc-remote-'))
    git(bare, 'init', '-q', '--bare', '-b', 'main', bare)
    git(repo, 'remote', 'add', 'origin', bare)
    git(repo, 'push', '-q', '-u', 'origin', 'main')
    remotes.set(repo, bare)
  }
  return repo
}

// a second clone of the remote, so a test can move origin/main without touching the repo under test
function publisher(bare) {
  const pub = mkdtempSync(join(tmpdir(), 'sdlc-pub-'))
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
  // config.json is written by an agent, so nothing but this check constrains gitMode to the four modes.
  // An unrecognised one reaches no arm of ensure_slice_branch and behaves like direct: a slice committed to
  // the default branch, with no pull request and no push — the one thing stack mode exists to prevent.
  for (const mode of ['stak', 'STACK', 'PullRequest']) {
    const repo = fixture({ config: { gitMode: mode, defaultBranch: 'main', runBranch: 'sdlc/run-1' }, slices: [slice('S-014')], milestones: [{ id: 'M-2', status: 'pending', slices: ['S-014'], fixSlices: [] }] })
    const r = call(STATE, repo, ['patch-slice', '--slice', 'S-014'], { status: 'in_progress' })
    assert.equal(r.code, 2, `${mode} must not be silently accepted`)
    assert.match(r.out.error, new RegExp(mode))
    assert.match(r.out.error, /pr, direct, mr, stack/)
    // nothing was committed and no slice branch was cut, so the slice cannot have landed on main
    assert.equal(git(repo, 'branch', '--list', 'sdlc/S-014').trim(), '')
    assert.equal(git(repo, 'branch', '--list', 'sdlc/M-2').trim(), '')
    assert.equal(json(repo, 'slices.json')[0].status, 'todo')
    assert.equal(git(repo, 'rev-parse', 'main'), git(repo, 'rev-parse', 'HEAD'))
  }
  // the four known modes are still accepted
  for (const mode of ['pr', 'direct', 'mr', 'stack']) {
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
