import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, mkdirSync, writeFileSync, chmodSync } from 'node:fs'
import { join } from 'node:path'

const KIT = '/Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/test/testkit/cli-runner.mjs'
const WT = process.env.VERIFY_WT
const { cliRunner } = await import(KIT)
const SKILL = join(WT, 'skills/sdlc')

const ledger = (rows) => rows.map(([id, status]) => (status === undefined ? { id } : { id, status }))
function setup({ format, slices, branches, files = {} }) {
  const r = cliRunner({ skillDir: SKILL })
  const cfg = format === undefined ? {} : { branchFormat: format }
  const repo = r.gitRepo({ files: { '.sdlc/config.json': cfg, '.sdlc/slices.json': slices, ...files }, branches })
  const tmp = r.dir('tmp')
  const run = () => r.run('janitor.py', ['--repo', repo], { env: { TMPDIR: tmp } })
  const refs = () => r.git(repo, 'for-each-ref', '--format=%(refname:short)', 'refs/heads').split('\n').sort()
  return { r, repo, run, refs }
}
const V = (id) => `${id}-v0-http-api-0`

test('verify cli: VS-1 default format sweeps finished and unknown verify branches only', () => {
  const keep = ['sdlc/S-002-v0-http-api-0', 'sdlc/S-004-v0-http-api-0', 'sdlc/S-005-v0-http-api-0', 'sdlc/S-004', 'sdlc/run-1', 'sdlc/S-004-attempt-1', 'sdlc/S-004-attempt-1-v0-http-api-0', 'sdlc/state-20261010000000', 'sdlc/M-1', 'sdlc/M-1-e2e', 'sdlc/-v1', 'sdlc/S-001-v1', 'sdlc/S-001-vextra/nested']
  const gone = ['sdlc/S-001-v0-http-api-0', 'sdlc/S-003-v0-http-api-0', 'sdlc/S-999-v0-http-api-0']
  const s = setup({ slices: ledger([['S-001', 'done'], ['S-002', 'in_progress'], ['S-003', 'rejected'], ['S-004', 'todo'], ['S-005']]), branches: [...keep, ...gone] })
  const t = s.run()
  assert.equal(t.status, 0)
  assert.deepEqual(t.json.removedBranches.sort(), gone.sort())
  const left = s.refs()
  for (const k of keep) assert.ok(left.includes(k), k)
  for (const g of gone) assert.ok(!left.includes(g), g)
  assert.ok(left.includes('main'))
  console.log(t.text())
})

test('verify cli: VS-1 other kinds with finished ids are kept', () => {
  const kinds = ['sdlc/S-001', 'sdlc/S-001-attempt-1', 'sdlc/run-3', 'sdlc/M-1', 'sdlc/M-1-e2e', 'sdlc/M-1-e2e-http-api', 'sdlc/state-20261010-000000']
  const s = setup({ slices: ledger([['S-001', 'done'], ['M-1', 'done']]), branches: kinds })
  const t = s.run()
  assert.equal(t.status, 0)
  assert.deepEqual(t.json.removedBranches, [])
  assert.ok(t.treeUnchanged)
})

test('verify cli: VS-2 unparseable, unicode, whitespace, nested and flag-like names stay', () => {
  const names = ['sdlc/S-001-v0-é-0', 'sdlc/Ś-001-v0-http-api-0x', 'sdlc/S-001-v0-http-api-0/extra', 'sdlc/-v0-http-api-0', 'other/S-001-v0-http-api-0', 'S-001-v0-http-api-0', 'sdlc/S-001-attempt-2-v1-http-api-0', 'sdlc/S-001-attempt-12-v0-a-1', 'sdlc/S-001-v0--0', 'feature-x']
  const s = setup({ slices: ledger([['S-001', 'done']]), branches: names })
  const before = s.refs()
  const t = s.run()
  assert.equal(t.status, 0)
  console.log(JSON.stringify(t.json))
  assert.deepEqual(t.json.removedBranches, [], JSON.stringify(t.json))
  assert.deepEqual(s.refs(), before)
})

test('verify cli: VS-3 custom format sweeps verify, spares run, attempt, slice, milestone and collisions', () => {
  const f = 'feature/sdlc/{name}'
  const gone = [`feature/sdlc/${V('S-001')}`, `feature/sdlc/${V('S-777')}`]
  const keep = ['feature/sdlc/run-1', 'feature/sdlc/S-001-attempt-1', 'feature/sdlc/S-001-attempt-1-v0-http-api-0', 'feature/sdlc/S-001', 'feature/sdlc/M-1', 'feature/sdlc/M-1-e2e', `feature/sdlc/${V('S-002')}`, `sdlc/${V('S-001')}`, `xfeature/sdlc/${V('S-001')}`, `feature/sdlcS-001-v0-http-api-0`]
  const s = setup({ format: f, slices: ledger([['S-001', 'done'], ['S-002', 'todo']]), branches: [...gone, ...keep] })
  const t = s.run()
  assert.equal(t.status, 0)
  console.log(JSON.stringify(t.json))
  assert.deepEqual(t.json.removedBranches.sort(), gone.sort())
  const left = s.refs()
  for (const k of keep) assert.ok(left.includes(k), k)
})

test('verify cli: VS-4 derived format leaves old-format verify branch; parse and list agree', () => {
  const s = setup({ format: 'feature/sdlc/{name}', slices: ledger([['S-001', 'done']]), branches: [`sdlc/${V('S-001')}`, 'sdlc/S-001'] })
  const t = s.run()
  assert.equal(t.status, 0)
  assert.deepEqual(t.json.removedBranches, [])
  assert.ok(s.refs().includes(`sdlc/${V('S-001')}`))
  const p = s.r.run('branches.py', ['parse', '--repo', s.repo, '--branch', 'sdlc/S-001'])
  console.log(p.text())
  assert.equal(p.status, 0)
  assert.ok(p.stdout.includes('null') || p.json === null || JSON.stringify(p.json).includes('null'), p.stdout)
  const l = s.r.run('branches.py', ['list', '--repo', s.repo, '--kind', 'slice'])
  console.log(l.text())
  assert.ok(!l.stdout.includes('sdlc/S-001'))
})

test('verify cli: VS-5 lowercase format resolves ids through ledger', () => {
  const f = 'feature/p-1-{name:lower}'
  const gone = ['feature/p-1-s-001-v0-http-api-0', 'feature/p-1-s-999-v0-http-api-0']
  const keep = ['feature/p-1-s-002-v0-http-api-0', 'feature/p-1-run-1', 'feature/p-1-s-001', 'feature/p-1-s-001-attempt-1']
  const s = setup({ format: f, slices: ledger([['S-001', 'done'], ['S-002', 'todo']]), branches: [...gone, ...keep] })
  const t = s.run()
  assert.equal(t.status, 0)
  console.log(JSON.stringify(t.json))
  assert.deepEqual(t.json.removedBranches.sort(), gone.sort())
  const left = s.refs()
  for (const k of keep) assert.ok(left.includes(k), k)
})

test('verify cli: VS-5 mixed-case ledger id and uppercase branch under lower format', () => {
  const f = 'feature/p-1-{name:lower}'
  const s = setup({ format: f, slices: ledger([['S-001', 'done'], ['S-Ab', 'done'], ['S-003', 'todo']]), branches: ['feature/p-1-s-ab-v0-http-api-0', 'FEATURE/P-1-S-001-V0-HTTP-API-0', 'feature/p-1-s-003-v0-http-api-0'] })
  const t = s.run()
  assert.equal(t.status, 0)
  console.log(JSON.stringify(t.json))
  assert.ok(t.json.removedBranches.includes('feature/p-1-s-ab-v0-http-api-0'))
  assert.ok(s.refs().includes('feature/p-1-s-003-v0-http-api-0'))
})

const unusable = [
  ['format without placeholder', { format: 'feature/no-placeholder' }],
  ['format with two placeholders', { format: 'a/{name}/{name}' }],
  ['config malformed', { rawConfig: '{not json' }],
]
for (const [label, o] of unusable) {
  test(`verify cli: VS-6 ${label} notes and deletes nothing`, () => {
    const branches = ['sdlc/S-001-v0-http-api-0', 'sdlc/S-999-v0-http-api-0']
    const files = o.rawConfig !== undefined ? { '.sdlc/config.json': o.rawConfig } : {}
    const s = setup({ format: o.format, slices: ledger([['S-001', 'done']]), branches, files })
    const before = s.refs()
    const t = s.run()
    console.log(label, t.stdout.trim(), t.stderr.trim())
    assert.equal(t.status, 0)
    assert.deepEqual(t.json.removedBranches, [])
    assert.deepEqual(s.refs(), before)
    assert.ok(t.json.notes.length >= 1, t.stdout)
  })
}

const ledgers = [
  ['missing ledger', null],
  ['malformed ledger', '{oops'],
  ['object ledger', '{"id":"S-001","status":"done"}'],
  ['null ledger', 'null'],
  ['string ledger', '"x"'],
  ['empty file', ''],
]
for (const [label, content] of ledgers) {
  test(`verify cli: VS-6 ${label} deletes nothing, exits 0`, () => {
    const s = setup({ slices: [], branches: ['sdlc/S-001-v0-http-api-0'], files: content === null ? {} : { '.sdlc/slices.json': content } })
    if (content === null) s.r.exec('rm', [join(s.repo, '.sdlc/slices.json')])
    const before = s.refs()
    const t = s.run()
    console.log(label, t.stdout.trim(), t.stderr.trim())
    assert.equal(t.status, 0)
    assert.deepEqual(s.refs(), before, t.stdout)
  })
}

test('verify cli: VS-6 unreadable ledger deletes nothing', () => {
  const s = setup({ slices: ledger([['S-001', 'done']]), branches: ['sdlc/S-001-v0-http-api-0'] })
  s.r.chmod(join(s.repo, '.sdlc/slices.json'), 0)
  const t = s.run()
  s.r.chmod(join(s.repo, '.sdlc/slices.json'), 0o644)
  console.log(t.stdout.trim())
  assert.equal(t.status, 0)
  assert.deepEqual(t.json.removedBranches, [])
  assert.ok(t.json.notes.length >= 1)
})

test('verify cli: VS-6 scratch reaping and worktree prune still run when the format is unusable', () => {
  const r = cliRunner({ skillDir: SKILL })
  const repo = r.gitRepo({ files: { '.sdlc/config.json': { branchFormat: 'bad' }, '.sdlc/slices.json': ledger([['S-001', 'done']]) }, branches: ['sdlc/S-001-v0-http-api-0'] })
  const tmp = r.dir('tmp')
  const old = join(tmp, 'sdlc-old-scratch')
  mkdirSync(old)
  writeFileSync(join(old, 'f'), 'x')
  const past = new Date(Date.now() - 30 * 86400 * 1000)
  r.exec('python3', ['-c', `import os,sys;os.utime(sys.argv[1],(${past.getTime() / 1000},${past.getTime() / 1000}))`, old])
  const wt = r.dir('wtparent') + '/wt'
  r.git(repo, 'worktree', 'add', '-b', 'sdlc/S-009-v0-x-0', wt)
  r.exec('rm', ['-rf', wt])
  const t = r.run('janitor.py', ['--repo', repo], { env: { TMPDIR: tmp } })
  console.log(t.text())
  assert.equal(t.status, 0)
  assert.equal(t.json.removedDirs, 1)
  assert.deepEqual(t.json.removedBranches, [])
  assert.ok(t.json.notes.some((n) => /format/.test(n)))
})

test('verify cli: VS-1 stale worktree pin on a finished verify branch is pruned and the branch removed', () => {
  const r = cliRunner({ skillDir: SKILL })
  const repo = r.gitRepo({ files: { '.sdlc/config.json': {}, '.sdlc/slices.json': ledger([['S-001', 'done']]) } })
  const wt = r.dir('wtp') + '/wt'
  r.git(repo, 'worktree', 'add', '-b', 'sdlc/S-001-v0-http-api-0', wt)
  r.exec('rm', ['-rf', wt])
  const t = r.run('janitor.py', ['--repo', repo], { env: { TMPDIR: r.dir('tmp') } })
  assert.equal(t.status, 0)
  assert.deepEqual(t.json.removedBranches, ['sdlc/S-001-v0-http-api-0'])
})

test('verify cli: idempotent second run removes nothing more', () => {
  const s = setup({ slices: ledger([['S-001', 'done']]), branches: ['sdlc/S-001-v0-http-api-0', 'sdlc/S-001'] })
  s.run()
  const t2 = s.run()
  assert.equal(t2.status, 0)
  assert.deepEqual(t2.json.removedBranches, [])
  assert.ok(t2.treeUnchanged)
})

test('verify cli: --help exits 0 and unknown flag does not crash the best-effort wrapper', () => {
  const r = cliRunner({ skillDir: SKILL })
  const h = r.run('janitor.py', ['--help'])
  assert.equal(h.status, 0)
  const u = r.run('janitor.py', ['--bogus'])
  console.log(u.text())
})

test('verify cli: path with spaces and unicode repo', () => {
  const r = cliRunner({ skillDir: SKILL })
  const repo = r.gitRepo({ name: 'rép o with space', files: { '.sdlc/config.json': {}, '.sdlc/slices.json': ledger([['S-001', 'done']]) }, branches: ['sdlc/S-001-v0-http-api-0'] })
  const t = r.run('janitor.py', ['--repo', repo], { env: { TMPDIR: r.dir('tmp') } })
  assert.equal(t.status, 0)
  assert.deepEqual(t.json.removedBranches, ['sdlc/S-001-v0-http-api-0'])
})

test('verify cli: source holds no V_BRANCH or V_ID', () => {
  const src = readFileSync(join(SKILL, 'janitor.py'), 'utf8')
  assert.ok(!/V_BRANCH|V_ID/.test(src))
})

test('verify cli: observation (seed) nested-format collision id is swept as unknown', () => {
  const b = `feature/sdlc/feature/sdlc/${V('S-001')}`
  const s = setup({ format: 'feature/sdlc/{name}', slices: ledger([['S-001', 'done']]), branches: [b] })
  const t = s.run()
  assert.deepEqual(t.json.removedBranches, [b])
})

test('verify cli: observation (seed) brace and whitespace formats give no note', () => {
  for (const f of ['a/{x}-{name}', 'a b/{name}']) {
    const s = setup({ format: f, slices: ledger([['S-001', 'done']]), branches: [`sdlc/${V('S-001')}`] })
    const t = s.run()
    assert.equal(t.status, 0)
    assert.deepEqual(t.json.removedBranches, [])
    assert.deepEqual(t.json.notes, [])
  }
})

test('verify cli: observation (seed) brace format deletes a matching verify branch', () => {
  const b = `a/{x}-${V('S-999')}`
  const s = setup({ format: 'a/{x}-{name}', slices: ledger([['S-001', 'done']]), branches: [b] })
  const t = s.run()
  console.log(t.stdout)
  assert.deepEqual(t.json.removedBranches, [b])
})

test('verify cli: observation (seed) non-string format falls back to default', () => {
  const s = setup({ slices: ledger([['S-001', 'done']]), branches: [`sdlc/${V('S-001')}`], files: { '.sdlc/config.json': '{"branchFormat": 5}' } })
  const t = s.run()
  assert.deepEqual(t.json.removedBranches, [`sdlc/${V('S-001')}`])
})

test('verify cli: observation (seed) non-object config stops the janitor before scratch reaping', () => {
  const r = cliRunner({ skillDir: SKILL })
  const repo = r.gitRepo({ files: { '.sdlc/config.json': '[1,2]', '.sdlc/slices.json': ledger([['S-001', 'done']]) }, branches: [`sdlc/${V('S-001')}`] })
  const tmp = r.dir('tmp')
  const old = join(tmp, 'sdlc-old-scratch')
  mkdirSync(old)
  const past = Date.now() / 1000 - 30 * 86400
  r.exec('python3', ['-c', 'import os,sys;os.utime(sys.argv[1],(float(sys.argv[2]),float(sys.argv[2])))', old, String(past)])
  const t = r.run('janitor.py', ['--repo', repo], { env: { TMPDIR: tmp } })
  console.log(t.stdout)
  assert.equal(t.status, 0)
  assert.deepEqual(t.json.removedBranches, [])
  assert.equal(t.json.removedDirs, 0)
  assert.ok(t.json.notes.some((n) => /stopped early/.test(n)))
})

test('verify cli: observation (seed) unusable format skips the worktree prune', () => {
  const r = cliRunner({ skillDir: SKILL })
  const repo = r.gitRepo({ files: { '.sdlc/config.json': { branchFormat: 'bad' }, '.sdlc/slices.json': ledger([['S-001', 'done']]) } })
  const wt = r.dir('wtp') + '/wt'
  r.git(repo, 'worktree', 'add', '-b', 'sdlc/S-009-v0-x-0', wt)
  r.exec('rm', ['-rf', wt])
  r.run('janitor.py', ['--repo', repo], { env: { TMPDIR: r.dir('tmp') } })
  assert.equal(r.git(repo, 'worktree', 'list').split('\n').length, 2)
})

test('verify cli: observation (seed) ledger of non-objects sweeps every verify branch', () => {
  const s = setup({ slices: [1, 'a', null], branches: [`sdlc/${V('S-001')}`] })
  const t = s.run()
  assert.deepEqual(t.json.removedBranches, [`sdlc/${V('S-001')}`])
})
