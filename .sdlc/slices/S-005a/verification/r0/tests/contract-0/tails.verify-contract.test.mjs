import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const REPO = process.env.VERIFY_REPO ?? '/Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run'
const SKILL = join(REPO, 'skills/sdlc')
const { rng, defaultSeed } = await import(join(SKILL, 'test/testkit/property.mjs'))
const { cliRunner } = await import(join(SKILL, 'test/testkit/cli-runner.mjs'))
const { scratch } = await import(join(SKILL, 'test/harness.mjs'))

const RUNS = Number.parseInt(process.env.VERIFY_RUNS ?? '2000', 10)
const SEED = defaultSeed()
const LOG = process.env.VERIFY_LOG

const record = (line) => {
  console.log(line)
  if (LOG) writeFileSync(LOG, line + '\n', { flag: 'a' })
}

const CONSUMER = `
import json, sys
from datetime import datetime, timezone
sys.path.insert(0, sys.argv[1])
import branches
req = json.load(sys.stdin)
out = []
for c in req:
    before = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
    try:
        fn = getattr(branches, c["fn"])
        v = fn(*c.get("args", []), **c.get("kwargs", {}))
        r = {"outcome": "return", "value": v}
    except branches.Fail as e:
        r = {"outcome": "Fail", "message": str(e)}
    except BaseException as e:
        r = {"outcome": "exception", "type": type(e).__name__, "message": str(e)[:500]}
    r["before"] = before
    r["after"] = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
    out.append(r)
print(json.dumps(out, default=repr))
`

function py(calls, { env = {} } = {}) {
  const r = spawnSync('python3', ['-I', '-c', CONSUMER, SKILL], {
    cwd: scratch('verify-contract-'),
    input: JSON.stringify(calls),
    encoding: 'utf8',
    env: { PATH: process.env.PATH, PYTHONUTF8: '1', PYTHONDONTWRITEBYTECODE: '1', ...env },
    maxBuffer: 256 * 1024 * 1024,
  })
  assert.equal(r.status, 0, r.stderr)
  return JSON.parse(r.stdout)
}

const call = (fn, args, kwargs = {}) => ({ fn, args, kwargs })
const one = (fn, args, kwargs, opts) => py([call(fn, args, kwargs)], opts)[0]

const PROFILES = ['http-api', 'async', 'concurrency', 'data', 'ui', 'i18n', 'cli', 'contract', 'security', 'limits']
const FORMATS = [
  ['sdlc/', '', false], ['feature/PROJ-1-', '', false], ['feature/PROJ-1-', '', true], ['x/', '/y', false],
  ['x/', '/y', true], ['team/ABC-', '-wip', true], ['', '', false], ['', '-tail', true], ['a.b/', '', false],
]
const fmtOf = ([p, s, lower]) => `${p}${lower ? '{name:lower}' : '{name}'}${s}`

function genId(r) {
  const d = () => String(r.int(0, 999)).padStart(3, '0')
  return r.pick([
    () => `S-${d()}`, () => `S-fix-${r.int(0, 50)}`, () => `S-fix-M-${r.int(1, 9)}-${r.int(1, 20)}`,
    () => `S-${d()}${r.pick(['a', 'b', 'c'])}`, () => `S-${d()}`,
  ])()
}
const genInt = (r) => r.pick([0, 0, 1, 2, r.int(0, 99), r.int(0, 1e6), r.int(0, 2 ** 31)])

function reference(kind, p) {
  if (kind === 'verify') return `${p.id}-v${p.round}-${p.profile}-${p.part}`
  if (kind === 'attempt') return `${p.id}-attempt-${p.n}`
  throw new Error(kind)
}
const referenceName = ([prefix, suffix, lower], kind, p) => {
  const t = reference(kind, p)
  return prefix + (lower ? t.toLowerCase() : t) + suffix
}

test('verify contract: surface of branches.py as a consumer imports it', () => {
  const r = spawnSync('python3', ['-I', '-c', `
import inspect, json, sys
sys.path.insert(0, sys.argv[1])
import branches
pub = {}
for n, v in sorted(vars(branches).items()):
    if n.startswith('_') or inspect.ismodule(v):
        continue
    if inspect.isfunction(v) or inspect.isclass(v):
        try: pub[n] = str(inspect.signature(v))
        except (TypeError, ValueError): pub[n] = 'class'
    else:
        pub[n] = repr(v)[:120]
mods = sorted({n for n, v in vars(branches).items() if inspect.ismodule(v)})
print(json.dumps({'public': pub, 'modules': mods, 'stdlib': sorted(sys.stdlib_module_names & set(mods))}))
`, SKILL], { encoding: 'utf8', cwd: scratch('verify-contract-') })
  assert.equal(r.status, 0, r.stderr)
  const s = JSON.parse(r.stdout)
  record('surface ' + JSON.stringify(s.public))
  record('modules ' + JSON.stringify(s.modules))
  assert.equal(s.public.tail, '(kind, **parts)')
  assert.equal(s.public.name, '(fmt, kind, **parts)')
  assert.equal(s.public.split, '(fmt)')
  assert.equal(s.public.load_format, '(repo)')
  assert.equal(s.public.validate_format, '(fmt)')
  assert.ok('Fail' in s.public)
  assert.match(s.public.KINDS, /'verify'/)
  assert.match(s.public.KINDS, /'attempt'/)
  assert.deepEqual(s.modules, s.stdlib, 'branches.py imports only the standard library')
})

test('verify contract: VS-1 name(fmt, "state") gives state- and 14 UTC digits under far time zones', () => {
  const zones = ['Pacific/Kiritimati', 'America/Adak', 'Etc/GMT+12', 'Etc/GMT-14', 'Asia/Kathmandu', 'UTC']
  const fmts = [['sdlc/{name}', 'sdlc/state-'], ['feature/PROJ-1-{name}', 'feature/PROJ-1-state-'], ['feature/PROJ-1-{name:lower}', 'feature/PROJ-1-state-'], ['x/{name}/y', 'x/state-']]
  const extras = [{}, { id: 'S-001' }, { n: 3 }, { round: 2, profile: 'cli', part: 1 }, { id: 'S-001', n: 0, area: 'api', round: 0, part: 0 }]
  for (const TZ of zones) {
    const calls = []
    for (const [fmt] of fmts) for (const extra of extras) calls.push(call('name', [fmt, 'state'], extra))
    calls.push(call('tail', ['state'], {}))
    const res = py(calls, { env: { TZ } })
    let i = 0
    for (const [fmt, prefix] of fmts) for (const extra of extras) {
      const r = res[i++]
      assert.equal(r.outcome, 'return', `${TZ} ${fmt} ${JSON.stringify(extra)} ${r.message}`)
      const suffix = fmt.endsWith('/y') ? '/y' : ''
      const m = r.value.match(new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}(\\d{14})${suffix.replace('/', '\\/')}$`))
      assert.ok(m, `${TZ} ${fmt} gave ${r.value}`)
      assert.ok(r.before <= m[1] && m[1] <= r.after, `${TZ}: ${m[1]} not in [${r.before}, ${r.after}]`)
    }
    const t = res[i]
    assert.match(t.value, /^state-\d{14}$/)
    record(`VS-1 TZ=${TZ} tail=${t.value} window=[${t.before},${t.after}]`)
  }
})

test('verify contract: VS-1 property: state name stays in the UTC window for any extra parts', () => {
  const r = rng(SEED)
  const inputs = Array.from({ length: RUNS }, () => {
    const extra = {}
    if (r.bool()) extra.id = genId(r)
    if (r.bool()) extra.n = genInt(r)
    if (r.bool()) extra.round = genInt(r)
    if (r.bool()) extra.part = genInt(r)
    if (r.bool()) extra.profile = r.pick(PROFILES)
    return { f: r.pick(FORMATS), extra }
  })
  const res = py(inputs.map((x) => call('name', [fmtOf(x.f), 'state'], x.extra)), { env: { TZ: 'Pacific/Kiritimati' } })
  const bad = []
  inputs.forEach((x, i) => {
    const out = res[i]
    const [p, s] = x.f
    const ok = out.outcome === 'return' && out.value.startsWith(p + 'state-') && out.value.endsWith(s)
    const digits = ok ? out.value.slice(p.length + 6, out.value.length - s.length) : ''
    if (!ok || !/^\d{14}$/.test(digits) || digits < out.before || digits > out.after) bad.push({ x, out })
  })
  record(`property state-utc-window: seed=${SEED} runs=${RUNS} violations=${bad.length}`)
  assert.deepEqual(bad.slice(0, 3), [])
})

test('verify contract: VS-2 an explicit ts is used as given; empty and None generate one', () => {
  const res = py([
    call('name', ['sdlc/{name}', 'state'], { ts: '20261008101500' }),
    call('tail', ['state'], { ts: '20261008101500' }),
    call('name', ['feature/PROJ-1-{name:lower}', 'state'], { ts: '20261008101500' }),
    call('name', ['sdlc/{name}', 'state'], { ts: '' }),
    call('name', ['sdlc/{name}', 'state'], { ts: null }),
  ], { env: { TZ: 'America/Adak' } })
  assert.equal(res[0].value, 'sdlc/state-20261008101500')
  assert.equal(res[1].value, 'state-20261008101500')
  assert.equal(res[2].value, 'feature/PROJ-1-state-20261008101500')
  for (const r of res.slice(3)) {
    const d = r.value.slice('sdlc/state-'.length)
    assert.match(d, /^\d{14}$/)
    assert.ok(r.before <= d && d <= r.after)
  }
})

test('verify contract: VS-2 property: any 14-digit ts passes through unchanged', () => {
  const r = rng(((SEED ^ 0x55) >>> 0))
  const inputs = Array.from({ length: RUNS }, () => ({ f: r.pick(FORMATS), ts: Array.from({ length: 14 }, () => r.int(0, 9)).join('') }))
  const res = py(inputs.map((x) => call('name', [fmtOf(x.f), 'state'], { ts: x.ts })))
  const bad = inputs.filter((x, i) => res[i].value !== x.f[0] + 'state-' + x.ts + x.f[1])
  record(`property state-explicit-ts: seed=${((SEED ^ 0x55) >>> 0)} runs=${RUNS} violations=${bad.length}`)
  assert.deepEqual(bad.slice(0, 3), [])
})

test('verify contract: VS-2 corner ts values are recorded', () => {
  const values = [0, '0', 1.5, true, false, ['x'], '../../x', 'a/b', ' 2026', '2026\n', '\u001b[31m', '@{-1}', 'x'.repeat(300), '١٢']
  const res = py(values.map((ts) => call('name', ['sdlc/{name}', 'state'], { ts })))
  const rows = values.map((ts, i) => `ts=${JSON.stringify(ts)} -> ${res[i].outcome} ${JSON.stringify(res[i].value ?? res[i].message)?.slice(0, 80)}`)
  for (const row of rows) record('VS-2 corner ' + row)
  assert.equal(res[0].value, 'sdlc/state-0')
  assert.equal(res[1].value, 'sdlc/state-0')
  for (const r of res) assert.notEqual(r.outcome, 'exception')
})

test('verify contract: VS-3 spec example and table row for verify, round 0 and part 0', () => {
  const res = py([
    call('name', ['sdlc/{name}', 'verify'], { id: 'S-001', round: 0, profile: 'http-api', part: 0 }),
    call('tail', ['verify'], { id: 'S-001', round: 0, profile: 'http-api', part: 0 }),
    call('name', ['sdlc/{name}', 'verify'], { id: 'S-fix-M-1-2', round: 12, profile: 'concurrency', part: 7 }),
    call('name', ['sdlc/{name}', 'verify'], { id: 'S-013a', round: 1, profile: 'i18n', part: 0 }),
  ])
  assert.equal(res[0].value, 'sdlc/S-001-v0-http-api-0')
  assert.equal(res[1].value, 'S-001-v0-http-api-0')
  assert.equal(res[2].value, 'sdlc/S-fix-M-1-2-v12-concurrency-7')
  assert.equal(res[3].value, 'sdlc/S-013a-v1-i18n-0')
})

test('verify contract: VS-3 property: verify name equals the spec template and the loop builder', () => {
  const loop = readFileSync(join(SKILL, 'sdlc-loop.js'), 'utf8')
  assert.ok(loop.includes('const branch = g => `sdlc/${id}-v${round}-${g.profile}-${g.part}`'))
  const loopBranch = (id, round, g) => `sdlc/${id}-v${round}-${g.profile}-${g.part}`
  const r = rng(((SEED ^ 0x33) >>> 0))
  const inputs = Array.from({ length: RUNS }, () => ({ f: r.pick(FORMATS), p: { id: genId(r), round: genInt(r), profile: r.pick(PROFILES), part: genInt(r) } }))
  const res = py(inputs.flatMap((x) => [call('name', [fmtOf(x.f), 'verify'], x.p), call('tail', ['verify'], x.p), call('name', [fmtOf(x.f), 'verify'], x.p)]))
  const bad = []
  inputs.forEach((x, i) => {
    const [n, t, n2] = res.slice(i * 3, i * 3 + 3)
    if (n.value !== referenceName(x.f, 'verify', x.p)) bad.push({ x, n })
    if (t.value !== reference('verify', x.p)) bad.push({ x, t })
    if (n2.value !== n.value) bad.push({ x, n2, why: 'not deterministic' })
    if (fmtOf(x.f) === 'sdlc/{name}' && n.value !== loopBranch(x.p.id, x.p.round, x.p)) bad.push({ x, n, why: 'loop builder differs' })
  })
  record(`property verify-template: seed=${((SEED ^ 0x33) >>> 0)} runs=${RUNS} violations=${bad.length}`)
  assert.deepEqual(bad.slice(0, 3), [])
})

test('verify contract: VS-4 a missing, None or empty verify part raises Fail naming the part', () => {
  const full = { id: 'S-001', round: 0, profile: 'http-api', part: 0 }
  const calls = [], expect = []
  for (const k of Object.keys(full)) {
    for (const v of ['__omit__', null, '']) {
      const p = { ...full }
      if (v === '__omit__') delete p[k]; else p[k] = v
      calls.push(call('tail', ['verify'], p), call('name', ['feature/PROJ-1-{name:lower}', 'verify'], p))
      expect.push(k, k)
    }
  }
  const res = py(calls)
  res.forEach((r, i) => {
    assert.equal(r.outcome, 'Fail', JSON.stringify(calls[i]))
    assert.ok(r.message.includes(`non-empty ${expect[i]}`) && r.message.includes('verify'), r.message)
  })
  record(`VS-4 missing-part Fail messages: ${[...new Set(res.map((r) => r.message))].join(' | ')}`)
})

test('verify contract: VS-4 property: dropping any subset of verify parts fails on the first missing part in order', () => {
  const order = ['id', 'round', 'profile', 'part']
  const r = rng(((SEED ^ 0x44) >>> 0))
  const inputs = Array.from({ length: RUNS }, () => {
    const p = { id: genId(r), round: genInt(r), profile: r.pick(PROFILES), part: genInt(r) }
    const drop = order.filter(() => r.bool(0.4))
    if (!drop.length) drop.push(r.pick(order))
    for (const k of drop) { const how = r.int(0, 2); if (how === 0) delete p[k]; else p[k] = how === 1 ? null : '' }
    return { p, first: order.find((k) => drop.includes(k)) }
  })
  const res = py(inputs.map((x) => call('tail', ['verify'], x.p)))
  const bad = inputs.filter((x, i) => res[i].outcome !== 'Fail' || res[i].message !== `a verify branch name needs a non-empty ${x.first}`)
  record(`property verify-missing-part: seed=${((SEED ^ 0x44) >>> 0)} runs=${RUNS} violations=${bad.length}`)
  assert.deepEqual(bad.slice(0, 3), [])
})

test('verify contract: VS-4 corner part types through the API are recorded', () => {
  const full = { id: 'S-001', round: 0, profile: 'http-api', part: 0 }
  const cases = [['round', -1], ['round', false], ['round', 1.5], ['round', '0'], ['part', -1], ['profile', '../x'], ['profile', 'a b'], ['profile', '\u001b'], ['id', '-x'], ['id', 'İ']]
  const res = py(cases.map(([k, v]) => call('name', ['sdlc/{name:lower}', 'verify'], { ...full, [k]: v })))
  cases.forEach(([k, v], i) => record(`VS-4 corner ${k}=${JSON.stringify(v)} -> ${res[i].outcome} ${JSON.stringify(res[i].value ?? res[i].message)}`))
  for (const r of res) assert.notEqual(r.outcome, 'exception')
  for (const r of res) if (r.outcome === 'return') assert.ok(r.value.startsWith('sdlc/'), r.value)
})

test('verify contract: VS-5 spec example and table row for attempt', () => {
  const res = py([
    call('name', ['sdlc/{name}', 'attempt'], { id: 'S-001', n: 1 }),
    call('tail', ['attempt'], { id: 'S-001', n: 1 }),
    call('name', ['sdlc/{name}', 'attempt'], { id: 'S-fix-M-1-2', n: 3 }),
    call('name', ['sdlc/{name}', 'attempt'], { id: 'S-001', n: 0 }),
    call('name', ['sdlc/{name}', 'attempt'], { id: 'S-001', n: 1, round: 4, profile: 'cli', part: 2, area: 'api', ts: '20261008101500' }),
    call('name', ['sdlc/{name}', 'attempt'], { id: 'S-001', n: 10 ** 15 }),
  ])
  assert.deepEqual(res.map((r) => r.value), ['sdlc/S-001-attempt-1', 'S-001-attempt-1', 'sdlc/S-fix-M-1-2-attempt-3', 'sdlc/S-001-attempt-0', 'sdlc/S-001-attempt-1', 'sdlc/S-001-attempt-1000000000000000'])
})

test('verify contract: VS-5 property: attempt name equals the spec template, extra parts never leak', () => {
  const r = rng(((SEED ^ 0x66) >>> 0))
  const inputs = Array.from({ length: RUNS }, () => {
    const p = { id: genId(r), n: genInt(r) }
    const extra = {}
    if (r.bool()) extra.round = genInt(r)
    if (r.bool()) extra.profile = r.pick(PROFILES)
    if (r.bool()) extra.part = genInt(r)
    if (r.bool()) extra.area = r.pick(['api', 'web'])
    return { f: r.pick(FORMATS), p, extra }
  })
  const res = py(inputs.flatMap((x) => [call('name', [fmtOf(x.f), 'attempt'], { ...x.p, ...x.extra }), call('tail', ['attempt'], x.p)]))
  const bad = inputs.filter((x, i) => res[2 * i].value !== referenceName(x.f, 'attempt', x.p) || res[2 * i + 1].value !== reference('attempt', x.p))
  record(`property attempt-template: seed=${((SEED ^ 0x66) >>> 0)} runs=${RUNS} violations=${bad.length}`)
  assert.deepEqual(bad.slice(0, 3), [])
})

test('verify contract: VS-6 a missing, None or empty attempt part raises Fail naming the part', () => {
  const cases = [[{ n: 1 }, 'id'], [{ id: 'S-001' }, 'n'], [{ id: null, n: 1 }, 'id'], [{ id: 'S-001', n: null }, 'n'], [{ id: '', n: 1 }, 'id'], [{ id: 'S-001', n: '' }, 'n'], [{}, 'id']]
  const res = py(cases.flatMap(([p]) => [call('tail', ['attempt'], p), call('name', ['x/{name}/y', 'attempt'], p)]))
  res.forEach((r, i) => {
    const [, part] = cases[Math.floor(i / 2)]
    assert.equal(r.outcome, 'Fail')
    assert.equal(r.message, `a attempt branch name needs a non-empty ${part}`)
  })
  const corner = py([call('name', ['sdlc/{name}', 'attempt'], { id: 'S-001', n: -1 }), call('name', ['sdlc/{name}', 'attempt'], { id: 'S-001', n: false }), call('name', ['sdlc/{name}', 'attempt'], { id: 'S-001', n: 1.0 })])
  record(`VS-6 corner n=-1 -> ${corner[0].value}; n=false -> ${corner[1].value}; n=1.0 -> ${corner[2].value}`)
})

test('verify contract: VS-7 a custom format wraps verify and attempt tails, lowercasing only the tail', () => {
  const res = py([
    call('name', ['feature/PROJ-1-{name:lower}', 'verify'], { id: 'S-001', round: 0, profile: 'http-api', part: 0 }),
    call('name', ['feature/PROJ-1-{name:lower}', 'attempt'], { id: 'S-001', n: 1 }),
    call('name', ['x/{name}/y', 'verify'], { id: 'S-001', round: 0, profile: 'http-api', part: 0 }),
    call('name', ['x/{name}/y', 'attempt'], { id: 'S-001', n: 1 }),
    call('name', ['ABC/{name:lower}/DEF', 'attempt'], { id: 'S-FIX-M-1-2', n: 3 }),
    call('split', ['ABC/{name:lower}/DEF']),
  ])
  assert.equal(res[0].value, 'feature/PROJ-1-s-001-v0-http-api-0')
  assert.equal(res[1].value, 'feature/PROJ-1-s-001-attempt-1')
  assert.equal(res[2].value, 'x/S-001-v0-http-api-0/y')
  assert.equal(res[3].value, 'x/S-001-attempt-1/y')
  assert.equal(res[4].value, 'ABC/s-fix-m-1-2-attempt-3/DEF')
  assert.deepEqual(res[5].value, ['ABC/', '/DEF', true])
})

test('verify contract: VS-7 consumer view: --format wins over config.branchFormat, invalid format exits 2', () => {
  const run = cliRunner()
  const repo = run.gitRepo({ files: { '.sdlc/config.json': { branchFormat: 'feature/PROJ-1-{name:lower}' } } })
  const v = ['--kind', 'verify', '--id', 'S-001', '--round', '0', '--profile', 'http-api', '--part', '0']
  const a = ['--kind', 'attempt', '--id', 'S-001', '--n', '1']
  const fromConfig = [run.run('branches.py', ['name', '--repo', repo, ...v]), run.run('branches.py', ['name', '--repo', repo, ...a])]
  assert.deepEqual(fromConfig.map((t) => [t.status, t.json.branch]), [[0, 'feature/PROJ-1-s-001-v0-http-api-0'], [0, 'feature/PROJ-1-s-001-attempt-1']])
  const flag = run.run('branches.py', ['name', '--repo', repo, ...v, '--format', 'x/{name}/y'])
  assert.equal(flag.json.branch, 'x/S-001-v0-http-api-0/y')
  const bad = run.run('branches.py', ['name', '--repo', repo, ...a, '--format', 'x/{name}{name}'])
  assert.equal(bad.status, 2)
  assert.equal(bad.json.ok, false)
  assert.equal(bad.stdout.trim().split('\n').length, 1)
  assert.equal(bad.stderr, '')
  for (const t of [...fromConfig, flag, bad]) assert.ok(t.treeUnchanged)
  record(`VS-7 cli: config=${fromConfig.map((t) => t.json.branch).join(', ')} flag=${flag.json.branch} invalid=${bad.stdout.trim()}`)
})

test('verify contract: VS-2 consumer view: the CLI has no --ts flag and refuses it with one JSON error', () => {
  const run = cliRunner()
  const repo = run.gitRepo({})
  const t = run.run('branches.py', ['name', '--repo', repo, '--kind', 'state', '--ts', '20261008101500'])
  assert.equal(t.status, 2)
  assert.equal(t.stdout.trim().split('\n').length, 1)
  assert.equal(t.json.ok, false)
  assert.equal(t.stderr, '')
  assert.ok(t.treeUnchanged)
  record(`VS-2 cli --ts: exit=${t.status} ${t.stdout.trim()}`)
})

test('verify contract: VS-3 VS-5 consumer view: the CLI output equals the API name for sampled inputs', () => {
  const run = cliRunner()
  const repo = run.gitRepo({})
  const r = rng(((SEED ^ 0x77) >>> 0))
  const N = Number.parseInt(process.env.VERIFY_CLI_RUNS ?? '120', 10)
  const inputs = Array.from({ length: N }, (_, i) => i % 2
    ? { kind: 'verify', p: { id: genId(r), round: genInt(r), profile: PROFILES[i % PROFILES.length], part: genInt(r) } }
    : { kind: 'attempt', p: { id: genId(r), n: genInt(r) } })
  const api = py(inputs.map((x) => call('name', ['sdlc/{name}', x.kind], x.p)))
  const bad = []
  inputs.forEach((x, i) => {
    const args = ['name', '--repo', repo, '--kind', x.kind]
    for (const [k, v] of Object.entries(x.p)) args.push(`--${k}`, String(v))
    const t = run.run('branches.py', args)
    if (t.status !== 0 || t.json.branch !== api[i].value || t.json.branch !== 'sdlc/' + reference(x.kind, x.p) || t.stderr !== '') bad.push({ x, status: t.status, out: t.stdout, api: api[i] })
  })
  record(`consumer cli-equals-api: seed=${((SEED ^ 0x77) >>> 0)} runs=${N} violations=${bad.length}`)
  assert.deepEqual(bad.slice(0, 3), [])
})

test('verify contract: VS-3 VS-5 property: integer and string parts give the same tail', () => {
  const r = rng(((SEED ^ 0x88) >>> 0))
  const inputs = Array.from({ length: RUNS }, () => {
    const id = genId(r), round = genInt(r), part = genInt(r), n = genInt(r), profile = r.pick(PROFILES)
    return { id, round, part, n, profile }
  })
  const res = py(inputs.flatMap((x) => [
    call('tail', ['verify'], { id: x.id, round: x.round, profile: x.profile, part: x.part }),
    call('tail', ['verify'], { id: x.id, round: String(x.round), profile: x.profile, part: String(x.part) }),
    call('tail', ['attempt'], { id: x.id, n: x.n }),
    call('tail', ['attempt'], { id: x.id, n: String(x.n) }),
  ]))
  const bad = inputs.filter((x, i) => {
    const [a, b, c, d] = res.slice(4 * i, 4 * i + 4)
    return a.value !== b.value || c.value !== d.value || a.value !== reference('verify', x) || c.value !== reference('attempt', x)
  })
  record(`property int-string-equal: seed=${((SEED ^ 0x88) >>> 0)} runs=${RUNS} violations=${bad.length}`)
  assert.deepEqual(bad.slice(0, 3), [])
})

test('verify contract: VS-4 VS-6 hostile profiles and ids through the API are checked against git check-ref-format', () => {
  const hostile = ['a/b', '../x', 'a b', 'a\tb', '\u001b[31m', '--help', '-x', 'a~1', 'a^b', 'a:b', 'a@{1}', 'a..b', 'x.lock', 'a\\b', 'a?b', 'a*b', 'a[b']
  const calls = hostile.flatMap((h) => [
    call('name', ['sdlc/{name}', 'verify'], { id: 'S-001', round: 0, profile: h, part: 0 }),
    call('name', ['sdlc/{name}', 'attempt'], { id: h, n: 1 }),
  ])
  const res = py(calls)
  const unsafe = []
  res.forEach((r, i) => {
    assert.notEqual(r.outcome, 'exception', JSON.stringify(calls[i]))
    if (r.outcome !== 'return') return
    const g = spawnSync('git', ['check-ref-format', `refs/heads/${r.value}`], { encoding: 'utf8' })
    if (g.status !== 0) unsafe.push(`${calls[i].args[1]} ${JSON.stringify(calls[i].kwargs)} -> ${JSON.stringify(r.value)}`)
  })
  record(`VS-4/VS-6 API hostile inputs: ${res.length} calls, ${unsafe.length} returned names git check-ref-format refuses`)
  for (const u of unsafe) record('  unsafe ' + u)
})
