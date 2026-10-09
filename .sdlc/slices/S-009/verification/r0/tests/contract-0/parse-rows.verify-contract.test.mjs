import { test } from 'node:test'
import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'

const REPO = process.env.SDLC_REPO || '/Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run'
const MAIN = '/Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run'
const KIT = `${REPO}/skills/sdlc/test/testkit`
const { callPython, rng, defaultSeed, BRANCHES } = await import(`${KIT}/property.mjs`)
const { cliRunner } = await import(`${KIT}/cli-runner.mjs`)

const D = 'sdlc/{name}'
const PRE = 'feature/PROJ-1-{name}'
const SUF = '{name}-wip'
const LOW = 'sdlc/{name:lower}'

const parse = (cases) => callPython(BRANCHES, 'parse', cases.map((c) => (c.ids ? [c.fmt, c.branch, c.ids] : [c.fmt, c.branch])))
const ret = (res) => { assert.equal(res.outcome, 'return', JSON.stringify(res)); return res.value }
const one = (fmt, branch, ids) => ret(parse([{ fmt, branch, ids }])[0])
const kindOf = (fmt, branch) => one(fmt, branch)?.kind ?? null

const pre = (fmt) => { const [a, b] = fmt.split(/\{name(?::lower)?\}/); return [a, b] }
const wrap = (fmt, tail) => { const [a, b] = pre(fmt); return a + tail + b }

const MODEL_ROWS = [
  ['run', /^run-(\d+)$/, ['n']],
  ['milestone', /^(M-\d+)$/, ['id']],
  ['e2e', /^(M-\d+)-e2e$/, ['id']],
  ['e2e-area', /^(M-\d+)-e2e-(.+)$/, ['id', 'area']],
  ['state', /^state-(\d{14})$/, ['ts']],
  ['verify', /^(.+)-v(\d+)-([a-z0-9-]+?)-(\d+)$/, ['id', 'round', 'profile', 'part']],
  ['attempt', /^(.+)-attempt-(\d+)$/, ['id', 'n']],
  ['slice', /^(S-[A-Za-z0-9-]+)$/, ['id']],
]
function model(tail) {
  for (const [kind, re, names] of MODEL_ROWS) {
    const m = re.exec(tail)
    if (!m) continue
    const out = { kind, tail }
    names.forEach((n, i) => { out[n] = ['n', 'round', 'part'].includes(n) ? Number(m[i + 1]) : m[i + 1] })
    return out
  }
  return null
}
const same = (got, tail) => {
  const exp = model(tail)
  if (exp === null) return assert.equal(got, null, tail)
  const { known, ...rest } = got
  assert.equal(known, null)
  assert.deepEqual(rest, exp, tail)
}
const note = (s) => console.log(s)

test('verify contract VS-1 state: exactly 14 digits, ts string', () => {
  const g = one(D, 'sdlc/state-20261008101500')
  assert.equal(g.kind, 'state'); assert.strictEqual(g.ts, '20261008101500'); assert.equal(g.tail, 'state-20261008101500'); assert.equal('id' in g, false)
  for (const t of ['state-2026100810150', 'state-202610081015000', 'state-', 'state-2026100810150x', 'state-20261008101a00', 'state-x20261008101500', 'state-20261008101500-', 'state-20261008101500x', 'State-20261008101500']) {
    assert.equal(one(D, `sdlc/${t}`), null, t)
  }
  const r = cliRunner(); const repo = r.gitRepo({})
  const t = r.run('branches.py', ['parse', '--repo', repo, '--format', D, '--branch', 'sdlc/state-20261008101500'])
  assert.equal(t.status, 0); assert.equal(t.json.kind, 'state'); assert.strictEqual(t.json.ts, '20261008101500')
  const bad = r.run('branches.py', ['parse', '--repo', repo, '--format', D, '--branch', 'sdlc/state-2026100810150'])
  assert.equal(bad.status, 0); assert.equal(bad.json.kind ?? null, null)
})

test('verify contract VS-2 verify parts and boundaries', () => {
  let g = one(D, 'sdlc/S-001-v0-http-api-0')
  assert.deepEqual({ ...g }, { kind: 'verify', tail: 'S-001-v0-http-api-0', id: 'S-001', round: 0, profile: 'http-api', part: 0, known: null })
  g = one(D, 'sdlc/S-001-v12-cli-3')
  assert.equal(g.round, 12); assert.equal(g.part, 3); assert.equal(g.profile, 'cli'); assert.equal(typeof g.round, 'number')
  g = one(D, 'sdlc/S-001-v1-a-b-c-4')
  assert.equal(g.profile, 'a-b-c'); assert.equal(g.part, 4)
  for (const t of ['S-001-v0-http-api', 'S-001-v-cli-0', 'S-001-v0--0', 'S-001-v0-cli-', 'S-001-v0-cli-x', 'S-001-vx-cli-0']) {
    assert.notEqual(kindOf(D, `sdlc/${t}`), 'verify', t)
  }
  const r = cliRunner(); const repo = r.gitRepo({})
  const t = r.run('branches.py', ['parse', '--repo', repo, '--format', D, '--branch', 'sdlc/S-001-v12-cli-3'])
  assert.deepEqual([t.json.kind, t.json.id, t.json.round, t.json.profile, t.json.part], ['verify', 'S-001', 12, 'cli', 3])
})

test('verify contract VS-3 verify beats slice and attempt', () => {
  for (const fmt of [D, PRE, SUF, LOW]) {
    assert.equal(kindOf(fmt, wrap(fmt, 'S-001-v0-http-api-0')), 'verify', fmt)
    const g = one(fmt, wrap(fmt, 'S-fix-M-1-2-v1-cli-0'))
    assert.equal(g.kind, 'verify'); assert.equal(g.id, 'S-fix-M-1-2')
  }
  const g = one(D, 'sdlc/S-001-attempt-3-v0-cli-0')
  assert.equal(g.kind, 'verify'); assert.equal(g.id, 'S-001-attempt-3')
})

test('verify contract VS-4 attempt', () => {
  let g = one(D, 'sdlc/S-001-attempt-2')
  assert.deepEqual(g, { kind: 'attempt', tail: 'S-001-attempt-2', id: 'S-001', n: 2, known: null })
  g = one(D, 'sdlc/S-005b-attempt-10'); assert.equal(g.n, 10); assert.equal(g.id, 'S-005b'); assert.equal(typeof g.n, 'number')
  for (const t of ['S-001-attempt-', 'S-001-attempt-x', 'S-001-attempt-2-', 'S-001-attempt', 'S-001-attempt-2x']) {
    assert.notEqual(kindOf(D, `sdlc/${t}`), 'attempt', t)
  }
  assert.equal(kindOf(D, 'sdlc/S-001-attempt-'), 'slice')
  assert.equal(kindOf(D, 'sdlc/S-001-attempt-2'), 'attempt')
})

test('verify contract VS-5 slice', () => {
  assert.deepEqual(one(D, 'sdlc/S-001'), { kind: 'slice', tail: 'S-001', id: 'S-001', known: null })
  assert.equal(one(D, 'sdlc/S-fix-M-1-2').id, 'S-fix-M-1-2')
  assert.equal(one(D, 'sdlc/S-005b').id, 'S-005b')
  for (const b of ['sdlc/S-', 'sdlc/X-001', 'sdlc/S-001/x', 'sdlc/s-001', 'sdlc/', 'sdlc/S_001']) assert.equal(one(D, b), null, b)
  assert.equal(kindOf(LOW, 'sdlc/s-001'), 'slice')
  assert.equal(one(LOW, 'sdlc/s-001').id, 's-001')
  const r = cliRunner(); const repo = r.gitRepo({})
  const t = r.run('branches.py', ['parse', '--repo', repo, '--format', D, '--branch', 'sdlc/S-fix-M-1-2'])
  assert.deepEqual([t.json.kind, t.json.id], ['slice', 'S-fix-M-1-2'])
})

test('verify contract VS-6 rows 5 to 8 under prefix and suffix formats', () => {
  const tails = ['state-20261008101500', 'S-001-v0-http-api-0', 'S-001-v12-cli-3', 'S-001-attempt-2', 'S-005b-attempt-10', 'S-001', 'S-fix-M-1-2']
  for (const fmt of [D, PRE, SUF]) for (const t of tails) same(one(fmt, wrap(fmt, t)), t)
  assert.equal(one(SUF, 'S-001-v0-http-api-0-wip').part, 0)
  assert.equal(one(SUF, 'S-001-attempt-2-wip').n, 2)
  assert.equal(one(SUF, 'S-001-v0-http-api-0'), null)
  assert.equal(one(PRE, 'sdlc/S-001'), null)
  assert.equal(one(PRE, 'feature/PROJ-2-S-001'), null)
  assert.equal(one(SUF, 'S-001-wipx'), null)
  assert.equal(one(SUF, 'S-001'), null)
})

test('verify contract VS-7 known flag', () => {
  const ids = ['S-001']
  for (const t of ['S-001', 'S-001-attempt-2', 'S-001-v0-cli-0']) assert.equal(one(D, `sdlc/${t}`, ids).known, true, t)
  for (const t of ['S-002', 'S-002-attempt-2', 'S-002-v0-cli-0']) assert.equal(one(D, `sdlc/${t}`, ids).known, false, t)
  assert.equal(one(D, 'sdlc/state-20261008101500', ids).known, null)
  for (const t of ['s-001', 's-001-attempt-2', 's-001-v0-cli-0']) { const g = one(LOW, `sdlc/${t}`, ids); assert.equal(g.known, true); assert.equal(g.id, 'S-001') }
  assert.equal(one(D, 'sdlc/s-001', ids), null)
  assert.equal(one(LOW, 'sdlc/S-001-V0-CLI-0', ids).id, 'S-001')
  assert.equal(one(D, 'sdlc/S-001', []).known, false)
  assert.equal(one(D, 'sdlc/S-001', null)?.known ?? null, null)
})

const ALPHA = ['S', '-', 'fix', 'M', '1', 'v', '0', '12', 'attempt', 'state', 'cli', 'http', 'api', 'a', 'b', '9', '-', '-', 'x', '20261008101500']
function genTail(r) {
  const n = 1 + Math.floor(r() * 8)
  let s = ''
  for (let i = 0; i < n; i++) s += ALPHA[Math.floor(r() * ALPHA.length)] + (r() < 0.6 ? '-' : '')
  return r() < 0.5 ? s.replace(/-$/, '') : s
}
const SEED = Number(process.env.TESTKIT_SEED) || defaultSeed()
test('verify contract property: parse equals spec model, never raises, 3000 runs', () => {
  const rr0 = rng(SEED); const r = rr0.next
  const fmts = [D, PRE, SUF, LOW]
  const inputs = []
  const structured = (rr) => {
    const id = ['S-001', 'S-fix-M-1-2', 'S-005b', 'S-9'][Math.floor(rr() * 4)]
    const pick = Math.floor(rr() * 5)
    const num = String(Math.floor(rr() * 30))
    return [`${id}-v${num}-${['cli', 'http-api', 'a-b-c', 'x'][Math.floor(rr() * 4)]}-${num}`, `${id}-attempt-${num}`, id, `state-${'2026100810'.concat(String(Math.floor(rr() * 1e4)).padStart(4, '0'))}`, genTail(rr)][pick]
  }
  for (let i = 0; i < 3000; i++) {
    const fmt = fmts[i % 4]
    const tail = i % 2 ? structured(r) : genTail(r)
    inputs.push({ fmt, tail, branch: wrap(fmt, tail) })
  }
  writeFileSync(`${MAIN}/.sdlc/slices/S-009/verification/r0/logs/contract-0-inputs.json`, JSON.stringify(inputs))
  const res = parse(inputs)
  let nonNull = 0; const fails = []
  inputs.forEach((c, i) => {
    try {
      assert.equal(res[i].outcome, 'return')
      const got = ret(res[i])
      const lower = c.fmt === LOW
      const mtail = lower ? c.tail.toLowerCase() : c.tail
      const rows = MODEL_ROWS.map(([k, re, n]) => [k, lower ? new RegExp(re.source, 'i') : re, n])
      let exp = null
      for (const [kind, re, names] of rows) {
        const m = re.exec(c.tail)
        if (!m) continue
        exp = { kind, tail: c.tail }
        names.forEach((nm, j) => { exp[nm] = ['n', 'round', 'part'].includes(nm) ? Number(m[j + 1]) : m[j + 1] })
        break
      }
      void mtail
      if (exp === null) assert.equal(got, null)
      else { nonNull++; const { known, ...rest } = got; assert.equal(known, null); assert.deepEqual(rest, exp) }
    } catch (e) { fails.push({ input: c, message: e.message.slice(0, 300) }) }
  })
  const label = `property parse-model: seed=${SEED} runs=${inputs.length} nonNull=${nonNull} violations=${fails.length}`
  note(label)
  writeFileSync(`${MAIN}/.sdlc/slices/S-009/verification/r0/logs/contract-0-property.txt`, label + '\n' + JSON.stringify(fails.slice(0, 5), null, 1) + '\n')
  assert.equal(fails.length, 0, label + JSON.stringify(fails.slice(0, 3)))
})

test('verify contract determinism and no mutation of ids', () => {
  const ids = ['S-001', 'S-002']
  const a = one(D, 'sdlc/S-001-attempt-2', ids), b = one(D, 'sdlc/S-001-attempt-2', ids)
  assert.deepEqual(a, b)
  const out = parse([{ fmt: D, branch: 'sdlc/S-001', ids: ids }])
  assert.equal(out[0].outcome, 'return')
})

test('verify contract hostile inputs never raise', () => {
  const huge = '9'.repeat(5000)
  const cases = [
    `sdlc/S-001-attempt-${huge}`, `sdlc/S-001-v${huge}-cli-${huge}`, `sdlc/state-${huge}`,
    'sdlc/S-001-attempt-2\n', 'sdlc/state-20261008101500\n', 'sdlc/S-001\n', 'sdlc/S-001-v0-cli-0\n',
    'sdlc/S-001-attempt-٣', 'sdlc/state-٢٠٢٦١٠٠٨١٠١٥٠٠', 'sdlc/S-001-v٠-cli-٠',
    'sdlc/--flag-attempt-1', 'sdlc/S-001\u0000-attempt-1', 'sdlc/' + 'S-'.repeat(50000) + 'attempt-1', 'sdlc/S-001-v0-' + 'a-'.repeat(20000) + '0',
    'sdlc/S-\ud800-attempt-1',
  ]
  const res = parse(cases.map((branch) => ({ fmt: D, branch })))
  const summary = res.map((x, i) => `${JSON.stringify(cases[i].slice(0, 60))} -> ${x.outcome} ${x.outcome === 'return' ? JSON.stringify(x.value?.kind ?? null) : x.type}`)
  writeFileSync(`${MAIN}/.sdlc/slices/S-009/verification/r0/logs/contract-0-hostile.txt`, summary.join('\n') + '\n')
  res.forEach((x, i) => assert.equal(x.outcome, 'return', summary[i]))
})
