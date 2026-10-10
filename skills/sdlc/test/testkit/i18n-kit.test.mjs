import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { FOLD_SAMPLES, asciiLower, asciiUpper, isAscii, lookalikes, sample, withIdPrefix } from './i18n-kit.mjs'

const python = (code, input) => {
  const r = spawnSync('python3', ['-I', '-c', code], { input: JSON.stringify(input), encoding: 'utf8', env: { PYTHONUTF8: '1', PATH: process.env.PATH } })
  assert.equal(r.status, 0, r.stderr)
  return JSON.parse(r.stdout)
}

test('testkit i18n-kit: sample ids are unique and cover the four named cases', () => {
  const ids = FOLD_SAMPLES.map((s) => s.id)
  assert.equal(new Set(ids).size, ids.length)
  for (const id of ['kelvin', 'long-s', 'dotted-i', 'sharp-s']) assert.ok(ids.includes(id), id)
  assert.equal(sample('kelvin').codepoint, 'U+212A')
  assert.throws(() => sample('nope'), /unknown i18n-kit sample/)
})

test('testkit i18n-kit: the recorded python lower and casefold results match python3', () => {
  const out = python('import json,sys\nd=json.load(sys.stdin)\nprint(json.dumps([[t.lower(), t.casefold()] for t in d]))', FOLD_SAMPLES.map((s) => s.text))
  FOLD_SAMPLES.forEach((s, i) => {
    assert.equal(out[i][0], s.pyLower, `${s.id} lower`)
    assert.equal(out[i][1], s.pyCasefold, `${s.id} casefold`)
  })
})

test('testkit i18n-kit: ASCII lowering leaves every non-ASCII sample character alone', () => {
  for (const s of FOLD_SAMPLES) {
    assert.equal(asciiLower(s.text), s.asciiLower, s.id)
    assert.ok(s.text.includes(s.char), s.id)
    assert.equal(isAscii(s.char), false, s.id)
  }
  assert.equal(asciiLower('AbC-009'), 'abc-009')
  assert.equal(asciiUpper('abC'), 'ABC')
})

test('testkit i18n-kit: look-alikes are the samples with an ASCII twin; withIdPrefix keeps the sample', () => {
  assert.deepEqual(lookalikes().map((s) => s.id).sort(), ['capital-sharp-s', 'dotless-i', 'dotted-i', 'kelvin', 'long-s', 'sharp-s'])
  const s = withIdPrefix('S-00', 'kelvin')
  assert.equal(s.text, 'S-00S-00K')
  assert.equal(s.char, 'K')
})
