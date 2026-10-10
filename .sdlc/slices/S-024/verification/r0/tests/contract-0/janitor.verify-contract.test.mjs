import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { join } from 'node:path'

const WT = process.env.WT
const SKILL = join(WT, 'skills/sdlc')
const { cliRunner } = await import(join(SKILL, 'test/testkit/cli-runner.mjs'))
const { rng, defaultSeed, callPython } = await import(join(SKILL, 'test/testkit/property.mjs'))
const BRANCHES = join(SKILL, 'branches.py')
const JANITOR = join(SKILL, 'janitor.py')

const ledger = (rows) => JSON.stringify(rows.map(([id, status]) => (status === undefined ? { id } : { id, status })))
const refs = (r, repo) => r.git(repo, 'for-each-ref', '--format=%(refname:short)', 'refs/heads').split('\n').filter(Boolean).sort()

test('verify contract: VS-4 old-format verify branch stays under a derived format; parse null; list omits', () => {
  const r = cliRunner()
  const repo = r.gitRepo({
    files: {
      '.sdlc/config.json': { branchFormat: 'feature/sdlc/{name}' },
      '.sdlc/slices.json': ledger([['S-001', 'done']]),
    },
    branches: ['sdlc/S-001-v0-http-api-0', 'sdlc/S-001', 'feature/sdlc/S-001'],
  })
  const j = r.run('janitor.py', ['--repo', repo])
  assert.equal(j.status, 0)
  assert.deepEqual(j.json.removedBranches, [])
  assert.ok(refs(r, repo).includes('sdlc/S-001-v0-http-api-0'))
  const p = r.run('branches.py', ['parse', '--repo', repo, '--branch', 'sdlc/S-001'])
  console.log('PARSE', p.stdout.trim())
  assert.equal(p.status, 0)
  assert.equal(p.json.kind, null)
  const l = r.run('branches.py', ['list', '--repo', repo, '--kind', 'slice'])
  console.log('LIST', l.stdout.trim())
  assert.ok(!l.stdout.includes('"sdlc/S-001"'))
  assert.ok(l.stdout.includes('feature/sdlc/S-001'))
})

test('verify contract: VS-4 property: no branch outside the derived prefix is ever deleted, 1000 runs', () => {
  const seed = defaultSeed()
  const g = rng(seed)
  const fmt = 'feature/sdlc/{name}'
  const runs = 1000
  const pieces = ['sdlc/', 'S-001', 'S-9', '-v0-', 'http-api', '-0', 'run-1', '-attempt-2', 'M-1', '-e2e', 'feature/', 'x', '/', '-', 'é', 'feature/sdlc', 'state-20260101000000']
  const names = Array.from({ length: runs }, () => Array.from({ length: g.int(1, 6) }, () => g.pick(pieces)).join(''))
  const res = callPython(BRANCHES, 'parse', names.map((n) => [fmt, n, ['S-001']]))
  let bad = 0
  names.forEach((n, i) => {
    const prefixed = n.startsWith('feature/sdlc/')
    const out = res[i]
    assert.equal(out.outcome, 'return', n)
    if (!prefixed && out.value !== null) bad++
  })
  console.log(`property-run parse-derived-prefix seed=${seed} runs=${runs} violations=${bad}`)
  assert.equal(bad, 0)
})

test('verify contract: VS-4 end to end: random old-format verify branches all stay under derived format', () => {
  const seed = defaultSeed()
  const g = rng(seed)
  const r = cliRunner()
  const ids = ['S-001', 'S-002', 'S-999', 'S-003']
  const set = new Set()
  while (set.size < 40) set.add(`sdlc/${g.pick(ids)}-v${g.int(0, 3)}-${g.pick(['http-api', 'cli', 'async'])}-${g.int(0, 3)}`)
  const repo = r.gitRepo({
    files: { '.sdlc/config.json': { branchFormat: 'feature/sdlc/{name}' }, '.sdlc/slices.json': ledger([['S-001', 'done'], ['S-002', 'rejected'], ['S-003', 'todo']]) },
    branches: [...set],
  })
  const before = refs(r, repo)
  const j = r.run('janitor.py', ['--repo', repo])
  console.log(`property-run janitor-old-format seed=${seed} runs=${set.size}`)
  assert.deepEqual(j.json.removedBranches, [])
  assert.deepEqual(refs(r, repo), before)
})

test('verify contract: VS-5 lowercased ids resolve through the ledger (spec example)', () => {
  const r = cliRunner()
  const repo = r.gitRepo({
    files: {
      '.sdlc/config.json': { branchFormat: 'feature/p-1-{name:lower}' },
      '.sdlc/slices.json': ledger([['S-001', 'done'], ['S-002', 'todo']]),
    },
    branches: ['feature/p-1-s-001-v0-http-api-0', 'feature/p-1-s-002-v0-http-api-0', 'feature/p-1-s-999-v0-http-api-0', 'feature/p-1-run-1', 'feature/p-1-s-002'],
  })
  const j = r.run('janitor.py', ['--repo', repo])
  assert.equal(j.status, 0)
  assert.deepEqual(j.json.removedBranches.sort(), ['feature/p-1-s-001-v0-http-api-0', 'feature/p-1-s-999-v0-http-api-0'])
  assert.deepEqual(refs(r, repo), ['feature/p-1-run-1', 'feature/p-1-s-002', 'feature/p-1-s-002-v0-http-api-0', 'main'])
})

test('verify contract: VS-5 property: parse with ledger ids resolves any case of a ledger id to the ledger spelling, 1000 runs', () => {
  const seed = defaultSeed()
  const g = rng(seed)
  const fmt = 'feature/p-1-{name:lower}'
  const alphabet = 'abcdefABCDEF0123456789'
  const mk = () => 'S-' + Array.from({ length: g.int(1, 6) }, () => g.pick([...alphabet])).join('')
  const runs = 1000
  const cases = Array.from({ length: runs }, () => {
    const id = mk()
    const other = mk()
    return { id, other, ids: [other, id] }
  })
  const res = callPython(BRANCHES, 'parse', cases.map((c) => [fmt, `feature/p-1-${c.id.toLowerCase()}-v0-http-api-0`, c.ids]))
  let bad = []
  cases.forEach((c, i) => {
    const v = res[i].value
    const wantId = c.ids.find((x) => x.toLowerCase() === c.id.toLowerCase())
    if (res[i].outcome !== 'return' || !v || v.kind !== 'verify' || v.id !== wantId || v.known !== true) bad.push({ c, got: res[i] })
  })
  console.log(`property-run lower-resolve seed=${seed} runs=${runs} violations=${bad.length}`)
  assert.equal(bad.length, 0, JSON.stringify(bad.slice(0, 3)))
  const unknown = callPython(BRANCHES, 'parse', [[fmt, 'feature/p-1-s-777-v0-http-api-0', ['S-001']]])[0].value
  assert.equal(unknown.known, false)
})

test('verify contract: VS-5 mixed-case ledger ids: janitor sweeps by status of the ledger spelling', () => {
  const r = cliRunner()
  const repo = r.gitRepo({
    files: {
      '.sdlc/config.json': { branchFormat: 'feature/p-1-{name:lower}' },
      '.sdlc/slices.json': ledger([['S-Ab1', 'done'], ['S-Cd2', 'in_progress'], ['S-eF3', 'rejected']]),
    },
    branches: ['feature/p-1-s-ab1-v0-cli-0', 'feature/p-1-s-cd2-v0-cli-0', 'feature/p-1-s-ef3-v1-cli-2'],
  })
  const j = r.run('janitor.py', ['--repo', repo])
  assert.deepEqual(j.json.removedBranches.sort(), ['feature/p-1-s-ab1-v0-cli-0', 'feature/p-1-s-ef3-v1-cli-2'])
  assert.ok(refs(r, repo).includes('feature/p-1-s-cd2-v0-cli-0'))
})

test('verify contract: VS-5 determinism and no mutation of the ledger: second run removes nothing more', () => {
  const r = cliRunner()
  const files = {
    '.sdlc/config.json': { branchFormat: 'feature/p-1-{name:lower}' },
    '.sdlc/slices.json': ledger([['S-001', 'done']]),
  }
  const repo = r.gitRepo({ files, branches: ['feature/p-1-s-001-v0-http-api-0'] })
  const before = readFileSync(join(repo, '.sdlc/slices.json'), 'utf8')
  const a = r.run('janitor.py', ['--repo', repo])
  const b = r.run('janitor.py', ['--repo', repo])
  assert.deepEqual(a.json.removedBranches, ['feature/p-1-s-001-v0-http-api-0'])
  assert.deepEqual(b.json.removedBranches, [])
  assert.equal(readFileSync(join(repo, '.sdlc/slices.json'), 'utf8'), before)
})

test('verify contract: VS-7 source holds no V_BRANCH or V_ID and loads format through branches.load_format', () => {
  const src = readFileSync(JANITOR, 'utf8')
  assert.ok(!/V_BRANCH/.test(src))
  assert.ok(!/V_ID/.test(src))
  assert.match(src, /branches\.load_format\(repo\)/)
  assert.match(src, /branches\.parse\(/)
  const py = spawnSync('python3', ['-m', 'py_compile', JANITOR], { encoding: 'utf8', env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' } })
  assert.equal(py.status, 0, py.stderr)
})

test('verify contract: VS-7 every import is used and imports are stdlib or branches only', () => {
  const script = `
import ast, sys
src = open(sys.argv[1], encoding='utf-8').read()
tree = ast.parse(src)
imported = []
for n in ast.walk(tree):
    if isinstance(n, ast.Import):
        imported += [a.asname or a.name.split('.')[0] for a in n.names]
    elif isinstance(n, ast.ImportFrom):
        imported.append(n.module.split('.')[0])
names = {n.id for n in ast.walk(tree) if isinstance(n, ast.Name)}
unused = [i for i in imported if i not in names]
print(sorted(set(imported)))
print('unused', unused)
sys.exit(1 if unused else 0)
`
  const p = spawnSync('python3', ['-I', '-c', script, JANITOR], { encoding: 'utf8' })
  console.log(p.stdout)
  assert.equal(p.status, 0, p.stdout + p.stderr)
  const mods = JSON.parse(p.stdout.split('\n')[0].replace(/'/g, '"'))
  const allowed = new Set(['argparse', 'json', 'os', 're', 'shutil', 'subprocess', 'sys', 'tempfile', 'time', 'branches'])
  for (const m of mods) assert.ok(allowed.has(m), m)
})

test('verify contract: VS-7 docstring matches behavior: names parse, verify, finished statuses and the -attempt rule', () => {
  const src = readFileSync(JANITOR, 'utf8')
  const open = src.indexOf('"""')
  const doc = src.slice(open, src.indexOf('"""', open + 3) + 3)
  for (const w of ['branches.parse', 'verify', '`done`', '`rejected`', '-attempt-<n>', 'format']) assert.ok(doc.includes(w), w)
  assert.ok(!/leftover slice branches.*sdlc\/<id>-v/.test(doc))
  assert.ok(!doc.includes('V_BRANCH'))
})

test('verify contract: VS-7 consumer view: janitor entry point runs from a foreign cwd with a hostile format as a note', () => {
  const r = cliRunner()
  for (const fmt of ['feature/no-placeholder', '{name}{name}', '{name:lower}x{name}']) {
    const repo = r.gitRepo({
      files: { '.sdlc/config.json': { branchFormat: fmt }, '.sdlc/slices.json': ledger([['S-001', 'done']]) },
      branches: ['sdlc/S-001-v0-http-api-0', 'feature/no-placeholder'],
    })
    const before = refs(r, repo)
    const j = r.run('janitor.py', ['--repo', repo])
    assert.equal(j.status, 0, fmt)
    assert.deepEqual(j.json.removedBranches, [], fmt)
    assert.deepEqual(refs(r, repo), before, fmt)
    assert.ok(j.json.notes.some((n) => n.includes('format')), fmt + JSON.stringify(j.json.notes))
  }
})

test('verify contract: VS-7 seed probe: a format with whitespace is not a note but still deletes nothing', () => {
  const r = cliRunner()
  const repo = r.gitRepo({
    files: { '.sdlc/config.json': { branchFormat: 'a b/{name}' }, '.sdlc/slices.json': ledger([['S-001', 'done']]) },
    branches: ['sdlc/S-001-v0-http-api-0'],
  })
  const j = r.run('janitor.py', ['--repo', repo])
  console.log('WHITESPACE-FORMAT', JSON.stringify(j.json))
  assert.deepEqual(j.json.removedBranches, [])
})
