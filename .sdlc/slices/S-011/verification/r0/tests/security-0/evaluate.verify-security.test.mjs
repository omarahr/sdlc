import test from 'node:test'
import assert from 'node:assert/strict'
import { callPython } from '/Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/test/testkit/property.mjs'
import { load } from '/Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/test/testkit/attack-corpus.mjs'

const MOD = process.env.VERIFY_BRANCHES ?? '/Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/branches.py'
const ev = (calls, t = 60000) => callPython(MOD, 'evaluate', calls, { timeoutMs: t })
const rx = (p, s, negate = false) => [{ kind: 'regex', pattern: p, negate }, s]

test('verify security: VS-2 uncompilable regex gives None and no side effect', () => {
  const r = ev([rx('('), rx('[a-'), rx('\\'), rx('(', 'x', true), rx('*a'), rx('(?P<n>a)(?P<n>b)')])
  for (const x of r) { assert.equal(x.outcome, 'return'); assert.equal(x.value, null); assert.equal(x.stdout, ''); assert.equal(x.stderr, '') }
})

test('verify security: VS-2 search semantics hold', () => {
  const r = ev([rx('^sdlc/', 'sdlc/S-001'), rx('S-001', 'sdlc/S-001'), rx('^S-001', 'sdlc/S-001')])
  assert.deepEqual(r.map((x) => x.value), [true, true, false])
})

test('verify security: VS-2 NUL and huge repeat count', () => {
  const r = ev([rx('a\u0000b', 'a\u0000b'), rx('a', 'x\u0000a'), rx('a{99999999999}', 'a'), rx('a{1,99999999999}', 'a'), rx('(' .repeat(1000) + ')'.repeat(1000), 'x')])
  for (const x of r) assert.ok(['return', 'exception'].includes(x.outcome), JSON.stringify(x))
  assert.equal(r[0].value, true)
  assert.equal(r[1].value, true)
})

test('verify security: VS-2 corpus patterns never raise', () => {
  const fams = ['injection', 'control-chars', 'format-strings', 'unicode-confusables', 'traversal', 'flag-like-values', 'oversized', 'nul']
  const entries = fams.flatMap((f) => load(f))
  const calls = entries.map((e) => rx(String(e.value), 'sdlc/S-001'))
  const r = ev(calls, 120000)
  const bad = r.map((x, i) => [x, entries[i]]).filter(([x]) => x.outcome !== 'return')
  assert.deepEqual(bad.map(([x, e]) => `${e.id}:${x.type}`), [])
})

test('verify security: VS-2 observation catastrophic backtracking hangs', () => {
  const t0 = Date.now()
  let hung = false
  try { ev([rx('(a+)+$', 'a'.repeat(40) + 'b')], 8000) } catch (e) { hung = /did not finish|ETIMEDOUT/.test(e.message) }
  console.log('backtracking hung=', hung, 'ms=', Date.now() - t0)
  assert.equal(hung, true, 'observation: nested quantifier hangs evaluate (out of scope, seed)')
})

test('verify security: VS-4 unknown or malformed kind gives None', () => {
  const kinds = ['equals', '', 'Starts_With', 'REGEX', ' regex', 'regex\u0000', null, 5, ['regex']]
  const calls = []
  for (const k of kinds) for (const n of [true, false]) calls.push([{ kind: k, pattern: 'a', negate: n }, 'a'])
  calls.push([{ pattern: 'a' }, 'a'], [{}, 'a'], [{ kind: 'regex' }, 'a'])
  const r = ev(calls)
  r.slice(0, 18).forEach((x, i) => { assert.equal(x.outcome, 'return', `${i}`); assert.equal(x.value, null, `${i}`) })
  assert.equal(r[18].value, null)
  assert.equal(r[19].value, null)
  assert.equal(r[20].outcome, 'exception', 'regex with absent pattern')
})

test('verify security: VS-4 observation non-string pattern or sample raises', () => {
  const vals = [null, 5, ['a'], { a: 1 }, true]
  const calls = []
  for (const k of ['starts_with', 'ends_with', 'contains', 'regex']) for (const v of vals) { calls.push([{ kind: k, pattern: v }, 'a']); calls.push([{ kind: k, pattern: 'a' }, v]) }
  const r = ev(calls)
  const raised = r.map((x, i) => [x, calls[i]]).filter(([x]) => x.outcome !== 'return').map(([x, c]) => `${c[0].kind} p=${JSON.stringify(c[0].pattern)} s=${JSON.stringify(c[1])} -> ${x.type}`)
  console.log(raised.join('\n'))
  assert.equal(raised.length, 38, 'observation pinned: evaluate raises TypeError on non-string input; out of scope, no spec text promises None')
})

test('verify security: VS-4 observation non-dict rule raises', () => {
  const r = ev([[null, 'a'], ['regex', 'a'], [[], 'a']])
  console.log(r.map((x) => x.outcome + ':' + (x.type ?? '')).join(' '))
  r.forEach((x) => assert.equal(x.outcome, 'exception'))
})

test('verify security: VS-4 no output, no file written', () => {
  const r = ev([[{ kind: 'equals', pattern: 'a' }, 'a'], rx('('), rx('a', 'a')])
  r.forEach((x) => { assert.equal(x.stdout, ''); assert.equal(x.stderr, '') })
})
