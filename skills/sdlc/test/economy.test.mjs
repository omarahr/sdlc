import { test } from 'node:test'
import assert from 'node:assert/strict'
import { runMain, loadInternals, clear as clearVote } from './harness.mjs'
import { happy, sliceNext } from './slice.test.mjs'

const clear = { refuted: false, evidence: 'holds' }

test('an infra vote never counts as a refutation, but stops the round from passing', async () => {
  const rt = await loadInternals()
  const votes = [clear, { refuted: false, evidence: 'timed out', outcome: 'infra' }, clear]
  const t = rt.I.tallyVerify(votes, ['spec-fidelity', 'profiles', 'regression'])
  assert.equal(t.refutations, 0)
  assert.equal(t.pass, false)
  assert.equal(t.infra, true)
})

test('a refuting vote wins over infra classification (infra must not mask a real bug)', async () => {
  const rt = await loadInternals()
  const votes = [clear, { refuted: false, evidence: 'cut off', outcome: 'infra' }, { refuted: true, evidence: 'x', failingTest: 't — a — R-1' }]
  const t = rt.I.tallyVerify(votes, ['spec-fidelity', 'profiles', 'regression'])
  assert.equal(t.pass, false)
  assert.equal(t.refutations, 1)
  assert.equal(t.infra, false)
})

test('profileVote folds blocked scenarios and silent agents into infra, not refutation', async () => {
  const rt = await loadInternals()
  const groups = [{ profile: 'ui', part: 0, scenarioIds: ['VS-1'] }]
  const silent = rt.I.profileVote([null], groups)
  assert.equal(silent.refuted, false)
  assert.equal(silent.outcome, 'infra')
  const blocked = rt.I.profileVote([{ refuted: false, evidence: 'env', blocked: [{ scenarioId: 'VS-1', reason: 'no chromium' }] }], groups)
  assert.equal(blocked.refuted, false)
  assert.equal(blocked.outcome, 'infra')
  const failing = rt.I.profileVote([{ refuted: true, evidence: 'bug', failingTest: 't — b — R-1', blocked: [{ scenarioId: 'VS-1', reason: 'also no chromium' }] }], groups)
  assert.equal(failing.refuted, true)
  assert.equal(failing.outcome, 'refuted')
})

test('a battery slice runs the gate before integrate, and a gate fail goes back to the build loop', async () => {
  let gates = 0
  const rt = await runMain(happy({
    gate: () => (gates++ === 0 ? { state: 'fail', failingTest: 'e2e — SC-9 — R-2', commit: 'c1' } : { state: 'pass', commit: 'c2' }),
    implementer: () => ({ green: true, notes: 'fixed for the gate' }),
    verifier: () => clearVote(),
    'verify-planner': () => ({ scenarios: [], tools: [], risk: 'high' }),
  }, 'plan'))
  // 'Read state' brackets every main-loop iteration, so it is filtered out: the assertion is the slice's lifecycle
  assert.deepEqual(rt.phases.filter(p => p !== 'Read state'), ['Plan', 'Tests first', 'Implement', 'Verify', 'Review', 'Gate', 'Implement', 'Verify', 'Review', 'Gate', 'Report', 'Integrate'])
  const gateCalls = rt.calls.filter(c => c.role === 'gate')
  assert.equal(gateCalls.length, 2)
  assert.ok(rt.roles().indexOf('gate') < rt.roles().indexOf('integrator'))
})

test('a slice already at phase gate resumes at the gate, not the build loop', async () => {
  const rt = await runMain(happy({ gate: () => ({ state: 'pass', commit: 'c2' }) }, 'gate'))
  assert.equal(rt.calls.filter(c => c.role === 'implementer').length, 0)
  assert.equal(rt.calls.filter(c => c.role === 'gate').length, 1)
  assert.ok(rt.roles().includes('integrator'))
})

// the verify-economy ledger: every round-ending persist carries the slice's full ledger array, whose
// last row is the round's outcome, so the tracker can price verification without a second state-write
const ledgerArrays = rt => rt.calls
  .filter(c => c.role === 'state-writer' && c.inputs.op === 'patch-slice' && c.inputs.patch && Array.isArray(c.inputs.patch.ledger))
  .map(c => c.inputs.patch.ledger)

test('each verify round appends one ledger row to a single cumulative persist', async () => {
  let refuted = 0
  const rt = await runMain(happy({
    'verify-http-api': () => (refuted++ === 0
      ? { refuted: true, evidence: 'empty input crashes', failingTest: 'edge — a — R-1' }
      : clearVote()),
  }, 'implement'))
  assert.deepEqual(rt.errors, [])
  const arrays = ledgerArrays(rt)
  // one state-write per round: the refuted round, the verified round (riding the gate transition), the gate
  assert.deepEqual(arrays.map(a => a.length), [1, 2, 3])
  assert.deepEqual(arrays[0].at(-1), { kind: 'verify', round: 0, outcome: 'refuted', refutations: 1, failingTests: 1 })
  assert.deepEqual(arrays[1].at(-1), { kind: 'verify', round: 1, outcome: 'verified', refutations: 0, failingTests: 0 })
  assert.deepEqual(arrays[2].at(-1), { kind: 'gate', round: 0, outcome: 'verified', refutations: 0, failingTests: 0 })
  // cumulative: each patch carries every row written before it, so it never truncates the ledger
  assert.deepEqual(arrays[1], [...arrays[0], arrays[1][1]])
  assert.deepEqual(arrays[2], [...arrays[1], arrays[2][2]])
})

test('an infra round appends an infra row and replays without spending a fix round', async () => {
  let n = 0
  const rt = await runMain(happy({
    verifier: () => (n++ === 0 ? { refuted: false, evidence: 'suite cut off', outcome: 'infra' } : clearVote()),
  }, 'implement'))
  assert.deepEqual(rt.errors, [])
  const arrays = ledgerArrays(rt)
  assert.deepEqual(arrays.map(a => a.length), [1, 2, 3])
  assert.deepEqual(arrays[0].at(-1), { kind: 'verify', round: 0, outcome: 'infra', refutations: 0, failingTests: 0 })
  assert.deepEqual(arrays[1].at(-1), { kind: 'verify', round: 0, outcome: 'verified', refutations: 0, failingTests: 0 })
  // the replay keeps the same fix round...
  const impls = rt.calls.filter(c => c.role === 'implementer')
  assert.equal(impls.length, 2)
  assert.ok(impls.every(c => c.inputs.fixRound === 0))
  // ...and the round with a verdict resets the infra streak
  const last = rt.calls.filter(c => c.role === 'state-writer' && c.inputs.patch && c.inputs.patch.counters).at(-1)
  assert.equal(last.inputs.patch.counters.infraRetries, 0)
})

test('a gate fail appends its row and the retry carries the ledger through the recursion', async () => {
  let gates = 0
  const rt = await runMain(happy({
    gate: () => (gates++ === 0 ? { state: 'fail', failingTest: 'e2e — SC-9 — R-2', commit: 'c1' } : { state: 'pass', commit: 'c2' }),
    implementer: () => ({ green: true, notes: 'fixed for the gate' }),
    'verify-planner': () => ({ scenarios: [], tools: [], risk: 'high' }),
  }, 'plan'))
  assert.deepEqual(rt.errors, [])
  const arrays = ledgerArrays(rt)
  assert.deepEqual(arrays.map(a => a.length), [1, 2, 3, 4])
  assert.deepEqual(arrays[0].at(-1), { kind: 'verify', round: 0, outcome: 'verified', refutations: 0, failingTests: 0 })
  assert.deepEqual(arrays[1].at(-1), { kind: 'gate', round: 0, outcome: 'refuted', refutations: 1, failingTests: 1 })
  assert.deepEqual(arrays[2].at(-1), { kind: 'verify', round: 1, outcome: 'verified', refutations: 0, failingTests: 0 })
  assert.deepEqual(arrays[3].at(-1), { kind: 'gate', round: 0, outcome: 'verified', refutations: 0, failingTests: 0 })
})

test('a round the implementer could not finish still appends its refuted row', async () => {
  let n = 0
  const rt = await runMain(happy({
    implementer: () => (n++ === 0 ? { green: false, notes: 'lint fails' } : { green: true, notes: 'ok' }),
  }, 'implement'))
  assert.deepEqual(rt.errors, [])
  const arrays = ledgerArrays(rt)
  assert.deepEqual(arrays[0].at(-1), { kind: 'verify', round: 0, outcome: 'refuted', refutations: 0, failingTests: 0 })
  assert.deepEqual(arrays[1].at(-1), { kind: 'verify', round: 1, outcome: 'verified', refutations: 0, failingTests: 0 })
})

test('the integrator sending regate re-runs the gate', async () => {
  let n = 0
  let reads = 0
  const rt = await runMain(happy({
    // production re-dispatch: the integrator's regate leaves the slice in_progress at phase gate, so the
    // state-reader hands it back and the next iteration re-runs the gate before the integrator is asked again
    'state-reader': () => (reads++ < 2 ? sliceNext('gate') : { action: 'stop', reason: 'test end' }),
    gate: () => ({ state: 'pass', commit: 'c2' }),
    integrator: () => (n++ === 0 ? { state: 'regate', notes: 'CI fix changed product code after the gate' } : { state: 'merged', commit: 'abc' }),
  }, 'gate'))
  assert.equal(rt.calls.filter(c => c.role === 'gate').length, 2)
  assert.equal(rt.calls.filter(c => c.role === 'integrator').length, 2)
})
