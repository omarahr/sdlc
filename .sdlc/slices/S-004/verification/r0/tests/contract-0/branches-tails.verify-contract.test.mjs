import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const WT = process.env.VERIFY_WORKTREE
if (!WT) throw new Error('set VERIFY_WORKTREE to the verifier worktree')
const KIT = join(WT, 'skills/sdlc/test/testkit')
const { cliRunner } = await import(join(KIT, 'cli-runner.mjs'))
const { rng, defaultSeed } = await import(join(KIT, 'property.mjs'))
const { load } = await import(join(KIT, 'attack-corpus.mjs'))
const { scratch } = await import(join(WT, 'skills/sdlc/test/harness.mjs'))

const SKILL = join(WT, 'skills/sdlc')
const RUNS = Number.parseInt(process.env.VERIFY_RUNS ?? '1500', 10)
const SEED = defaultSeed()

const CONSUMER = `
import json, math, sys
sys.path.insert(0, sys.argv[1])
import branches
def arg(v):
    if isinstance(v, dict) and "$pow10" in v:
        return 10 ** v["$pow10"]
    if isinstance(v, dict) and "$float" in v:
        return float(v["$float"])
    return v
out = []
for c in json.load(sys.stdin):
    fn = getattr(branches, c["fn"])
    args = [arg(a) for a in c.get("args", [])]
    kwargs = {k: arg(v) for k, v in c.get("kwargs", {}).items()}
    try:
        v = fn(*args, **kwargs)
        out.append({"outcome": "return", "valueType": type(v).__name__, "value": v if isinstance(v, str) else repr(v)})
    except branches.Fail as e:
        out.append({"outcome": "Fail", "message": str(e)})
    except BaseException as e:
        out.append({"outcome": "exception", "type": type(e).__name__, "message": str(e)[:300]})
print(json.dumps(out))
`

function api(calls) {
  const r = spawnSync('python3', ['-I', '-c', CONSUMER, SKILL], {
    cwd: scratch('verify-contract-'),
    input: JSON.stringify(calls),
    encoding: 'utf8',
    env: { PATH: process.env.PATH, PYTHONUTF8: '1', PYTHONDONTWRITEBYTECODE: '1', TZ: 'UTC' },
    maxBuffer: 256 * 1024 * 1024,
  })
  assert.equal(r.status, 0, `consumer helper failed: ${r.stderr}`)
  return JSON.parse(r.stdout)
}

const cli = cliRunner()
const refOk = (branch) => spawnSync('git', ['check-ref-format', '--branch', branch], { encoding: 'utf8' }).status === 0

function okName(t, label) {
  assert.equal(t.status, 0, `${label}: ${t.text()}`)
  assert.equal(t.stderr, '', `${label}: stderr`)
  assert.ok(t.json && typeof t.json === 'object', `${label}: not one JSON object`)
  assert.deepEqual(Object.keys(t.json).sort(), ['branch', 'command', 'format', 'kind', 'ok'], label)
  assert.equal(t.json.ok, true)
  assert.equal(t.json.command, 'name')
  assert.ok(t.treeUnchanged, `${label}: tree changed ${t.text()}`)
  return t.json
}

function badName(t, label, part) {
  assert.equal(t.status, 2, `${label}: ${t.text()}`)
  assert.doesNotMatch(t.stderr, /Traceback/, label)
  assert.ok(t.json && typeof t.json === 'object' && !Array.isArray(t.json), `${label}: not one JSON object: ${t.stdout}`)
  assert.equal(t.stdout.trim().split('\n').length, 1, `${label}: more than one line`)
  assert.equal(t.json.ok, false, label)
  assert.equal(typeof t.json.error, 'string', label)
  if (part) assert.match(t.json.error, new RegExp(`non-empty ${part}\\b`), `${label}: ${t.json.error}`)
  assert.ok(t.treeUnchanged, `${label}: tree changed`)
  return t.json
}

const SPEC_EXAMPLES = [
  { req: 'R-003', args: ['--kind', 'run', '--n', '1'], kind: 'run', branch: 'sdlc/run-1' },
  { req: 'R-004', args: ['--kind', 'slice', '--id', 'S-001'], kind: 'slice', branch: 'sdlc/S-001' },
  { req: 'R-005', args: ['--kind', 'milestone', '--id', 'M-1'], kind: 'milestone', branch: 'sdlc/M-1' },
  { req: 'R-006', args: ['--kind', 'e2e', '--id', 'M-1'], kind: 'e2e', branch: 'sdlc/M-1-e2e' },
  { req: 'R-007', args: ['--kind', 'e2e-area', '--id', 'M-1', '--area', 'api'], kind: 'e2e-area', branch: 'sdlc/M-1-e2e-api' },
]

test('verify contract TC-contract-1: spec section 1 default names on the CLI', () => {
  const repo = cli.gitRepo()
  for (const ex of SPEC_EXAMPLES) {
    const t = cli.run('branches.py', ['name', '--repo', repo, ...ex.args])
    const out = okName(t, ex.req)
    assert.equal(out.format, 'sdlc/{name}', ex.req)
    assert.equal(out.kind, ex.kind, ex.req)
    assert.equal(out.branch, ex.branch, ex.req)
    assert.ok(refOk(out.branch), `${ex.req}: git refuses ${out.branch}`)
  }
})

test('verify contract TC-contract-2: absent, empty or non-string branchFormat falls back to sdlc/{name}', () => {
  const values = [undefined, '', null, 5, 0, true, false, [], ['x/{name}'], {}]
  for (const v of values) {
    const config = v === undefined ? { gitMode: 'pr' } : { gitMode: 'pr', branchFormat: v }
    const repo = cli.gitRepo({ files: { '.sdlc/config.json': config } })
    for (const ex of SPEC_EXAMPLES) {
      const t = cli.run('branches.py', ['name', '--repo', repo, ...ex.args])
      const out = okName(t, `${JSON.stringify(v)} ${ex.req}`)
      assert.equal(out.format, 'sdlc/{name}')
      assert.equal(out.branch, ex.branch)
    }
  }
})

test('verify contract TC-contract-3: consumer import of tail and name gives the CLI tails', () => {
  const res = api([
    { fn: 'tail', args: ['run'], kwargs: { n: 1 } },
    { fn: 'tail', args: ['slice'], kwargs: { id: 'S-001' } },
    { fn: 'tail', args: ['milestone'], kwargs: { id: 'M-1' } },
    { fn: 'tail', args: ['e2e'], kwargs: { id: 'M-1' } },
    { fn: 'tail', args: ['e2e-area'], kwargs: { id: 'M-1', area: 'api' } },
    { fn: 'name', args: ['sdlc/{name}', 'run'], kwargs: { n: 1 } },
    { fn: 'name', args: ['sdlc/{name}', 'milestone'], kwargs: { id: 'M-1' } },
    { fn: 'name', args: ['sdlc/{name}', 'e2e'], kwargs: { id: 'M-1' } },
  ])
  assert.deepEqual(res.map((r) => r.value), ['run-1', 'S-001', 'M-1', 'M-1-e2e', 'M-1-e2e-api', 'sdlc/run-1', 'sdlc/M-1', 'sdlc/M-1-e2e'])
  assert.ok(res.every((r) => r.outcome === 'return' && r.valueType === 'str'))
})

test('verify contract TC-contract-4: team format from config and from --format, the flag wins', () => {
  const repo = cli.gitRepo({ files: { '.sdlc/config.json': { branchFormat: 'feature/PROJ-1-{name}' } } })
  const cases = [
    [['--kind', 'milestone', '--id', 'M-1'], 'feature/PROJ-1-M-1'],
    [['--kind', 'run', '--n', '1'], 'feature/PROJ-1-run-1'],
    [['--kind', 'e2e', '--id', 'M-1'], 'feature/PROJ-1-M-1-e2e'],
  ]
  for (const [args, want] of cases) {
    const out = okName(cli.run('branches.py', ['name', '--repo', repo, ...args]), `config ${args}`)
    assert.equal(out.format, 'feature/PROJ-1-{name}')
    assert.equal(out.branch, want)
  }
  const bare = cli.gitRepo()
  for (const [args, want] of cases) {
    const out = okName(cli.run('branches.py', ['name', '--repo', bare, ...args, '--format', 'feature/PROJ-1-{name}']), `flag ${args}`)
    assert.equal(out.format, 'feature/PROJ-1-{name}')
    assert.equal(out.branch, want)
  }
  const out = okName(cli.run('branches.py', ['name', '--repo', repo, '--kind', 'e2e', '--id', 'M-1', '--format', 'team/{name:lower}']), 'flag wins')
  assert.equal(out.format, 'team/{name:lower}')
  assert.equal(out.branch, 'team/m-1-e2e')
})

test('verify contract TC-contract-5: lowercase, suffix and placeholder-first formats', () => {
  const repo = cli.gitRepo()
  const cases = [
    ['feature/PROJ-1-{name:lower}', ['--kind', 'e2e', '--id', 'M-1'], 'feature/PROJ-1-m-1-e2e'],
    ['feature/PROJ-1-{name:lower}', ['--kind', 'milestone', '--id', 'M-1'], 'feature/PROJ-1-m-1'],
    ['feature/PROJ-1-{name:lower}', ['--kind', 'run', '--n', '1'], 'feature/PROJ-1-run-1'],
    ['x/{name}-wip', ['--kind', 'run', '--n', '3'], 'x/run-3-wip'],
    ['x/{name}-wip', ['--kind', 'e2e', '--id', 'M-2'], 'x/M-2-e2e-wip'],
    ['{name}/sdlc', ['--kind', 'milestone', '--id', 'M-1'], 'M-1/sdlc'],
    ['{name}/sdlc', ['--kind', 'run', '--n', '1'], 'run-1/sdlc'],
    ['{name:lower}/SDLC', ['--kind', 'e2e', '--id', 'M-1'], 'm-1-e2e/SDLC'],
  ]
  for (const [fmt, args, want] of cases) {
    const out = okName(cli.run('branches.py', ['name', '--repo', repo, ...args, '--format', fmt]), `${fmt} ${args}`)
    assert.equal(out.format, fmt)
    assert.equal(out.branch, want)
    assert.ok(refOk(out.branch))
  }
})

const ID_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_.éÄ'
const LIT_CHARS = 'abcXYZ019-_./@+éÄ€:~ '
const genStr = (r, chars, lo, hi) => Array.from({ length: r.int(lo, hi) }, () => r.pick([...chars])).join('')

function refTail(kind, p) {
  switch (kind) {
    case 'run': return `run-${p.n}`
    case 'slice': return p.id
    case 'milestone': return p.id
    case 'e2e': return `${p.id}-e2e`
    case 'e2e-area': return `${p.id}-e2e-${p.area}`
    case 'state': return `state-${p.ts}`
    default: throw new Error(kind)
  }
}

function genParts(r, kind) {
  const id = r.bool(0.5) ? `M-${r.int(0, 999)}` : genStr(r, ID_CHARS, 1, 12)
  if (kind === 'run') return { n: r.pick([0, 1, 2, r.int(0, 1e6), r.int(0, 2 ** 31)]) }
  if (kind === 'e2e-area') return { id, area: genStr(r, ID_CHARS, 1, 8) }
  if (kind === 'state') return { ts: String(r.int(0, 99999999999999)).padStart(14, '0') }
  return { id }
}

function propertyName(seed, runs, kinds) {
  const r = rng(seed)
  const inputs = Array.from({ length: runs }, () => {
    const kind = r.pick(kinds)
    const lower = r.bool(0.4)
    const prefix = genStr(r, LIT_CHARS, 0, 10)
    const suffix = genStr(r, LIT_CHARS, 0, 6)
    return { kind, lower, prefix, suffix, fmt: prefix + (lower ? '{name:lower}' : '{name}') + suffix, parts: genParts(r, kind) }
  })
  const calls = inputs.flatMap((i) => [
    { fn: 'name', args: [i.fmt, i.kind], kwargs: i.parts },
    { fn: 'name', args: [i.fmt, i.kind], kwargs: i.parts },
    { fn: 'tail', args: [i.kind], kwargs: i.parts },
  ])
  const res = api(calls)
  const violations = []
  inputs.forEach((i, k) => {
    const [a, b, t] = res.slice(3 * k, 3 * k + 3)
    let tl = refTail(i.kind, i.parts)
    if (i.lower) tl = tl.toLowerCase()
    const want = i.prefix + tl + i.suffix
    if (a.outcome !== 'return' || a.value !== want) violations.push({ i, got: a, want })
    else if (b.value !== a.value) violations.push({ i, got: b, want: a.value, why: 'not deterministic' })
    else if (t.outcome !== 'return' || t.valueType !== 'str' || t.value !== refTail(i.kind, i.parts)) violations.push({ i, got: t, why: 'tail' })
  })
  return { seed, runs, violations }
}

test('verify contract TC-contract-6: property name equals prefix + tail + suffix for run, milestone and e2e', () => {
  const rep = propertyName(SEED, RUNS, ['run', 'milestone', 'e2e'])
  console.log(`property name(run|milestone|e2e): seed=${rep.seed} runs=${rep.runs} violations=${rep.violations.length}`)
  assert.deepEqual(rep.violations.slice(0, 3), [], `replay with TESTKIT_SEED=${rep.seed}`)
  const r = rng(SEED ^ 0x5a5a)
  const pre = ['feature/', 'PROJ-1-', 'team/', 'x', 'a.b-', 'Release/', '']
  const suf = ['', '-wip', '/sdlc', '.x', '_y']
  const repo = cli.gitRepo()
  let n = 0
  for (let k = 0; k < 40; k++) {
    const lower = r.bool()
    const p = r.pick(pre), s = r.pick(suf)
    const fmt = p + (lower ? '{name:lower}' : '{name}') + s
    const kind = r.pick(['run', 'milestone', 'e2e'])
    const parts = kind === 'run' ? { n: r.int(0, 5000) } : { id: `M-${r.int(1, 99)}` }
    const args = kind === 'run' ? ['--n', String(parts.n)] : ['--id', parts.id]
    const out = okName(cli.run('branches.py', ['name', '--repo', repo, '--kind', kind, ...args, '--format', fmt]), fmt)
    let tl = refTail(kind, parts)
    if (lower) tl = tl.toLowerCase()
    assert.equal(out.format, fmt)
    assert.equal(out.branch, p + tl + s)
    n++
  }
  console.log(`cli format echo: seed=${SEED ^ 0x5a5a} runs=${n} violations=0`)
})

test('verify contract TC-contract-7: Python API missing parts raise Fail that names the part', () => {
  const cases = [
    [{ args: ['run'] }, 'n'],
    [{ args: ['run'], kwargs: { n: null } }, 'n'],
    [{ args: ['run'], kwargs: { n: '' } }, 'n'],
    [{ args: ['run'], kwargs: { id: '1' } }, 'n'],
    [{ args: ['milestone'] }, 'id'],
    [{ args: ['milestone'], kwargs: { id: '' } }, 'id'],
    [{ args: ['milestone'], kwargs: { n: 1 } }, 'id'],
    [{ args: ['e2e'], kwargs: { id: null } }, 'id'],
    [{ args: ['e2e'], kwargs: { id: '' } }, 'id'],
    [{ args: ['e2e'] }, 'id'],
    [{ args: ['e2e-area'], kwargs: { id: 'M-1' } }, 'area'],
    [{ args: ['e2e-area'], kwargs: { id: 'M-1', area: '' } }, 'area'],
  ]
  const res = api(cases.map(([c]) => ({ fn: 'tail', ...c })))
  res.forEach((r, i) => {
    assert.equal(r.outcome, 'Fail', JSON.stringify([cases[i], r]))
    assert.match(r.message, new RegExp(`non-empty ${cases[i][1]}$`), JSON.stringify([cases[i], r]))
  })
  const zero = api([{ fn: 'tail', args: ['run'], kwargs: { n: 0 } }, { fn: 'name', args: ['sdlc/{name}', 'run'], kwargs: { n: 0 } }])
  assert.deepEqual(zero.map((r) => r.value), ['run-0', 'sdlc/run-0'])
})

test('verify contract TC-contract-8: CLI missing or wrong part exits 2 with one JSON error', () => {
  const repo = cli.gitRepo()
  const cases = [
    [['--kind', 'run'], 'n'],
    [['--kind', 'run', '--id', '1'], 'n'],
    [['--kind', 'milestone'], 'id'],
    [['--kind', 'milestone', '--id', ''], 'id'],
    [['--kind', 'milestone', '--n', '1'], 'id'],
    [['--kind', 'e2e'], 'id'],
    [['--kind', 'e2e', '--id', ''], 'id'],
    [['--kind', 'e2e-area', '--id', 'M-1'], 'area'],
    [['--kind', 'e2e-area', '--id', 'M-1', '--area', ''], 'area'],
  ]
  for (const [args, part] of cases) badName(cli.run('branches.py', ['name', '--repo', repo, ...args]), args.join(' '), part)
  const zero = okName(cli.run('branches.py', ['name', '--repo', repo, '--kind', 'run', '--n', '0']), 'n 0')
  assert.equal(zero.branch, 'sdlc/run-0')
})

test('verify contract TC-contract-9: Python API run counter edge forms give a str or Fail', () => {
  const ns = [7, '7', true, false, 0, -1, 12, 1.5, { $float: 'nan' }, { $float: 'inf' }, { $float: '-0.0' }, [], {}, 'x', 2 ** 53, { $pow10: 4299 }, { $pow10: 5000 }]
  const res = api(ns.map((n) => ({ fn: 'tail', args: ['run'], kwargs: { n } })))
  const report = ns.map((n, i) => ({ n: JSON.stringify(n), outcome: res[i].outcome, type: res[i].type ?? res[i].valueType, value: (res[i].value ?? res[i].message ?? '').slice(0, 60) }))
  console.log(JSON.stringify(report, null, 1))
  assert.equal(res[0].value, 'run-7')
  assert.equal(res[1].value, 'run-7')
  assert.equal(res[4].value, 'run-0')
  const named = [0, 1, 2]
  for (const i of named) assert.ok(res[i].outcome === 'Fail' || res[i].valueType === 'str', JSON.stringify(report[i]))
})

test('verify contract TC-contract-10: CLI --n edge forms give run-<int> or exit 2', () => {
  const repo = cli.gitRepo()
  const values = ['0', '1', '12', '-1', '1.5', 'abc', ' 1', '+1', '0x1', '1_000', '١', '१२',
    ...load('integer-forms', { argv: true }).map((e) => e.value),
    ...load('unicode-digits', { argv: true }).map((e) => e.value),
    ...load('huge-integers', { argv: true }).map((e) => e.value)]
  const rows = []
  for (const v of values) {
    const t = cli.run('branches.py', ['name', '--repo', repo, '--kind', 'run', '--n', v])
    assert.doesNotMatch(t.stderr, /Traceback/, `${JSON.stringify(v)} ${t.stderr}`)
    assert.ok(t.status === 0 || t.status === 2, `${JSON.stringify(v)} exit ${t.status}`)
    assert.ok(t.json && typeof t.json === 'object', `${JSON.stringify(v)} no JSON`)
    assert.ok(t.treeUnchanged)
    let parsed = null
    const py = spawnSync('python3', ['-I', '-c', 'import sys\ntry:\n print(int(sys.argv[1]))\nexcept Exception:\n print("REFUSED")', v], { encoding: 'utf8' })
    parsed = py.stdout.trim()
    if (parsed === 'REFUSED') {
      assert.equal(t.status, 2, `${JSON.stringify(v)} accepted but int() refuses`)
      rows.push(`${JSON.stringify(v).slice(0, 24)} -> exit 2 ${t.json.error.slice(0, 50)}`)
    } else {
      assert.equal(t.status, 0, `${JSON.stringify(v)} refused but int() gives ${parsed}`)
      assert.equal(t.json.branch, `sdlc/run-${parsed}`)
      const okRef = refOk(t.json.branch)
      if (!parsed.startsWith('-')) assert.ok(okRef, `git refuses ${t.json.branch.slice(0, 60)}`)
      rows.push(`${JSON.stringify(v).slice(0, 24)} -> exit 0 ${t.json.branch.slice(0, 40)}${t.json.branch.length > 40 ? '…' : ''} (len ${t.json.branch.length}, check-ref-format ${okRef ? 'ok' : 'refused'})`)
    }
  }
  console.log(rows.join('\n'))
})

test('verify contract TC-contract-11: slice, state, e2e-area and e2e tails unchanged; verify, attempt and unknown kinds refused', () => {
  const res = api([
    { fn: 'tail', args: ['slice'], kwargs: { id: 'S-001' } },
    { fn: 'tail', args: ['state'], kwargs: { ts: '20261008101500' } },
    { fn: 'tail', args: ['e2e-area'], kwargs: { id: 'M-1', area: 'api' } },
    { fn: 'tail', args: ['e2e'], kwargs: { id: 'M-1' } },
    { fn: 'tail', args: ['e2e'], kwargs: { id: 'M-1', area: 'api' } },
    { fn: 'tail', args: ['verify'], kwargs: { id: 'S-001', round: 0, profile: 'cli', part: 0 } },
    { fn: 'tail', args: ['attempt'], kwargs: { id: 'S-001', n: 1 } },
    { fn: 'tail', args: ['foo'] },
  ])
  assert.deepEqual(res.slice(0, 5).map((r) => r.value), ['S-001', 'state-20261008101500', 'M-1-e2e-api', 'M-1-e2e', 'M-1-e2e'])
  assert.notEqual(res[3].value, res[2].value)
  for (const r of res.slice(5)) assert.equal(r.outcome, 'Fail')
  const repo = cli.gitRepo()
  for (const k of ['verify', 'attempt']) {
    const out = badName(cli.run('branches.py', ['name', '--repo', repo, '--kind', k, '--id', 'S-001', '--n', '1', '--round', '0', '--profile', 'cli', '--part', '0']), k)
    assert.match(out.error, /no branch name is defined for kind/)
  }
  const out = badName(cli.run('branches.py', ['name', '--repo', repo, '--kind', 'foo', '--id', 'S-001']), 'foo')
  for (const k of ['run', 'slice', 'milestone', 'e2e', 'e2e-area', 'state']) assert.match(out.error, new RegExp(`\\b${k}\\b`))
})

test('verify contract TC-contract-12: property every TAILS kind gives a str and sdlc/ names', () => {
  const kinds = ['run', 'slice', 'milestone', 'e2e', 'e2e-area', 'state']
  const keys = api([{ fn: 'tail', args: ['nope'] }])
  assert.equal(keys[0].outcome, 'Fail')
  const rep = propertyName(SEED ^ 0x1234, RUNS, kinds)
  console.log(`property tail(all kinds): seed=${SEED ^ 0x1234} runs=${RUNS} violations=${rep.violations.length}`)
  assert.deepEqual(rep.violations.slice(0, 3), [])
  const r = rng(SEED ^ 0x777)
  const inputs = Array.from({ length: RUNS }, () => { const kind = r.pick(kinds); return { kind, parts: genParts(r, kind) } })
  const res = api(inputs.map((i) => ({ fn: 'name', args: ['sdlc/{name}', i.kind], kwargs: i.parts })))
  const bad = res.filter((x, k) => x.outcome !== 'return' || !x.value.startsWith('sdlc/') || x.value !== `sdlc/${refTail(inputs[k].kind, inputs[k].parts)}`)
  console.log(`property name(sdlc/{name}): seed=${SEED ^ 0x777} runs=${RUNS} violations=${bad.length}`)
  assert.equal(bad.length, 0)
})

test('verify contract TC-contract-13: branches.py imports only the Python standard library', () => {
  const r = spawnSync('python3', ['-I', '-c', `
import ast, sys
tree = ast.parse(open(sys.argv[1]).read())
mods = set()
for node in ast.walk(tree):
    if isinstance(node, ast.Import): mods.update(a.name.split('.')[0] for a in node.names)
    if isinstance(node, ast.ImportFrom): mods.add((node.module or '').split('.')[0])
print(sorted(mods)); print(sorted(m for m in mods if m not in sys.stdlib_module_names))
`, join(SKILL, 'branches.py')], { encoding: 'utf8' })
  console.log(r.stdout)
  assert.equal(r.stdout.trim().split('\n')[1], '[]')
  assert.match(readFileSync(join(SKILL, 'branches.py'), 'utf8'), /^#!\/usr\/bin\/env python3/)
})
