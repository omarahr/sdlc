import { test } from 'node:test'
import assert from 'node:assert/strict'
import { loadInternals } from './harness.mjs'

const { I } = await loadInternals()
const yes = { refuted: false, evidence: 'ok' }
const no = { refuted: true, evidence: 'broken' }

test('tallyVerify passes with at most a minority refuting and no failing tests', () => {
  assert.equal(I.tallyVerify([yes, yes, yes]).pass, true)
  assert.equal(I.tallyVerify([yes, yes, no]).pass, true)
  assert.equal(I.tallyVerify([yes, no, no]).pass, false)
})

test('tallyVerify: one failing test beats any number of approvals', () => {
  const r = I.tallyVerify([yes, yes, { refuted: false, evidence: 'x', failingTest: 'edge.test.ts > empty input' }])
  assert.equal(r.pass, false)
  assert.deepEqual(r.failingTests, ['edge.test.ts > empty input'])
})

test('tallyVerify counts null votes as refutations', () => {
  const r = I.tallyVerify([yes, null, null])
  assert.equal(r.pass, false)
  assert.equal(r.refutations, 2)
})

test('allClear needs every vote present and not refuted', () => {
  assert.equal(I.allClear([yes, yes]), true)
  assert.equal(I.allClear([yes, no]), false)
  assert.equal(I.allClear([yes, null]), false)
})

test('survives needs a strict majority of non-refuting votes', () => {
  assert.equal(I.survives([yes, yes, no]), true)
  assert.equal(I.survives([yes, no, no]), false)
  assert.equal(I.survives([yes, null, null]), false)
  assert.equal(I.survives([]), false)
})

test('dedupeIdeas drops seen keys and in-batch duplicates, normalizing keys', () => {
  const out = I.dedupeIdeas(
    [{ key: 'Perf: Memo Graph', title: 'a' }, { key: 'perf-memo-graph', title: 'b' }, { title: 'Add fuzz tests' }, { key: 'old-one', title: 'c' }],
    ['OLD one'])
  assert.deepEqual(out.map(i => i.key), ['perf-memo-graph', 'add-fuzz-tests'])
})

test('tallyAudit reopens a requirement only when a majority of auditors refute it', () => {
  const out = I.tallyAudit(['R-1', 'R-2'], [
    { refuted: [{ id: 'R-1', reason: 'test missing' }] },
    { refuted: [{ id: 'R-1', reason: 'no assertion' }, { id: 'R-2', reason: 'maybe' }] },
    { refuted: [] },
  ])
  assert.deepEqual(out, [{ id: 'R-1', reasons: ['test missing', 'no assertion'] }])
})

test('tallyAudit treats a failed auditor as refuting every id in its chunk', () => {
  const out = I.tallyAudit(['R-1'], [null, { refuted: [{ id: 'R-1', reason: 'x' }] }, { refuted: [] }])
  assert.equal(out.length, 1)
  assert.deepEqual(out[0].reasons, ['auditor failed to report', 'x'])
})

test('normalizeCounters fills missing counters with zero and keeps given ones', () => {
  assert.deepEqual(I.normalizeCounters({ fixRounds: 2 }), { planRevisions: 0, fixRounds: 2, ladderStep: 0, parkCycles: 0 })
  assert.deepEqual(I.normalizeCounters(undefined), { planRevisions: 0, fixRounds: 0, ladderStep: 0, parkCycles: 0 })
})

test('chunk splits into fixed-size groups', () => {
  assert.deepEqual(I.chunk([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]])
})
