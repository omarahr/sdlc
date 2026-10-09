import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO = process.env.VERIFY_REPO ?? resolve(HERE, '../../../../../../..')
const SKILL = join(REPO, 'skills/sdlc')
const BRANCHES = join(SKILL, 'branches.py')
const kit = await import(join(SKILL, 'test/testkit/property.mjs'))
const { rng, arb, materializeConfig } = kit

const RUNS = Number.parseInt(process.env.VERIFY_RUNS ?? '1000', 10)
const SEED = Number.parseInt(process.env.TESTKIT_SEED ?? '20261009', 10) >>> 0
const DEFAULT = 'sdlc/{name}'

const scratchRoot = mkdtempSync(join(tmpdir(), 'sdlc-verify-contract-'))
const scratch = (p) => mkdtempSync(join(scratchRoot, p))

const CONSUMER = `
import json, sys, datetime
sys.path.insert(0, sys.argv[1])
import branches
req = json.load(sys.stdin)
out = []
for c in req:
    fn = getattr(branches, c["fn"])
    try:
        v = fn(*c.get("args", []), **c.get("kwargs", {}))
        out.append({"outcome": "return", "value": v, "type": type(v).__name__})
    except BaseException as e:
        out.append({"outcome": "Fail" if isinstance(e, branches.Fail) else "exception", "type": type(e).__name__,
                    "mro": [k.__name__ for k in type(e).__mro__], "message": str(e)})
print(json.dumps({"results": out, "failMro": [k.__name__ for k in branches.Fail.__mro__],
                  "local": datetime.datetime.now().strftime("%Y%m%d%H%M%S"),
                  "utc": datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%d%H%M%S")}))
`

function py(calls, { env = {} } = {}) {
  const r = spawnSync('python3', ['-I', '-c', CONSUMER, SKILL], {
    cwd: scratch('cwd-'),
    input: JSON.stringify(calls),
    encoding: 'utf8',
    env: { PATH: process.env.PATH, PYTHONUTF8: '1', PYTHONDONTWRITEBYTECODE: '1', ...env },
    maxBuffer: 256 * 1024 * 1024,
  })
  if (r.status !== 0) throw new Error(`consumer exit ${r.status}: ${r.stderr}`)
  return JSON.parse(r.stdout)
}

const tailCall = (kind, kwargs = {}) => ({ fn: 'tail', args: [kind], kwargs })
const utcStamp = () => new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)
const namesPart = (msg, part) => new RegExp(`(^|[^-\\w])${part}\\b`).test(msg.replaceAll('e2e-area', ''))
const validStamp = (d) => {
  const [y, mo, da, h, mi, s] = [d.slice(0, 4), d.slice(4, 6), d.slice(6, 8), d.slice(8, 10), d.slice(10, 12), d.slice(12, 14)].map(Number)
  const t = new Date(Date.UTC(y, mo - 1, da, h, mi, s))
  return t.getUTCFullYear() === y && t.getUTCMonth() === mo - 1 && t.getUTCDate() === da && t.getUTCHours() === h && t.getUTCMinutes() === mi && t.getUTCSeconds() === s
}

const ID_POOL = ['S-001', 'S-fix-M-1-2', 'S-013a', 'M-1', 'x', '0', 'é', 'İ', 'ß', 'Ǆ', '漢字', '\u{1f600}', 'a b', '-', '{name}', '{0}', '%s', '..', 'S-', 'A'.repeat(300)]
const genStr = (r) => Array.from({ length: r.int(1, 3) }, () => r.pick(ID_POOL)).join(r.pick(['', '-', '/']))
const genMissing = (r) => r.pick(['absent', 'empty', 'null'])
const extraParts = (r) => {
  const p = {}
  if (r.bool()) p.n = r.pick([0, 1, 7, null])
  if (r.bool()) p.round = r.pick([0, 2, null])
  if (r.bool()) p.part = r.pick([0, 1, null])
  if (r.bool()) p.profile = r.pick(['http-api', '', null])
  if (r.bool()) p.unknown = r.pick(['zz', 0, null])
  if (r.bool()) p.ts = r.pick(['20261008101500', '', null])
  return p
}
function report(label, seed, runs, violations) {
  console.log(`property ${label}: seed=${seed} runs=${runs} violations=${violations.length}`)
  if (violations.length) throw new Error(`${label} seed=${seed}\n${violations.slice(0, 5).map((v) => JSON.stringify(v).slice(0, 400)).join('\n')}`)
}

test('verify contract: tail("slice", id="S-001") is the str "S-001" (R-018 example)', () => {
  const { results } = py([tailCall('slice', { id: 'S-001' })])
  assert.deepEqual(results[0], { outcome: 'return', value: 'S-001', type: 'str' })
})

test('verify contract: slice tail with a missing, empty or None id raises Fail, never KeyError or TypeError', () => {
  const { results } = py([tailCall('slice'), tailCall('slice', { id: '' }), tailCall('slice', { id: null }), tailCall('slice', { area: 'api' })])
  for (const r of results) {
    assert.equal(r.outcome, 'Fail', JSON.stringify(r))
    assert.ok(namesPart(r.message, 'id'), r.message)
  }
})

test('verify contract: property slice tail equals the id and ignores extra parts', () => {
  const r = rng(SEED)
  const inputs = Array.from({ length: RUNS }, () => ({ id: genStr(r), ...extraParts(r) }))
  const { results } = py(inputs.map((k) => tailCall('slice', k)))
  const violations = inputs.map((k, i) => ({ k, got: results[i] })).filter(({ k, got }) => got.outcome !== 'return' || got.value !== k.id || got.type !== 'str')
  report('tail slice', SEED, RUNS, violations)
})

test('verify contract: state tail without ts is 14 UTC digits under TZ=Pacific/Kiritimati and TZ=Etc/GMT+12', () => {
  for (const tz of ['Pacific/Kiritimati', 'Etc/GMT+12']) {
    const before = utcStamp()
    const out = py([tailCall('state'), tailCall('state', { ts: '' }), tailCall('state', { ts: null })], { env: { TZ: tz } })
    const after = utcStamp()
    assert.notEqual(out.local.slice(0, 10), out.utc.slice(0, 10), `TZ ${tz} must move local time away from UTC`)
    for (const r of out.results) {
      assert.equal(r.outcome, 'return', JSON.stringify(r))
      assert.match(r.value, /^state-\d{14}$/)
      const d = r.value.slice(6)
      assert.ok(d >= before && d <= after, `${tz}: ${d} not within UTC [${before}, ${after}]`)
      assert.ok(validStamp(d), `${d} is not a valid date`)
    }
  }
})

test('verify contract: state tail with ts="20261008101500" is "state-20261008101500"', () => {
  const { results } = py([tailCall('state', { ts: '20261008101500' }), tailCall('state', { ts: '20261008101500', id: 'S-001', n: 0 })])
  for (const r of results) assert.deepEqual(r, { outcome: 'return', value: 'state-20261008101500', type: 'str' })
})

test('verify contract: property state tail keeps a given ts and stamps UTC when ts is absent, empty or None', () => {
  const r = rng(SEED + 1)
  const inputs = Array.from({ length: RUNS }, () => r.bool(0.5) ? { ts: r.pick(['20261008101500', '19991231235959', String(r.int(10 ** 13, 10 ** 14 - 1)), genStr(r)]) } : r.pick([{}, { ts: '' }, { ts: null }]))
  const before = utcStamp()
  const { results } = py(inputs.map((k) => tailCall('state', k)), { env: { TZ: 'Pacific/Kiritimati' } })
  const after = utcStamp()
  const violations = inputs.map((k, i) => ({ k, got: results[i] })).filter(({ k, got }) => {
    if (got.outcome !== 'return' || got.type !== 'str') return true
    if (k.ts) return got.value !== `state-${k.ts}`
    const d = got.value.slice(6)
    return !/^state-\d{14}$/.test(got.value) || d < before || d > after || !validStamp(d)
  })
  report('tail state', SEED + 1, RUNS, violations)
})

test('verify contract: e2e-area tail joins id and area in any keyword order (R-018 example)', () => {
  const { results } = py([tailCall('e2e-area', { id: 'M-1', area: 'api' }), tailCall('e2e-area', { area: 'api', id: 'M-1' })])
  for (const r of results) assert.deepEqual(r, { outcome: 'return', value: 'M-1-e2e-api', type: 'str' })
})

test('verify contract: e2e-area with a missing part raises the module Fail that names the part', () => {
  const calls = [], expect = []
  for (const miss of ['absent', 'empty', 'null']) {
    const v = miss === 'empty' ? '' : null
    const area = miss === 'absent' ? { id: 'M-1' } : { id: 'M-1', area: v }
    const id = miss === 'absent' ? { area: 'api' } : { id: v, area: 'api' }
    calls.push(tailCall('e2e-area', area)); expect.push(['area'])
    calls.push(tailCall('e2e-area', id)); expect.push(['id'])
  }
  calls.push(tailCall('e2e-area')); expect.push(['id', 'area'])
  calls.push(tailCall('e2e-area', { id: '', area: null })); expect.push(['id', 'area'])
  const out = py(calls)
  assert.deepEqual(out.failMro, ['Fail', 'Exception', 'BaseException', 'object'])
  out.results.forEach((r, i) => {
    assert.equal(r.outcome, 'Fail', JSON.stringify(r))
    assert.equal(r.type, 'Fail')
    assert.ok(expect[i].some((p) => namesPart(r.message, p)), `${JSON.stringify(calls[i].kwargs)} -> ${r.message}`)
  })
})

test('verify contract: property e2e-area tail matches the reference model', () => {
  const r = rng(SEED + 2)
  const genPart = () => (r.bool(0.7) ? { v: genStr(r) } : { miss: genMissing(r) })
  const inputs = Array.from({ length: RUNS }, () => {
    const id = genPart(), area = genPart(), k = extraParts(r)
    delete k.unknown
    if (id.v !== undefined) k.id = id.v; else if (id.miss !== 'absent') k.id = id.miss === 'empty' ? '' : null
    if (area.v !== undefined) k.area = area.v; else if (area.miss !== 'absent') k.area = area.miss === 'empty' ? '' : null
    return k
  })
  const { results } = py(inputs.map((k) => tailCall('e2e-area', k)))
  const missing = (v) => v === undefined || v === null || v === ''
  const violations = inputs.map((k, i) => ({ k, got: results[i] })).filter(({ k, got }) => {
    const miss = ['id', 'area'].filter((p) => missing(k[p]))
    if (!miss.length) return got.outcome !== 'return' || got.value !== `${k.id}-e2e-${k.area}`
    if (got.outcome !== 'Fail') return true
    return miss.length === 1 ? !namesPart(got.message, miss[0]) : !miss.some((p) => namesPart(got.message, p))
  })
  report('tail e2e-area', SEED + 2, RUNS, violations)
})

test('verify contract: zero-valued numeric parts are accepted and do not change the tail (VS-10)', () => {
  const { results } = py([
    tailCall('slice', { id: 'S-001', n: 0, round: 0, part: 0 }),
    tailCall('e2e-area', { id: 'M-1', area: 'api', n: 0, round: 0, part: 0 }),
    tailCall('state', { ts: '20261008101500', n: 0, round: 0, part: 0 }),
    tailCall('slice', { id: 0 }),
  ])
  assert.deepEqual(results.map((r) => r.value), ['S-001', 'M-1-e2e-api', 'state-20261008101500', '0'])
  for (const r of results) assert.equal(r.outcome, 'return')
})

test('verify contract: tail is deterministic for the same input', () => {
  const calls = []
  for (let i = 0; i < 3; i++) calls.push(tailCall('slice', { id: 'S-001' }), tailCall('e2e-area', { id: 'M-1', area: 'ui' }), tailCall('state', { ts: '20261008101500' }))
  const v = py(calls).results.map((r) => r.value)
  assert.deepEqual(v.slice(0, 3), v.slice(3, 6))
  assert.deepEqual(v.slice(0, 3), v.slice(6, 9))
})

function cfgRepo(content) {
  const repo = scratch('repo-')
  if (content === undefined) return repo
  mkdirSync(join(repo, '.sdlc'))
  writeFileSync(join(repo, '.sdlc/config.json'), typeof content === 'string' ? content : JSON.stringify(content))
  return repo
}

test('verify contract: load_format resolves the config value or the default (R-015, R-002 clause 1, VS-8)', () => {
  const cases = [
    [{ branchFormat: 'feature/PROJ-1-{name}' }, 'feature/PROJ-1-{name}'],
    [undefined, DEFAULT],
    [{ gitMode: 'pr' }, DEFAULT],
    [{ branchFormat: '' }, DEFAULT],
    [{ branchFormat: null }, DEFAULT],
    [{ branchFormat: 5 }, DEFAULT],
    [{ branchFormat: ['x/{name}'] }, DEFAULT],
    [{ branchFormat: { a: 1 } }, DEFAULT],
    [[], DEFAULT],
    [JSON.stringify('sdlc/{name}'), DEFAULT],
    [{ branchFormat: 'sdlc/{name}' }, 'sdlc/{name}'],
  ]
  const { results } = py(cases.map(([c]) => ({ fn: 'load_format', args: [cfgRepo(c)] })))
  results.forEach((r, i) => assert.deepEqual([r.outcome, r.value], ['return', cases[i][1]], JSON.stringify(cases[i][0])))
  const noSdlc = scratch('nosdlc-')
  assert.deepEqual(py([{ fn: 'load_format', args: [noSdlc] }]).results[0].value, DEFAULT)
})

test('verify contract: load_format raises Fail for invalid JSON, deep nesting and an unreadable file', () => {
  const unreadable = cfgRepo({ branchFormat: 'a/{name}' })
  spawnSync('chmod', ['000', join(unreadable, '.sdlc/config.json')])
  const repos = [cfgRepo('{'), cfgRepo('['.repeat(200000)), cfgRepo('{"a":'.repeat(50000) + '1'), unreadable]
  const { results } = py(repos.map((p) => ({ fn: 'load_format', args: [p] })))
  for (const r of results) assert.equal(r.outcome, 'Fail', JSON.stringify(r).slice(0, 300))
})

test('verify contract: name follows the resolved format, and {name:lower} lowercases the tail (R-015 examples)', () => {
  const { results } = py([
    { fn: 'name', args: ['sdlc/{name}', 'slice'], kwargs: { id: 'S-001' } },
    { fn: 'name', args: ['feature/PROJ-1-{name}', 'slice'], kwargs: { id: 'S-001' } },
    { fn: 'name', args: ['feature/{name:lower}', 'slice'], kwargs: { id: 'S-001' } },
    { fn: 'name', args: ['feature/{name:lower}', 'e2e-area'], kwargs: { id: 'M-1', area: 'API' } },
    { fn: 'name', args: ['sdlc/{name}', 'state'], kwargs: { ts: '20261008101500' } },
  ])
  assert.deepEqual(results.map((r) => r.value), ['sdlc/S-001', 'feature/PROJ-1-S-001', 'feature/s-001', 'feature/m-1-e2e-api', 'sdlc/state-20261008101500'])
})

test('verify contract: property name is prefix + tail + suffix, lowercased for {name:lower}', () => {
  const r = rng(SEED + 3)
  const lit = ['', 'sdlc/', 'feature/', 'team/PROJ-1-', 'x', '-wip', '/end', 'A/']
  const inputs = Array.from({ length: RUNS }, () => {
    const placeholder = r.pick(['{name}', '{name:lower}'])
    const fmt = r.pick(lit) + placeholder + r.pick(lit)
    const kind = r.pick(['slice', 'e2e-area', 'state'])
    const k = kind === 'slice' ? { id: genStr(r) } : kind === 'e2e-area' ? { id: genStr(r), area: genStr(r) } : { ts: String(r.int(10 ** 13, 10 ** 14 - 1)) }
    return { fmt, kind, k, lower: placeholder === '{name:lower}' }
  })
  const { results } = py(inputs.map((x) => ({ fn: 'name', args: [x.fmt, x.kind], kwargs: x.k })))
  const violations = inputs.map((x, i) => ({ x, got: results[i] })).filter(({ x, got }) => {
    const t = x.kind === 'slice' ? x.k.id : x.kind === 'e2e-area' ? `${x.k.id}-e2e-${x.k.area}` : `state-${x.k.ts}`
    const [pre, suf] = x.fmt.split(x.lower ? '{name:lower}' : '{name}')
    return got.outcome !== 'return' || got.value !== pre + (x.lower ? t.toLowerCase() : t) + suf
  })
  report('name', SEED + 3, RUNS, violations)
})

function strictModel(shape) {
  switch (shape.kind) {
    case 'absent': case 'no-sdlc-dir': case 'dangling-symlink': return { ok: [DEFAULT] }
    case 'dir': case 'symlink-loop': case 'unreadable': case 'bytes': return { fail: true }
    case 'json': {
      const v = shape.value
      const bf = v && typeof v === 'object' && !Array.isArray(v) ? v.branchFormat : undefined
      return { ok: [typeof bf === 'string' && bf ? bf : DEFAULT] }
    }
    case 'text': {
      let v
      try { v = JSON.parse(shape.text) } catch { return { fail: true, lenient: [DEFAULT] } }
      const bf = v && typeof v === 'object' && !Array.isArray(v) ? v.branchFormat : undefined
      return { ok: [typeof bf === 'string' && bf ? bf : DEFAULT] }
    }
  }
  throw new Error(shape.kind)
}

test('verify contract: property load_format over arb.configShape matches the spec model', () => {
  const r = rng(SEED + 4)
  const root = scratch('cfg-')
  const inputs = Array.from({ length: RUNS }, () => { const shape = arb.configShape(r); return { shape, repo: materializeConfig(root, shape) } })
  const { results } = py(inputs.map((x) => ({ fn: 'load_format', args: [x.repo] })))
  const lenient = []
  const violations = inputs.map((x, i) => ({ shape: x.shape, got: results[i], want: strictModel(x.shape) })).filter(({ shape, got, want }) => {
    if (got.outcome === 'exception') return true
    if (want.fail) {
      if (got.outcome === 'Fail') return false
      if (want.lenient && want.lenient.includes(got.value)) { lenient.push(shape.text); return false }
      return true
    }
    return got.outcome !== 'return' || !want.ok.includes(got.value)
  })
  console.log(`lenient non-strict JSON accepted as default: ${JSON.stringify([...new Set(lenient)])}`)
  report('load_format', SEED + 4, RUNS, violations.map((v) => ({ ...v, shape: { ...v.shape, text: v.shape.text?.slice(0, 80) } })))
})

test('verify contract: CLI name format agrees with load_format on each config shape (VS-5)', () => {
  const r = rng(SEED + 5)
  const root = scratch('cfg-cli-')
  const n = Math.min(RUNS, 200)
  const inputs = Array.from({ length: n }, () => materializeConfig(root, arb.configShape(r)))
  const lf = py(inputs.map((repo) => ({ fn: 'load_format', args: [repo] }))).results
  const vf = py(lf.map((x) => ({ fn: 'validate_format', args: [x.outcome === 'return' ? x.value : DEFAULT] }))).results
  const violations = []
  inputs.forEach((repo, i) => {
    const c = spawnSync('python3', [BRANCHES, 'name', '--repo', repo, '--kind', 'slice', '--id', 'S-001'], { cwd: scratch('cli-'), encoding: 'utf8', env: { PATH: process.env.PATH, TZ: 'UTC' } })
    const lines = c.stdout.trim().split('\n')
    let j
    try { j = JSON.parse(c.stdout) } catch { violations.push({ i, why: 'stdout not one JSON object', stdout: c.stdout.slice(0, 200) }); return }
    if (lines.length !== 1 || /Traceback/.test(c.stderr)) violations.push({ i, why: 'extra output', stderr: c.stderr.slice(0, 200) })
    const good = lf[i].outcome === 'return' && vf[i].outcome === 'return'
    if (good && (c.status !== 0 || j.format !== lf[i].value)) violations.push({ i, why: 'format mismatch', lf: lf[i].value, cli: j })
    if (!good && (c.status !== 2 || j.ok !== false || !j.error)) violations.push({ i, why: 'expected exit 2', status: c.status, cli: j })
  })
  report('cli-name-vs-load_format', SEED + 5, n, violations)
})
