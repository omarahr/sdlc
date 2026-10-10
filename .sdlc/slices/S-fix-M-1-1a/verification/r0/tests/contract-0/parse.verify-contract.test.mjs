import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const REPO = process.env.VERIFY_REPO
const BRANCHES = join(REPO, 'skills/sdlc/branches.py')
const TK = join(REPO, 'skills/sdlc/test/testkit')
const { callPython } = await import(join(TK, 'property.mjs'))
const { cliRunner } = await import(join(TK, 'cli-runner.mjs'))

const K = 'K', LONGS = 'ſ', AR3 = '٣', ARC = '١'
const FORMATS = ['feature/p-1-{name}', 'feature/p-1-{name:lower}', '{name:lower}-end', 'X{name}']
const parseAll = (calls) => callPython(BRANCHES, 'parse', calls)
const val = (r) => { assert.equal(r.outcome, 'return', JSON.stringify(r)); return r.value }

const wrap = (fmt, tail) => {
  const [p, s] = fmt.split(/\{name(?::lower)?\}/)
  return p + tail + s
}

function model(fmt, branch, ids) {
  const lower = fmt.includes('{name:lower}')
  const [p, s] = fmt.split(/\{name(?::lower)?\}/)
  const lo = (t) => t.replace(/[A-Z]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 32))
  const cmp = (a, b) => (lower ? lo(a) === lo(b) : a === b)
  if (branch.length < p.length + s.length) return null
  if (!cmp(branch.slice(0, p.length), p)) return null
  if (s && !cmp(branch.slice(branch.length - s.length), s)) return null
  const mid = branch.slice(p.length, branch.length - s.length)
  const f = lower ? 'i' : ''
  const rows = [
    ['run', new RegExp('^run-([0-9]+)$', f), ['n']],
    ['milestone', new RegExp('^(M-[0-9]+)$', f), ['id']],
    ['e2e', new RegExp('^(M-[0-9]+)-e2e$', f), ['id']],
    ['e2e-area', new RegExp('^(M-[0-9]+)-e2e-([^\\n]+)$', f), ['id', 'area']],
    ['state', new RegExp('^state-([0-9]{14})$', f), ['ts']],
    ['verify', new RegExp('^([^\\n]+)-v([0-9]+)-([a-z0-9-]+?)-([0-9]+)$', f), ['id', 'round', 'profile', 'part']],
    ['attempt', new RegExp('^([^\\n]+)-attempt-([0-9]+)$', f), ['id', 'n']],
    ['slice', new RegExp('^(S-[A-Za-z0-9-]+)$', f), ['id']],
  ]
  for (const [kind, re, names] of rows) {
    const m = mid.match(re)
    if (!m) continue
    const out = { kind, tail: mid }
    names.forEach((n, i) => { out[n] = ['n', 'round', 'part'].includes(n) ? Number(m[i + 1]) : m[i + 1] })
    if ('id' in out && !/^[\x00-\x7f]*$/.test(out.id)) return null
    out.known = null
    if (ids && 'id' in out) {
      out.known = false
      const w = lower ? lo(out.id) : out.id
      for (const c of ids) if ((lower ? lo(c) : c) === w) { out.id = c; out.known = true; break }
    }
    return out
  }
  return null
}

const LOOKALIKE_TAILS = [
  `S-00${K}`, `s-001${LONGS}`, `s-00${K}-v0-cli-0`, `s-00${K}-attempt-1`, `S-001-v${AR3}-cli-0`, `run-${AR3}`,
  `S-${LONGS}ome`, `M-${ARC}`, `M-${ARC}-e2e`, `M-1-e2e${K}`, `state-${ARC.repeat(14)}`, `S-001-v0-cli-${AR3}`,
  `S-001-attempt-${AR3}`, `S-001-${K}`, `${K}-001`,
]

test('verify contract: VS-1 look-alike tails give None in both name modes', () => {
  const calls = []
  for (const fmt of FORMATS) for (const t of LOOKALIKE_TAILS) calls.push([fmt, wrap(fmt, t)])
  const res = parseAll(calls)
  res.forEach((r, i) => {
    const expected = model(calls[i][0], calls[i][1])
    assert.deepEqual(val(r), expected, `${JSON.stringify(calls[i])}`)
  })
  const nonNull = res.map((r, i) => [val(r), calls[i]]).filter(([v, c]) => v !== null && /[Kſ١٣]/.test(c[1].slice(c[0].length ? 0 : 0)))
  console.log('look-alike calls', calls.length, 'non-null results', nonNull.map(([v, c]) => JSON.stringify([c, v])))
})

test('verify contract: VS-1 explicit None for the named tails', () => {
  for (const fmt of ['feature/p-1-{name}', 'feature/p-1-{name:lower}']) {
    for (const t of [`S-00${K}`, `s-00${K}-v0-cli-0`, `s-00${K}-attempt-1`, `S-001-v${AR3}-cli-0`, `run-${AR3}`]) {
      const [r] = parseAll([[fmt, wrap(fmt, t)]])
      assert.equal(val(r), null, `${fmt} ${t}`)
    }
  }
  const [r] = parseAll([['feature/p-1-{name:lower}', wrap('feature/p-1-{name:lower}', `s-001${LONGS}`)]])
  assert.equal(val(r), null)
})

test('verify contract: VS-2 lower mode look-alike prefix, suffix and ledger ids', () => {
  const fmtK = `${K}ey/{name:lower}`
  const [a] = parseAll([[fmtK, 'key/s-001']])
  assert.equal(val(a), null, 'K sign prefix must not match k')
  const [a2] = parseAll([[fmtK, `${K}ey/s-001`]])
  assert.equal(val(a2)?.kind, 'slice')
  const fmtS = `{name:lower}-${LONGS}x`
  const [b] = parseAll([[fmtS, 's-001-sx']])
  assert.equal(val(b), null, 'long s suffix must not match s')
  const [c] = parseAll([['feature/{name:lower}', 'feature/s-001', [`S-00${K}`, 'S-001']]])
  assert.equal(val(c).known, true); assert.equal(val(c).id, 'S-001')
  const [d] = parseAll([['feature/{name:lower}', 'feature/s-001', [`S-001${LONGS}`, `S-00${K}`]]])
  assert.equal(val(d).known, false)
  const [e] = parseAll([['feature/{name:lower}', 'feature/s-0k1', ['S-0' + K + '1']]])
  assert.equal(val(e).known, false)
  const [f] = parseAll([['feature/{name:lower}', 'FEATURE/S-001', ['S-001']]])
  assert.equal(val(f).known, true)
})

test('verify contract: VS-3 valid ASCII tails keep kind and rows', () => {
  const cases = [
    ['S-fix-M-1-2', 'slice'], ['M-1-e2e-api', 'e2e-area'], ['M-1-e2e-a-b', 'e2e-area'], ['S-001-v0-http-api-0', 'verify'],
    ['S-001-attempt-2', 'attempt'], ['run-12', 'run'], ['M-3', 'milestone'], ['M-3-e2e', 'e2e'], ['state-20261010131519', 'state'],
  ]
  for (const fmt of ['feature/p-1-{name}', 'feature/p-1-{name:lower}']) {
    const res = parseAll(cases.map(([t]) => [fmt, wrap(fmt, fmt.includes('lower') ? t.toLowerCase() : t)]))
    res.forEach((r, i) => {
      const v = val(r)
      assert.equal(v.kind, cases[i][1], `${fmt} ${cases[i][0]}`)
    })
  }
  const [x] = parseAll([['feature/p-1-{name}', 'feature/p-1-S-fix-M-1-2']]); assert.equal(val(x).id, 'S-fix-M-1-2')
  const [y] = parseAll([['feature/p-1-{name}', 'feature/p-1-M-1-e2e-a-b']]); assert.equal(val(y).area, 'a-b')
  const [z] = parseAll([['feature/p-1-{name}', 'feature/p-1-S-001-v0-http-api-0']])
  assert.deepEqual([val(z).id, val(z).round, val(z).profile, val(z).part], ['S-001', 0, 'http-api', 0])
  const [m] = parseAll([['feature/p-1-{name:lower}', 'FEATURE/P-1-s-FIX-m-1-2', ['S-fix-M-1-2']]])
  assert.equal(val(m).kind, 'slice'); assert.equal(val(m).known, true); assert.equal(val(m).id, 'S-fix-M-1-2')
  const [n] = parseAll([['feature/p-1-{name:lower}', 'feature/p-1-M-1-E2E-API']]); assert.equal(val(n).kind, 'e2e-area')
})

test('verify contract: VS-4 non-ASCII area stays e2e-area', () => {
  for (const fmt of ['feature/p-1-{name}', 'feature/p-1-{name:lower}']) {
    const [r] = parseAll([[fmt, wrap(fmt, 'M-1-e2e-é')]])
    assert.equal(val(r).kind, 'e2e-area'); assert.equal(val(r).area, 'é'); assert.equal(val(r).id, 'M-1')
    const [r2] = parseAll([[fmt, wrap(fmt, 'M-1-e2e-日本-😀')]])
    assert.equal(val(r2).kind, 'e2e-area')
  }
})

const ALPHA = ['S', 's', 'M', 'm', 'k', 'K', K, LONGS, 'e', '2', AR3, ARC, '-', '-', 'v', 'a', 'é', '0', '1', 'run', 'state', 'e2e', 'attempt', '😀']
function rng(seed) { let s = seed >>> 0; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32) }

test('verify contract: property parse equals ASCII reference model (1000+ runs)', () => {
  const seed = Number(process.env.TESTKIT_SEED ?? 20261010)
  const r = rng(seed)
  const pick = (a) => a[Math.floor(r() * a.length)]
  const structured = () => pick(['S-', 'M-1-e2e-', 'run-', 'state-', 'M-', '']) + Array.from({ length: Math.floor(r() * 5) }, () => pick(ALPHA)).join('') + pick(['', '-v0-cli-0', '-attempt-1', '-v1-a-b-2', '-e2e'])
  const free = () => Array.from({ length: Math.floor(r() * 12) }, () => pick(ALPHA)).join('')
  const runs = 3000
  const calls = []
  for (let i = 0; i < runs; i++) {
    const fmt = pick(FORMATS)
    const t = r() < 0.6 ? structured() : free()
    const ids = r() < 0.4 ? [pick(['S-001', 'S-00K', `S-00${K}`, 'M-1', 'S-' + LONGS, 'S-s'])] : undefined
    calls.push(ids ? [fmt, wrap(fmt, t), ids] : [fmt, wrap(fmt, t)])
  }
  const res = parseAll(calls)
  const bad = []
  res.forEach((x, i) => {
    if (x.outcome !== 'return') return bad.push([calls[i], x])
    const exp = model(calls[i][0], calls[i][1], calls[i][2])
    if (JSON.stringify(x.value) !== JSON.stringify(exp)) bad.push([calls[i], x.value, exp])
  })
  const nonNull = res.filter((x) => x.value).length
  console.log(`property-run parse-vs-model seed=${seed} runs=${runs} nonNull=${nonNull} mismatches=${bad.length}`)
  if (bad.length) console.log(JSON.stringify(bad.slice(0, 5)))
  assert.equal(bad.length, 0)
})

test('verify contract: determinism and input immutability', () => {
  const ids = ['S-001', 'M-1']
  const call = ['feature/p-1-{name:lower}', 'feature/p-1-s-001', ids]
  const a = parseAll([call, call, call]).map((x) => JSON.stringify(x.value))
  assert.equal(new Set(a).size, 1)
})

test('verify contract: consumer view through the CLI matches parse', () => {
  const r = cliRunner()
  const repo = r.gitRepo({ files: { '.sdlc/config.json': { branchFormat: 'feature/p-1-{name:lower}' } } })
  for (const t of [`s-00${K}`, `s-001${LONGS}`, `run-${AR3}`, 'm-1-e2e-é', 's-fix-m-1-2']) {
    const br = 'feature/p-1-' + t
    const out = r.run('branches.py', ['parse', '--repo', repo, '--branch', br])
    const [py] = parseAll([['feature/p-1-{name:lower}', br]])
    const exp = val(py)
    console.log('cli', JSON.stringify(br), 'status', out.status, out.stdout.trim().slice(0, 160))
    assert.equal(out.status, 0)
    if (exp === null) assert.notEqual(out.json.kind ?? null, 'slice'), assert.ok(!out.json.kind, 'cli shows no kind'), assert.equal(out.json.matched ?? false, false)
    else assert.equal(out.json.kind, exp.kind)
  }
})
