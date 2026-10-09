import { test } from 'node:test'
import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { scratch } from '../harness.mjs'
import { BRANCHES, arb, assertProperty, callPython, check, checkLoadFormat, materializeConfig, rng } from './property.mjs'

const FIXTURE = `
import sys
class Fail(Exception):
    pass
def ok(x):
    return x
def refuse(x):
    raise Fail("no " + str(x))
def boom(x):
    raise KeyError(x)
def deep(x):
    return deep(x)
def noisy(x):
    print("noise")
    return x
def leave(x):
    sys.exit(3)
`

function fixtureModule() {
  const p = join(scratch('testkit-prop-fix-'), 'fixture.py')
  writeFileSync(p, FIXTURE)
  return p
}

test('testkit property: the generator is deterministic for a seed', () => {
  const a = rng(1234), b = rng(1234), c = rng(1235)
  const sa = Array.from({ length: 50 }, () => arb.format(a))
  const sb = Array.from({ length: 50 }, () => arb.format(b))
  const sc = Array.from({ length: 50 }, () => arb.format(c))
  assert.deepEqual(sa, sb)
  assert.notDeepEqual(sa, sc)
})

test('testkit property: callPython classifies return, Fail and every other exception', () => {
  const mod = fixtureModule()
  const one = (fn) => callPython(mod, fn, [['v']])[0]
  assert.deepEqual([one('ok').outcome, one('ok').value], ['return', 'v'])
  assert.deepEqual([one('refuse').outcome, one('refuse').message], ['Fail', 'no v'])
  assert.deepEqual([one('boom').outcome, one('boom').type], ['exception', 'KeyError'])
  assert.deepEqual([one('deep').outcome, one('deep').type], ['exception', 'RecursionError'])
  assert.deepEqual([one('leave').outcome, one('leave').type], ['exception', 'SystemExit'])
  const noisy = one('noisy')
  assert.deepEqual([noisy.outcome, noisy.value, noisy.stdout], ['return', 'v', 'noise\n'])
  assert.throws(() => callPython(mod, 'missing', [[1]]), /not callable/)
})

test('testkit property: check reports violations with the seed for replay', () => {
  const mod = fixtureModule()
  const report = check({ module: mod, fn: 'boom', gen: (r) => r.int(0, 9), seed: 7, runs: 5, log: false })
  assert.equal(report.violations.length, 5)
  assert.throws(() => assertProperty(report), /seed=7 runs=5[\s\S]*TESTKIT_SEED=7/)
  const clean = check({ module: mod, fn: 'refuse', gen: (r) => r.int(0, 9), seed: 7, runs: 5, log: false })
  assert.doesNotThrow(() => assertProperty(clean))
})

test('testkit property: validate_format runs over generated formats through the module loaded by path', () => {
  const report = check({ fn: 'validate_format', gen: arb.format, seed: 42, runs: 300, property: () => null, log: false })
  assert.equal(report.cases.length, 300)
  for (const c of report.cases) assert.ok(['return', 'Fail', 'exception'].includes(c.result.outcome))
  assert.ok(report.cases.some((c) => c.result.outcome === 'return'), 'some formats are accepted')
  assert.ok(report.cases.some((c) => c.result.outcome === 'Fail'), 'some formats are refused')
  assert.ok(report.cases.some((c) => typeof c.input !== 'string'), 'non-string inputs are generated')
})

test('testkit property: every config shape materializes and load_format runs on it', () => {
  const root = scratch('testkit-prop-cfg-')
  const kinds = new Set()
  const r = rng(99)
  for (let i = 0; i < 400; i++) kinds.add(arb.configShape(r).kind)
  for (const k of ['absent', 'no-sdlc-dir', 'dir', 'json', 'text', 'bytes', 'dangling-symlink', 'symlink-loop', 'unreadable']) assert.ok(kinds.has(k), `shape ${k} is generated`)
  const repo = materializeConfig(root, { kind: 'json', value: { branchFormat: 'feature/{name}' } })
  assert.deepEqual(callPython(BRANCHES, 'load_format', [[repo]])[0].value, 'feature/{name}')
  const report = checkLoadFormat({ seed: 5, runs: 60, property: () => null, log: false })
  assert.equal(report.cases.length, 60)
  for (const c of report.cases) assert.ok(['return', 'Fail', 'exception'].includes(c.result.outcome))
})
