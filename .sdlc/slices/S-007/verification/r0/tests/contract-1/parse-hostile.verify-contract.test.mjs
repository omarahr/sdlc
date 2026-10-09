import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const MODULE = process.env.VERIFY_BRANCHES
const SEED = Number(process.env.TESTKIT_SEED || 20261010)

function run(seed, runs) {
  const r = spawnSync('python3', ['-I', join(HERE, 'vs7_verify_contract.py'), MODULE, String(seed), String(runs)], { encoding: 'utf8', maxBuffer: 1 << 28 })
  assert.equal(r.status, 0, r.stderr)
  return JSON.parse(r.stdout)
}

const out = run(SEED, 5000)
const byLabel = Object.fromEntries(out.hostile.map((h) => [h.label, h]))

test('verify contract VS-7: parse equals the spec reference model on 5000 random branches (property)', () => {
  console.log(`seed=${SEED} runs=${out.runs} failures=${out.failureCount} kinds=${JSON.stringify(out.kinds)}`)
  assert.equal(out.failureCount, 0, JSON.stringify(out.failures, null, 1))
  assert.ok(Object.keys(out.kinds).length >= 9)
})

for (const seed of [7, 99]) {
  test(`verify contract VS-7: reference model property, seed ${seed}`, () => {
    const o = run(seed, 5000)
    console.log(`seed=${seed} runs=${o.runs} failures=${o.failureCount}`)
    assert.equal(o.failureCount, 0, JSON.stringify(o.failures, null, 1))
  })
}

test('verify contract VS-7: non-string branches, NUL and surrogates give null and never raise', () => {
  for (const h of out.hostile.filter((x) => /^non-string|^NUL|surrogate branch|prefix only|shorter|empty branch|overlap/.test(x.label))) {
    assert.ok(!('raised' in h), `${h.label} raised ${h.raised}`)
    assert.equal(h.result, null, h.label)
  }
})

test('verify contract VS-7: trailing newline follows the spec regex text (observation pinned)', () => {
  assert.equal(byLabel['trailing newline run'].result.kind, 'run')
  assert.equal(byLabel['trailing newline slice'].result.kind, 'slice')
  assert.equal(byLabel['trailing newline after suffix'].result, null)
  assert.equal(byLabel['double trailing newline'].result, null)
})

test('verify contract VS-7: non-ASCII digits are accepted as integers (observation pinned)', () => {
  assert.equal(byLabel['arabic-indic run'].result.n, 3)
  assert.equal(byLabel['arabic-indic verify round and part'].result.part, 1)
})

test('verify contract VS-7: unicode case folding under lower never raises', () => {
  for (const h of out.hostile.filter((x) => /^lower /.test(x.label))) assert.ok(!('raised' in h), h.label)
})

test('verify contract VS-7: long tails finish within 5 seconds each at 40000 characters', () => {
  const slow = out.hostile.filter((x) => /^long|^quadratic/.test(x.label) && x.ms > 5000)
  assert.deepEqual(slow, [])
})

test('verify contract VS-7: a ledger list of non-strings does not raise (out of contract, seed)', { todo: 'seed only' }, () => {
  for (const l of ['ids non-string lower', 'ids None member lower']) assert.ok(!('raised' in byLabel[l]), `${l}: ${byLabel[l].raised}`)
})

test('verify contract VS-7: a run number of more than 4300 digits does not raise (out of contract, seed)', { todo: 'seed only' }, () => {
  assert.ok(!('raised' in byLabel['huge run']), byLabel['huge run'].raised)
})
