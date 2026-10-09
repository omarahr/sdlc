import test from 'node:test'
import assert from 'node:assert/strict'
import { callPython, rng, defaultSeed, BRANCHES } from '/Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/test/testkit/property.mjs'

const parseAll = (cases) => callPython(BRANCHES, 'parse', cases.map(([f, b]) => [f, b])).map((r) => {
  assert.equal(r.outcome, 'return', JSON.stringify(r))
  return r.value
})
const D = 'sdlc/{name}'
const one = (f, b) => parseAll([[f, b]])[0]

const ROWS = [
  ['run', /^run-(\d+)(?=\n?$)/, ['n']],
  ['milestone', /^(M-\d+)(?=\n?$)/, ['id']],
  ['e2e', /^(M-\d+)-e2e(?=\n?$)/, ['id']],
  ['e2e-area', /^(M-\d+)-e2e-([^\n]+)(?=\n?$)/, ['id', 'area']],
  ['state', /^state-(\d{14})(?=\n?$)/, ['ts']],
  ['verify', /^([^\n]+)-v(\d+)-([a-z0-9-]+?)-(\d+)(?=\n?$)/, ['id', 'round', 'profile', 'part']],
  ['attempt', /^([^\n]+)-attempt-(\d+)(?=\n?$)/, ['id', 'n']],
  ['slice', /^(S-[A-Za-z0-9-]+)(?=\n?$)/, ['id']],
]
const INT = new Set(['n', 'round', 'part'])
function model(fmt, branch) {
  const m = fmt.match(/^(.*)\{name(:lower)?\}(.*)$/s)
  const [, prefix, lowerTag, suffix] = m
  const lower = Boolean(lowerTag)
  if (branch.length < prefix.length + suffix.length) return null
  const head = branch.slice(0, prefix.length)
  const foot = suffix ? branch.slice(branch.length - suffix.length) : ''
  const norm = (s) => (lower ? s.toLowerCase() : s)
  if (norm(head) !== norm(prefix) || norm(foot) !== norm(suffix)) return null
  const tail = branch.slice(prefix.length, branch.length - suffix.length)
  for (const [kind, re0, names] of ROWS) {
    const re = lower ? new RegExp(re0.source, 'i') : re0
    const x = re.exec(tail)
    if (!x) continue
    const out = { kind, tail }
    names.forEach((n, i) => { out[n] = INT.has(n) ? Number(x[i + 1]) : x[i + 1] })
    out.known = null
    return out
  }
  return null
}

const FORMATS = [D, 'feature/PROJ-1-{name}', '{name}-wip', 'a/{name:lower}', 'feature/PROJ-1-{name:lower}', 'x/{name:lower}-WIP', '{name}']
const PIECES = ['run', 'M', 'm', 'S', 's', 'e2e', 'E2E', 'api', 'v2', 'v1', 'fix', 'state', 'attempt', 'wip', 'x', 'é', '/', '\n', '']
const NUMS = ['0', '1', '2', '3', '12', '007', '20261009172957', '']
function tailGen(r) {
  const heads = [
    () => `run-${r.pick(NUMS)}`, () => `M-${r.pick(NUMS)}`, () => `M-${r.pick(NUMS)}-e2e`, () => `M-${r.pick(NUMS)}-e2e-${r.pick(PIECES)}`,
    () => `M-${r.pick(NUMS)}-e2e-${r.pick(PIECES)}-${r.pick(PIECES)}-${r.pick(NUMS)}`, () => `S-${r.pick(PIECES)}-${r.pick(NUMS)}`,
    () => `S-001-v${r.pick(NUMS)}-${r.pick(PIECES)}-${r.pick(NUMS)}`, () => `state-${r.pick(NUMS)}`, () => `S-${r.pick(NUMS)}-attempt-${r.pick(NUMS)}`,
    () => Array.from({ length: r.int(0, 5) }, () => r.pick(PIECES.concat(NUMS, ['-']))).join(''),
  ]
  let t = r.pick(heads)()
  if (r.bool(0.15)) t += r.pick(['\n', '-x', '-e2e', ' ', '-', '\r'])
  return t
}
function inputGen(r) {
  const fmt = r.pick(FORMATS)
  const [, prefix, tag, suffix] = fmt.match(/^(.*)\{name(:lower)?\}(.*)$/s)
  let t = tailGen(r)
  if (tag && r.bool(0.5)) t = r.bool() ? t.toLowerCase() : t.toUpperCase()
  const pre = r.bool(0.9) ? prefix : prefix.slice(0, -1)
  return [fmt, pre + t + suffix]
}

test('verify contract: property parse equals the spec table model (VS-1..VS-5)', () => {
  const seed = defaultSeed()
  const runs = 3000
  const r = rng(seed)
  const inputs = Array.from({ length: runs }, () => inputGen(r))
  const results = parseAll(inputs)
  const bad = []
  inputs.forEach((inp, i) => {
    const want = model(...inp)
    try { assert.deepEqual(results[i], want) } catch { bad.push({ inp, got: results[i], want }) }
  })
  const kinds = {}
  for (const x of results) kinds[x ? x.kind : 'null'] = (kinds[x ? x.kind : 'null'] ?? 0) + 1
  console.log(`property-run parse-vs-model seed=${seed} runs=${runs} violations=${bad.length} kinds=${JSON.stringify(kinds)}`)
  assert.equal(bad.length, 0, JSON.stringify(bad.slice(0, 5)))
})

test('verify contract: determinism and no input mutation', () => {
  const ids = ['S-001', 'M-2']
  const a = callPython(BRANCHES, 'parse', [[D, 'sdlc/M-2', ids], [D, 'sdlc/M-2', ids]])
  assert.deepEqual(a[0], a[1])
  assert.equal(a[0].value.known, true)
})

test('verify contract: examples from spec, verbatim (VS-1..VS-4, VS-6)', () => {
  const out = parseAll([
    [D, 'sdlc/run-3'], [D, 'sdlc/run-x'], [D, 'sdlc/run-0'], [D, 'sdlc/run-12'], [D, 'sdlc/run-007'], [D, 'sdlc/run-'], [D, 'sdlc/run-3-x'], [D, 'sdlc/run--1'],
    [D, 'sdlc/M-2'], [D, 'sdlc/M-'], [D, 'sdlc/M-x'], [D, 'sdlc/M-2-e2e'], [D, 'sdlc/M-2-e2e-api'], [D, 'sdlc/m-2'], ['sdlc/{name:lower}', 'sdlc/m-2'],
    [D, 'sdlc/M-2-e2e-'], [D, 'sdlc/M-2-e2e-api-v2'], [D, 'sdlc/M-2-e2e-a'], [D, 'sdlc/M-2-e2e-0'], [D, 'sdlc/M-2-e2e-e2e'], [D, 'sdlc/M-2-e2e-v2-api-3'],
    [D, 'sdlc/S-fix-M-1-2'], [D, 'sdlc/M-1-e2e-api'], [D, 'sdlc/S-001-v0-http-api-0'],
  ])
  const [r3, rx, r0, r12, r007, rEmpty, r3x, rNeg, m2, mEmpty, mx, m2e, m2a, mLow, mLowL, m2eDash, area, areaA, area0, areaE, areaV, slice, ea, ver] = out
  assert.deepEqual(r3, { kind: 'run', tail: 'run-3', n: 3, known: null })
  assert.equal(typeof r3.n, 'number'); assert.ok(!('id' in r3))
  assert.equal(rx, null); assert.equal(rEmpty, null); assert.equal(r3x, null); assert.equal(rNeg, null)
  assert.equal(r0.n, 0); assert.equal(r12.n, 12); assert.equal(r007.n, 7)
  assert.deepEqual(m2, { kind: 'milestone', tail: 'M-2', id: 'M-2', known: null })
  assert.equal(mEmpty, null); assert.equal(mx, null)
  assert.equal(m2e.kind, 'e2e'); assert.equal(m2e.id, 'M-2')
  assert.equal(m2a.kind, 'e2e-area')
  assert.equal(mLow, null); assert.equal(mLowL.kind, 'milestone')
  assert.equal(m2eDash, null)
  assert.deepEqual(area, { kind: 'e2e-area', tail: 'M-2-e2e-api-v2', id: 'M-2', area: 'api-v2', known: null })
  assert.equal(areaA.area, 'a'); assert.equal(area0.area, '0'); assert.equal(areaE.area, 'e2e'); assert.equal(areaV.area, 'v2-api-3')
  assert.equal(slice.kind, 'slice'); assert.equal(slice.id, 'S-fix-M-1-2')
  assert.equal(ea.kind, 'e2e-area')
  assert.deepEqual([ver.kind, ver.profile, ver.round, ver.part, ver.id], ['verify', 'http-api', 0, 0, 'S-001'])
})

test('verify contract: first match wins under prefixed and suffixed formats (VS-5)', () => {
  for (const fmt of ['feature/PROJ-1-{name}', '{name}-wip', 'feature/PROJ-1-{name:lower}']) {
    const wrap = (t) => fmt.replace(/\{name(:lower)?\}/, t)
    const got = ['run-3', 'M-2', 'M-2-e2e', 'M-2-e2e-api', 'M-2-e2e-api-wip'].map((t) => one(fmt, wrap(t)))
    assert.deepEqual(got.map((x) => x.kind), fmt.endsWith('-wip') ? ['run', 'milestone', 'e2e', 'e2e-area', 'e2e-area'] : ['run', 'milestone', 'e2e', 'e2e-area', 'e2e-area'])
    assert.equal(got[3].area, 'api')
    assert.equal(got[4].area, 'api-wip')
  }
  const sfx = one('{name}-wip', 'M-2-e2e-api-wip')
  assert.equal(sfx.kind, 'e2e-area'); assert.equal(sfx.area, 'api')
})
