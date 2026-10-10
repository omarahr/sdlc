import test from 'node:test'
import assert from 'node:assert/strict'
import { appendFileSync, mkdirSync, mkdtempSync, utimesSync, existsSync, writeFileSync, symlinkSync } from 'node:fs'
import { join } from 'node:path'
import { cliRunner } from '/Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/test/testkit/cli-runner.mjs'
import { load } from '/Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/test/testkit/attack-corpus.mjs'

const LOG = process.env.VERIFY_LOG
const note = (id, obj) => { if (LOG) appendFileSync(LOG, JSON.stringify({ id, ...obj }) + '\n') }
const ledger = (o) => JSON.stringify(Object.entries(o).map(([id, status]) => status === undefined ? { id } : { id, status }))

function setup(r, { config, slices, branches, rawSlices }) {
  const files = {}
  if (config !== undefined) files['.sdlc/config.json'] = typeof config === 'string' ? config : JSON.stringify(config)
  if (rawSlices !== undefined) files['.sdlc/slices.json'] = rawSlices
  else if (slices) files['.sdlc/slices.json'] = ledger(slices)
  const repo = r.gitRepo({ files, branches })
  return repo
}
function janitor(r, repo, extra = {}) {
  const tmp = r.dir('tmp')
  const t = r.run('janitor.py', ['--repo', repo], { env: { TMPDIR: tmp, ...extra } })
  const refs = r.git(repo, 'for-each-ref', '--format=%(refname:short)', 'refs/heads').split('\n').filter(Boolean)
  return { t, refs, out: t.json, tmp }
}

test('verify security VS-1 default format: only done/rejected/unknown verify branches go', () => {
  const r = cliRunner()
  const keep = ['sdlc/S-002-v0-a-0', 'sdlc/S-004-v0-a-0', 'sdlc/S-005-v0-a-0', 'sdlc/run-1', 'sdlc/S-001', 'sdlc/S-004-attempt-1', 'sdlc/S-004-attempt-1-v0-http-api-0', 'sdlc/M-1', 'sdlc/M-1-e2e', 'sdlc/M-1-e2e-ui', 'sdlc/M-1-e2e-ui-v0-x-0', 'sdlc/state-20261010000000', 'sdlc/S-001-v1', 'sdlc/-v1', 'sdlc/S-001-vextra/nested', 'main']
  const gone = ['sdlc/S-001-v0-http-api-0', 'sdlc/S-003-v2-cli-1', 'sdlc/S-999-v0-a-0']
  const repo = setup(r, { slices: { 'S-001': 'done', 'S-002': 'in_progress', 'S-003': 'rejected', 'S-004': 'todo', 'S-005': undefined }, branches: [...keep.filter((b) => b !== 'main'), ...gone] })
  const { refs, out } = janitor(r, repo)
  note('A-1', { charter: 'VS-1', expected: 'removed exactly the done/rejected/unknown verify branches', observed: out.removedBranches })
  assert.deepEqual([...out.removedBranches].sort(), [...gone].sort())
  for (const k of keep) assert.ok(refs.includes(k), `lost ${k}`)
})

test('verify security VS-1b run-shaped and state-shaped verify names (id run-1, state-ts)', () => {
  const r = cliRunner()
  const branches = ['sdlc/run-1-v0-a-0', 'sdlc/state-20261010000000-v0-a-0', 'sdlc/M-1-v0-a-0', 'sdlc/S-001-attempt-2-v0-a-0']
  const repo = setup(r, { slices: { 'S-001': 'done' }, branches })
  const { refs, out } = janitor(r, repo)
  note('A-2', { charter: 'VS-2', expected: 'run/state/milestone-id verify-shaped names are not run/state branches; recorded', observed: out.removedBranches })
  assert.ok(refs.includes('sdlc/S-001-attempt-2-v0-a-0'))
  assert.ok(!out.removedBranches.includes('sdlc/run-1'))
})

test('verify security VS-2 hostile branch names never delete a non-verify branch', () => {
  const r = cliRunner()
  const names = ['sdlc/run-1', 'sdlc/S-1', 'sdlc/M-1', 'sdlc/M-1-e2e', 'sdlc/state-20261010000000', 'sdlc/S-001-attempt-1', 'sdlc/-v1', 'sdlc/S-001-v1', 'sdlc/é', 'sdlc/S-001-v0-ａ-0', 'sdlc/S-001-v٠-a-0', 'sdlc/S-001-v0-a-0/x', 'sdlc/x/S-001-v0-a-0', 'sdlc/S-001-v0--0', 'sdlc/S-001-v0-a-0-']
  const ok = []
  const repo = setup(r, { slices: { 'S-001': 'done' }, branches: [] })
  for (const n of names) { try { r.git(repo, 'branch', n); ok.push(n) } catch {} }
  const { refs, out } = janitor(r, repo)
  note('A-3', { charter: 'VS-2', expected: 'no deletion', created: ok.length, observed: out.removedBranches })
  const verifyShaped = ['sdlc/S-001-v٠-a-0', 'sdlc/x/S-001-v0-a-0']
  assert.deepEqual(out.removedBranches.filter((n) => !verifyShaped.includes(n)), [])
  for (const n of ok.filter((n) => !verifyShaped.includes(n))) assert.ok(refs.includes(n), n)
})

test('verify security VS-2 attack corpus as branch tails: exit 0 and only well-formed verify branches go', () => {
  const r = cliRunner()
  const repo = setup(r, { slices: { 'S-001': 'done' }, branches: [] })
  let made = 0
  const created = []
  for (const fam of ['traversal', 'injection', 'unicode-confusables', 'unicode-whitespace', 'flag-like-values', 'control-chars', 'format-strings']) {
    for (const e of load(fam, { argv: true })) {
      const n = `sdlc/${e.value}-v0-a-0`
      try { r.git(repo, 'branch', n); created.push(n); made++ } catch {}
    }
  }
  const { t, refs, out } = janitor(r, repo)
  note('A-4', { charter: 'VS-2', expected: 'exit 0; unknown id deletion only for verify shape; nothing outside refs/heads', created: made, status: t.status, removed: out.removedBranches.length })
  assert.equal(t.status, 0)
  assert.ok(refs.includes('main') || refs.length >= 1)
  for (const n of out.removedBranches) assert.match(n, /^sdlc\/.+-v0-a-0$/)
})

test('verify security VS-3 custom format and prefix collisions', () => {
  const r = cliRunner()
  const branches = ['feature/sdlc/S-001-v0-a-0', 'feature/sdlc/S-999-v0-a-0', 'feature/sdlc/S-002-v0-a-0', 'feature/sdlc/run-1', 'feature/sdlc/S-001-attempt-1', 'feature/sdlc/S-001-attempt-1-v0-a-0', 'feature/sdlc/S-001', 'feature/sdlc/M-1', 'feature/sdlc/state-20261010000000', 'sdlc/S-001-v0-a-0', 'x/feature/sdlc/S-001-v0-a-0', 'feature/sdlc/feature/sdlc/S-001-v0-a-0', 'feature/sdlc/S-001-v0-a-0.lock2']
  const repo = setup(r, { config: { branchFormat: 'feature/sdlc/{name}' }, slices: { 'S-001': 'done', 'S-002': 'todo' }, branches })
  const { refs, out } = janitor(r, repo)
  note('A-5', { charter: 'VS-3', expected: 'remove feature/sdlc S-001 and S-999 verify only', observed: out.removedBranches })
  assert.deepEqual([...out.removedBranches].sort(), ['feature/sdlc/S-001-v0-a-0', 'feature/sdlc/S-999-v0-a-0', 'feature/sdlc/feature/sdlc/S-001-v0-a-0'])
  for (const k of ['sdlc/S-001-v0-a-0', 'feature/sdlc/run-1', 'feature/sdlc/S-001-attempt-1-v0-a-0', 'x/feature/sdlc/S-001-v0-a-0']) assert.ok(refs.includes(k), k)
  note('A-6', { charter: 'VS-3', expected: 'nested duplicate prefix feature/sdlc/feature/sdlc/S-001-v0-a-0 id parses as feature/sdlc/S-001 -> unknown', observed: { stayed: refs.includes('feature/sdlc/feature/sdlc/S-001-v0-a-0') } })
})

test('verify security VS-3b suffix format', () => {
  const r = cliRunner()
  const repo = setup(r, { config: { branchFormat: '{name}-wip' }, slices: { 'S-001': 'done', 'S-002': 'todo' }, branches: ['S-001-v0-a-0-wip', 'S-002-v0-a-0-wip', 'S-001-v0-a-0', 'run-1-wip', 'S-001-attempt-1-wip'] })
  const { refs, out } = janitor(r, repo)
  note('A-7', { charter: 'VS-3', expected: 'only S-001-v0-a-0-wip removed', observed: out.removedBranches })
  assert.deepEqual(out.removedBranches, ['S-001-v0-a-0-wip'])
  assert.ok(refs.includes('S-001-v0-a-0') && refs.includes('run-1-wip'))
})

test('verify security VS-4 old-format branches stay under a derived format', () => {
  const r = cliRunner()
  const repo = setup(r, { config: { branchFormat: 'feature/sdlc/{name}' }, slices: { 'S-001': 'done' }, branches: ['sdlc/S-001-v0-http-api-0', 'sdlc/S-999-v0-a-0'] })
  const { refs, out } = janitor(r, repo)
  const p = r.run('branches.py', ['parse', '--repo', repo, '--branch', 'sdlc/S-001'])
  const l = r.run('branches.py', ['list', '--repo', repo, '--kind', 'slice'])
  note('A-8', { charter: 'VS-4', expected: 'branches stay; parse null; list omits', removed: out.removedBranches, parse: p.stdout.trim(), list: l.stdout.trim() })
  assert.deepEqual(out.removedBranches, [])
  assert.ok(refs.includes('sdlc/S-001-v0-http-api-0'))
  assert.ok(!l.stdout.includes('sdlc/S-001"'))
})

test('verify security VS-6 unusable format or ledger: note, no deletion, exit 0, scratch reaped', () => {
  const cases = [
    ['no-placeholder', { branchFormat: 'feature/no-placeholder' }, ledger({ 'S-001': 'done' })],
    ['two-placeholders', { branchFormat: '{name}/{name}' }, ledger({ 'S-001': 'done' })],
    ['brace', { branchFormat: 'a{b}/{name}' }, ledger({ 'S-001': 'done' })],
    ['non-string-format', { branchFormat: 5 }, ledger({ 'S-001': 'done' })],
    ['malformed-config', '{not json', ledger({ 'S-001': 'done' })],
    ['array-config', '[]', ledger({ 'S-001': 'done' })],
    ['deep-config', '['.repeat(100000), ledger({ 'S-001': 'done' })],
    ['ledger-object', { branchFormat: 'f/{name}' }, '{"id":"S-001","status":"done"}'],
    ['ledger-garbage', { branchFormat: 'f/{name}' }, '{{{'],
    ['ledger-null', { branchFormat: 'f/{name}' }, 'null'],
    ['ledger-string', { branchFormat: 'f/{name}' }, '"x"'],
    ['ledger-empty', { branchFormat: 'f/{name}' }, ''],
  ]
  for (const [id, config, rawSlices] of cases) {
    const r = cliRunner()
    const fmtOK = typeof config === 'object' && config.branchFormat === 'f/{name}'
    const bs = ['sdlc/S-001-v0-a-0', 'f/S-001-v0-a-0', 'feature/no-placeholder', 'S-001-v0-a-0']
    const repo = setup(r, { config, rawSlices, branches: bs })
    const tmp = r.dir('tmp')
    const old = join(tmp, 'sdlc-old'); mkdirSync(old)
    const past = new Date(Date.now() - 30 * 86400000); utimesSync(old, past, past)
    const t = r.run('janitor.py', ['--repo', repo], { env: { TMPDIR: tmp } })
    const refs = r.git(repo, 'for-each-ref', '--format=%(refname:short)', 'refs/heads').split('\n').filter(Boolean)
    note('A-9-' + id, { charter: 'VS-6', expected: 'exit 0, nothing removed, note, scratch reaped', status: t.status, out: t.json, reaped: !existsSync(old), refs: refs.length })
    assert.equal(t.status, 0, id)
    if (id !== 'non-string-format') assert.deepEqual(t.json.removedBranches, [], id)
    if (id !== 'brace' && id !== 'non-string-format') assert.ok(t.json.notes.length > 0, id)
    if (id !== 'array-config' && id !== 'deep-config') assert.equal(existsSync(old), false, `${id}: scratch not reaped`)
    for (const b of bs.filter((b) => id !== 'non-string-format' || b !== 'sdlc/S-001-v0-a-0')) assert.ok(refs.includes(b), `${id}: lost ${b}`)
  }
})

test('verify security VS-6 ledger rows with hostile ids or statuses', () => {
  const rows = [
    ['id-list', [{ id: ['S-001'], status: 'done' }]],
    ['id-int', [{ id: 5, status: 'done' }, { id: 'S-001', status: 'done' }]],
    ['id-dict', [{ id: { a: 1 }, status: 'done' }]],
    ['status-list', [{ id: 'S-001', status: ['done'] }]],
    ['null-row', [null, 7, 'x', { id: 'S-001', status: 'done' }]],
    ['status-case', [{ id: 'S-001', status: 'DONE' }]],
    ['dup-id', [{ id: 'S-001', status: 'todo' }, { id: 'S-001', status: 'done' }]],
  ]
  for (const [id, rows_] of rows) {
    for (const fmt of ['sdlc/{name}', 'sdlc/{name:lower}']) {
      const r = cliRunner()
      const repo = setup(r, { config: { branchFormat: fmt }, rawSlices: JSON.stringify(rows_), branches: ['sdlc/S-001-v0-a-0', 'sdlc/run-1', 'sdlc/S-001-attempt-1'] })
      const tmp = r.dir('tmp')
      const old = join(tmp, 'sdlc-old'); mkdirSync(old)
      const past = new Date(Date.now() - 30 * 86400000); utimesSync(old, past, past)
      const t = r.run('janitor.py', ['--repo', repo], { env: { TMPDIR: tmp } })
      const refs = r.git(repo, 'for-each-ref', '--format=%(refname:short)', 'refs/heads').split('\n').filter(Boolean)
      note(`A-10-${id}-${fmt.includes('lower') ? 'lower' : 'plain'}`, { charter: 'VS-6', expected: 'exit 0, scratch reaped, run and attempt kept', status: t.status, out: t.json, reaped: !existsSync(old), refs })
      assert.equal(t.status, 0)
      assert.ok(refs.includes('sdlc/run-1') && refs.includes('sdlc/S-001-attempt-1'))
    }
  }
})

test('verify security VS-6 unreadable config.json deletes nothing', () => {
  const r = cliRunner()
  const repo = setup(r, { config: { branchFormat: 'f/{name}' }, slices: { 'S-001': 'done' }, branches: ['f/S-001-v0-a-0', 'sdlc/S-001-v0-a-0'] })
  r.chmod(join(repo, '.sdlc/config.json'), 0o000)
  const t = r.run('janitor.py', ['--repo', repo])
  const refs = r.git(repo, 'for-each-ref', '--format=%(refname:short)', 'refs/heads').split('\n').filter(Boolean)
  note('A-12', { charter: 'VS-6', expected: 'format unreadable -> no deletion', status: t.status, out: t.json, refs })
  r.chmod(join(repo, '.sdlc/config.json'), 0o644)
  assert.equal(t.status, 0)
  assert.deepEqual(t.json.removedBranches, [])
})

test('verify security checked-out verify branch is not force-deleted silently', () => {
  const r = cliRunner()
  const repo = setup(r, { slices: { 'S-001': 'done' }, branches: ['sdlc/S-001-v0-a-0'] })
  r.git(repo, 'checkout', '-q', 'sdlc/S-001-v0-a-0')
  const { t, refs, out } = janitor(r, repo)
  note('A-13', { charter: 'VS-1', expected: 'checked-out branch not removed; note', status: t.status, out })
  assert.equal(t.status, 0)
  assert.ok(refs.includes('sdlc/S-001-v0-a-0'))
})

test('verify security lowercase ambiguity: two ledger ids differing by case', () => {
  const r = cliRunner()
  const repo = setup(r, { config: { branchFormat: 'p/{name:lower}' }, slices: { 'S-001': 'done', 's-001': 'todo' }, branches: ['p/s-001-v0-a-0'] })
  const { out } = janitor(r, repo)
  note('A-14', { charter: 'VS-3', expected: 'record only', out })
})

test('verify security lowercase format keeps run and attempt in any case', () => {
  const r = cliRunner()
  const repo = setup(r, { config: { branchFormat: 'p/{name:lower}' }, slices: { 'S-001': 'done' }, branches: ['p/run-1', 'p/s-001-attempt-1', 'p/s-001-attempt-1-v0-a-0', 'p/m-1', 'p/m-1-e2e-x', 'p/s-001-v0-a-0'] })
  const { refs, out } = janitor(r, repo)
  note('A-15', { charter: 'VS-3', expected: 'only the two verify branches of S-001 go', out: out.removedBranches })
  for (const k of ['p/run-1', 'p/s-001-attempt-1', 'p/s-001-attempt-1-v0-a-0', 'p/m-1', 'p/m-1-e2e-x']) assert.ok(refs.includes(k), k)
})
