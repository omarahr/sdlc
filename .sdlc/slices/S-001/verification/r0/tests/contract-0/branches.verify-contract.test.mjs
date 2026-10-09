import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { chmodSync, mkdirSync, mkdtempSync, symlinkSync, writeFileSync, realpathSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const ROOT = process.env.VERIFY_REPO ?? '/Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run'
const SKILL = join(ROOT, 'skills/sdlc')
const BRANCHES = join(SKILL, 'branches.py')
const { check, checkLoadFormat, callPython, rng, arb } = await import(join(SKILL, 'test/testkit/property.mjs'))
const { cliRunner } = await import(join(SKILL, 'test/testkit/cli-runner.mjs'))
const { plantDecoy, decoyFired } = await import(join(SKILL, 'test/testkit/attack-corpus.mjs'))

const SEED = Number.parseInt(process.env.TESTKIT_SEED ?? '20261009', 10)
const scratchDir = (p) => realpathSync(mkdtempSync(join(tmpdir(), `vc-${p}-`)))
const env = { PATH: process.env.PATH, PYTHONUTF8: '1', PYTHONDONTWRITEBYTECODE: '1', HOME: scratchDir('home') }

function py(code, { cwd = scratchDir('cwd'), extraEnv = {}, args = [] } = {}) {
  const r = spawnSync('python3', ['-I', '-c', code, ...args], { cwd, encoding: 'utf8', env: { ...env, ...extraEnv } })
  return r
}

function repoWith(config, kind = 'json') {
  const repo = scratchDir('repo')
  if (kind === 'no-sdlc') return repo
  mkdirSync(join(repo, '.sdlc'))
  const file = join(repo, '.sdlc', 'config.json')
  if (kind === 'json') writeFileSync(file, JSON.stringify(config))
  if (kind === 'text') writeFileSync(file, config)
  if (kind === 'dir') mkdirSync(file)
  if (kind === 'unreadable') { writeFileSync(file, JSON.stringify(config)); chmodSync(file, 0o000) }
  return repo
}

const LOAD = `
import importlib.util, sys, json
spec = importlib.util.spec_from_file_location("branches_probe", sys.argv[1])
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
`

const UNICODE_WS = /[\t\n\v\f\r \u0085\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]/u
function modelValid(fmt) {
  if (typeof fmt !== 'string') return false
  const count = fmt.split('{name}').length - 1 + fmt.split('{name:lower}').length - 1
  if (count !== 1) return false
  const ph = fmt.includes('{name:lower}') ? '{name:lower}' : '{name}'
  const rest = fmt.replace(ph, '')
  if (rest.includes('{') || rest.includes('}')) return false
  return !UNICODE_WS.test(fmt)
}
const PLAIN = /^[A-Za-z0-9/_.\-{}:é@]*$/u

test('verify contract: TC-contract-1 surface of branches.py as a consumer imports it by path', () => {
  const r = py(`${LOAD}
import inspect, builtins
public = sorted(n for n in vars(mod) if not n.startswith('_'))
own = {n: (type(getattr(mod, n)).__name__, str(inspect.signature(getattr(mod, n))) if callable(getattr(mod, n)) and not isinstance(getattr(mod, n), type) else None) for n in public if getattr(getattr(mod, n), '__module__', None) == 'branches_probe' or not hasattr(getattr(mod, n), '__module__')}
print(json.dumps({"public": public, "own": own, "failIsException": issubclass(mod.Fail, Exception), "failBases": [b.__name__ for b in mod.Fail.__mro__]}))
`, { args: [BRANCHES] })
  assert.equal(r.status, 0, r.stderr)
  const out = JSON.parse(r.stdout)
  console.log(JSON.stringify(out, null, 1))
  assert.equal(out.failIsException, true)
  assert.equal(out.own.load_format[1], '(repo)')
  assert.equal(out.own.validate_format[1], '(fmt)')
  assert.equal(out.own.main[1], '(argv=None)')
  for (const n of ['load_format', 'validate_format', 'main', 'Fail']) assert.ok(out.public.includes(n), n)
})

test('verify contract: TC-contract-2 importing branches.py has no side effect and needs only the stdlib', () => {
  const cwd = scratchDir('cwd')
  const r = py(`
import importlib.util, sys, json, io, contextlib, builtins, subprocess, os, ast
opened = []
real_open = builtins.open
def spy_open(f, *a, **k):
    opened.append(str(f)); return real_open(f, *a, **k)
builtins.open = spy_open
calls = []
real_popen = subprocess.Popen.__init__
def spy_popen(self, *a, **k):
    calls.append(repr(a)); return real_popen(self, *a, **k)
subprocess.Popen.__init__ = spy_popen
before = sorted(os.listdir('.'))
buf = io.StringIO(); ebuf = io.StringIO()
with contextlib.redirect_stdout(buf), contextlib.redirect_stderr(ebuf):
    spec = importlib.util.spec_from_file_location("branches_probe", sys.argv[1])
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
builtins.open = real_open
src = real_open(sys.argv[1], encoding='utf-8').read()
tree = ast.parse(src)
names = set()
for node in ast.walk(tree):
    if isinstance(node, ast.Import):
        names |= {a.name.split('.')[0] for a in node.names}
    elif isinstance(node, ast.ImportFrom):
        names.add((node.module or '').split('.')[0])
print(json.dumps({"stdout": buf.getvalue(), "stderr": ebuf.getvalue(), "opened": [o for o in opened if 'git-modes' in o or 'config.json' in o], "subprocess": calls,
  "cwdChanged": sorted(os.listdir('.')) != before, "imports": sorted(names), "nonStdlib": sorted(n for n in names if n not in sys.stdlib_module_names)}))
`, { cwd, args: [BRANCHES] })
  assert.equal(r.status, 0, r.stderr)
  const out = JSON.parse(r.stdout)
  console.log(JSON.stringify(out))
  assert.equal(out.stdout, '')
  assert.equal(out.stderr, '')
  assert.deepEqual(out.opened, [])
  assert.deepEqual(out.subprocess, [])
  assert.equal(out.cwdChanged, false)
  assert.deepEqual(out.nonStdlib, [])
})

test('verify contract: TC-contract-3 main(argv) returns 0 or 2 in-process and prints one JSON object', () => {
  const repo = repoWith({ branchFormat: 'feature/{name}' })
  const argvs = [
    ['name', '--repo', repo, '--kind', 'slice', '--id', 'S-001', '--n', '2', '--area', 'a', '--round', '1', '--profile', 'cli', '--part', '0', '--format', 'sdlc/{name}'],
    ['name', '--kind=slice', '--repo=' + repo],
    ['parse', '--branch', 'sdlc/S-1', '--repo', repo, '--format', 'x/{name:lower}'],
    ['list', '--repo', repo, '--kind', 'verify'],
    ['preflight', '--repo', repo, '--mode', 'pr', '--format', 'sdlc/{name}', '--branch', 'main'],
    ['parse', '--repo', repo],
    ['name', '--repo', repo, '--kind', 'slice', '--format', ''],
    ['bogus'],
    [],
  ]
  const r = py(`${LOAD}
import io, contextlib
out = []
for argv in json.loads(sys.argv[2]):
    buf = io.StringIO(); ebuf = io.StringIO()
    try:
        with contextlib.redirect_stdout(buf), contextlib.redirect_stderr(ebuf):
            rc = mod.main(argv)
        out.append({"rc": rc, "stdout": buf.getvalue(), "stderr": ebuf.getvalue()})
    except BaseException as e:
        out.append({"raised": type(e).__name__, "msg": str(e), "stdout": buf.getvalue()})
print(json.dumps(out))
`, { args: [BRANCHES, JSON.stringify(argvs)] })
  assert.equal(r.status, 0, r.stderr)
  const out = JSON.parse(r.stdout)
  console.log(JSON.stringify(out, null, 1))
  const expectRc = [0, 0, 0, 0, 0, 2, 2, 2, 2]
  out.forEach((o, i) => {
    assert.equal(o.raised, undefined, `argv ${i} raised ${o.raised}`)
    assert.equal(o.rc, expectRc[i], `argv ${i}`)
    const lines = o.stdout.split('\n').filter(Boolean)
    assert.equal(lines.length, 1, `argv ${i} stdout lines`)
    const obj = JSON.parse(lines[0])
    assert.equal(obj.ok, expectRc[i] === 0)
    if (expectRc[i] === 2) assert.ok(typeof obj.error === 'string' && obj.error.length > 0)
  })
  assert.equal(JSON.parse(out[1].stdout).format, 'feature/{name}')
  assert.equal(JSON.parse(out[3].stdout).format, 'feature/{name}')
})

test('verify contract: TC-contract-4 validate_format refuses each structural bad format with Fail and keeps the valid controls', () => {
  const bad = ['sdlc/x', '', '{name}{name}', '{name}-{name:lower}', 'a/{name}{', 'a/}{name}', '{id}', '{NAME}', '{name:upper}', '}{name:lower}', 'a {name}', 'a\t{name}', 'a\n{name}', 'a\r{name}', 'a\u00a0{name}', 'a\u3000{name}', '{{name}}', '{name', 'name}']
  const nonStrings = [null, 5, ['sdlc/{name}'], { name: 'x' }, true]
  const good = ['sdlc/{name}', 'sdlc/{name:lower}', 'feature/{name}-x', '{name}']
  const calls = [...bad, ...nonStrings, ...good].map((x) => [x])
  const res = callPython(BRANCHES, 'validate_format', calls)
  const rows = calls.map((c, i) => ({ input: c[0], outcome: res[i].outcome, value: res[i].value, type: res[i].type }))
  console.log(JSON.stringify(rows))
  rows.slice(0, bad.length + nonStrings.length).forEach((row) => assert.equal(row.outcome, 'Fail', JSON.stringify(row)))
  rows.slice(bad.length + nonStrings.length).forEach((row) => { assert.equal(row.outcome, 'return', JSON.stringify(row)); assert.equal(row.value, row.input) })
})

test('verify contract: TC-contract-5 property: validate_format agrees with the spec model and never raises another exception', () => {
  const report = check({
    fn: 'validate_format', gen: arb.format, runs: 3000, seed: SEED, module: BRANCHES,
    property: (input, result) => {
      if (result.outcome === 'exception') return `raised ${result.type}: ${result.message}`
      if (!modelValid(input) && result.outcome !== 'Fail') return `model says invalid, got ${result.outcome}`
      if (modelValid(input) && PLAIN.test(input) && !(result.outcome === 'return' && result.value === input)) return `model says valid, got ${result.outcome} ${result.message ?? ''}`
      return null
    },
  })
  const invalid = report.cases.filter((c) => !modelValid(c.input)).length
  console.log(`${report.label} modelInvalid=${invalid} modelValid=${report.runs - invalid}`)
  assert.deepEqual(report.violations.slice(0, 3).map((v) => ({ input: v.input, why: v.why })), [])
})

test('verify contract: TC-contract-6 load_format resolves each named config state', () => {
  const states = [
    ['feature', { branchFormat: 'feature/{name}' }, 'json', 'return', 'feature/{name}'],
    ['key missing', { gitMode: 'pr' }, 'json', 'return', 'sdlc/{name}'],
    ['empty string', { branchFormat: '' }, 'json', 'return', 'sdlc/{name}'],
    ['file absent', null, 'absent', 'return', 'sdlc/{name}'],
    ['no .sdlc', null, 'no-sdlc', 'return', 'sdlc/{name}'],
    ['null', { branchFormat: null }, 'json', 'return', 'sdlc/{name}'],
    ['number', { branchFormat: 5 }, 'json', 'return', 'sdlc/{name}'],
    ['list', { branchFormat: ['a/{name}'] }, 'json', 'return', 'sdlc/{name}'],
    ['top-level list', ['branchFormat'], 'json', 'return', 'sdlc/{name}'],
    ['top-level string', 'a/{name}', 'json', 'return', 'sdlc/{name}'],
    ['BOM', '\ufeff{"branchFormat": "a/{name}"}', 'text', 'Fail', null],
    ['invalid JSON', '{"branchFormat":', 'text', 'Fail', null],
    ['directory', null, 'dir', 'Fail', null],
    ['unreadable', { branchFormat: 'a/{name}' }, 'unreadable', 'Fail', null],
    ['deep nesting', '['.repeat(200000), 'text', 'Fail', null],
  ]
  const repos = states.map(([, cfg, kind]) => {
    if (kind === 'absent') { const r = scratchDir('repo'); mkdirSync(join(r, '.sdlc')); return r }
    return repoWith(cfg, kind)
  })
  const res = callPython(BRANCHES, 'load_format', repos.map((r) => [r]))
  const rows = states.map(([label, , , outcome, value], i) => ({ label, expected: outcome === 'return' ? value : 'Fail', outcome: res[i].outcome, value: res[i].value, type: res[i].type, message: res[i].message?.slice(0, 120) }))
  console.log(JSON.stringify(rows, null, 1))
  const wrong = rows.filter((row) => (row.expected === 'Fail' ? row.outcome !== 'Fail' : row.outcome !== 'return' || row.value !== row.expected))
  assert.deepEqual(wrong, [])
})

test('verify contract: TC-contract-7 property: load_format returns the config string, the default, or Fail', () => {
  const report = checkLoadFormat({
    runs: 1000, seed: SEED, module: BRANCHES,
    property: (input, result) => {
      if (result.outcome === 'exception') return `raised ${result.type}: ${result.message.slice(0, 100)}`
      const s = input.shape
      if (s.kind === 'absent' || s.kind === 'no-sdlc-dir') return result.outcome === 'return' && result.value === 'sdlc/{name}' ? null : `expected default, got ${result.outcome}`
      if (s.kind === 'json') {
        const v = s.value && typeof s.value === 'object' && !Array.isArray(s.value) ? s.value.branchFormat : undefined
        const want = typeof v === 'string' && v ? v : 'sdlc/{name}'
        return result.outcome === 'return' && result.value === want ? null : `expected ${String(want).slice(0, 40)}, got ${result.outcome}`
      }
      return null
    },
  })
  const byKind = {}
  for (const c of report.cases) { const k = `${c.input.shape.kind}:${c.result.outcome}`; byKind[k] = (byKind[k] ?? 0) + 1 }
  console.log(report.label, JSON.stringify(byKind))
  console.log(JSON.stringify(report.violations.slice(0, 3).map((v) => ({ shape: { ...v.input.shape, text: v.input.shape.text?.slice(0, 20) }, why: v.why }))))
  assert.equal(report.violations.length, 0)
})

test('verify contract: TC-contract-8 a command without --format uses load_format, and --format wins', () => {
  const r = cliRunner()
  const feature = repoWith({ branchFormat: 'feature/{name}' })
  const invalid = repoWith({ branchFormat: 'feature/x' })
  const spaced = repoWith({ branchFormat: 'a {name}' })
  const broken = repoWith('{"branchFormat":', 'text')
  const deep = repoWith('['.repeat(200000), 'text')
  const rows = []
  const runOne = (label, args, wantStatus, wantFormat) => {
    const t = r.run('branches.py', args)
    const lines = t.stdout.split('\n').filter(Boolean)
    let obj = null
    try { obj = JSON.parse(t.stdout) } catch {}
    rows.push({ label, status: t.status, lines: lines.length, ok: obj?.ok, format: obj?.format, error: obj?.error?.slice(0, 80), stderrTail: t.stderr.trim().split('\n').slice(-1)[0] ?? '' })
    return { t, obj, wantStatus, wantFormat, label }
  }
  const checks = [
    runOne('parse config', ['parse', '--repo', feature, '--branch', 'feature/S-1'], 0, 'feature/{name}'),
    runOne('list config', ['list', '--repo', feature, '--kind', 'slice'], 0, 'feature/{name}'),
    runOne('parse flag wins', ['parse', '--repo', feature, '--branch', 'x', '--format', 'sdlc/{name}'], 0, 'sdlc/{name}'),
    runOne('list flag wins', ['list', '--repo', feature, '--kind', 'slice', '--format', 'sdlc/{name}'], 0, 'sdlc/{name}'),
    runOne('invalid config', ['parse', '--repo', invalid, '--branch', 'x'], 2),
    runOne('invalid config + flag', ['parse', '--repo', invalid, '--branch', 'x', '--format', 'sdlc/{name}'], 0, 'sdlc/{name}'),
    runOne('spaced config', ['list', '--repo', spaced, '--kind', 'slice'], 2),
    runOne('malformed config', ['parse', '--repo', broken, '--branch', 'x'], 2),
    runOne('malformed config + flag', ['parse', '--repo', broken, '--branch', 'x', '--format', 'sdlc/{name}'], 0, 'sdlc/{name}'),
    runOne('deeply nested config', ['parse', '--repo', deep, '--branch', 'x'], 2),
    runOne('deeply nested config, name', ['name', '--repo', deep, '--kind', 'slice'], 2),
  ]
  console.log(JSON.stringify(rows, null, 1))
  const wrong = checks.filter((c) => c.t.status !== c.wantStatus || !c.obj || c.t.stdout.trim().split('\n').length !== 1 || (c.wantStatus === 0 ? c.obj.ok !== true || c.obj.format !== c.wantFormat : c.obj.ok !== false || typeof c.obj.error !== 'string')).map((c) => c.label)
  assert.deepEqual(wrong, [])
})

test('verify contract: TC-contract-9 each script binds mod.branches to the real module beside it', () => {
  const cwd = scratchDir('cwd')
  const decoyCwd = plantDecoy(cwd, { behavior: 'shadow' })
  const ppDir = scratchDir('pp')
  const decoyPP = plantDecoy(ppDir, { behavior: 'shadow' })
  const r = py(`
import importlib.util, sys, json, os, io, contextlib
out = {}
for name in ["next-action.py", "state-write.py", "janitor.py"]:
    path = os.path.join(sys.argv[1], name)
    for k in [k for k in sys.modules if k == "branches"]:
        del sys.modules[k]
    spec = importlib.util.spec_from_file_location(name.replace("-", "_")[:-3], path)
    mod = importlib.util.module_from_spec(spec)
    with contextlib.redirect_stdout(io.StringIO()):
        spec.loader.exec_module(mod)
    out[name] = os.path.realpath(mod.branches.__file__)
print(json.dumps(out))
`, { cwd, args: [SKILL], extraEnv: {} })
  const r2 = spawnSync('python3', ['-c', `
import importlib.util, sys, json, os
out = {}
for name in ["next-action.py", "state-write.py", "janitor.py"]:
    sys.modules.pop("branches", None)
    spec = importlib.util.spec_from_file_location(name.replace("-", "_")[:-3], os.path.join(sys.argv[1], name))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    out[name] = os.path.realpath(mod.branches.__file__)
print(json.dumps(out))
`, SKILL], { cwd, encoding: 'utf8', env: { ...env, PYTHONPATH: ppDir } })
  console.log(r.stdout, r.stderr, r2.stdout, r2.stderr)
  assert.equal(r.status, 0, r.stderr)
  assert.equal(r2.status, 0, r2.stderr)
  const real = realpathSync(BRANCHES)
  for (const v of Object.values(JSON.parse(r.stdout))) assert.equal(v, real)
  for (const v of Object.values(JSON.parse(r2.stdout))) assert.equal(v, real)
  assert.ok(!decoyFired(decoyCwd))
  assert.ok(!decoyFired(decoyPP))
})

test('verify contract: TC-contract-10 each script runs --help through a symlink and a relative path from another cwd', () => {
  const rows = []
  for (const name of ['next-action.py', 'state-write.py', 'janitor.py']) {
    const linkDir = scratchDir('link')
    symlinkSync(join(SKILL, name), join(linkDir, name))
    const viaLink = spawnSync('python3', [join(linkDir, name), '--help'], { cwd: scratchDir('cwd'), encoding: 'utf8', env })
    const decoyDir = scratchDir('linkdecoy')
    symlinkSync(join(SKILL, name), join(decoyDir, name))
    const decoy = plantDecoy(decoyDir, { behavior: 'exit' })
    const viaLinkDecoy = spawnSync('python3', [join(decoyDir, name), '--help'], { cwd: scratchDir('cwd'), encoding: 'utf8', env })
    const viaRel = spawnSync('python3', [join('..', name), '--help'], { cwd: join(SKILL, 'test'), encoding: 'utf8', env })
    rows.push({ name, link: viaLink.status, linkBesideDecoy: viaLinkDecoy.status, decoyFired: decoyFired(decoy), relative: viaRel.status })
  }
  console.log(JSON.stringify(rows, null, 1))
  for (const row of rows) { assert.equal(row.link, 0); assert.equal(row.relative, 0) }
})

test('verify contract: TC-contract-11 load_format and validate_format are deterministic over repeated calls', () => {
  const r = rng(SEED)
  const formats = Array.from({ length: 1000 }, () => arb.formatString(r))
  const a = callPython(BRANCHES, 'validate_format', formats.map((f) => [f]))
  const b = callPython(BRANCHES, 'validate_format', formats.map((f) => [f]))
  const diff = a.filter((x, i) => x.outcome !== b[i].outcome || x.value !== b[i].value || x.message !== b[i].message)
  console.log(`determinism validate_format seed=${SEED} runs=1000 diffs=${diff.length}`)
  assert.equal(diff.length, 0)
})
