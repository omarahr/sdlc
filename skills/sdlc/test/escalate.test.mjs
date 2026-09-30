import { test } from 'node:test'
import assert from 'node:assert/strict'
import { loadInternals, scripted, ok } from './harness.mjs'

const base = { escalator: () => ok(), 'test-reporter': () => ok() }

test('first escalation is replan', async () => {
  const rt = await loadInternals(scripted(base))
  const out = await rt.I.escalate('S-1', { kind: 'spec' }, rt.I.normalizeCounters({}), 'fix rounds exhausted')
  assert.match(out, /escalated to replan/)
  assert.deepEqual(rt.calls[0].inputs, { sliceId: 'S-1', step: 1, action: 'replan', why: 'fix rounds exhausted', adr: null })
})

test('step 4 runs a three-angle decision panel and passes the ADR to the escalator', async () => {
  const rt = await loadInternals(scripted({
    ...base,
    'decision-proposer': c => ({ option: `opt-${c.inputs.angle}`, rationale: 'r' }),
    'decision-judge': [{ adrId: 'ADR-1', choice: 'opt-simplest' }],
  }))
  await rt.I.escalate('S-1', { kind: 'spec' }, rt.I.normalizeCounters({ ladderStep: 3 }), 'still failing')
  assert.deepEqual(rt.calls.filter(c => c.role === 'decision-proposer').map(c => c.inputs.angle).sort(), ['most-reversible', 'simplest', 'spec-intent'])
  assert.equal(rt.calls.find(c => c.role === 'decision-judge').inputs.proposals.length, 3)
  const esc = rt.calls.find(c => c.role === 'escalator').inputs
  assert.equal(esc.action, 'alternative')
  assert.deepEqual(esc.adr, { adrId: 'ADR-1', choice: 'opt-simplest' })
})

test('panel with no proposals skips the judge and passes adr null', async () => {
  const rt = await loadInternals(scripted({ ...base, 'decision-proposer': () => null }))
  await rt.I.escalate('S-1', { kind: 'spec' }, rt.I.normalizeCounters({ ladderStep: 3 }), 'x')
  assert.equal(rt.roles().includes('decision-judge'), false)
  assert.equal(rt.calls.find(c => c.role === 'escalator').inputs.adr, null)
})

test('step 5 parks a spec slice and reverts an improvement slice', async () => {
  const rt = await loadInternals(scripted(base))
  await rt.I.escalate('S-1', { kind: 'spec' }, rt.I.normalizeCounters({ ladderStep: 4 }), 'x')
  await rt.I.escalate('S-2', { kind: 'improvement' }, rt.I.normalizeCounters({ ladderStep: 4 }), 'x')
  assert.deepEqual(rt.calls.filter(c => c.role === 'escalator').map(c => c.inputs.action), ['park', 'revert-reject'])
  // a parked slice gets its test report before the escalator archives the attempt; a reverted one does not
  assert.deepEqual(rt.roles(), ['test-reporter', 'escalator', 'escalator'])
  assert.equal(rt.calls[0].inputs.mode, 'park')
})

test('ladder never goes past park', async () => {
  const rt = await loadInternals(scripted(base))
  await rt.I.escalate('S-1', { kind: 'spec' }, rt.I.normalizeCounters({ ladderStep: 5 }), 'x')
  assert.equal(rt.calls.find(c => c.role === 'escalator').inputs.step, 5)
})

test('escalator that fails to confirm is reported in the outcome', async () => {
  const rt = await loadInternals(scripted({ escalator: () => null }))
  const out = await rt.I.escalate('S-1', { kind: 'spec' }, rt.I.normalizeCounters({}), 'x')
  assert.match(out, /did not confirm/)
})
