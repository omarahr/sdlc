import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, appendFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const WT = process.env.VERIFY_WORKTREE
const MODULE = join(WT, 'skills/sdlc/branches.py')
const LOG = process.env.VERIFY_LOG
const SEED = Number(process.env.TESTKIT_SEED || 20261011)

function rng(seed) {
  let s = seed >>> 0
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}
const pick = (r, xs) => xs[Math.floor(r() * xs.length)]

function py(calls) {
  const r = spawnSync('python3', ['-I', join(HERE, 'kwcall.py')], {
    cwd: mkdtempSync(join(tmpdir(), 'vc-')), input: JSON.stringify({ module: MODULE, calls }), encoding: 'utf8',
    env: { PATH: process.env.PATH, PYTHONUTF8: '1', PYTHONDONTWRITEBYTECODE: '1' }, maxBuffer: 1 << 28,
  })
  if (r.status !== 0) throw new Error(`python failed: ${r.stderr.slice(0, 1000)}`)
  return JSON.parse(r.stdout)
}
const nameOf = (fmt, kind, parts = {}) => py([{ fn: 'name', fmt, kind, parts }])[0]
const parseOf = (fmt, branch) => py([{ fn: 'parse', fmt, branch }])[0]
const record = (id, data) => { if (LOG) appendFileSync(LOG, JSON.stringify({ id, ...data }) + '\n') }

const asciiLower = (t) => t.replace(/[A-Z]/g, (c) => c.toLowerCase())
const INT = ['n', 'round', 'part']
const SPEC = {
  run: { req: ['n'], tail: (p) => `run-${p.n}` },
  slice: { req: ['id'], tail: (p) => p.id },
  milestone: { req: ['id'], tail: (p) => p.id },
  e2e: { req: ['id'], tail: (p) => `${p.id}-e2e` },
  'e2e-area': { req: ['id', 'area'], tail: (p) => `${p.id}-e2e-${p.area}` },
  state: { req: ['ts'], tail: (p) => `state-${p.ts}` },
  verify: { req: ['id', 'round', 'profile', 'part'], tail: (p) => `${p.id}-v${p.round}-${p.profile}-${p.part}` },
  attempt: { req: ['id', 'n'], tail: (p) => `${p.id}-attempt-${p.n}` },
}
const modelName = (fmt, kind, parts) => {
  const lower = fmt.includes('{name:lower}')
  const ph = lower ? '{name:lower}' : '{name}'
  const [pre, suf] = fmt.split(ph)
  const t = SPEC[kind].tail(parts)
  return pre + (lower ? asciiLower(t) : t) + suf
}
const sameParts = (kind, given, parsed, lower) => SPEC[kind].req.every((k) => {
  if (INT.includes(k)) return BigInt(String(given[k])) === BigInt(parsed[k])
  return lower ? asciiLower(String(given[k])) === asciiLower(String(parsed[k])) : String(given[k]) === String(parsed[k])
})

const FORMATS = ['sdlc/{name}', 'sdlc/{name:lower}', 'Feat/PROJ-{name:lower}-X', 'Feat/PROJ-{name}-X', '{name}', '{name:lower}', '{name}-e2e', '{name}-attempt-1', '{name}-v1-a-1', '{name}-1', 'run-{name}', 'feature/p-1-{name:lower}', 'x/{name}-y']
const KINDS = Object.keys(SPEC)

test('verify contract VS-1: name refuses ids that parse as another kind', () => {
  const ids = ['S-001-attempt-2', 'S-001-v0-cli-0', 'S-001-attempt-0', 'S-001-v10-a-b-3']
  for (const kind of ['slice', 'milestone']) for (const id of ids) for (const fmt of ['sdlc/{name}', 'sdlc/{name:lower}']) {
    const out = nameOf(fmt, kind, { id })
    record(`VS-1 ${fmt} ${kind} ${id}`, { out })
    assert.equal(out.outcome, 'Fail', `${fmt} ${kind} ${id} -> ${JSON.stringify(out)}`)
    assert.match(out.message, new RegExp(kind))
    assert.ok(out.message.includes('sdlc/'), out.message)
  }
  for (const [id, kind, n] of [['S-001-attempt-2', 'attempt', 2], ['S-001-v0-cli-0', 'verify', 0]]) {
    const p = parseOf('sdlc/{name}', `sdlc/${id}`)
    record(`VS-1 parse ${id}`, { out: p })
    assert.equal(p.value.kind, kind)
  }
})

test('verify contract VS-2: valid parts keep their names and parse back', () => {
  const cases = [
    ['run', { n: 7 }], ['run', { n: '07' }], ['slice', { id: 'S-001' }], ['slice', { id: 'S-fix-M-1-2' }], ['slice', { id: 'S-001-e2e' }],
    ['milestone', { id: 'M-1' }], ['e2e', { id: 'M-1' }], ['e2e-area', { id: 'M-1', area: 'api' }], ['state', { ts: '20261011101010' }],
    ['verify', { id: 'S-001', round: 2, profile: 'cli', part: 1 }], ['attempt', { id: 'S-001', n: 3 }],
  ]
  for (const fmt of ['sdlc/{name}', 'sdlc/{name:lower}', 'Feat/PROJ-{name:lower}-X', 'feature/p-1-{name}']) for (const [kind, parts] of cases) {
    const out = nameOf(fmt, kind, parts)
    assert.equal(out.outcome, 'return', `${fmt} ${kind} ${JSON.stringify(parts)} -> ${JSON.stringify(out)}`)
    assert.equal(out.value, modelName(fmt, kind, parts))
    const back = parseOf(fmt, out.value).value
    assert.equal(back.kind, kind)
    assert.ok(sameParts(kind, parts, back, fmt.includes(':lower')), JSON.stringify([parts, back]))
    record(`VS-2 ${fmt} ${kind}`, { branch: out.value, back: { kind: back.kind } })
  }
  assert.equal(nameOf('sdlc/{name}', 'slice', { id: 'S-001' }).value, 'sdlc/S-001')
})

test('verify contract VS-3: non-ASCII ids and parts are refused', () => {
  const ids = ['S-00\u212a', 'S-ſAMPLE', 'S-é', 'S-００１', 'M-１', 'S-İD']
  for (const fmt of ['sdlc/{name}', 'sdlc/{name:lower}']) {
    for (const kind of ['slice', 'milestone', 'e2e', 'attempt', 'verify', 'e2e-area']) for (const id of ids) {
      const parts = { id, n: 1, round: 1, profile: 'cli', part: 1, area: 'api' }
      const out = nameOf(fmt, kind, parts)
      record(`VS-3 ${fmt} ${kind} ${id}`, { out })
      assert.equal(out.outcome, 'Fail', `${fmt} ${kind} ${id} -> ${JSON.stringify(out)}`)
    }
    for (const kind of ['run', 'attempt']) for (const n of ['２', '١٢', '１２']) {
      const out = nameOf(fmt, kind, { id: 'S-001', n })
      assert.equal(out.outcome, 'Fail', `${fmt} ${kind} n=${n} -> ${JSON.stringify(out)}`)
    }
    for (const field of ['round', 'part']) for (const v of ['１', '٣']) {
      const out = nameOf(fmt, 'verify', { id: 'S-001', round: 1, profile: 'cli', part: 1, [field]: v })
      assert.equal(out.outcome, 'Fail', `${fmt} verify ${field}=${v} -> ${JSON.stringify(out)}`)
    }
  }
})

test('verify contract VS-4: integer parts compare by value', () => {
  const ok = [[2, 2], ['02', 2], ['2', 2], [0, 0], ['000', 0], [{ $bigint: '1' + '0'.repeat(400) }, null], ['1' + '0'.repeat(400), null]]
  for (const [n, want] of ok) {
    const out = nameOf('sdlc/{name}', 'run', { n })
    record(`VS-4 ok ${typeof n === 'object' ? 'bigint400' : JSON.stringify(n).slice(0, 20)}`, { out: { outcome: out.outcome, value: out.value?.slice(0, 30) } })
    assert.equal(out.outcome, 'return', JSON.stringify(out).slice(0, 300))
    const back = parseOf('sdlc/{name}', out.value).value
    assert.equal(back.kind, 'run')
    if (want !== null) assert.equal(back.n, want)
    else assert.equal(back.n.$bigint.length, 401)
  }
  const bad = [' 2', '+2', '-1', '0x2', '2.0', '2e0', '2_0', '', 'two', { $float: 2.0 }, true, false, '2 ', '٢', '1\u0000']
  for (const n of bad) for (const kind of ['run', 'attempt']) {
    const out = nameOf('sdlc/{name}', kind, { id: 'S-001', n })
    record(`VS-4 bad ${kind} ${JSON.stringify(n)}`, { out: { outcome: out.outcome, value: out.value } })
    assert.equal(out.outcome, 'Fail', `${kind} n=${JSON.stringify(n)} -> ${JSON.stringify(out)}`)
  }
})

test('verify contract VS-4 seed: integer part with a line break', () => {
  const found = []
  for (const n of ['2\n', '2\r', '\n2']) for (const kind of ['run', 'attempt']) {
    const out = nameOf('sdlc/{name}', kind, { id: 'S-001', n })
    found.push({ kind, n, out })
  }
  record('VS-4 seed newline-int', { found })
  const accepted = found.filter((f) => f.out.outcome === 'return').map((f) => JSON.stringify([f.kind, f.n, f.out.value]))
  console.log('SEED newline-int accepted: ' + accepted.join(' ; '))
})

test('verify contract VS-5: lowering touches only the tail by one ASCII rule', () => {
  const o = nameOf('Feat/PROJ-{name:lower}-X', 'slice', { id: 'S-001' })
  assert.equal(o.value, 'Feat/PROJ-s-001-X')
  for (const area of ['É', 'İ', 'ß', 'ẞ', 'ſ', 'K', 'Éa-B', 'API']) for (const fmt of ['Feat/PROJ-{name:lower}-X', 'sdlc/{name:lower}']) {
    const out = nameOf(fmt, 'e2e-area', { id: 'M-1', area })
    record(`VS-5 ${fmt} ${area}`, { out })
    assert.equal(out.outcome, 'return', JSON.stringify(out))
    assert.equal(out.value, modelName(fmt, 'e2e-area', { id: 'M-1', area }))
    const back = parseOf(fmt, out.value).value
    assert.equal(back.kind, 'e2e-area')
    assert.equal(asciiLower(back.area), asciiLower(area))
    assert.ok(![...out.value].some((c) => c.charCodeAt(0) < 128 && c >= 'A' && c <= 'Z' && out.value.indexOf(c) >= fmt.indexOf('{') && fmt.startsWith('sdlc')), out.value)
  }
  const up = nameOf('sdlc/{name:lower}', 'verify', { id: 'S-001', round: 1, profile: 'CLI', part: 1 })
  assert.equal(up.value, 'sdlc/s-001-v1-cli-1')
})

test('verify contract VS-6: joined prefix or suffix never gives a silent mismatch', () => {
  const fmts = ['{name}-e2e', '{name}-attempt-1', '{name}-v1-a-1', '{name}-1', 'run-{name}', 'x-{name}-e2e-y', '{name}-attempt-2']
  const idsAll = ['S-001', 'M-1', 'S-001-e2e', 'S-001-attempt-1', 'S-001-v1-a-1', 'M-1-e2e', 'S-fix-M-1-2']
  let fails = 0, oks = 0
  for (const fmt of fmts) for (const kind of ['slice', 'milestone', 'e2e', 'attempt', 'run']) for (const id of idsAll) {
    const parts = { id, n: 1 }
    const out = nameOf(fmt, kind, parts)
    assert.notEqual(out.outcome, 'exception', JSON.stringify(out))
    if (out.outcome === 'Fail') { fails++; continue }
    oks++
    const back = parseOf(fmt, out.value).value
    assert.ok(back && back.kind === kind && sameParts(kind, parts, back, false), `${fmt} ${kind} ${id} -> ${out.value} parses ${JSON.stringify(back)}`)
  }
  record('VS-6 totals', { fails, oks })
})

test('verify contract VS-7: state keeps ts as given and builds one when absent', () => {
  const none = nameOf('sdlc/{name}', 'state')
  assert.equal(none.outcome, 'return', JSON.stringify(none))
  assert.match(none.value, /^sdlc\/state-\d{14}$/)
  assert.equal(parseOf('sdlc/{name}', none.value).value.kind, 'state')
  for (const ts of [undefined, '']) {
    const o = nameOf('sdlc/{name}', 'state', ts === undefined ? {} : { ts })
    assert.equal(o.outcome, 'return', JSON.stringify(o))
    assert.match(o.value, /^sdlc\/state-\d{14}$/)
  }
  const given = nameOf('sdlc/{name}', 'state', { ts: '20261011101010' })
  assert.equal(given.value, 'sdlc/state-20261011101010')
  const upper = nameOf('Feat/{name:lower}', 'state', { ts: '20261011101010' })
  assert.equal(upper.value, 'Feat/state-20261011101010')
  for (const ts of ['2026101110101', '202610111010101', 'abcdefghijklmn', '2026-10-11T10:1', '２０２６１０１１１０１０１０', '20261011101010\n', ' 20261011101010', '0']) {
    const o = nameOf('sdlc/{name}', 'state', { ts })
    record(`VS-7 bad ts ${JSON.stringify(ts)}`, { out: o })
    assert.equal(o.outcome, 'Fail', `ts=${JSON.stringify(ts)} -> ${JSON.stringify(o)}`)
  }
  const a = nameOf('sdlc/{name}', 'state', { ts: '20261011101010' }).value
  assert.equal(a, nameOf('sdlc/{name}', 'state', { ts: '20261011101010' }).value)
})

const IDS = ['S-001', 'S-fix-M-1-2', 'S-001-attempt-2', 'S-001-v0-cli-0', 'S-001-e2e', 'S-001-attempt-0', 'S-001-v10-a-b-3', 'M-1', 'M-12', 'M-1-e2e', 'S-00\u212a', 'S-é', 'S-００１', 'S-001\n', 'S', 'S-', '', 'x', 'M-1-e2e-api', 'S-A-B-c']
const INTS = [0, 1, 2, 10, '02', '2', ' 2', '+2', '-1', '0x2', '2\n', '１２', true, { $float: 2.0 }, { $bigint: '123456789012345678901234567890' }, '']
const AREAS = ['api', 'É', 'İ', 'ß', 'a-b', '', 'x\n', 'A-B', 'ſ', '-', 'e2e-x']
const PROFILES = ['cli', 'CLI', 'a-b', 'é', 'http-api', '', 'a_b', 'cli\n']
const TSS = ['20261011101010', '2026', 'abcdefghijklmn', undefined, '', '20261011101010\n']

function genCall(r) {
  const fmt = pick(r, FORMATS), kind = pick(r, KINDS)
  const parts = { id: pick(r, IDS), n: pick(r, INTS), round: pick(r, INTS), part: pick(r, INTS), area: pick(r, AREAS), profile: pick(r, PROFILES) }
  const ts = pick(r, TSS)
  if (ts !== undefined) parts.ts = ts
  return { fmt, kind, parts }
}
const unbig = (v) => (v && typeof v === 'object' && '$bigint' in v ? BigInt(v.$bigint) : v)
const plainPart = (v) => (v && typeof v === 'object' && '$float' in v ? v.$float : v && typeof v === 'object' ? BigInt(v.$bigint) : v)

test('verify contract property: any name output parses back to the same kind and parts', () => {
  const runs = 3000
  const r = rng(SEED)
  const inputs = Array.from({ length: runs }, () => genCall(r))
  const outs = py(inputs.map((c) => ({ fn: 'name', ...c })))
  const okIdx = outs.map((o, i) => (o.outcome === 'return' ? i : -1)).filter((i) => i >= 0)
  const parsed = py(okIdx.map((i) => ({ fn: 'parse', fmt: inputs[i].fmt, branch: outs[i].value })))
  const violations = []
  const seedHits = []
  outs.forEach((o, i) => { if (o.outcome === 'exception') violations.push({ i, input: inputs[i], why: `exception ${o.type}: ${o.message}` }) })
  okIdx.forEach((i, k) => {
    const c = inputs[i], branch = outs[i].value, back = parsed[k].value
    const lower = c.fmt.includes(':lower')
    const given = Object.fromEntries(Object.entries(c.parts).map(([key, v]) => [key, plainPart(v)]))
    const bad = (why) => violations.push({ i, input: c, branch, why })
    if (!back || back.kind !== c.kind) return bad(`parse reads ${back && back.kind}`)
    const req = SPEC[c.kind].req.filter((p) => !(c.kind === 'state' && (given.ts === undefined || given.ts === '')))
    for (const p of req) {
      const g = given[p], f = unbig(back[p])
      const same = INT.includes(p) ? (typeof g !== 'boolean' && /^[0-9]+\s*$/.test(String(g)) && BigInt(String(g).trim()) === BigInt(f)) : (lower ? asciiLower(String(g)) === asciiLower(String(f)) : String(g) === String(f))
      if (!same) bad(`part ${p} given ${JSON.stringify(String(g))} parsed ${JSON.stringify(String(f))}`)
    }
    if (/[\n\r]/.test(branch)) (c.kind === 'state' ? bad : (why) => seedHits.push({ i, c, branch, why }))('branch holds a line break')
    if (c.kind !== 'state' && lower) {
      const [pre, suf] = c.fmt.split('{name:lower}')
      const mid = branch.slice(pre.length, branch.length - suf.length)
      if (mid !== asciiLower(mid)) bad('tail not ASCII-lowered')
      if (!branch.startsWith(pre) || !branch.endsWith(suf)) bad('prefix or suffix changed')
    }
  })
  record('PROPERTY any-name', { seed: SEED, runs, returns: okIdx.length, fails: outs.filter((o) => o.outcome === 'Fail').length, violations: violations.length, lineBreakSeedHits: seedHits.length, allStateTsNewline: violations.every((v) => v.input.kind === 'state' && v.input.parts.ts === '20261011101010\n'), kinds: [...new Set(violations.map((v) => v.input.kind))], sample: violations.slice(0, 5), seedSample: seedHits.slice(0, 3) })
  assert.equal(violations.length, 0, `seed=${SEED} violations=${violations.length}\n` + violations.slice(0, 5).map((v) => JSON.stringify(v)).join('\n'))
})

function validCall(r) {
  const fmt = pick(r, ['sdlc/{name}', 'sdlc/{name:lower}', 'Feat/PROJ-{name:lower}-X', 'Feat/PROJ-{name}-X', 'feature/p-1-{name:lower}'])
  const kind = pick(r, KINDS)
  const digits = () => String(Math.floor(r() * 10000)).padStart(Math.floor(r() * 3) + 1, '0')
  const sid = pick(r, ['S-001', 'S-fix-M-1-2', 'S-12', 'S-a-b', 'S-fix-3', 'S-001-e2e'])
  const mid = 'M-' + Math.floor(r() * 50)
  const parts = {
    id: ['milestone', 'e2e', 'e2e-area'].includes(kind) ? mid : sid,
    n: r() < 0.5 ? Math.floor(r() * 1000) : digits(),
    round: Math.floor(r() * 20), part: Math.floor(r() * 20),
    profile: pick(r, ['cli', 'http-api', 'a1', 'security']),
    area: pick(r, ['api', 'ui-1', 'É', 'Mixed-Case', 'x']),
    ts: String(20260000000000 + Math.floor(r() * 1e9)).padStart(14, '2'),
  }
  return { fmt, kind, parts }
}

test('verify contract property: valid parts give the reference name and round-trip', () => {
  const runs = 2000
  const r = rng(SEED + 1)
  const inputs = Array.from({ length: runs }, () => validCall(r))
  const outs = py(inputs.map((c) => ({ fn: 'name', ...c })))
  const bad = []
  outs.forEach((o, i) => {
    const c = inputs[i]
    const want = modelName(c.fmt, c.kind, c.parts)
    if (o.outcome !== 'return') bad.push({ c, o })
    else if (o.value !== want) bad.push({ c, got: o.value, want })
  })
  record('PROPERTY valid-names', { seed: SEED + 1, runs, violations: bad.length, sample: bad.slice(0, 5) })
  assert.equal(bad.length, 0, `seed=${SEED + 1} ` + bad.slice(0, 5).map((v) => JSON.stringify(v)).join('\n'))
})

test('verify contract property: name is deterministic', () => {
  const r = rng(SEED + 2)
  const inputs = Array.from({ length: 500 }, () => validCall(r)).filter((c) => c.kind !== 'state' || c.parts.ts)
  const a = py(inputs.map((c) => ({ fn: 'name', ...c })))
  const b = py(inputs.map((c) => ({ fn: 'name', ...c })))
  assert.deepEqual(a, b)
  record('PROPERTY determinism', { seed: SEED + 2, runs: inputs.length })
})
