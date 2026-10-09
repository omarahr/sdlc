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

test('verify contract: TC-contract-12 load_format turns every parse and read error near the fix into Fail', () => {
  const states = [
    ['deep arrays', '['.repeat(200000), 'text', 'Fail', null],
    ['deep objects', '{"a":'.repeat(100000), 'text', 'Fail', null],
    ['deep mixed', '[{"a":'.repeat(60000), 'text', 'Fail', null],
    ['deep closed arrays', '['.repeat(100000) + ']'.repeat(100000), 'text', 'return', 'sdlc/{name}'],
    ['deep under branchFormat', '{"branchFormat":' + '['.repeat(100000), 'text', 'Fail', null],
    ['nested 400 with format', '{"branchFormat":"a/{name}","x":' + '['.repeat(400) + ']'.repeat(400) + '}', 'text', 'return', 'a/{name}'],
    ['huge integer', '{"branchFormat":"a/{name}","n":' + '9'.repeat(5000) + '}', 'text', 'Fail', null],
    ['invalid utf-8', Buffer.from([0x7b, 0x22, 0xff, 0xfe, 0x22, 0x3a, 0x31, 0x7d]), 'text', 'Fail', null],
    ['empty file', '', 'text', 'Fail', null],
    ['NaN literal', '{"branchFormat":"a/{name}","n":NaN}', 'text', 'return', 'a/{name}'],
    ['duplicate key', '{"branchFormat":"a/{name}","branchFormat":"b/{name}"}', 'text', 'return', 'b/{name}'],
    ['unicode format', '{"branchFormat":"é/{name}"}', 'text', 'return', 'é/{name}'],
  ]
  const repos = states.map(([, cfg, kind]) => repoWith(cfg, kind))
  const res = callPython(BRANCHES, 'load_format', repos.map((r) => [r]))
  const rows = states.map(([label, , , outcome, value], i) => ({ label, expected: outcome === 'return' ? value : 'Fail', outcome: res[i].outcome, value: res[i].value, type: res[i].type, message: res[i].message?.slice(0, 120), stdout: res[i].stdout, stderr: res[i].stderr }))
  console.log(JSON.stringify(rows, null, 1))
  const wrong = rows.filter((row) => (row.expected === 'Fail' ? row.outcome !== 'Fail' : row.outcome !== 'return' || row.value !== row.expected) || row.stdout !== '' || row.stderr !== '')
  assert.deepEqual(wrong, [])
})

test('verify contract: TC-contract-13 main(argv) in-process returns 2 with one JSON error for every deep config, then still works', () => {
  const deepA = repoWith('['.repeat(200000), 'text')
  const deepO = repoWith('{"a":'.repeat(100000), 'text')
  const good = repoWith({ branchFormat: 'feature/{name}' })
  const r = py(`${LOAD}
import io, contextlib
calls = [
  ["parse", "--repo", sys.argv[2], "--branch", "x"],
  ["name", "--repo", sys.argv[2], "--kind", "slice"],
  ["list", "--repo", sys.argv[3], "--kind", "slice"],
  ["preflight", "--repo", sys.argv[3], "--mode", "pr"],
  ["parse", "--repo", sys.argv[2], "--branch", "x"],
  ["parse", "--repo", sys.argv[4], "--branch", "feature/S-1"],
  ["parse", "--repo", sys.argv[2], "--branch", "x", "--format", "sdlc/{name}"],
]
rows = []
for argv in calls:
    out = io.StringIO()
    try:
        with contextlib.redirect_stdout(out):
            rc = mod.main(argv)
        exc = None
    except BaseException as e:
        rc, exc = None, type(e).__name__
    rows.append({"argv": argv[0], "rc": rc, "exc": exc, "stdout": out.getvalue()})
print(json.dumps(rows))
`, { args: [BRANCHES, deepA, deepO, good] })
  assert.equal(r.status, 0, r.stderr)
  const rows = JSON.parse(r.stdout)
  const view = rows.map((row) => {
    const lines = row.stdout.split('\n').filter(Boolean)
    let obj = null
    try { obj = JSON.parse(row.stdout) } catch {}
    return { argv: row.argv, rc: row.rc, exc: row.exc, lines: lines.length, ok: obj?.ok, format: obj?.format, error: obj?.error?.slice(0, 90) }
  })
  console.log(JSON.stringify(view, null, 1))
  console.log('stderr:', JSON.stringify(r.stderr))
  const want = [[2, false], [2, false], [2, false], [2, false], [2, false], [0, true, 'feature/{name}'], [0, true, 'sdlc/{name}']]
  const wrong = view.filter((v, i) => v.exc !== null || v.rc !== want[i][0] || v.lines !== 1 || v.ok !== want[i][1] || (want[i][1] ? v.format !== want[i][2] : typeof v.error !== 'string' || v.error.length === 0))
  assert.deepEqual(wrong, [])
  assert.equal(r.stderr, '')
})

test('verify contract: TC-contract-14 the CLI gives one JSON error with exit 2 for each deep config on every command', () => {
  const r = cliRunner()
  const deepA = repoWith('['.repeat(200000), 'text')
  const deepO = repoWith('{"a":'.repeat(100000), 'text')
  const rows = []
  for (const [label, repo] of [['arrays', deepA], ['objects', deepO]]) {
    for (const args of [['parse', '--repo', repo, '--branch', 'x'], ['name', '--repo', repo, '--kind', 'slice'], ['list', '--repo', repo, '--kind', 'slice'], ['preflight', '--repo', repo, '--mode', 'pr']]) {
      const t = r.run('branches.py', args)
      let obj = null
      try { obj = JSON.parse(t.stdout) } catch {}
      rows.push({ label: `${label} ${args[0]}`, status: t.status, lines: t.stdout.split('\n').filter(Boolean).length, ok: obj?.ok, error: obj?.error?.slice(0, 90), stderr: t.stderr, treeUnchanged: t.treeUnchanged })
    }
  }
  console.log(JSON.stringify(rows, null, 1))
  const wrong = rows.filter((x) => x.status !== 2 || x.lines !== 1 || x.ok !== false || typeof x.error !== 'string' || x.stderr !== '' || x.treeUnchanged === false)
  assert.deepEqual(wrong, [])
})

test('verify contract: TC-contract-15 load_format gives the same outcome for the same config across two processes', () => {
  const report = checkLoadFormat({ runs: 300, seed: SEED + 1, module: BRANCHES, log: false })
  const again = checkLoadFormat({ runs: 300, seed: SEED + 1, module: BRANCHES, log: false })
  const sig = (c) => `${c.result.outcome}|${c.result.value ?? ''}|${c.result.type ?? ''}`
  const diffs = report.cases.filter((c, i) => sig(c) !== sig(again.cases[i])).length
  console.log(`seed=${SEED + 1} runs=${report.runs} differences=${diffs} violationsA=${report.violations.length} violationsB=${again.violations.length}`)
  assert.equal(diffs, 0)
  assert.equal(report.violations.length + again.violations.length, 0)
})
