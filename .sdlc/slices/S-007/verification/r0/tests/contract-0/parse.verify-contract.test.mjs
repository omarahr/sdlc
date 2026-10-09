import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = process.env.VERIFY_ROOT
const HERE = dirname(fileURLToPath(import.meta.url))
const KIT = `${ROOT}/skills/sdlc/test/testkit/property.mjs`
const { check, callPython, describeViolations, defaultSeed, BRANCHES } = await import(KIT)
const RUNS = 1500
const SEED = defaultSeed()

const py = (calls) => callPython(BRANCHES, 'parse', calls).map((r) => {
  assert.equal(r.outcome, 'return', `parse raised ${r.type}: ${r.message}`)
  return r.value
})
const one = (fmt, branch, ids) => py([ids === undefined ? [fmt, branch] : [fmt, branch, ids]])[0]

const ROWS = [
  ['run', /^run-(\d+)$/, ['n']],
  ['milestone', /^(M-\d+)$/, ['id']],
  ['e2e', /^(M-\d+)-e2e$/, ['id']],
  ['e2e-area', /^(M-\d+)-e2e-(.+)$/, ['id', 'area']],
  ['state', /^state-(\d{14})$/, ['ts']],
  ['verify', /^(.+)-v(\d+)-([a-z0-9-]+?)-(\d+)$/, ['id', 'round', 'profile', 'part']],
  ['attempt', /^(.+)-attempt-(\d+)$/, ['id', 'n']],
  ['slice', /^(S-[A-Za-z0-9-]+)$/, ['id']],
]
const INT = new Set(['n', 'round', 'part'])

function refSplit(fmt) {
  const lower = fmt.includes('{name:lower}')
  const ph = lower ? '{name:lower}' : '{name}'
  const i = fmt.indexOf(ph)
  return [fmt.slice(0, i), fmt.slice(i + ph.length), lower]
}

function refParse(fmt, branch, ids) {
  let [prefix, suffix, lower] = refSplit(fmt)
  const b = lower ? branch.toLowerCase() : branch
  if (lower) { prefix = prefix.toLowerCase(); suffix = suffix.toLowerCase() }
  if (branch.length < prefix.length + suffix.length) return null
  if (!b.startsWith(prefix) || !b.endsWith(suffix)) return null
  const tail = branch.slice(prefix.length, branch.length - suffix.length)
  for (const [kind, re, names] of ROWS) {
    const m = (lower ? new RegExp(re.source, 'i') : re).exec(tail)
    if (!m) continue
    const out = { kind, tail }
    names.forEach((p, i) => { out[p] = INT.has(p) ? Number(m[i + 1]) : m[i + 1] })
    out.known = null
    if (ids !== undefined && ids !== null && 'id' in out) {
      const want = lower ? out.id.toLowerCase() : out.id
      out.known = false
      for (const c of ids) if ((lower ? c.toLowerCase() : c) === want) { out.id = c; out.known = true; break }
    }
    return out
  }
  return null
}

const sortKeys = (o) => (o === null ? null : Object.fromEntries(Object.entries(o).sort(([a], [b]) => a.localeCompare(b))))
const same = (a, b) => JSON.stringify(sortKeys(a)) === JSON.stringify(sortKeys(b))

const digits = (r, max = 12) => { const n = r.int(1, max); let s = ''; for (let i = 0; i < n; i++) s += r.int(0, 9); return s }
const word = (r, alpha, lo, hi) => { const n = r.int(lo, hi); let s = ''; for (let i = 0; i < n; i++) s += r.pick(alpha); return s }
const ALNUM = [...'abcdefghijklmnopqrstuvwxyz0123456789']
const IDS = ['S-001', 'S-fix-M-1-2', 'S-12-a', 'M-1', 'x', 'a-b', 'S-', 'S-A-b', 's-001', 'M-12']
const NOISE = [...'SMsmrunvaeAB0123456789-']

function genTail(r) {
  const roll = r.int(0, 15)
  let t
  switch (roll) {
    case 0: t = 'run-' + digits(r); break
    case 1: t = 'M-' + digits(r, 5); break
    case 2: t = 'M-' + digits(r, 5) + '-e2e'; break
    case 3: t = 'M-' + digits(r, 5) + '-e2e-' + word(r, [...'abcxyz09-'], 1, 6); break
    case 4: t = 'state-' + digits(r, 16); break
    case 5: t = r.pick(IDS) + '-v' + digits(r, 3) + '-' + word(r, [...'abcxyz09-'], 1, 8) + '-' + digits(r, 3); break
    case 6: t = r.pick(IDS) + '-attempt-' + digits(r, 4); break
    case 7: t = 'S-' + word(r, [...'abAB09-'], 0, 8); break
    case 8: t = 'S-' + word(r, [...'abAB09-'], 0, 4) + '-v' + digits(r, 2) + '-' + word(r, [...'ab9-'], 1, 4) + '-' + digits(r, 2); break
    case 9: t = 'M-' + digits(r, 3) + '-e2e-' + word(r, [...'ab-'], 0, 3) + '-v1-x-2'; break
    default: t = word(r, NOISE, 0, 14)
  }
  if (r.bool(0.2)) t = t.toUpperCase()
  else if (r.bool(0.2)) t = t.toLowerCase()
  else if (r.bool(0.1)) t = [...t].map((c) => (r.bool() ? c.toUpperCase() : c.toLowerCase())).join('')
  return t
}

const PREFIXES = ['sdlc/', 'feature/PROJ-1-', 'Team/', '', 'x/', 'a-S-']
const SUFFIXES = ['', '-wip', '/Z', '-s', 'e2e']
const genFormat = (r, lower) => r.pick(PREFIXES) + (lower === undefined ? r.pick(['{name}', '{name:lower}']) : lower ? '{name:lower}' : '{name}') + r.pick(SUFFIXES)

function genCase(r, lower) {
  const fmt = genFormat(r, lower)
  const [p, s] = refSplit(fmt)
  const tail = genTail(r)
  let branch
  const roll = r.int(0, 9)
  if (roll === 0) branch = tail
  else if (roll === 1) branch = p.slice(0, r.int(0, p.length)) + s.slice(0, r.int(0, s.length))
  else if (roll === 2) branch = (r.bool() ? p.toUpperCase() : p.toLowerCase()) + tail + s
  else if (roll === 3) branch = p + tail + (r.bool() ? s.toUpperCase() : s.toLowerCase())
  else if (roll === 4) branch = p + tail
  else branch = p + tail + s
  let ids
  if (r.bool(0.6)) {
    ids = []
    const n = r.int(0, 4)
    for (let i = 0; i < n; i++) {
      const base = r.bool(0.5) ? tail.replace(/-(v\d+|attempt|e2e).*$/i, '') : r.pick(IDS)
      ids.push(r.bool(0.3) ? base.toUpperCase() : r.bool(0.3) ? base.toLowerCase() : base)
    }
  }
  return { fmt, branch, ids }
}

function propertyAgainstModel(name, gen, runs = RUNS) {
  const report = check({
    fn: 'parse',
    gen,
    toArgs: (c) => (c.ids === undefined ? [c.fmt, c.branch] : [c.fmt, c.branch, c.ids]),
    seed: SEED,
    runs,
    property: (c, res) => {
      if (res.outcome !== 'return') return `raised ${res.type}: ${res.message}`
      const want = refParse(c.fmt, c.branch, c.ids)
      return same(res.value, want) ? null : `got ${JSON.stringify(res.value)} want ${JSON.stringify(want)}`
    },
    log: false,
  })
  const hits = report.cases.filter((c) => c.result.value !== null).length
  console.log(`property-run ${name}: seed=${report.seed} runs=${report.runs} violations=${report.violations.length} nonNull=${hits}`)
  if (report.violations.length) assert.fail(describeViolations(report))
  assert.ok(hits > runs * 0.1, `generator reached too few non-null results: ${hits}`)
}

test('verify contract TC-contract-1 VS-1: foreign branches give null (examples)', () => {
  const cases = [
    ['sdlc/{name}', 'main'],
    ['feature/PROJ-1-{name}', 'feature/PROJ-1-foo'],
    ['sdlc/{name}', 'sdlc/feature-x'],
    ['sdlc/{name}', ''],
    ['sdlc/{name}', 'sdlc'],
    ['sdlc/{name}', 'SDLC/S-001'],
    ['sdlc/{name}-wip', 'sdlc/-wi'],
    ['{name}', ''],
    ['abc{name}cde', 'abcde'],
    ['abc{name}cde', 'abcxcd'],
  ]
  const got = py(cases)
  cases.forEach((c, i) => assert.equal(got[i], null, `${JSON.stringify(c)} -> ${JSON.stringify(got[i])}`))
})

test('verify contract TC-contract-2 VS-1: property, a branch missing the prefix or the suffix gives null', () => {
  const report = check({
    fn: 'parse',
    gen: (r) => {
      const c = genCase(r)
      const [p, s, lower] = refSplit(c.fmt)
      const b = lower ? c.branch.toLowerCase() : c.branch
      const okp = b.startsWith(lower ? p.toLowerCase() : p)
      const oks = b.endsWith(lower ? s.toLowerCase() : s)
      return { ...c, foreign: !(okp && oks) || c.branch.length < p.length + s.length }
    },
    toArgs: (c) => [c.fmt, c.branch],
    seed: SEED,
    runs: RUNS,
    property: (c, res) => {
      if (res.outcome !== 'return') return `raised ${res.type}`
      return c.foreign && res.value !== null ? `expected null, got ${JSON.stringify(res.value)}` : null
    },
    log: false,
  })
  const foreign = report.cases.filter((c) => c.input.foreign).length
  console.log(`property-run foreign-null: seed=${report.seed} runs=${report.runs} foreignCases=${foreign} violations=${report.violations.length}`)
  assert.ok(foreign > 100)
  if (report.violations.length) assert.fail(describeViolations(report))
})

test('verify contract TC-contract-3 VS-2: prefix and suffix pass but no row matches gives null', () => {
  const cases = [
    ['sdlc/{name}', 'sdlc/'],
    ['sdlc/{name}', 'sdlc/run-'],
    ['sdlc/{name}', 'sdlc/run-x'],
    ['sdlc/{name}-wip', 'sdlc/S-001'],
    ['sdlc/{name}', 'sdlc/S-'.slice(0, 5)],
    ['sdlc/{name}', 'sdlc/m-1'],
    ['sdlc/{name}', 'sdlc/state-2026100810150'],
    ['sdlc/{name}', 'sdlc/state-202610081015000'],
    ['sdlc/{name}', 'sdlc/M-'],
    ['sdlc/{name}', 'sdlc/M-1-e2e-'],
    ['sdlc/{name}', 'sdlc/-v1-x-2'],
    ['sdlc/{name}', 'sdlc/S-001-v-x-0'.replace('S-001', 'T-001')],
    ['sdlc/{name}', 'sdlc/T-001-v0-X-0'],
    ['sdlc/{name}', 'sdlc/attempt-3'],
    ['sdlc/{name}', 'sdlc/T-001-attempt-'],
    ['sdlc/{name}', 'sdlc/T-001-attempt-x'],
    ['sdlc/{name}', 'sdlc/T-001'],
  ]
  const got = py(cases)
  cases.forEach((c, i) => assert.equal(got[i], null, `${JSON.stringify(c)} -> ${JSON.stringify(got[i])}`))
  const ok = one('sdlc/{name}-wip', 'sdlc/S-001-wip')
  assert.equal(ok.kind, 'slice'); assert.equal(ok.id, 'S-001'); assert.equal(ok.tail, 'S-001')
})

test('verify contract TC-contract-4 VS-3: one branch per row 1 to 8 and overlap precedence (examples)', () => {
  const D = 'sdlc/'
  const exp = [
    ['run-2', { kind: 'run', n: 2 }],
    ['run-007', { kind: 'run', n: 7 }],
    ['M-1', { kind: 'milestone', id: 'M-1' }],
    ['M-1-e2e', { kind: 'e2e', id: 'M-1' }],
    ['M-1-e2e-api', { kind: 'e2e-area', id: 'M-1', area: 'api' }],
    ['M-1-e2e-a-b', { kind: 'e2e-area', id: 'M-1', area: 'a-b' }],
    ['state-20261008101500', { kind: 'state', ts: '20261008101500' }],
    ['S-001-v0-http-api-0', { kind: 'verify', id: 'S-001', round: 0, profile: 'http-api', part: 0 }],
    ['S-001-v12-a-b-c-3', { kind: 'verify', id: 'S-001', round: 12, profile: 'a-b-c', part: 3 }],
    ['S-001-attempt-3', { kind: 'attempt', id: 'S-001', n: 3 }],
    ['S-001', { kind: 'slice', id: 'S-001' }],
    ['S-fix-M-1-2', { kind: 'slice', id: 'S-fix-M-1-2' }],
    ['S-fix-M-1-e2e', { kind: 'slice', id: 'S-fix-M-1-e2e' }],
    ['M-1-v0-api-0', { kind: 'verify', id: 'M-1', round: 0, profile: 'api', part: 0 }],
    ['S-001-v0-x-0-attempt-4', { kind: 'verify', id: 'S-001', round: 0, profile: 'x-0-attempt', part: 4 }],
    ['S-001-attempt-3-v0-x-0', { kind: 'verify', id: 'S-001-attempt-3', round: 0, profile: 'x', part: 0 }],
    ['M-1-e2e-v0-x-0', { kind: 'e2e-area', id: 'M-1', area: 'v0-x-0' }],
    ['M-1-e2e-attempt-2', { kind: 'e2e-area', id: 'M-1', area: 'attempt-2' }],
    ['S-1-v0-x-0-v1-y-1', { kind: 'verify', id: 'S-1-v0-x-0', round: 1, profile: 'y', part: 1 }],
    ['S-1-v1-a-2-b-3', { kind: 'verify', id: 'S-1', round: 1, profile: 'a-2-b', part: 3 }],
  ]
  const got = py(exp.map(([t]) => [`${D}{name}`, D + t]))
  exp.forEach(([t, want], i) => {
    const g = got[i]
    assert.ok(g, `${t} gave null`)
    for (const [k, v] of Object.entries(want)) assert.deepEqual(g[k], v, `${t}: ${k}`)
    assert.equal(g.tail, t)
  })
})

test('verify contract TC-contract-5 VS-3: property, classification equals the reference table (plain format)', () => {
  propertyAgainstModel('classification-plain', (r) => genCase(r, false))
})

test('verify contract TC-contract-6 VS-4: lowercase formats ignore case in the tail and the prefix and suffix; plain formats do not', () => {
  const cases = [
    ['feature/PROJ-1-{name:lower}', 'feature/PROJ-1-s-001'],
    ['feature/PROJ-1-{name:lower}', 'feature/PROJ-1-m-1-e2e-api'],
    ['feature/PROJ-1-{name:lower}', 'feature/PROJ-1-run-2'],
    ['feature/PROJ-1-{name:lower}', 'feature/proj-1-s-001'],
    ['feature/PROJ-1-{name:lower}', 'FEATURE/proj-1-RUN-2'],
    ['feature/PROJ-1-{name}', 'feature/PROJ-1-s-001'],
    ['feature/PROJ-1-{name}', 'feature/PROJ-1-m-1-e2e-api'],
    ['feature/PROJ-1-{name}', 'feature/PROJ-1-run-2'],
    ['feature/PROJ-1-{name}', 'feature/proj-1-S-001'],
    ['sdlc/{name}', 'sdlc/RUN-2'],
    ['sdlc/{name}', 'SDLC/run-2'],
    ['sdlc/{name}-WIP', 'sdlc/S-001-wip'],
    ['sdlc/{name:lower}-WIP', 'sdlc/S-001-wip'],
  ]
  const got = py(cases)
  const kinds = got.map((g) => (g === null ? null : g.kind))
  assert.deepEqual(kinds, ['slice', 'e2e-area', 'run', 'slice', 'run', null, null, 'run', null, null, null, null, 'slice'])
  assert.equal(got[1].id, 'm-1'); assert.equal(got[1].area, 'api')
  assert.equal(got[4].tail, 'RUN-2'); assert.equal(got[4].n, 2)
  assert.equal(got[0].tail, 's-001')
})

test('verify contract TC-contract-7 VS-4: property, lowercase classification equals the reference table', () => {
  propertyAgainstModel('classification-lower', (r) => genCase(r, true))
})

test('verify contract TC-contract-8 VS-3 VS-4: property, mixed formats equal the reference table', () => {
  propertyAgainstModel('classification-mixed', (r) => genCase(r))
})

test('verify contract TC-contract-9 VS-5: the result holds exactly the parts that apply, integers are integers', () => {
  const D = 'sdlc/{name}'
  const want = {
    'run-2': ['kind', 'tail', 'known', 'n'],
    'state-20261008101500': ['kind', 'tail', 'known', 'ts'],
    'S-001-v0-http-api-0': ['kind', 'tail', 'known', 'id', 'round', 'profile', 'part'],
    'M-1-e2e-api': ['kind', 'tail', 'known', 'id', 'area'],
    'M-1-e2e': ['kind', 'tail', 'known', 'id'],
    'M-1': ['kind', 'tail', 'known', 'id'],
    'S-001': ['kind', 'tail', 'known', 'id'],
    'S-001-attempt-3': ['kind', 'tail', 'known', 'id', 'n'],
  }
  const tails = Object.keys(want)
  const got = py(tails.map((t) => [D, 'sdlc/' + t]))
  tails.forEach((t, i) => assert.deepEqual(Object.keys(got[i]).sort(), [...want[t]].sort(), t))
  assert.strictEqual(got[0].n, 2)
  assert.strictEqual(got[0].known, null)
  assert.strictEqual(got[1].ts, '20261008101500')
  assert.strictEqual(got[2].round, 0); assert.strictEqual(got[2].part, 0); assert.strictEqual(got[2].profile, 'http-api')
  assert.strictEqual(got[7].n, 3)
  const withIds = py(tails.map((t) => [D, 'sdlc/' + t, ['S-001', 'M-1']]))
  tails.forEach((t, i) => assert.deepEqual(Object.keys(withIds[i]).sort(), [...want[t]].sort(), t + ' with ids'))
})

test('verify contract TC-contract-10 VS-5: property, key set per kind, int types and tail identity', () => {
  const KEYS = {
    run: ['n'], milestone: ['id'], e2e: ['id'], 'e2e-area': ['id', 'area'], state: ['ts'],
    verify: ['id', 'round', 'profile', 'part'], attempt: ['id', 'n'], slice: ['id'],
  }
  const report = check({
    fn: 'parse',
    gen: (r) => genCase(r),
    toArgs: (c) => (c.ids === undefined ? [c.fmt, c.branch] : [c.fmt, c.branch, c.ids]),
    seed: SEED,
    runs: RUNS,
    property: (c, res) => {
      if (res.outcome !== 'return') return `raised ${res.type}`
      const v = res.value
      if (v === null) return null
      const keys = ['kind', 'tail', 'known', ...KEYS[v.kind]].sort()
      if (JSON.stringify(Object.keys(v).sort()) !== JSON.stringify(keys)) return `keys ${Object.keys(v)} for ${v.kind}`
      for (const k of ['n', 'round', 'part']) if (k in v && !Number.isInteger(v[k])) return `${k} not integer`
      if (typeof v.tail !== 'string' || !c.branch.includes(v.tail)) return 'tail not a slice of branch'
      if (v.known !== null && typeof v.known !== 'boolean') return 'known type'
      return null
    },
    log: false,
  })
  console.log(`property-run result-shape: seed=${report.seed} runs=${report.runs} violations=${report.violations.length}`)
  if (report.violations.length) assert.fail(describeViolations(report))
})

test('verify contract TC-contract-11 VS-6: ids resolve the ledger spelling and set known (examples)', () => {
  const L = 'feature/PROJ-1-{name:lower}'
  const a = one(L, 'feature/proj-1-s-001', ['S-001'])
  assert.equal(a.id, 'S-001'); assert.strictEqual(a.known, true); assert.equal(a.tail, 's-001')
  const b = one(L, 'feature/proj-1-s-002', ['S-001'])
  assert.equal(b.id, 's-002'); assert.strictEqual(b.known, false)
  assert.strictEqual(one(L, 'feature/proj-1-s-001').known, null)
  assert.strictEqual(one(L, 'feature/proj-1-s-001', null).known, null)
  assert.strictEqual(one(L, 'feature/proj-1-s-001', []).known, false)
  assert.strictEqual(one(L, 'feature/proj-1-run-2', ['S-001']).known, null)
  assert.strictEqual(one(L, 'feature/proj-1-state-20261008101500', ['S-001']).known, null)
  assert.equal(one(L, 'feature/proj-1-s-001', ['S-001', 's-001']).id, 'S-001')
  assert.equal(one(L, 'feature/proj-1-s-001', ['s-001', 'S-001']).id, 's-001')
  const m = one(L, 'feature/proj-1-m-1-e2e-api', ['M-1'])
  assert.equal(m.id, 'M-1'); assert.strictEqual(m.known, true)
  const v = one(L, 'feature/proj-1-s-001-v0-api-0', ['S-001'])
  assert.equal(v.id, 'S-001'); assert.strictEqual(v.known, true)
  const x = one('sdlc/{name}', 'sdlc/S-001', ['s-001'])
  assert.strictEqual(x.known, false); assert.equal(x.id, 'S-001')
  const y = one('sdlc/{name}', 'sdlc/S-001', ['S-001'])
  assert.strictEqual(y.known, true)
  const z = one(L, 'feature/proj-1-s-001', ['s-001'])
  assert.strictEqual(z.known, true); assert.equal(z.id, 's-001')
})

test('verify contract TC-contract-12 VS-6: property, ids resolution equals the reference model', () => {
  propertyAgainstModel('ids-resolution', (r) => {
    const c = genCase(r)
    if (c.ids === undefined) c.ids = r.bool(0.5) ? [] : [r.pick(IDS)]
    return c
  })
})

test('verify contract TC-contract-13 VS-6: iterator, tuple, generator and set work as ids; ids and result are not shared state', () => {
  const script = join(mkdtempSync(join(tmpdir(), 'verify-contract-ids-')), 'ids.py')
  writeFileSync(script, `
import importlib.util, json, sys, copy
spec = importlib.util.spec_from_file_location("b", sys.argv[1])
b = importlib.util.module_from_spec(spec); spec.loader.exec_module(b)
out = {}
L = "feature/PROJ-1-{name:lower}"
br = "feature/proj-1-s-001"
out["tuple"] = b.parse(L, br, ("S-001",))
out["iter"] = b.parse(L, br, iter(["S-002", "S-001"]))
out["gen"] = b.parse(L, br, (x for x in ["S-001"]))
out["set"] = b.parse(L, br, {"S-001"})
out["frozenset"] = b.parse(L, br, frozenset({"S-001"}))
out["dict_keys"] = b.parse(L, br, {"S-001": 1}.keys())
out["empty_iter"] = b.parse(L, br, iter([]))
lst = ["S-002", "S-001"]
snap = copy.deepcopy(lst)
r1 = b.parse(L, br, lst)
r2 = b.parse(L, br, lst)
out["list_unchanged"] = lst == snap
out["deterministic"] = r1 == r2
r1["id"] = "mutated"
out["fresh_result"] = b.parse(L, br, lst)["id"]
out["positional_kw"] = b.parse(fmt=L, branch=br, ids=["S-001"])
out["no_ids_default"] = b.parse(L, br)
out["fn_default"] = repr(b.parse.__defaults__)
import inspect
out["signature"] = str(inspect.signature(b.parse))
print(json.dumps(out))
`)
  const r = spawnSync('python3', ['-I', script, BRANCHES], { encoding: 'utf8', cwd: mkdtempSync(join(tmpdir(), 'verify-contract-cwd-')) })
  assert.equal(r.status, 0, r.stderr)
  const o = JSON.parse(r.stdout)
  for (const k of ['tuple', 'iter', 'gen', 'set', 'frozenset', 'dict_keys', 'positional_kw']) {
    assert.equal(o[k].id, 'S-001', k); assert.strictEqual(o[k].known, true, k)
  }
  assert.strictEqual(o.empty_iter.known, false)
  assert.strictEqual(o.list_unchanged, true)
  assert.strictEqual(o.deterministic, true)
  assert.equal(o.fresh_result, 'S-001')
  assert.strictEqual(o.no_ids_default.known, null)
  assert.equal(o.signature, '(fmt, branch, ids=None)')
})

test('verify contract TC-contract-14 VS-1 VS-2: the module surface and the consumer import path', () => {
  const script = join(mkdtempSync(join(tmpdir(), 'verify-contract-surface-')), 'surface.py')
  writeFileSync(script, `
import importlib.util, inspect, json, sys, os
sys.path.insert(0, os.path.dirname(sys.argv[1]))
import branches as b
pub = sorted(n for n in dir(b) if not n.startswith("_") and getattr(getattr(b, n), "__module__", "branches") == "branches" and (inspect.isfunction(getattr(b, n)) or inspect.isclass(getattr(b, n))))
sigs = {n: str(inspect.signature(getattr(b, n))) for n in pub if inspect.isfunction(getattr(b, n))}
imports = sorted(n for n, v in vars(b).items() if inspect.ismodule(v))
print(json.dumps({"public": pub, "sigs": sigs, "modules": imports, "kinds": list(b.KINDS), "rows": len(b.PARSE_ROWS)}))
`)
  const r = spawnSync('python3', ['-I', script, BRANCHES], { encoding: 'utf8', cwd: mkdtempSync(join(tmpdir(), 'verify-contract-cwd-')) })
  assert.equal(r.status, 0, r.stderr)
  const o = JSON.parse(r.stdout)
  console.log('surface ' + JSON.stringify(o))
  assert.equal(o.sigs.parse, '(fmt, branch, ids=None)')
  for (const n of ['load_format', 'validate_format', 'tail', 'name', 'split', 'parse']) assert.ok(o.public.includes(n), n)
  assert.deepEqual(o.modules.filter((m) => !['argparse', 'json', 'os', 're', 'subprocess', 'sys'].includes(m)), [])
  assert.equal(o.rows, 8)
})
