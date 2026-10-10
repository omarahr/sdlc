import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { arb, callPython, rng, defaultSeed, BRANCHES } from '/Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/test/testkit/property.mjs'

const rule = (kind, pattern, negate = false, label = 'r') => ({ source: 'github', kind, pattern, negate, label })
const derive = (calls) => callPython(BRANCHES, 'derive', calls.map((c) => [c]))
const one = (rules) => { const [r] = derive([rules]); assert.equal(r.outcome, 'return', JSON.stringify(r)); return r.value }

const model = (rules) => {
  if (rules.length !== 1) return null
  const [r] = rules
  if (r.negate) return null
  if (r.kind === 'starts_with') return r.pattern + 'sdlc/{name}'
  if (r.kind === 'ends_with') return 'sdlc/{name}' + r.pattern
  if (r.kind === 'contains') return 'sdlc/' + r.pattern + '/{name}'
  return null
}

test('verify contract: VS-1 starts_with feature/ gives feature/sdlc/{name}', () => {
  assert.equal(one([rule('starts_with', 'feature/')]), 'feature/sdlc/{name}')
})
test('verify contract: VS-2 ends_with -dev gives sdlc/{name}-dev', () => {
  assert.equal(one([rule('ends_with', '-dev')]), 'sdlc/{name}-dev')
})
test('verify contract: VS-3 contains team-a gives sdlc/team-a/{name}', () => {
  assert.equal(one([rule('contains', 'team-a')]), 'sdlc/team-a/{name}')
})
test('verify contract: VS-5 no format for regex, negated, several, empty and unknown', () => {
  assert.equal(one([rule('regex', '^feature/.*')]), null)
  for (const k of ['starts_with', 'ends_with', 'contains']) assert.equal(one([rule(k, 'x', true)]), null, k)
  assert.equal(one([rule('starts_with', 'a/'), rule('ends_with', '-dev')]), null)
  assert.equal(one([rule('contains', 'a'), rule('contains', 'a')]), null)
  assert.equal(one([]), null)
  assert.equal(one([rule('bogus', 'x')]), null)
  assert.equal(one([rule(null, 'x')]), null)
})
test('verify contract: odd patterns are spliced verbatim', () => {
  const pats = ['a.b', '.x', '-', 'a b', 'feat', '(a+)', 'é\u{1f600}', 'x'.repeat(100000), 'ABC', '{name}', '%s']
  const got = derive(pats.flatMap((p) => [[rule('starts_with', p)], [rule('ends_with', p)], [rule('contains', p)]]))
  const want = pats.flatMap((p) => [model([rule('starts_with', p)]), model([rule('ends_with', p)]), model([rule('contains', p)])])
  got.forEach((g, i) => { assert.equal(g.outcome, 'return'); assert.equal(g.value, want[i]) })
})
test('verify contract: property derive equals the reference model', () => {
  const seed = defaultSeed()
  const r = rng(seed)
  const kinds = ['starts_with', 'ends_with', 'contains', 'regex', 'bogus', null]
  const alphabet = ['a', 'b', '/', '-', '.', ' ', 'é', '\u{1f600}', '{', '}', '\\', '*', 'feature/', '-dev', 'team-a']
  const pat = () => Array.from({ length: r.int(1, 6) }, () => r.pick(alphabet)).join('')
  const one1 = () => rule(r.pick(kinds), pat(), r.bool(0.3), pat())
  const runs = 3000
  const inputs = Array.from({ length: runs }, () => Array.from({ length: r.pick([0, 1, 1, 1, 1, 2, 3]) }, one1))
  const snapshot = JSON.stringify(inputs)
  const results = derive(inputs)
  const bad = []
  results.forEach((res, i) => {
    if (res.outcome !== 'return' || res.value !== model(inputs[i])) bad.push({ i, input: inputs[i], res })
  })
  console.log('property-run derive seed=' + seed + ' runs=' + runs + ' violations=' + bad.length)
  assert.equal(JSON.stringify(inputs), snapshot)
  assert.deepEqual(bad.slice(0, 3), [])
  const again = derive(inputs)
  assert.deepEqual(again.map((x) => x.value), results.map((x) => x.value))
})
test('verify contract: derive does not mutate its input and is deterministic', () => {
  const py = `
import importlib.util, json, copy, sys
s = importlib.util.spec_from_file_location('b', sys.argv[1]); m = importlib.util.module_from_spec(s); s.loader.exec_module(m)
rules = [{'source':'github','kind':'starts_with','pattern':'feature/','negate':False,'label':'r'}]
before = copy.deepcopy(rules)
a = m.derive(rules); b = m.derive(rules)
print(json.dumps([a == b, rules == before]))
`
  const r = spawnSync('python3', ['-I', '-c', py, BRANCHES], { encoding: 'utf8' })
  assert.equal(r.stdout.trim(), '[true, true]', r.stderr)
})
test('verify contract: consumer view signature has one parameter', () => {
  const py = `
import importlib.util, inspect, sys
s = importlib.util.spec_from_file_location('b', sys.argv[1]); m = importlib.util.module_from_spec(s); s.loader.exec_module(m)
print(inspect.signature(m.derive), [n for n in dir(m) if 'derive' in n.lower()])
`
  const r = spawnSync('python3', ['-I', '-c', py, BRANCHES], { encoding: 'utf8' })
  assert.equal(r.stdout.trim(), "(rules) ['DERIVE_FORMATS', 'derive']", r.stderr)
})
