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

function fixture({ config = {}, reqs = [], slices = [], milestones = [] } = {}) {
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
  return repo
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
  })
  git(repo, 'branch', 'sdlc/run-1')
  const r = call(STATE, repo, ['patch-slice', '--slice', 'S-014'], { status: 'in_progress' })
  assert.equal(r.code, 0)
  // the milestone branch was created from the run branch...
  assert.equal(git(repo, 'branch', '--list', 'sdlc/M-2').trim(), 'sdlc/M-2')
  // ...and the slice was cut from the milestone branch, not from main or the run branch
  assert.equal(git(repo, 'merge-base', '--is-ancestor', 'sdlc/M-2', 'sdlc/S-014'), '')
  assert.equal(git(repo, 'rev-parse', 'sdlc/M-2'), git(repo, 'rev-parse', 'sdlc/S-014^'))
})

test('stack mode cuts an audit fix slice from the run branch, since it belongs to no milestone', opts, () => {
  const repo = fixture({
    config: { gitMode: 'stack', defaultBranch: 'main', runBranch: 'sdlc/run-1' },
    slices: [slice('S-fix-1', { kind: 'fix' })],
    milestones: [{ id: 'M-1', title: 'Done', status: 'verified', slices: [], fixSlices: [] }],
  })
  git(repo, 'branch', 'sdlc/run-1')
  const r = call(STATE, repo, ['patch-slice', '--slice', 'S-fix-1'], { status: 'in_progress' })
  assert.equal(r.code, 0)
  assert.equal(git(repo, 'rev-parse', 'sdlc/run-1'), git(repo, 'rev-parse', 'sdlc/S-fix-1^'))
  assert.equal(git(repo, 'branch', '--list', 'sdlc/M-1').trim(), '')
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
    slices: [slice('S-014'), slice('S-015', { dependsOn: ['S-014'], status: 'awaiting-merge', pr: 'u' })],
    milestones: [{ id: 'M-2', title: 'Sessions', status: 'pending', slices: ['S-014', 'S-015'], fixSlices: [] }],
  })
  git(repo, 'branch', 'sdlc/run-1')
  git(repo, 'branch', 'sdlc/M-2')
  git(repo, 'branch', 'sdlc/S-014', 'sdlc/M-2')
  assert.equal(call(STATE, repo, ['patch-slice', '--slice', 'S-015'], { status: 'in_progress' }).code, 0)
  assert.equal(git(repo, 'rev-parse', 'sdlc/S-014'), git(repo, 'rev-parse', 'sdlc/S-015^'))
})

test('pr, direct and mr mode are untouched by the stack arm', opts, () => {
  for (const mode of ['pr', 'direct', 'mr']) {
    const repo = fixture({ config: { gitMode: mode, defaultBranch: 'main', runBranch: '' }, slices: [slice('S-001')] })
    assert.equal(call(STATE, repo, ['patch-slice', '--slice', 'S-001'], { status: 'in_progress' }).code, 0)
    assert.equal(git(repo, 'rev-parse', 'main'), git(repo, 'rev-parse', 'sdlc/S-001^'), `${mode} mode changed its base`)
  }
})
