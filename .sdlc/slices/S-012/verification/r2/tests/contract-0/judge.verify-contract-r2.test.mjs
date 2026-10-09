import { test } from 'node:test'
import assert from 'node:assert/strict'
import { join } from 'node:path'
const KIT = '/Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/test/testkit'
const { callPython, defaultSeed } = await import(`${KIT}/property.mjs`)
const MODULE = join(process.env.VERIFY_WT, 'skills/sdlc/branches.py')
const SEED = defaultSeed()
const rule = (pattern, negate) => ({ kind: 'regex', pattern, label: 'p', ...(negate === undefined ? {} : { negate }) })
function lcg(s) { let x = s >>> 0; return () => (x = (Math.imul(x, 1664525) + 1013904223) >>> 0) / 2 ** 32 }
test('verify contract: VS-1 round 2 property, random regex-like patterns never raise out of judge or regex_error', () => {
  const rnd = lcg(SEED)
  const atoms = ['(', ')', '[', ']', '{', '}', '*', '+', '?', '|', '\\', '^', '$', '.', 'a', 'b', '-', ',', '0', '9', '99999999999', '4294967296', '(?P<', '(?', '(?=', '(?<', '(?#', '\\1', '\\k', '\\x', '\\u', '\\N{', '(?i)', '(?P=n)', 'é', '😀', '\u0000', '{2,1}', '[a-', '[z-a]', '\\p{L}']
  const pats = []
  for (let i = 0; i < 1500; i++) { let p = ''; const n = 1 + Math.floor(rnd() * 12); for (let j = 0; j < n; j++) p += atoms[Math.floor(rnd() * atoms.length)]; pats.push(p) }
  pats.push('(?:'.repeat(3000), '['.repeat(5000), 'a'.repeat(200000), '(' + 'a|'.repeat(50000) + 'b)', '\\' , '(?i', 'a{,}', '(?(1)a|b)', '(?P<n>a)(?P<n>b)')
  const out = callPython(MODULE, 'judge', pats.map((p) => [[rule(p), ...[]], 'sdlc/S-001']).map(([r]) => [r, 'sdlc/S-001']))
  const re = callPython(MODULE, 'regex_error', pats.map((p) => [p]))
  let bad = 0, uneval = 0
  out.forEach((o, i) => { if (o.outcome !== 'return') { bad++; console.log('RAISE', JSON.stringify(pats[i].slice(0, 40)), o.type, o.message) } else if (o.value.result === 'unevaluated') { uneval++; assert.equal(o.value.notes[0], `cannot evaluate p: ${re[i].value}`) } })
  re.forEach((o, i) => { if (o.outcome !== 'return') { bad++; console.log('RAISE regex_error', JSON.stringify(pats[i].slice(0, 40)), o.type) } })
  console.log(`seed ${SEED} runs ${pats.length} unevaluated ${uneval} raised ${bad}`)
  assert.equal(bad, 0)
})
