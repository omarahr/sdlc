import { test } from 'node:test'
import assert from 'node:assert/strict'
import { writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const WT = process.env.VERIFY_WT
const TESTKIT = join(WT, 'skills/sdlc/test/testkit/property.mjs')
const { arb, rng, callPython, BRANCHES, defaultSeed } = await import(TESTKIT)

const SPEC_KINDS = ['run', 'slice', 'milestone', 'e2e', 'e2e-area', 'state', 'verify', 'attempt']
const RUNS = Number.parseInt(process.env.VERIFY_RUNS ?? '1000', 10)

const shim = join(mkdtempSync(join(tmpdir(), 'verify-contract-shim-')), 'shim.py')
writeFileSync(shim, [
  'import importlib.util',
  `spec = importlib.util.spec_from_file_location("branches_under_test", ${JSON.stringify(BRANCHES)})`,
  'mod = importlib.util.module_from_spec(spec)',
  'spec.loader.exec_module(mod)',
  'Fail = mod.Fail',
  'def name_kw(fmt, kind, parts):',
  '    return mod.name(fmt, kind, **parts)',
  'def surface():',
  '    import inspect',
  '    return {k: str(inspect.signature(v)) for k, v in vars(mod).items() if inspect.isfunction(v) and not k.startswith("_") and v.__module__ == mod.__name__}',
  '',
].join('\n'))

const callName = (calls) => callPython(shim, 'name_kw', calls)

function oneOf(r, list) { return r.pick(list) }

function onePlaceholderFormat(r) {
  for (;;) {
    const f = arb.formatString(r)
    const count = f.split('{name}').length - 1 + f.split('{name:lower}').length - 1
    if (count === 1) return f
  }
}

const MISSING_PARTS = [{}, { id: '' }, { id: null }, { ID: 'S-001' }, { Id: 'S-001' }, { n: 1 }, { area: 'api' }, { id: '', n: 1 }, { id: null, area: 'x' }]

test('verify contract: surface of branches.py as a consumer loads it by path', () => {
  const [r] = callPython(shim, 'surface', [[]])
  assert.equal(r.outcome, 'return', r.message)
  console.log(JSON.stringify(r.value, null, 2))
  assert.equal(r.value.name, '(fmt, kind, **parts)')
  assert.equal(r.value.tail, '(kind, **parts)')
})

test('verify contract: name for kind slice without id, with id "" and with id None raises Fail', () => {
  const calls = [
    ['sdlc/{name}', 'slice', {}],
    ['sdlc/{name}', 'slice', { id: '' }],
    ['sdlc/{name}', 'slice', { id: null }],
    ['feature/PROJ-1-{name:lower}', 'slice', {}],
    ['feature/PROJ-1-{name:lower}', 'slice', { id: '' }],
    ['feature/PROJ-1-{name:lower}', 'slice', { id: null }],
  ]
  const res = callName(calls)
  res.forEach((r, i) => {
    console.log(JSON.stringify(calls[i]), '->', r.outcome, r.type, r.message)
    assert.equal(r.outcome, 'Fail', `${JSON.stringify(calls[i])} gave ${r.outcome} ${r.type} ${r.message} ${JSON.stringify(r.value)}`)
    assert.match(r.message, /id/)
    assert.equal(r.stdout, '')
    assert.equal(r.stderr, '')
  })
})

test('verify contract: name for a kind not in the spec table raises Fail', () => {
  const kinds = ['bogus', '', 'SLICE', 'Slice', ' slice', 'slice ', 'slice\n', 'sliсe', 'S-001', 'slices', 'kind', null, 7, 0, true, 1.5]
  const calls = kinds.map((k) => ['sdlc/{name}', k, { id: 'S-001' }])
  const res = callName(calls)
  res.forEach((r, i) => {
    console.log(JSON.stringify(kinds[i]), '->', r.outcome, r.type, r.message)
    assert.equal(r.outcome, 'Fail', `kind ${JSON.stringify(kinds[i])} gave ${r.outcome} ${r.type} ${r.message} ${JSON.stringify(r.value)}`)
  })
})

test('verify contract: property, a slice name with a missing or empty id always raises Fail', () => {
  const seed = defaultSeed()
  const r = rng(seed)
  const inputs = Array.from({ length: RUNS }, () => [onePlaceholderFormat(r), 'slice', oneOf(r, MISSING_PARTS)])
  const res = callName(inputs)
  const bad = res.map((x, i) => ({ x, i })).filter(({ x }) => x.outcome !== 'Fail')
  console.log(`property name-missing-id: seed=${seed} runs=${RUNS} violations=${bad.length}`)
  for (const { x, i } of bad.slice(0, 5)) console.log('  counterexample', JSON.stringify(inputs[i]), '->', x.outcome, x.type, x.message, JSON.stringify(x.value))
  assert.equal(bad.length, 0)
})

test('verify contract: property, an unknown kind string always raises Fail', () => {
  const seed = defaultSeed()
  const r = rng(seed)
  const pieces = ['slice', 'run', 'x', '-', 'e2e', 'S', 'İ', 'а', ' ', '\t', '', 'verify', 'state', '{name}', '\u0000', '\ud800', 'K']
  const inputs = []
  while (inputs.length < RUNS) {
    const n = r.int(0, 4)
    let k = ''
    for (let i = 0; i < n; i++) k += r.pick(pieces)
    if (SPEC_KINDS.includes(k)) continue
    inputs.push([onePlaceholderFormat(r), k, r.bool() ? { id: 'S-001' } : oneOf(r, MISSING_PARTS)])
  }
  const res = callName(inputs)
  const bad = res.map((x, i) => ({ x, i })).filter(({ x }) => x.outcome !== 'Fail')
  console.log(`property name-unknown-kind: seed=${seed} runs=${RUNS} violations=${bad.length}`)
  for (const { x, i } of bad.slice(0, 5)) console.log('  counterexample', JSON.stringify(inputs[i]), '->', x.outcome, x.type, x.message, JSON.stringify(x.value))
  assert.equal(bad.length, 0)
})

test('verify contract: unhashable kinds', () => {
  const kinds = [[], ['slice'], {}, { slice: 1 }]
  const res = callName(kinds.map((k) => ['sdlc/{name}', k, { id: 'S-001' }]))
  res.forEach((r, i) => console.log(JSON.stringify(kinds[i]), '->', r.outcome, r.type, r.message))
})

test('verify contract: non-string ids are converted by str', () => {
  const ids = [7, 0, -1, 1.5, false, true, [], ['S-1'], {}, ' ', '\t', 'S 001', '..', 'S-001.lock']
  const res = callName(ids.map((id) => ['sdlc/{name}', 'slice', { id }]))
  res.forEach((r, i) => console.log(JSON.stringify(ids[i]), '->', r.outcome, r.type ?? '', JSON.stringify(r.value ?? r.message)))
  assert.equal(res[0].outcome, 'return')
  assert.equal(res[0].value, 'sdlc/7')
})

test('verify contract: the same missing-part call gives the same outcome every time', () => {
  const call = ['sdlc/{name}', 'slice', {}]
  const res = callName([call, call, call])
  assert.deepEqual(res.map((r) => [r.outcome, r.type, r.message]), Array(3).fill([res[0].outcome, res[0].type, res[0].message]))
})
