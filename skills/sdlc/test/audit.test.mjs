import { test } from 'node:test'
import assert from 'node:assert/strict'
import { runMain, scripted, ok } from './harness.mjs'

const readAudit = () => [{ action: 'audit', reason: 'no audit.json' }, { action: 'stop', reason: 'end' }]

test('clean audit reports pass and records all audited ids', async () => {
  const rt = await runMain(scripted({
    'state-reader': readAudit(),
    'audit-planner': [{ chunks: [['R-1', 'R-2'], ['R-3']] }],
    auditor: () => ({ refuted: [] }),
    'state-writer': () => ok(),
  }))
  assert.equal(rt.roles().filter(r => r === 'auditor').length, 6)
  const w = rt.calls.find(c => c.role === 'state-writer').inputs
  assert.deepEqual(w, { op: 'audit-result', auditedIds: ['R-1', 'R-2', 'R-3'], refuted: [] })
  assert.match(rt.result.iterations[0].outcome, /audit passed \(3 requirements\)/)
})

test('majority-refuted requirements are reopened', async () => {
  const rt = await runMain(scripted({
    'state-reader': readAudit(),
    'audit-planner': [{ chunks: [['R-1', 'R-2']] }],
    auditor: c => (c.inputs.voter < 2 ? { refuted: [{ id: 'R-2', reason: `v${c.inputs.voter}: test asserts nothing` }] } : { refuted: [] }),
    'state-writer': () => ok(),
  }))
  const w = rt.calls.find(c => c.role === 'state-writer').inputs
  assert.deepEqual(w.refuted, [{ id: 'R-2', reasons: ['v0: test asserts nothing', 'v1: test asserts nothing'] }])
  assert.match(rt.result.iterations[0].outcome, /audit reopened R-2/)
})

test('repeated audit abort returns stalled', async () => {
  const rt = await runMain(scripted({
    'state-reader': () => ({ action: 'audit', reason: 'pending' }),
    'audit-planner': () => null,
  }))
  assert.equal(rt.result.state, 'stalled')
  assert.equal(rt.result.iterations.length, 3)
})

test('livelock writes STUCK.md and ends the run as livelock', async () => {
  const rt = await runMain(scripted({
    'state-reader': [{ action: 'livelock', reason: 'S-4 parked 3 times', summary: '11/12 done, 1 parked' }],
    'stuck-writer': () => ok(),
  }))
  assert.equal(rt.result.state, 'livelock')
  assert.equal(rt.result.reason, '11/12 done, 1 parked')
  assert.deepEqual(rt.roles(), ['state-reader', 'stuck-writer'])
})
