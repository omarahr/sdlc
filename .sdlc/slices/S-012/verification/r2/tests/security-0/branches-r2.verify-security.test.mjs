import test from 'node:test'
import assert from 'node:assert/strict'
import { callPython } from '/Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/test/testkit/property.mjs'

const MOD = '/Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/branches.py'
const rx = (pattern, negate = false, label = 'r') => ({ kind: 'regex', pattern, label, negate })
const one = (fn, args) => callPython(MOD, fn, [args])[0]

const patterns = {
  'huge repeat': 'a{4294967296}',
  'huge repeat inner': '(a{4294967296})*',
  'huge min max': 'a{99999999999,99999999999}',
  'lazy huge': 'a{4294967296}?',
  'possessive huge': 'a{4294967296}+',
  'huge group ref': '(a)\\99999999999',
  'huge group ref octal': '\\777',
  'bad named backref': '(?P=nope)',
  'bad cond group': '(?(99999999999)a|b)',
  'cond huge': '(?(1)a|b)',
  'lookbehind variable': '(?<=a+)b',
  'lookbehind huge': '(?<=a{4294967296})b',
  'bad flag': '(?z)',
  'global flag middle': 'a(?i)b',
  'nul pattern': 'a\u0000b',
  'unicode escape bad': '\\u12',
  'unicode name bad': '\\N{NOPE}',
  'unicode name huge': '\\N{' + 'A'.repeat(100000) + '}',
  'bad range': '[z-a]',
  'bad class escape': '[\\d-z]',
  'huge class': '[' + 'a-z'.repeat(200000) + ']',
  'many groups': '(a)'.repeat(70000),
  'many alternation': Array(200000).fill('a').join('|'),
  'long literal': 'a'.repeat(5000000),
  'deep lookahead': '(?=' .repeat(3000) + 'a' + ')'.repeat(3000),
  'deep cond': '(?(1)'.repeat(3000),
  'huge repeat counts nested': '((a{65535}){65535}){65535}',
  'lone surrogate': '\ud800',
  'backslash end': 'abc\\',
  'bad group name': '(?P<1a>x)',
  'dup group name': '(?P<a>x)(?P<a>y)',
  'atomic': '(?>a)',
  'possessive': 'a*+',
  'unicode group name': '(?P<é>x)',
  'verbose bad': '(?x)#(',
  'inline scoped flag bad': '(?i-i:a)',
}

for (const [name, p] of Object.entries(patterns)) {
  test(`verify security: pattern ${name} never raises from judge`, () => {
    for (const neg of [false, true]) {
      const r = one('judge', [[rx(p, neg, 'x')], 'sdlc/S-001'])
      assert.equal(r.outcome, 'return', `${name}: ${r.type}: ${r.message}`)
      assert.ok(['pass', 'fail', 'unevaluated'].includes(r.value.result))
      if (r.value.result === 'unevaluated') assert.match(r.value.notes[0], /^cannot evaluate x: /)
    }
  })
}

test('verify security: regex_error and evaluate stay total on the same patterns', () => {
  const bad = []
  for (const [name, p] of Object.entries(patterns)) {
    for (const [fn, args] of [['regex_error', [p]], ['evaluate', [rx(p), 'sdlc/S-001']]]) {
      const r = one(fn, args)
      if (r.outcome !== 'return') bad.push(`${name}/${fn}: ${r.type}: ${r.message}`)
    }
  }
  assert.deepEqual(bad, [])
})

test('verify security: hostile sample against a regex rule does not raise', () => {
  for (const s of ['a'.repeat(100000), 'a\u0000b', '\ud800', 'é'.repeat(1000)]) {
    const r = one('judge', [[rx('^(a|aa)+$', false, 'x')], s])
    assert.ok(['return', 'Fail'].includes(r.outcome), `${r.type}: ${r.message}`)
  }
})

test('verify security: notes never echo secrets beyond the pattern error', () => {
  const r = one('judge', [[rx('(', false, 'x')], 'sdlc/S-001'])
  assert.equal(r.value.notes.length, 1)
})
