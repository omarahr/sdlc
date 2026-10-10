import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { spawnSync } from 'node:child_process'
import { up, down, skillDir, sh } from '../helpers/stack.mjs'
import { api } from '../helpers/api.mjs'
import { mark, since } from '../helpers/logs.mjs'
import { gitRepo, refs } from '../helpers/repo.mjs'
import { scenario } from '../helpers/scenario.mjs'

const stack = up()
test.after(() => down(stack))

function snapshot(repo) {
  const files = []
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.name === '.git') continue
      const p = path.join(d, e.name)
      if (e.isDirectory()) walk(p)
      else files.push([path.relative(repo.dir, p), fs.readFileSync(p, 'utf8')])
    }
  }
  walk(repo.dir)
  return JSON.stringify({ refs: repo.git('for-each-ref'), files })
}

function call(repo, script, args) {
  const offset = mark(stack, 'call')
  const t = api(stack, script, args, { cwd: repo.dir })
  const lines = since(stack, offset)
  assert.ok(lines.some((l) => l.includes(`"script":"${script}"`)), 'service log holds the call')
  return t
}

function clean(t) {
  assert.equal(t.stderr, '', `stderr: ${t.stderr}`)
  assert.ok(!t.stderr.includes('Traceback'))
  assert.ok(t.json && typeof t.json === 'object' && !Array.isArray(t.json), `one JSON object: ${t.stdout}`)
  assert.equal(t.stdout.trim().split('\n').length, 1)
}

function parse(repo, branch, format) {
  const args = ['parse', '--repo', repo.dir, '--branch', branch]
  if (format !== undefined) args.push('--format', format)
  const t = call(repo, 'branches.py', args)
  clean(t)
  return t
}

function probe(code) {
  const proc = spawnSync('python3', ['-I', '-c', `import sys, json; sys.path.insert(0, ${JSON.stringify(skillDir)}); import branches\n${code}`], { encoding: 'utf8', env: { PATH: process.env.PATH, PYTHONUTF8: '1', PYTHONDONTWRITEBYTECODE: '1' } })
  assert.equal(proc.status, 0, proc.stderr)
  return JSON.parse(proc.stdout)
}

function pick(j, keys) {
  return Object.fromEntries(keys.map((k) => [k, j[k]]))
}

scenario('SC-M-1-014', 'parse of every kind', () => {
  const repo = gitRepo(stack)
  const cases = [
    ['sdlc/run-2', { kind: 'run', n: 2 }],
    ['sdlc/M-1', { kind: 'milestone', id: 'M-1' }],
    ['sdlc/M-1-e2e', { kind: 'e2e', id: 'M-1' }],
    ['sdlc/M-1-e2e-api', { kind: 'e2e-area', id: 'M-1', area: 'api' }],
    ['sdlc/state-20261008101500', { kind: 'state', ts: '20261008101500' }],
    ['sdlc/S-001-v0-http-api-0', { kind: 'verify', id: 'S-001', round: 0, profile: 'http-api', part: 0 }],
    ['sdlc/S-001-attempt-2', { kind: 'attempt', id: 'S-001', n: 2 }],
    ['sdlc/S-001', { kind: 'slice', id: 'S-001' }],
  ]
  for (const [branch, want] of cases) {
    const t = parse(repo, branch)
    assert.equal(t.status, 0)
    assert.deepEqual(pick(t.json, Object.keys(want)), want, branch)
    assert.equal(t.json.known, null)
  }
})

scenario('SC-M-1-015', 'parse of dashed ids and areas', () => {
  const repo = gitRepo(stack)
  const cases = [
    ['sdlc/S-fix-M-1-2', { kind: 'slice', id: 'S-fix-M-1-2' }],
    ['sdlc/M-1-e2e-a-b', { kind: 'e2e-area', id: 'M-1', area: 'a-b' }],
    ['sdlc/M-2-e2e-api-v2', { kind: 'e2e-area', id: 'M-2', area: 'api-v2' }],
    ['sdlc/S-fix-M-1-2-attempt-3', { kind: 'attempt', id: 'S-fix-M-1-2', n: 3 }],
    ['sdlc/S-fix-M-1-2-v1-cli-0', { kind: 'verify', id: 'S-fix-M-1-2', round: 1, profile: 'cli', part: 0 }],
  ]
  for (const [branch, want] of cases) {
    const t = parse(repo, branch)
    assert.equal(t.status, 0)
    assert.deepEqual(pick(t.json, Object.keys(want)), want, branch)
  }
})

scenario('SC-M-1-016', 'parse returns null for non-loop branches', () => {
  const repo = gitRepo(stack, { files: { '.sdlc/config.json': { gitMode: 'pr' } } })
  const before = snapshot(repo)
  const fmt = 'feature/PROJ-1-{name}'
  for (const [b, f] of [['main'], ['feature/PROJ-1-foo', fmt], ['sdlc/feature-x'], ['sdlc/'], ['']]) {
    const t = parse(repo, b, f)
    assert.equal(t.status, 0, `${b}: ${t.stdout}`)
    assert.equal(t.json.kind, null, b)
  }
  const t = parse(repo, 'feature/PROJ-1-S-002', fmt)
  assert.equal(t.json.kind, 'slice')
  assert.equal(t.json.id, 'S-002')
  assert.equal(snapshot(repo), before)
})

scenario('SC-M-1-017', 'parse limits on state and run tails', () => {
  const repo = gitRepo(stack)
  const before = snapshot(repo)
  for (const b of ['sdlc/state-2026100810150', 'sdlc/state-202610081015000', 'sdlc/state-2026100810150a', 'sdlc/run-x', 'sdlc/run-']) {
    const t = parse(repo, b)
    assert.equal(t.status, 0)
    assert.equal(t.json.kind, null, `${b}: ${t.stdout}`)
  }
  const seven = parse(repo, 'sdlc/run-007')
  assert.equal(seven.json.kind, 'run')
  assert.equal(seven.json.n, 7)
  const huge = parse(repo, 'sdlc/run-99999999999999999999')
  assert.equal(huge.status, 0)
  assert.equal(snapshot(repo), before)
  const arabic = parse(repo, 'sdlc/state-٢٠٢٦١٠٠٨١٠١٥٠٠')
  assert.equal(arabic.json.kind, null, arabic.stdout)
})

scenario('SC-M-1-018', 'parse of e2e and area boundaries', () => {
  const repo = gitRepo(stack)
  const want = [
    ['sdlc/M-2-e2e', 'e2e'],
    ['sdlc/M-2-e2e-api', 'e2e-area'],
    ['sdlc/M-2-e2e-', null],
    ['sdlc/M-2e2e', null],
    ['sdlc/m-2', null],
    ['sdlc/M-', null],
  ]
  for (const [b, kind] of want) {
    const t = parse(repo, b)
    assert.equal(t.json.kind, kind, `${b}: ${t.stdout}`)
  }
})

scenario('SC-M-1-019', 'known follows the id list and case rules', () => {
  const fmt = 'feature/PROJ-1-{name:lower}'
  const repo = gitRepo(stack, { files: { '.sdlc/config.json': { branchFormat: fmt }, '.sdlc/slices.json': [{ id: 'S-001', status: 'todo' }] } })
  const cli = parse(repo, 'feature/proj-1-s-001')
  assert.equal(cli.json.kind, 'slice')
  assert.equal(cli.json.id.toLowerCase(), 's-001')
  assert.equal(cli.json.known, null)
  const out = probe(`
f = ${JSON.stringify(fmt)}
print(json.dumps([branches.parse(f, 'feature/proj-1-s-001', ids=['S-001']), branches.parse(f, 'feature/proj-1-s-009', ids=['S-001']), branches.parse(f, 'feature/proj-1-s-001')]))`)
  assert.equal(out[0].id, 'S-001')
  assert.equal(out[0].known, true)
  assert.equal(out[1].known, false)
  assert.equal(out[2].known, null)
  const upper = parse(repo, 'FEATURE/PROJ-1-S-001')
  assert.equal(upper.json.kind, 'slice', upper.stdout)
  assert.equal(upper.json.id, 'S-001')
  const m = probe(`
f = 'feature/p-1-{name:lower}'
print(json.dumps([branches.parse(f, 'feature/p-1-m-1', ids=['M-1']), branches.parse(f, 'feature/p-1-m-1-e2e', ids=['M-1']), branches.parse(f, 'feature/p-1-m-2', ids=['M-1'])]))`)
  assert.equal(m[0].id, 'M-1')
  assert.equal(m[0].known, true)
  assert.equal(m[1].id, 'M-1')
  assert.equal(m[1].known, true)
  assert.equal(m[2].known, false)
})

scenario('SC-M-1-020', 'list sorts by number then name', () => {
  const repo = gitRepo(stack, { branches: ['sdlc/run-10', 'sdlc/run-2', 'sdlc/run-1', 'sdlc/S-002', 'sdlc/S-001', 'sdlc/S-001-attempt-10', 'sdlc/S-001-attempt-2', 'sdlc/S-002-attempt-1', 'sdlc/S-001-v0-cli-0', 'feature/x'] })
  const list = (kind) => {
    const t = call(repo, 'branches.py', ['list', '--repo', repo.dir, '--kind', kind])
    clean(t)
    assert.equal(t.status, 0)
    return t.json.branches
  }
  const runs = list('run')
  assert.deepEqual(runs.map((b) => b.n), [1, 2, 10])
  const slices = list('slice')
  assert.deepEqual(slices.map((b) => b.branch), ['sdlc/S-001', 'sdlc/S-002'])
  const attempts = list('attempt')
  assert.deepEqual(attempts.map((b) => b.branch), ['sdlc/S-002-attempt-1', 'sdlc/S-001-attempt-2', 'sdlc/S-001-attempt-10'])
  for (const e of [...runs, ...slices, ...attempts]) {
    assert.ok(e.branch && e.kind && e.tail !== undefined)
    assert.ok(!['main', 'feature/x'].includes(e.branch))
  }
  assert.ok(attempts.every((a) => a.id && Number.isInteger(a.n)))
})

scenario('SC-M-1-021', 'old branches stay hidden under a new format', () => {
  const repo = gitRepo(stack, { branches: ['sdlc/S-001', 'feature/sdlc/S-002'] })
  const a = call(repo, 'branches.py', ['list', '--repo', repo.dir, '--kind', 'slice', '--format', 'feature/sdlc/{name}'])
  clean(a)
  assert.deepEqual(a.json.branches.map((b) => b.branch), ['feature/sdlc/S-002'])
  const p = parse(repo, 'sdlc/S-001', 'feature/sdlc/{name}')
  assert.equal(p.json.kind, null)
  const d = call(repo, 'branches.py', ['list', '--repo', repo.dir, '--kind', 'slice'])
  clean(d)
  assert.deepEqual(d.json.branches.map((b) => b.branch), ['sdlc/S-001'])
})

scenario('SC-M-1-022', 'list on non-git, missing and empty repos', () => {
  const plain = path.join(stack.dirs.repos, 'plain-dir')
  fs.mkdirSync(plain, { recursive: true })
  const empty = path.join(stack.dirs.repos, 'empty-git')
  fs.mkdirSync(path.join(empty, '.sdlc'), { recursive: true })
  fs.writeFileSync(path.join(empty, '.sdlc', 'config.json'), '{}')
  fs.writeFileSync(path.join(empty, '.sdlc', 'slices.json'), '[]')
  fs.writeFileSync(path.join(empty, '.sdlc', 'log.jsonl'), '')
  assert.equal(sh(stack, 'git', ['init', '-q', '-b', 'main'], { cwd: empty }).status, 0)
  const state = (d) => JSON.stringify({ refs: sh(stack, 'git', ['for-each-ref'], { cwd: d }).stdout, files: fs.readdirSync(d, { recursive: true }).sort(), cfg: fs.readFileSync(path.join(d, '.sdlc/config.json'), 'utf8') })
  const before = state(empty)
  const holder = { dir: stack.dirs.repos }
  const run = (dir) => {
    const t = call(holder, 'branches.py', ['list', '--kind', 'slice', '--repo', dir])
    clean(t)
    return t
  }
  const a = run(plain)
  assert.equal(a.status, 2)
  assert.equal(a.json.ok, false)
  assert.ok(a.json.error)
  const b = run(empty)
  assert.equal(b.status, 0, b.stdout)
  assert.equal(b.json.ok, true)
  assert.deepEqual(b.json.branches, [])
  const c = call(holder, 'branches.py', ['list', '--repo', '/nonexistent', '--kind', 'slice'])
  clean(c)
  assert.equal(c.status, 2)
  assert.equal(c.json.ok, false)
  assert.ok(c.json.error)
  assert.equal(state(empty), before)
  assert.deepEqual(fs.readdirSync(plain), [])
})

scenario('SC-M-1-023', 'non-ASCII branches are not loop branches', () => {
  const names = ['sdlc/S-001', 'sdlc/مرحبا', 'sdlc/S-001-é', 'sdlc/日本語-v1']
  const repo = gitRepo(stack, { branches: names })
  const l = call(repo, 'branches.py', ['list', '--repo', repo.dir, '--kind', 'slice'])
  clean(l)
  assert.deepEqual(l.json.branches.map((b) => b.branch), ['sdlc/S-001'])
  Buffer.from(l.stdout, 'utf8').toString('utf8')
  for (const n of names.slice(1)) {
    const t = parse(repo, n)
    assert.equal(t.status, 0)
    assert.equal(t.json.kind, null, `${n}: ${t.stdout}`)
  }
})

scenario('SC-M-1-024', 'parallel list and parse beside branch churn', async () => {
  const many = []
  for (let i = 1; i <= 8; i++) many.push(`sdlc/S-${String(i).padStart(3, '0')}`, `sdlc/run-${i}`, `sdlc/S-${String(i).padStart(3, '0')}-attempt-${i}`)
  many.push('sdlc/M-1', 'sdlc/M-1-e2e', 'sdlc/M-1-e2e-api', 'sdlc/state-20261008101500', 'feature/x', 'sdlc/S-001-v0-cli-0')
  const repo = gitRepo(stack, { branches: many })
  const before = refs(repo)
  assert.ok(before.length >= 30)
  const script = (name) => path.join(skillDir, name)
  const spawnOne = (args) => new Promise((resolve) => {
    import('node:child_process').then(({ spawn }) => {
      const p = spawn('python3', [script('branches.py'), ...args], { cwd: repo.dir, env: { PATH: process.env.PATH, HOME: stack.dirs.home, PYTHONUTF8: '1', PYTHONDONTWRITEBYTECODE: '1' } })
      let out = '', err = ''
      p.stdout.on('data', (d) => (out += d))
      p.stderr.on('data', (d) => (err += d))
      p.on('close', (code) => resolve({ code, out, err }))
    })
  })
  const jobs = []
  for (let i = 0; i < 8; i++) {
    jobs.push(spawnOne(['list', '--repo', repo.dir, '--kind', 'slice']))
    jobs.push(spawnOne(['parse', '--repo', repo.dir, '--branch', `sdlc/S-00${i + 1}-attempt-${i + 1}`]))
  }
  const churn = []
  for (let i = 0; i < 6; i++) {
    repo.git('branch', 'tmp-churn')
    repo.git('branch', '-D', 'tmp-churn')
  }
  repo.git('branch', 'scenario-made')
  const results = await Promise.all([...jobs, ...churn])
  for (const r of results) {
    assert.equal(r.code, 0, r.err + r.out)
    assert.equal(r.err, '')
    assert.equal(JSON.parse(r.out).ok, true)
    assert.equal(r.out.trim().split('\n').length, 1)
  }
  const after = refs(repo)
  assert.deepEqual(after.filter((r) => !before.includes(r)), ['refs/heads/scenario-made'])
  assert.deepEqual(before.filter((r) => !after.includes(r)), [])
})

scenario('SC-M-1-075', 'name then parse round trips under suffix formats', () => {
  const repo = gitRepo(stack, { files: { '.sdlc/config.json': {}, '.sdlc/slices.json': [], '.sdlc/log.jsonl': '' } })
  const before = snapshot(repo)
  const kinds = [
    ['run', ['--n', '3'], { kind: 'run', n: 3 }],
    ['slice', ['--id', 'S-001'], { kind: 'slice', id: 'S-001' }],
    ['milestone', ['--id', 'M-1'], { kind: 'milestone', id: 'M-1' }],
    ['e2e', ['--id', 'M-1'], { kind: 'e2e', id: 'M-1' }],
    ['e2e-area', ['--id', 'M-1', '--area', 'api'], { kind: 'e2e-area', id: 'M-1', area: 'api' }],
    ['state', ['--id', '20261008101500'], null],
    ['verify', ['--id', 'S-001', '--round', '0', '--profile', 'http-api', '--part', '1'], { kind: 'verify', id: 'S-001', round: 0, profile: 'http-api', part: 1 }],
    ['attempt', ['--id', 'S-001', '--n', '2'], { kind: 'attempt', id: 'S-001', n: 2 }],
  ]
  for (const fmt of ['sdlc/{name}-dev', 'sdlc/team-a/{name}', 'sdlc/{name}-attempt-1']) {
    for (const [kind, extra, want] of kinds) {
      const n = call(repo, 'branches.py', ['name', '--repo', repo.dir, '--kind', kind, ...extra, '--format', fmt])
      clean(n)
      if (n.status !== 0) {
        assert.equal(kind, 'state', `${fmt} ${kind}: ${n.stdout}`)
        continue
      }
      const p = parse(repo, n.json.branch, fmt)
      assert.equal(p.json.kind, kind, `${fmt} ${kind}: ${n.stdout} -> ${p.stdout}`)
      if (want) assert.deepEqual(pick(p.json, Object.keys(want)), want, `${fmt} ${kind}`)
    }
  }
  const state = call(repo, 'branches.py', ['name', '--repo', repo.dir, '--kind', 'state', '--format', 'sdlc/{name}-dev'])
  clean(state)
  if (state.status === 0) {
    const p = parse(repo, state.json.branch, 'sdlc/{name}-dev')
    assert.equal(p.json.kind, 'state')
    assert.match(p.json.ts, /^\d{14}$/)
  }
  assert.equal(parse(repo, 'sdlc/S-001', 'sdlc/{name}-dev').json.kind, null)
  assert.equal(parse(repo, 'a-a', 'a-{name}-a').json.kind, null)
  assert.equal(snapshot(repo), before)
})

scenario('SC-M-1-080', 'look-alike unicode never becomes a loop branch', () => {
  const fmt = 'feature/p-1-{name:lower}'
  const bad = ['feature/p-1-\u017F-001', 'feature/p-1-S-00\u212A', 'feature/p-1-s-001\u017F', 'feature/p-1-\u212A-1', 'feature/p-1-m-1-e2e\u212A', 'feature/p-1-s-00\u212A-v0-cli-0']
  const repo = gitRepo(stack, {
    files: { '.sdlc/config.json': { branchFormat: fmt }, '.sdlc/slices.json': [{ id: 'S-001', status: 'done' }], '.sdlc/log.jsonl': '' },
    branches: bad,
  })
  const names = refs(repo).filter((r) => r.startsWith('refs/heads/feature/')).map((r) => r.slice('refs/heads/'.length))
  assert.equal(names.length, bad.length)
  const misparsed = []
  for (const n of names) {
    const t = parse(repo, n, fmt)
    if (t.json.kind !== null) misparsed.push(`${n} -> ${t.json.kind}`)
  }
  const before = refs(repo)
  const j = call(repo, 'janitor.py', ['--repo', repo.dir])
  assert.equal(j.status, 0)
  assert.ok(!j.stderr.includes('Traceback'), j.stderr)
  const n = call(repo, 'next-action.py', ['--repo', repo.dir])
  assert.ok(!n.stderr.includes('Traceback'), n.stderr)
  const deleted = before.filter((r) => !refs(repo).includes(r))
  assert.deepEqual({ misparsed, deleted }, { misparsed: [], deleted: [] })
})
