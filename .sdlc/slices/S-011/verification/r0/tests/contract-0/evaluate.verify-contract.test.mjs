import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { join } from 'node:path'

const ROOT = process.env.VERIFY_ROOT
const { rng, defaultSeed, callPython, scratch } = await import(join(ROOT, 'skills/sdlc/test/testkit/property.mjs')).then(async (m) => ({ ...m, scratch: (await import(join(ROOT, 'skills/sdlc/test/harness.mjs'))).scratch }))
const MOD = join(ROOT, 'skills/sdlc/branches.py')
const SEED = defaultSeed()
const RUNS = 1500

const ev = (calls) => callPython(MOD, 'evaluate', calls)
const one = (rule, sample) => ev([[rule, sample]])[0]
const rule = (kind, pattern, negate) => ({ source: 'github', kind, pattern, negate, label: 'x' })

const refRaw = { starts_with: (p, s) => s.startsWith(p), ends_with: (p, s) => s.endsWith(p), contains: (p, s) => s.includes(p) }
const ref = (r, s) => { const raw = refRaw[r.kind](r.pattern, s); return r.negate ? !raw : raw }

const ALPHA = ['a', 'b', 'A', 'B', 'e', 'E', '2', '/', '-', '_', 'S', 's', 'ı', 'İ', 'ß', 'SS', 'é', 'e\u0301', '\u{1f600}', ' ', 'feature/', 'Feature/', '-e2e', '-E2E']
const str = (r, max) => Array.from({ length: r.int(0, max) }, () => r.pick(ALPHA)).join('')
const sub = (r, s) => { const cp = [...s]; const i = r.int(0, cp.length); const j = r.int(i, cp.length); return cp.slice(i, j).join('') }

test('verify contract: text operators match a reference model (property)', () => {
  const r = rng(SEED)
  const inputs = []
  for (let i = 0; i < RUNS; i++) {
    const kind = r.pick(['starts_with', 'ends_with', 'contains'])
    const sample = str(r, 8)
    const pattern = r.bool(0.5) ? sub(r, sample) : str(r, 4)
    const p = r.bool(0.2) ? pattern.toUpperCase() : pattern
    inputs.push([rule(kind, p, r.bool(0.4)), sample])
  }
  const out = ev(inputs)
  const bad = []
  inputs.forEach(([ru, s], i) => { if (out[i].outcome !== 'return' || out[i].value !== ref(ru, s)) bad.push({ ru, s, got: out[i] }) })
  console.log(`property-run text-operators seed=${SEED} runs=${RUNS} violations=${bad.length}`)
  assert.deepEqual(bad.slice(0, 3), [])
})

test('verify contract: fixed examples from the spec and the plan', () => {
  const cases = [
    [rule('starts_with', 'feature/', false), 'feature/x', true],
    [rule('starts_with', 'feature/', false), 'bugfix/x', false],
    [rule('starts_with', 'Feature/', false), 'feature/x', false],
    [rule('ends_with', '-e2e', false), 'sdlc/M-1-e2e', true],
    [rule('ends_with', '-e2e', false), 'sdlc/M-1', false],
    [rule('ends_with', '-E2E', false), 'sdlc/M-1-e2e', false],
    [rule('ends_with', '-E2E', false), 'sdlc/M-1-E2E', true],
    [rule('contains', '/S-', false), 'sdlc/S-001', true],
    [rule('contains', '/S-', false), 'sdlc/M-1', false],
    [rule('contains', 'Feature', false), 'feature/x', false],
    [rule('contains', 'Feature', false), 'Feature/x', true],
    [rule('starts_with', '', false), 'abc', true],
    [rule('ends_with', '', false), '', true],
    [rule('contains', '', false), '', true],
    [rule('starts_with', 'abc', false), '', false],
    [rule('starts_with', 'abc', false), 'abc', true],
    [rule('contains', 'ı', false), 'I', false],
    [rule('contains', 'ß', false), 'SS', false],
    [rule('contains', 'ss', false), 'ß', false],
    [rule('regex', '^sdlc/', false), 'sdlc/S-001', true],
    [rule('regex', 'S-001', false), 'sdlc/S-001', true],
    [rule('regex', '^S-001', false), 'sdlc/S-001', false],
    [rule('regex', '(', false), 'sdlc/S-001', null],
    [rule('regex', '[a-', false), 'sdlc/S-001', null],
    [rule('regex', '\\', false), 'sdlc/S-001', null],
    [rule('regex', '(', true), 'sdlc/S-001', null],
    [rule('regex', '^sdlc/', true), 'sdlc/S-001', false],
    [rule('regex', '^S-', true), 'sdlc/S-001', true],
    [rule('regex', '', false), 'x', true],
    [rule('regex', 'a', false), 'A', false],
  ]
  const out = ev(cases.map(([ru, s]) => [ru, s]))
  cases.forEach(([ru, s, want], i) => assert.deepEqual([out[i].outcome, out[i].value], ['return', want], `${ru.kind} ${JSON.stringify(ru.pattern)} neg=${ru.negate} on ${JSON.stringify(s)}`))
})

test('verify contract: negate on every kind flips booleans (property over match and non-match)', () => {
  const r = rng(SEED + 1)
  const kinds = ['starts_with', 'ends_with', 'contains', 'regex']
  const inputs = []
  for (let i = 0; i < RUNS; i++) {
    const kind = r.pick(kinds)
    const sample = str(r, 6)
    let pattern = r.bool(0.5) ? sub(r, sample) : str(r, 3)
    if (kind === 'regex') pattern = pattern.replace(/[\\.^$|?*+()[\]{}]/g, (c) => '\\' + c)
    inputs.push([kind, pattern, sample])
  }
  const plain = ev(inputs.map(([k, p, s]) => [rule(k, p, false), s]))
  const neg = ev(inputs.map(([k, p, s]) => [rule(k, p, true), s]))
  const bad = []
  inputs.forEach((inp, i) => {
    const a = plain[i], b = neg[i]
    if (a.outcome !== 'return' || b.outcome !== 'return' || typeof a.value !== 'boolean' || b.value !== !a.value) bad.push({ inp, a, b })
  })
  console.log(`property-run negate seed=${SEED + 1} runs=${RUNS} violations=${bad.length}`)
  assert.deepEqual(bad.slice(0, 3), [])
})

test('verify contract: regex rule agrees with escaped-literal reference and search semantics', () => {
  const r = rng(SEED + 2)
  const inputs = []
  for (let i = 0; i < RUNS; i++) {
    const sample = str(r, 8)
    const lit = r.bool(0.5) ? sub(r, sample) : str(r, 3)
    const anchor = r.pick(['', '^', '$'])
    inputs.push([lit, anchor, sample])
  }
  const esc = (s) => s.replace(/[\\.^$|?*+()[\]{}]/g, '\\$&')
  const out = ev(inputs.map(([l, a, s]) => [rule('regex', a === '$' ? esc(l) + '$' : a + esc(l), false), s]))
  const bad = []
  inputs.forEach(([l, a, s], i) => {
    const want = a === '^' ? s.startsWith(l) : a === '$' ? s.endsWith(l) : s.includes(l)
    if (out[i].outcome !== 'return' || out[i].value !== want) bad.push({ l, a, s, got: out[i] })
  })
  console.log(`property-run regex-search seed=${SEED + 2} runs=${RUNS} violations=${bad.length}`)
  assert.deepEqual(bad.slice(0, 3), [])
})

test('verify contract: uncompilable patterns give None, never raise (property)', () => {
  const r = rng(SEED + 3)
  const bad_patterns = ['(', ')', '[a-', '[', '\\', '*', '+a', '?', 'a{2,1}', '(?P<n', '(?P<1a>x)', '[z-a]', '(?<=a*)b', '\\1', '(?', 'a**', '\\u12', '(?i', '{1}']
  const inputs = []
  for (let i = 0; i < 400; i++) inputs.push([rule('regex', r.pick(bad_patterns) + (r.bool(0.3) ? str(r, 2) : ''), r.bool(0.5)), str(r, 5)])
  const out = ev(inputs)
  const wrong = []
  const compilable = callPython(MOD, 'regex_error', inputs.map(([ru]) => [ru.pattern]))
  inputs.forEach((inp, i) => {
    const bad = compilable[i].value !== null
    if (bad && !(out[i].outcome === 'return' && out[i].value === null)) wrong.push({ inp, got: out[i] })
  })
  console.log(`property-run bad-regex seed=${SEED + 3} runs=${inputs.length} violations=${wrong.length}`)
  assert.deepEqual(wrong.slice(0, 3), [])
})

test('verify contract: a huge repeat count raises OverflowError instead of giving None (observation)', () => {
  const o = ev([[rule('regex', 'x{99999999999999999999}', false), 'x']])[0]
  console.log(`overflow-repeat: ${o.outcome} ${o.type ?? JSON.stringify(o.value)}`)
  assert.ok(o.outcome === 'return' ? o.value === null : o.type === 'OverflowError')
})

test('verify contract: unknown or malformed kind gives None and never raises', () => {
  const kinds = ['equals', '', 'Starts_With', 'STARTS_WITH', 'regexp', ' regex', 'starts_with ', 'matches', 'contains\n']
  const calls = []
  for (const k of kinds) for (const n of [true, false]) calls.push([{ source: 'github', kind: k, pattern: 'a', negate: n, label: 'x' }, 'abc'])
  calls.push([{ pattern: 'a' }, 'abc'], [{ kind: null, pattern: 'a' }, 'abc'], [{ kind: 5, pattern: 'a' }, 'abc'], [{ kind: ['regex'], pattern: 'a' }, 'abc'], [{}, 'abc'])
  const out = ev(calls)
  out.forEach((o, i) => assert.deepEqual([o.outcome, o.value, o.stdout, o.stderr], ['return', null, '', ''], JSON.stringify(calls[i])))
})

test('verify contract: negate with non-boolean values follows truthiness and never raises', () => {
  const vals = [0, 1, null, 'x', '', [], [1], {}, 0.0, -1]
  const calls = []
  for (const v of vals) calls.push([{ kind: 'starts_with', pattern: 'a', negate: v }, 'abc'], [{ kind: 'starts_with', pattern: 'z', negate: v }, 'abc'], [{ kind: 'regex', pattern: '(', negate: v }, 'abc'])
  calls.push([{ kind: 'starts_with', pattern: 'a' }, 'abc'])
  const out = ev(calls)
  vals.forEach((v, i) => {
    const truthy = Array.isArray(v) ? v.length > 0 : v && typeof v === 'object' ? Object.keys(v).length > 0 : Boolean(v)
    assert.deepEqual([out[3 * i].outcome, out[3 * i].value], ['return', !truthy], `negate=${JSON.stringify(v)} match`)
    assert.deepEqual([out[3 * i + 1].outcome, out[3 * i + 1].value], ['return', truthy], `negate=${JSON.stringify(v)} nonmatch`)
    assert.deepEqual([out[3 * i + 2].outcome, out[3 * i + 2].value], ['return', null], `negate=${JSON.stringify(v)} bad regex`)
  })
  assert.deepEqual([out.at(-1).outcome, out.at(-1).value], ['return', true])
})

test('verify contract: evaluate is deterministic, pure and writes nothing', () => {
  const dir = scratch('verify-contract-pure-')
  const calls = Array.from({ length: 50 }, () => [rule('regex', '^sdlc/(S|M)-\\d+', true), 'sdlc/S-001'])
  const a = callPython(MOD, 'evaluate', calls, { cwd: dir })
  const b = callPython(MOD, 'evaluate', calls, { cwd: dir })
  assert.deepEqual(a, b)
  assert.ok(a.every((o) => o.value === false && o.stdout === '' && o.stderr === ''))
  const ls = spawnSync('ls', ['-A', dir], { encoding: 'utf8' }).stdout
  assert.equal(ls.trim(), '')
  const input = { kind: 'contains', pattern: 'a', negate: false, label: 'x' }
  const before = JSON.stringify(input)
  const probe = spawnSync('python3', ['-I', '-c', `import importlib.util,json,sys\ns=importlib.util.spec_from_file_location('b',${JSON.stringify(MOD)});m=importlib.util.module_from_spec(s);s.loader.exec_module(m)\nr=json.loads(sys.argv[1]);m.evaluate(r,'abc');print(json.dumps(r))`, before], { encoding: 'utf8' })
  assert.deepEqual(JSON.parse(probe.stdout), JSON.parse(before))
})

test('verify contract: non-string and hostile inputs (observation, record outcome)', () => {
  const cases = {
    'regex pattern None': [rule('regex', null, false), 'abc'],
    'regex pattern 5': [rule('regex', 5, false), 'abc'],
    'regex pattern list': [rule('regex', ['a'], false), 'abc'],
    'regex sample None': [rule('regex', 'a', false), null],
    'regex sample 5': [rule('regex', 'a', false), 5],
    'starts_with pattern None': [rule('starts_with', null, false), 'abc'],
    'starts_with sample None': [rule('starts_with', 'a', false), null],
    'contains pattern 5': [rule('contains', 5, false), 'abc'],
    'contains sample list': [rule('contains', 'a', false), ['a']],
    'ends_with sample 5': [rule('ends_with', 'a', false), 5],
    'pattern absent': [{ kind: 'regex', negate: false }, 'abc'],
    'rule None': [null, 'abc'],
    'rule string': ['regex', 'abc'],
    'NUL in regex pattern': [rule('regex', 'a\u0000b', false), 'a\u0000b'],
    'NUL in text pattern': [rule('contains', '\u0000', false), 'a\u0000b'],
    'nested quantifier deep': [rule('regex', '('.repeat(300) + 'a' + ')'.repeat(300), false), 'a'],
    'nested group 100000': [rule('regex', '('.repeat(100000) + 'a' + ')'.repeat(100000), false), 'a'],
    'huge repeat': [rule('regex', 'a{1,99999999999}', false), 'aaa'],
    'huge repeat overflow': [rule('regex', 'a{99999999999999999999}', false), 'aaa'],
    'huge repeat 4e9': [rule('regex', '(?:a{65536}){65536}', false), 'aaa'],
    'lone surrogate sample': [rule('regex', 'a', false), 'a\ud800'],
    'emoji pattern': [rule('contains', '\u{1f600}', false), 'x\u{1f600}'],
  }
  const names = Object.keys(cases)
  const out = callPython(MOD, 'evaluate', names.map((n) => cases[n]), { timeoutMs: 40000 })
  const lines = names.map((n, i) => `${n}: ${out[i].outcome} ${out[i].outcome === 'return' ? JSON.stringify(out[i].value) : out[i].type + ': ' + out[i].message.slice(0, 80)}`)
  console.log(lines.join('\n'))
  assert.equal(out[names.indexOf('NUL in regex pattern')].value, true)
  assert.equal(out[names.indexOf('NUL in text pattern')].value, true)
  assert.equal(out[names.indexOf('emoji pattern')].value, true)
})

test('verify contract: catastrophic backtracking sample is bounded (observation)', () => {
  const t0 = Date.now()
  const r = spawnSync('python3', ['-I', '-c', `import importlib.util,sys\ns=importlib.util.spec_from_file_location('b',${JSON.stringify(MOD)});m=importlib.util.module_from_spec(s);s.loader.exec_module(m)\nprint(m.evaluate({'kind':'regex','pattern':'(a+)+$','negate':False},'a'*27+'!'))`], { encoding: 'utf8', timeout: 60000 })
  const ms = Date.now() - t0
  console.log(`backtracking (a+)+$ on a*27+! : status=${r.status} stdout=${(r.stdout || '').trim()} ms=${ms} signal=${r.signal}`)
  assert.ok(true)
})

test('verify contract: regex_error text equals the re.error text evaluate hides, None for good patterns', () => {
  const bad = ['(', '[a-', '\\', ')', '*', 'a{2,1}', '(?P<n', '[z-a]']
  const good = ['^a', '', 'a|b', '\\d+', '.*', '(?i)x']
  const out = callPython(MOD, 'regex_error', [...bad, ...good].map((p) => [p]))
  const py = spawnSync('python3', ['-I', '-c', `import re,json,sys\nres=[]\nfor p in json.loads(sys.argv[1]):\n    try:\n        re.compile(p); res.append(None)\n    except re.error as e:\n        res.append(str(e))\nprint(json.dumps(res))`, JSON.stringify([...bad, ...good])], { encoding: 'utf8' })
  const want = JSON.parse(py.stdout)
  out.forEach((o, i) => assert.deepEqual([o.outcome, o.value], ['return', want[i]], JSON.stringify([...bad, ...good][i])))
  bad.forEach((p, i) => assert.ok(typeof out[i].value === 'string' && out[i].value.length > 0, p))
  good.forEach((p, i) => assert.equal(out[bad.length + i].value, null, p))
  const ev2 = ev(bad.map((p) => [rule('regex', p, false), 'x']))
  ev2.forEach((o) => assert.equal(o.value, null))
})

test('verify contract: regex_error property over generated patterns agrees with evaluate None', () => {
  const r = rng(SEED + 4)
  const PIECES = ['a', 'b', '(', ')', '[', ']', '-', '\\', '*', '+', '?', '{', '}', ',', '1', '2', '|', '^', '$', '.', '(?', ':', '<', '>', 'P', '=', '!', 'é', '\u0000']
  const inputs = Array.from({ length: RUNS }, () => Array.from({ length: r.int(0, 7) }, () => r.pick(PIECES)).join(''))
  const errs = callPython(MOD, 'regex_error', inputs.map((p) => [p]))
  const evs = ev(inputs.map((p) => [rule('regex', p, false), 'ab-1']))
  const bad = []
  inputs.forEach((p, i) => {
    const e = errs[i], v = evs[i]
    if (e.outcome !== 'return' || v.outcome !== 'return') return bad.push({ p, e, v })
    if ((e.value === null) !== (v.value !== null)) bad.push({ p, e, v })
  })
  console.log(`property-run regex-error seed=${SEED + 4} runs=${RUNS} violations=${bad.length}`)
  assert.deepEqual(bad.slice(0, 3), [])
})
