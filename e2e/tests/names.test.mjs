import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { up, down, sh, skillDir } from '../helpers/stack.mjs'
import { api } from '../helpers/api.mjs'
import { mark, since } from '../helpers/logs.mjs'
import { gitRepo, refs } from '../helpers/repo.mjs'
import { scenario } from '../helpers/scenario.mjs'

const stack = up()
const evidence = {}
test.after(() => {
  if (process.env.E2E_EVIDENCE_FILE) fs.writeFileSync(process.env.E2E_EVIDENCE_FILE, JSON.stringify(evidence, null, 2))
  down(stack)
})

const note = (id, label, value) => {
  evidence[id] = evidence[id] || []
  evidence[id].push({ label, value })
}

const walk = (dir, base = dir, out = {}) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.git') continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, base, out)
    else out[path.relative(base, full)] = fs.readFileSync(full, 'utf8')
  }
  return out
}
const snap = (repo) => JSON.stringify({ refs: refs(repo), files: walk(repo.dir) })

const name = (repo, args, opts) => {
  const t = api(stack, 'branches.py', ['name', '--repo', repo.dir, ...args], opts)
  note(opts?.id || 'x', `name ${args.join(' ')}`, { status: t.status, stdout: t.stdout.trim(), stderr: t.stderr.trim() })
  return t
}
const oneJson = (t) => {
  const lines = t.stdout.split('\n').filter(Boolean)
  return lines.length === 1 && t.json !== null && typeof t.json === 'object'
}
const probe = (code, args = [], opts = {}) =>
  sh(stack, stack.env.E2E_PYTHON, ['-I', '-c', `import sys;sys.path.insert(0,${JSON.stringify(skillDir)});${code}`, ...args], opts)
const utcStamp = (d = new Date()) => d.toISOString().replace(/[-:T]/g, '').slice(0, 14)
const stampMs = (s) => Date.UTC(+s.slice(0, 4), +s.slice(4, 6) - 1, +s.slice(6, 8), +s.slice(8, 10), +s.slice(10, 12), +s.slice(12, 14))

const KIND_ARGS = {
  run: ['--n', '1'],
  slice: ['--id', 'S-001'],
  milestone: ['--id', 'M-1'],
  e2e: ['--id', 'M-1'],
  'e2e-area': ['--id', 'M-1', '--area', 'api'],
  verify: ['--id', 'S-001', '--round', '0', '--profile', 'http-api', '--part', '0'],
  attempt: ['--id', 'S-001', '--n', '1'],
}

scenario('SC-M-1-001', 'name prints the default branch for every kind', () => {
  const repo = gitRepo(stack)
  const before = snap(repo)
  const expected = {
    run: 'sdlc/run-1', slice: 'sdlc/S-001', milestone: 'sdlc/M-1', e2e: 'sdlc/M-1-e2e',
    'e2e-area': 'sdlc/M-1-e2e-api', verify: 'sdlc/S-001-v0-http-api-0', attempt: 'sdlc/S-001-attempt-1',
  }
  const offset = mark(stack, 'SC-M-1-001')
  const seen = {}
  for (const [kind, args] of Object.entries(KIND_ARGS)) {
    const t = name(repo, ['--kind', kind, ...args], { id: 'SC-M-1-001' })
    seen[kind] = t
  }
  note('SC-M-1-001', 'log lines', since(stack, offset).length)
  for (const [kind, want] of Object.entries(expected)) {
    assert.equal(seen[kind].status, 0, kind)
    assert.ok(oneJson(seen[kind]))
    assert.equal(seen[kind].json.ok, true)
    assert.equal(seen[kind].json.branch, want)
    assert.equal(seen[kind].stderr, '')
  }
  assert.equal(snap(repo), before)
})

scenario('SC-M-1-002', 'state names carry a UTC timestamp and honor an explicit ts', () => {
  const repo = gitRepo(stack)
  const before = snap(repo)
  for (let i = 0; i < 2; i += 1) {
    const t = name(repo, ['--kind', 'state'], { id: 'SC-M-1-002' })
    assert.equal(t.status, 0)
    assert.ok(oneJson(t))
    assert.match(t.json.branch, /^sdlc\/state-\d{14}$/)
    const digits = t.json.branch.slice('sdlc/state-'.length)
    assert.ok(Math.abs(stampMs(digits) - Date.now()) <= 5000, digits)
    assert.ok(!t.stderr.includes('Traceback'))
  }
  const cli = name(repo, ['--kind', 'state', '--ts', '20261008101500'], { id: 'SC-M-1-002' })
  const p = probe("import branches;print(branches.tail('state', ts='20261008101500'))")
  note('SC-M-1-002', 'python api tail', { status: p.status, stdout: p.stdout.trim(), stderr: p.stderr.trim() })
  assert.equal(p.stdout.trim(), 'state-20261008101500')
  assert.ok(!p.stderr.includes('Traceback'))
  assert.equal(snap(repo), before)
  void cli
})

scenario('SC-M-1-003', 'name format keeps literal case and lowercases only the tail', () => {
  const repo = gitRepo(stack)
  const cases = [
    [['--kind', 'slice', '--id', 'S-001', '--format', 'feature/PROJ-123-{name}'], 'feature/PROJ-123-S-001'],
    [['--kind', 'slice', '--id', 'S-001', '--format', 'feature/PROJ-1-{name:lower}'], 'feature/PROJ-1-s-001'],
    [['--kind', 'milestone', '--id', 'M-1', '--format', 'Team/X-{name:lower}'], 'Team/X-m-1'],
  ]
  for (const [args, want] of cases) {
    const t = name(repo, args, { id: 'SC-M-1-003' })
    assert.equal(t.status, 0)
    assert.ok(oneJson(t))
    assert.equal(t.json.branch, want)
    assert.ok(!t.stderr.includes('Traceback'))
  }
})

scenario('SC-M-1-004', 'every printed name parses back to its kind and parts', () => {
  const repo = gitRepo(stack)
  const formats = ['sdlc/{name}', 'feature/PROJ-123-{name}', 'Team/X-{name:lower}']
  const kinds = { ...KIND_ARGS, state: [] }
  let passed = 0
  for (const format of formats) {
    const lower = format.includes(':lower')
    for (const [kind, args] of Object.entries(kinds)) {
      const n = name(repo, ['--kind', kind, ...args, '--format', format], { id: 'SC-M-1-004' })
      assert.equal(n.status, 0, `${format} ${kind}`)
      const p = api(stack, 'branches.py', ['parse', '--repo', repo.dir, '--branch', n.json.branch, '--format', format])
      note('SC-M-1-004', `parse ${n.json.branch}`, p.json)
      assert.equal(p.status, 0)
      assert.equal(p.json.kind, kind, `${format} ${n.json.branch}`)
      const want = {}
      for (let i = 0; i < args.length; i += 2) want[args[i].slice(2)] = args[i + 1]
      for (const [part, value] of Object.entries(want)) {
        const got = String(p.json[part])
        const same = lower ? got.toLowerCase() === value.toLowerCase() : got === value
        assert.ok(same, `${format} ${kind} ${part}: ${got} vs ${value}`)
      }
      if (kind === 'state') assert.equal(p.json.ts, n.json.branch.match(/\d{14}$/)[0])
      assert.ok(!p.stderr.includes('Traceback'))
      passed += 1
    }
  }
  assert.equal(passed, 24)
})

scenario('SC-M-1-005', 'preflight rejects malformed formats and accepts valid ones', () => {
  const repo = gitRepo(stack, { files: { '.sdlc/config.json': { forge: '' } } })
  const before = snap(repo)
  const bad = ['{name}{name}', 'sdlc/', 'sdlc/{ name }', 'sdlc/{name}..', 'a b/{name}', 'sdlc/{name}}', 'sdlc/{name:upper}']
  for (const format of bad) {
    const t = api(stack, 'branches.py', ['preflight', '--repo', repo.dir, '--mode', 'pr', '--format', format])
    note('SC-M-1-005', `preflight ${format}`, { status: t.status, stdout: t.stdout.trim(), stderr: t.stderr.trim() })
    assert.equal(t.status, 2, format)
    assert.ok(oneJson(t))
    assert.equal(t.json.ok, false)
    assert.ok(typeof t.json.error === 'string' && t.json.error.length > 0)
    assert.ok(!t.stdout.includes('Traceback') && !t.stderr.includes('Traceback'))
  }
  for (const format of ['sdlc/{name}', 'feature/PROJ-1-{name}']) {
    const t = api(stack, 'branches.py', ['preflight', '--repo', repo.dir, '--mode', 'pr', '--format', format])
    note('SC-M-1-005', `preflight ${format}`, { status: t.status, stdout: t.stdout.trim().slice(0, 300) })
    assert.equal(t.status, 0, t.stdout)
    assert.ok(oneJson(t))
  }
  assert.equal(snap(repo), before)
})

scenario('SC-M-1-006', 'preflight refuses formats that make an invalid ref with the git reason', () => {
  const repo = gitRepo(stack, { files: { '.sdlc/config.json': {}, '.sdlc/slices.json': [], '.sdlc/log.jsonl': '' } })
  const before = snap(repo)
  const formats = ['sdlc/{name}..', 'sdlc/~{name}', 'sdlc/{name}.lock', '/sdlc/{name}', 'sdlc/{name}^', 'sdlc/a:{name}', 'sdlc/*{name}', 'sdlc/[{name}']
  for (const format of formats) {
    const t = api(stack, 'branches.py', ['preflight', '--repo', repo.dir, '--mode', 'pr', '--format', format])
    note('SC-M-1-006', `preflight ${format}`, { status: t.status, stdout: t.stdout.trim(), stderr: t.stderr.trim() })
    assert.equal(t.status, 2, format)
    assert.ok(oneJson(t))
    assert.equal(t.json.ok, false)
    assert.ok(String(t.json.error).includes('not a valid branch name'), `${format}: ${t.json.error}`)
    assert.ok(!t.stderr.includes('Traceback'))
  }
  assert.equal(snap(repo), before)
})

scenario('SC-M-1-007', 'load_format falls back to the default for absent, empty and invalid config', () => {
  const variants = [
    ['absent', null, 'sdlc/S-001'],
    ['empty object', '{}', 'sdlc/S-001'],
    ['empty string', '{"branchFormat": ""}', 'sdlc/S-001'],
    ['valid value', '{"branchFormat": "feature/PROJ-1-{name}"}', 'feature/PROJ-1-S-001'],
    ['invalid json', 'not json {', 'sdlc/S-001'],
  ]
  const failures = []
  for (const [label, text, want] of variants) {
    const repo = gitRepo(stack, text === null ? {} : { files: { '.sdlc/config.json': text } })
    const t = name(repo, ['--kind', 'slice', '--id', 'S-001'], { id: 'SC-M-1-007' })
    note('SC-M-1-007', label, { status: t.status, stdout: t.stdout.trim(), stderr: t.stderr.trim() })
    const good = t.status === 0 && oneJson(t) && t.json.branch === want && t.stderr === ''
    if (!good) failures.push(`${label}: status ${t.status} stdout ${t.stdout.trim()}`)
    assert.ok(!t.stderr.includes('Traceback'))
  }
  assert.deepEqual(failures, [])
})

scenario('SC-M-1-008', 'an explicit format beats the config format', () => {
  const repo = gitRepo(stack, { files: { '.sdlc/config.json': { branchFormat: 'feature/PROJ-1-{name}' } } })
  const out = []
  out.push(name(repo, ['--kind', 'slice', '--id', 'S-001', '--format', 'sdlc/{name}'], { id: 'SC-M-1-008' }))
  out.push(name(repo, ['--kind', 'slice', '--id', 'S-001'], { id: 'SC-M-1-008' }))
  fs.writeFileSync(path.join(repo.dir, '.sdlc', 'config.json'), '{}')
  out.push(name(repo, ['--kind', 'slice', '--id', 'S-001'], { id: 'SC-M-1-008' }))
  assert.deepEqual(out.map((t) => t.json.branch), ['sdlc/S-001', 'feature/PROJ-1-S-001', 'sdlc/S-001'])
  for (const t of out) {
    assert.ok(oneJson(t))
    assert.ok(!t.stderr.includes('Traceback'))
  }
})

scenario('SC-M-1-009', 'name rejects missing and bad parts with one JSON error', () => {
  const repo = gitRepo(stack, { files: { '.sdlc/config.json': {} } })
  const before = snap(repo)
  const calls = [
    ['--kind', 'e2e-area', '--id', 'M-1'],
    ['--kind', 'slice'],
    ['--kind', 'verify', '--id', 'S-001', '--round', '0', '--profile', 'http-api'],
    ['--kind', 'bogus', '--id', 'S-001'],
    ['--kind', 'slice', '--id', ''],
    ['--kind', 'attempt', '--id', 'S-001', '--n', '-1'],
    ['--kind', 'run', '--n', 'abc'],
  ]
  const failures = []
  for (const args of calls) {
    const t = name(repo, args, { id: 'SC-M-1-009' })
    const good = t.status === 2 && oneJson(t) && t.json.ok === false && typeof t.json.error === 'string' && t.json.error.length > 0
    if (!good) failures.push(`${args.join(' ')} => status ${t.status} ${t.stdout.trim()}`)
    assert.ok(!t.stderr.includes('Traceback'))
  }
  assert.equal(snap(repo), before)
  assert.deepEqual(failures, [])
})

scenario('SC-M-1-010', 'branches.py rejects bad command lines with one JSON error', () => {
  const repo = gitRepo(stack, { files: { '.sdlc/config.json': {} } })
  const before = snap(repo)
  const calls = [
    [],
    ['frobnicate'],
    ['name', '--repo', repo.dir, '--kind', 'slice', '--id', 'S-001', '--bogus', '1'],
    ['parse', '--repo', repo.dir],
    ['list', '--repo', repo.dir],
  ]
  for (const args of calls) {
    const t = api(stack, 'branches.py', args)
    note('SC-M-1-010', args.join(' ') || '(no command)', { status: t.status, stdout: t.stdout.trim(), stderr: t.stderr.trim() })
    assert.equal(t.status, 2, args.join(' '))
    assert.ok(oneJson(t))
    assert.equal(t.json.ok, false)
    assert.ok(typeof t.json.error === 'string' && t.json.error.length > 0)
    assert.ok(!t.stderr.includes('Traceback') && !t.stdout.includes('Traceback'))
  }
  assert.equal(snap(repo), before)
})

scenario('SC-M-1-011', 'sibling scripts run from an unrelated directory and branches.py uses the stdlib only', () => {
  const repo = gitRepo(stack, { files: { '.sdlc/config.json': { gitMode: 'pr' }, '.sdlc/slices.json': [] } })
  const elsewhere = path.join(stack.dirs.root, 'elsewhere-011')
  fs.mkdirSync(elsewhere, { recursive: true })
  const runs = [
    ['janitor.py', ['--repo', repo.dir]],
    ['next-action.py', ['--repo', repo.dir]],
    ['state-write.py', ['status', '--repo', repo.dir]],
    ['branches.py', ['name', '--repo', repo.dir, '--kind', 'slice', '--id', 'S-001']],
  ]
  const failures = []
  for (const [script, args] of runs) {
    const t = api(stack, script, args, { cwd: elsewhere })
    note('SC-M-1-011', `${script} ${args.join(' ')}`, { status: t.status, stdout: t.stdout.trim().slice(0, 300), stderr: t.stderr.trim().slice(0, 500) })
    if (/ImportError|ModuleNotFoundError|Traceback/.test(t.stderr + t.stdout)) failures.push(`${script}: traceback or import error`)
    if (t.json === null) failures.push(`${script}: stdout is not JSON`)
  }
  const imp = sh(stack, stack.env.E2E_PYTHON, ['-I', '-c', [
    'import ast,sys',
    'tree=ast.parse(open(sys.argv[1]).read())',
    'mods=set()',
    'for n in ast.walk(tree):',
    '    if isinstance(n,ast.Import): mods.update(a.name.split(".")[0] for a in n.names)',
    '    elif isinstance(n,ast.ImportFrom) and n.module and n.level==0: mods.add(n.module.split(".")[0])',
    'print(sorted(mods)); print(sorted(m for m in mods if m not in sys.stdlib_module_names))',
  ].join('\n'), path.join(skillDir, 'branches.py')])
  note('SC-M-1-011', 'imports', imp.stdout.trim())
  assert.equal(imp.stdout.trim().split('\n')[1], '[]')
  assert.deepEqual(failures, [])
})

scenario('SC-M-1-012', 'hostile values keep the one-JSON contract and leak nothing', () => {
  const repo = gitRepo(stack)
  const before = snap(repo)
  const env = { GHP_TOKEN: 'ghp_SECRET123', SDLC_PROBE_ENV: 'env-value-7' }
  const calls = [
    ['--kind', 'slice', '--id', `S-001; touch /tmp/pwn-${repo.dir}`],
    ['--kind', 'slice', '--id', 'S-001\nS-002'],
    ['--kind', 'slice', '--id', '../../etc/passwd'],
    ['--kind', 'area', '--id', 'M-1', '--area', 'a b'],
    ['--kind', 'e2e-area', '--id', 'M-1', '--area', 'a b'],
    ['--kind', 'slice', '--id', 'S-001', '--format', 'sdlc/{name}\n'],
  ]
  const failures = []
  for (const args of calls) {
    const t = name(repo, args, { id: 'SC-M-1-012', env })
    const blob = t.stdout + t.stderr
    let good = oneJson(t) && !blob.includes('Traceback') && !blob.includes('ghp_SECRET123') && !blob.includes('env-value-7')
    if (good && t.status === 2) good = t.json.ok === false
    else if (good && t.status === 0) {
      const g = sh(stack, 'git', ['check-ref-format', '--branch', t.json.branch])
      note('SC-M-1-012', `git check-ref-format ${JSON.stringify(t.json.branch)}`, g.status)
      good = g.status === 0
    } else good = false
    if (!good) failures.push(`${JSON.stringify(args)} => status ${t.status} ${t.stdout.trim()}`)
  }
  const stray = fs.readdirSync('/tmp').filter((f) => f.startsWith('pwn-'))
  note('SC-M-1-012', 'stray pwn files in /tmp', stray)
  assert.deepEqual(stray, [])
  assert.equal(snap(repo), before)
  assert.deepEqual(failures, [])
})

scenario('SC-M-1-013', 'non-string branchFormat values fall back or fail cleanly', () => {
  for (const [label, text, strict] of [['42', '{"branchFormat": 42}', false], ['null', '{"branchFormat": null}', true], ['array', '{"branchFormat": ["x"]}', false]]) {
    const repo = gitRepo(stack, { files: { '.sdlc/config.json': text } })
    const t = name(repo, ['--kind', 'slice', '--id', 'S-001'], { id: 'SC-M-1-013' })
    assert.ok(oneJson(t), label)
    assert.ok(!t.stderr.includes('Traceback'), label)
    assert.equal(t.stderr, '', label)
    if (strict) {
      assert.equal(t.status, 0, label)
      assert.equal(t.json.branch, 'sdlc/S-001')
    } else if (t.status === 0) assert.equal(t.json.branch, 'sdlc/S-001', label)
    else {
      assert.equal(t.status, 2, label)
      assert.equal(t.json.ok, false)
      assert.ok(t.json.error)
    }
  }
})

scenario('SC-M-1-071', 'split returns prefix, suffix and the lower flag', () => {
  const repo = gitRepo(stack, { files: { '.sdlc/config.json': {}, '.sdlc/slices.json': [], '.sdlc/log.jsonl': '' } })
  const before = snap(repo)
  const p = probe("import branches,json;print(json.dumps([branches.split('a/{name}.x'),branches.split('a/{name:lower}')]))", [], { cwd: repo.dir })
  note('SC-M-1-071', 'split', { status: p.status, stdout: p.stdout.trim(), stderr: p.stderr })
  assert.equal(p.stderr, '')
  assert.deepEqual(JSON.parse(p.stdout), [['a/', '.x', false], ['a/', '', true]])
  assert.equal(snap(repo), before)
})

scenario('SC-M-1-076', 'a printed name parses back to its kind and parts or the command refuses', () => {
  const repo = gitRepo(stack, { files: { '.sdlc/config.json': {} } })
  const before = snap(repo)
  const calls = [
    { kind: 'slice', args: ['--id', 'S-001-attempt-2'], parts: { id: 'S-001-attempt-2' } },
    { kind: 'slice', args: ['--id', 'S-001-v0-cli-0'], parts: { id: 'S-001-v0-cli-0' } },
    { kind: 'slice', args: ['--id', 'S-001-e2e'], parts: { id: 'S-001-e2e' } },
    { kind: 'e2e-area', args: ['--id', 'M-1', '--area', 'ab\u202ecd'], parts: { id: 'M-1', area: 'ab\u202ecd' } },
  ]
  const failures = []
  for (const c of calls) {
    const t = name(repo, ['--kind', c.kind, ...c.args], { id: 'SC-M-1-076' })
    assert.ok(oneJson(t))
    assert.ok(!t.stderr.includes('Traceback'))
    if (t.status === 2 && t.json.ok === false) continue
    const p = api(stack, 'branches.py', ['parse', '--repo', repo.dir, '--branch', t.json.branch])
    note('SC-M-1-076', `parse ${JSON.stringify(t.json.branch)}`, p.json)
    const same = p.json && p.json.kind === c.kind && Object.entries(c.parts).every(([k, v]) => p.json[k] === v)
    if (!same) failures.push(`${JSON.stringify(t.json.branch)} named as ${c.kind} parses as ${p.json && p.json.kind} (${p.json && p.json.id})`)
  }
  assert.equal(snap(repo), before)
  assert.deepEqual(failures, [])
})

scenario('SC-M-1-077', 'state timestamps are UTC in any zone and explicit ts values are kept or refused', () => {
  const repo = gitRepo(stack, { files: { '.sdlc/config.json': {}, '.sdlc/slices.json': [], '.sdlc/log.jsonl': '' } })
  const before = snap(repo)
  for (const tz of ['Pacific/Kiritimati', 'America/Los_Angeles']) {
    const t = name(repo, ['--kind', 'state'], { id: 'SC-M-1-077', env: { TZ: tz } })
    const digits = t.json.branch.slice('sdlc/state-'.length)
    const d = sh(stack, 'date', ['-u', '+%Y%m%d%H%M%S'])
    note('SC-M-1-077', `${tz} date -u`, d.stdout.trim())
    assert.ok(Math.abs(stampMs(digits) - stampMs(d.stdout.trim())) <= 5000, `${tz} ${digits}`)
    assert.ok(!t.stderr.includes('Traceback'))
  }
  const viaApi = (ts) => probe("import branches,json\ntry:\n    print(json.dumps({'ok':True,'tail':branches.tail('state', ts=sys.argv[1])}))\nexcept branches.Fail as e:\n    print(json.dumps({'ok':False,'error':str(e)}))", [ts])
  const results = {}
  for (const ts of ['20261231235959', '20260101000000', '2026123123595', '20261332250000']) {
    const p = viaApi(ts)
    results[ts] = p.stdout.trim()
    note('SC-M-1-077', `python api ts ${ts}`, { stdout: p.stdout.trim(), stderr: p.stderr.trim() })
    assert.ok(!p.stderr.includes('Traceback'))
  }
  for (const ts of ['20261231235959', '20260101000000', '2026123123595']) {
    const c = name(repo, ['--kind', 'state', '--ts', ts], { id: 'SC-M-1-077' })
    note('SC-M-1-077', `cli --ts ${ts}`, { status: c.status, stdout: c.stdout.trim() })
  }
  assert.equal(JSON.parse(results['20261231235959']).tail, 'state-20261231235959')
  assert.equal(JSON.parse(results['20260101000000']).tail, 'state-20260101000000')
  assert.equal(JSON.parse(results['2026123123595']).ok, false)
  assert.equal(snap(repo), before)
})
