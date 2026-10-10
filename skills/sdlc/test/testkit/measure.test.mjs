import { test } from 'node:test'
import assert from 'node:assert/strict'
import { formatReport, measure, measureCommand, sizeOf, summarize } from './measure.mjs'

test('testkit measure: sizeOf counts chars, bytes, lines and the longest line', () => {
  assert.deepEqual(sizeOf('ab\ncdé'), { chars: 6, bytes: 7, lines: 2, maxLineChars: 3 })
  assert.deepEqual(sizeOf(''), { chars: 0, bytes: 0, lines: 0, maxLineChars: 0 })
  assert.equal(sizeOf(undefined).chars, 0)
  assert.equal(sizeOf({ a: 1 }).chars, 7)
})

test('testkit measure: summarize gives median, p95 and worst', () => {
  const s = summarize([5, 1, 3, 2, 4, 6, 7, 8, 9, 100])
  assert.equal(s.medianMs, 5)
  assert.equal(s.p95Ms, 100)
  assert.equal(s.worstMs, 100)
  assert.equal(s.bestMs, 1)
  assert.equal(s.runs, 10)
})

test('testkit measure: measure runs warm-up plus timed runs and records the environment', () => {
  let calls = 0
  const r = measure(() => ++calls, { warmup: 2, runs: 4 })
  assert.equal(calls, 6)
  assert.equal(r.runs, 4)
  assert.equal(r.last, 6)
  assert.ok(r.worstMs >= r.medianMs && r.medianMs >= r.bestMs)
  assert.ok(r.env.node && r.env.platform && r.env.cpus >= 1)
  assert.throws(() => measure(() => 0, { runs: 0 }))
})

test('testkit measure: measure sees a slow function as slower', () => {
  const r = measure(() => { const end = Date.now() + 20; while (Date.now() < end); }, { warmup: 0, runs: 3 })
  assert.ok(r.medianMs >= 15)
})

test('testkit measure: measureCommand reports stdout size, status and time', () => {
  const r = measureCommand(process.execPath, ['-e', "process.stdout.write('x'.repeat(5000))"], { warmup: 1, runs: 3 })
  assert.equal(r.status, 0)
  assert.equal(r.stdout.chars, 5000)
  assert.equal(r.stderr.chars, 0)
  assert.deepEqual(r.statuses, [0, 0, 0])
  assert.match(formatReport(r, 'big'), /^big: runs=3 median=.*stdout=5000 chars/)
})

test('testkit measure: measureCommand keeps a non-zero status', () => {
  const r = measureCommand(process.execPath, ['-e', 'process.exit(3)'], { warmup: 0, runs: 2 })
  assert.deepEqual(r.statuses, [3, 3])
})
