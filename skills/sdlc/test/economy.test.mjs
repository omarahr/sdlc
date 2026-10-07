import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { runMain, loadInternals, clear as clearVote, scripted, ok, SKILL_DIR } from './harness.mjs'
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
  // the gate's failing test reaches the next implementer as evidence, so the fix round knows what to fix
  const impls = rt.calls.filter(c => c.role === 'implementer')
  assert.equal(impls.length, 2)
  assert.ok(impls[1].inputs.evidence.includes('[gate] failing test: e2e — SC-9 — R-2'))
  assert.equal(impls[1].inputs.fixRound, 1)
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

// ---------- deferred controller rulings (Tasks 1 and 4 reviews) ----------

// loop-level infra economy: infra rounds replay at the same fix round, and three in a row park the slice
test('three consecutive infra rounds park the slice with infra debt, without escalating', async () => {
  const rt = await runMain(happy({
    verifier: () => ({ refuted: false, evidence: 'suite cut off', outcome: 'infra' }),
  }, 'implement'))
  assert.deepEqual(rt.errors, [])
  // every infra round replays the same fix round: no fixRounds++ is spent on an inconclusive round
  const impls = rt.calls.filter(c => c.role === 'implementer')
  assert.equal(impls.length, 3)
  assert.ok(impls.every(c => c.inputs.fixRound === 0), 'infra rounds replay at the same fix round')
  const parked = rt.calls.filter(c => c.role === 'state-writer' && c.inputs.patch && c.inputs.patch.status === 'parked')
  assert.equal(parked.length, 1)
  assert.equal(parked[0].inputs.patch.infraDebt, true)
  assert.equal(parked[0].inputs.patch.counters.infraRetries, 3)
  // one infra row per replayed round, all at the same fix round
  assert.deepEqual(parked[0].inputs.patch.ledger, [
    { kind: 'verify', round: 0, outcome: 'infra', refutations: 0, failingTests: 0 },
    { kind: 'verify', round: 0, outcome: 'infra', refutations: 0, failingTests: 0 },
    { kind: 'verify', round: 0, outcome: 'infra', refutations: 0, failingTests: 0 },
  ])
  assert.equal(rt.roles().includes('escalator'), false, 'infra debt parks; it does not escalate')
  assert.match(rt.result.iterations[0].outcome, /parked with infra debt/)
})

// gate-infra transitions: a gate agent that fails to report is infra, retried outside the economy
test('gatePhase returns an infra verdict on a silent gate agent, and parks on the third', async () => {
  const rt = await loadInternals(scripted({
    gate: () => null,
    'state-writer': () => ok(),
  }))
  const counters = { fixRounds: 0, gateCommit: '', infraRetries: 0 }
  const ledger = []
  const first = await rt.I.gatePhase('S-1', counters, ledger)
  assert.deepEqual(first, { verdict: 'infra', failingTest: '' })
  assert.equal(counters.infraRetries, 1)
  const second = await rt.I.gatePhase('S-1', counters, ledger)
  assert.equal(second.verdict, 'infra')
  assert.equal(counters.infraRetries, 2)
  const third = await rt.I.gatePhase('S-1', counters, ledger)
  assert.deepEqual(third, { verdict: 'infra-debt', failingTest: '' })
  assert.equal(counters.infraRetries, 3)
  assert.deepEqual(ledger.at(-1), { kind: 'gate', round: 0, outcome: 'infra', refutations: 0, failingTests: 0 })
})

// blocked-only and silent-verifier rounds are infra too: they replay at the same fix round and park after three
test('a blocked-only profile round replays at the same fix round and parks after three', async () => {
  let reads = 0
  const written = []
  const rt = await runMain(scripted({
    // production relay: the state-reader hands back what the loop actually persisted — the last
    // state-writer patch is the slice the next iteration sees — so every infra persist is pinned by
    // construction: deleting one breaks the relay and the test. The relay stops once the park lands:
    // unlike the gate (one round per run iteration), the build loop spends all three infra rounds
    // inside one action
    'state-reader': () => {
      const n = reads++
      const last = written.at(-1)
      if (n >= 3 || (last && last.inputs.patch.status === 'parked')) return { action: 'stop', reason: 'end' }
      return sliceNext('implement', last
        ? { risk: 'high', counters: last.inputs.patch.counters, ledger: last.inputs.patch.ledger }
        : { risk: 'high', counters: { fixRounds: 0, gateCommit: '', infraRetries: 0 } })
    },
    implementer: () => ({ green: true, notes: 'green' }),
    verifier: () => clearVote(),
    // the review runs next to the regression lens while the profiles vote is not refuting; on an infra
    // round its verdict is ignored, so a clean review costs nothing
    reviewer: () => ({ findings: [] }),
    'verify-planner': () => ({ scenarios: [{ id: 'VS-1', title: 't', requirementIds: ['R-1'], profiles: ['http-api'] }], tools: [], risk: 'high' }),
    'verify-http-api': () => ({ refuted: false, evidence: 'no server', blocked: [{ scenarioId: 'VS-1', reason: 'the api server would not start' }] }),
    'verify-collector': () => ok(),
    'state-writer': call => { written.push(call); return ok() },
    // escalator deliberately unscripted: an escalation would show up as an error and a role
  }))
  assert.deepEqual(rt.errors, [])
  const impls = rt.calls.filter(c => c.role === 'implementer')
  assert.equal(impls.length, 3)
  assert.ok(impls.every(c => c.inputs.fixRound === 0), 'blocked-only rounds replay at the same fix round')
  assert.equal(rt.roles().includes('escalator'), false, 'infra debt parks; it does not escalate')
  const parked = written.filter(c => c.inputs.patch.status === 'parked')
  assert.equal(parked.length, 1)
  assert.equal(parked[0].inputs.patch.infraDebt, true)
  assert.equal(parked[0].inputs.patch.counters.infraRetries, 3)
  assert.deepEqual(parked[0].inputs.patch.ledger, [
    { kind: 'verify', round: 0, outcome: 'infra', refutations: 0, failingTests: 0 },
    { kind: 'verify', round: 0, outcome: 'infra', refutations: 0, failingTests: 0 },
    { kind: 'verify', round: 0, outcome: 'infra', refutations: 0, failingTests: 0 },
  ])
  // each replayed round's own persist carries the incremented infra streak; the third round's streak
  // rides the park persist, which replaces the plain one
  assert.deepEqual(written.filter(c => !c.inputs.patch.status).map(c => c.inputs.patch.counters.infraRetries), [1, 2])
  assert.match(rt.result.iterations[0].outcome, /parked with infra debt/)
})

test('a round whose only anomaly is a failed-to-report verifier replays without consuming a fix round', async () => {
  let n = 0
  const rt = await runMain(happy({
    // the spec-fidelity verifier fails both of its attempts in round 0; the regression lens reports normally
    verifier: c => (c.inputs.lens === 'spec-fidelity' && n++ < 2 ? null : clearVote()),
  }, 'implement'))
  assert.deepEqual(rt.errors, [])
  const arrays = ledgerArrays(rt)
  assert.deepEqual(arrays[0].at(-1), { kind: 'verify', round: 0, outcome: 'infra', refutations: 0, failingTests: 0 })
  assert.deepEqual(arrays[1].at(-1), { kind: 'verify', round: 0, outcome: 'verified', refutations: 0, failingTests: 0 })
  const impls = rt.calls.filter(c => c.role === 'implementer')
  assert.equal(impls.length, 2)
  assert.ok(impls.every(c => c.inputs.fixRound === 0), 'the silent-verifier round replayed at the same fix round')
  const last = rt.calls.filter(c => c.role === 'state-writer' && c.inputs.patch && c.inputs.patch.counters).at(-1)
  assert.equal(last.inputs.patch.counters.infraRetries, 0)
})

test('three consecutive gate infra failures park the slice without escalating', async () => {
  let reads = 0
  const written = []
  const rt = await runMain(scripted({
    // production relay: the state-reader hands back what the loop actually persisted — the last
    // state-writer patch is the slice the next iteration sees — so every gate persist is pinned by
    // construction: deleting one breaks the relay and the test
    'state-reader': () => {
      const n = reads++
      if (n >= 3) return { action: 'stop', reason: 'end' }
      const last = written.at(-1)
      return sliceNext('gate', last
        ? { counters: last.inputs.patch.counters, ledger: last.inputs.patch.ledger }
        : { counters: { fixRounds: 0, gateCommit: '', infraRetries: 0 } })
    },
    gate: () => null,
    'state-writer': call => { written.push(call); return ok() },
    // escalator deliberately unscripted: an escalation would show up as an error and a role
  }))
  assert.deepEqual(rt.errors, [])
  assert.equal(rt.calls.filter(c => c.role === 'gate').length, 6, 'two dispatch attempts per silent gate round; this count tracks run() retry policy')
  assert.equal(rt.roles().includes('escalator'), false)
  // each round's own persist carries the incremented infra streak and the cumulative gate ledger row
  const infraPersists = written.filter(c => !c.inputs.patch.status)
  assert.deepEqual(infraPersists.map(c => c.inputs.patch.counters.infraRetries), [1, 2, 3])
  assert.deepEqual(infraPersists.map(c => c.inputs.patch.ledger.length), [1, 2, 3])
  // the park carries the full three-row gate ledger, all infra, none of them a verdict
  const parked = written.filter(c => c.inputs.patch.status === 'parked')
  assert.equal(parked.length, 1)
  assert.equal(parked[0].inputs.patch.infraDebt, true)
  assert.equal(parked[0].inputs.patch.counters.infraRetries, 3)
  assert.deepEqual(parked[0].inputs.patch.ledger, [
    { kind: 'gate', round: 0, outcome: 'infra', refutations: 0, failingTests: 0 },
    { kind: 'gate', round: 0, outcome: 'infra', refutations: 0, failingTests: 0 },
    { kind: 'gate', round: 0, outcome: 'infra', refutations: 0, failingTests: 0 },
  ])
  assert.match(rt.result.iterations[2].outcome, /parked with infra debt at the gate/)
})

test('a parked-at-gate slice resumed via parkedRetry re-runs the gate, not the build loop', async () => {
  const rt = await runMain(happy({
    'state-reader': [
      { action: 'parkedRetry', sliceId: 'S-1', slice: { id: 'S-1', kind: 'spec', phase: 'gate', infraDebt: true, counters: { fixRounds: 1, gateCommit: '', infraRetries: 3 } }, reason: 'retry' },
      { action: 'stop', reason: 'end' },
    ],
  }))
  assert.deepEqual(rt.errors, [])
  assert.equal(rt.calls[1].role, 'state-writer')
  assert.equal(rt.calls[1].inputs.op, 'unpark')
  assert.equal(rt.roles().includes('planner'), false)
  assert.equal(rt.calls.filter(c => c.role === 'implementer').length, 0)
  assert.equal(rt.calls.filter(c => c.role === 'verifier').length, 0)
  assert.equal(rt.calls.filter(c => c.role === 'gate').length, 1)
  assert.ok(rt.roles().includes('integrator'))
  // counters survive the park intact...
  const counters = rt.calls.filter(c => c.role === 'state-writer' && c.inputs.patch && c.inputs.patch.counters).map(c => c.inputs.patch.counters)
  assert.ok(counters.every(c => c.fixRounds === 1), 'the resumed gate keeps its counters')
  // ...and the gate pass persists the commit it gated on
  const last = rt.calls.filter(c => c.role === 'state-writer' && c.inputs.patch && c.inputs.patch.counters && c.inputs.patch.counters.gateCommit).at(-1)
  assert.equal(last.inputs.patch.counters.gateCommit, 'c2')
})

// ---------- stop = pause after the last running agent (2026-10-07 run-runtime spec, Section 2) ----------

test('a stopRequested implementer pauses the run without spending a fix round', async () => {
  const written = []
  const rt = await runMain(happy({
    implementer: () => ({ stopRequested: true, green: false, notes: 'STOP seen before starting' }),
    'state-writer': call => { written.push(call); return ok() },
  }, 'implement'))
  assert.deepEqual(rt.errors, [])
  assert.equal(rt.result.state, 'paused')
  assert.match(rt.result.reason, /stop requested/)
  // nothing at all runs after the implementer: no verifier, no reviewer, no state-write
  assert.deepEqual(rt.roles(), ['state-reader', 'implementer'])
  assert.deepEqual(written, [])
  // the action never completed, so the pause is not a counted iteration (and no fix round was spent)
  assert.deepEqual(rt.result.iterations, [])
})

test('an agent already running finishes, the next one does not start', async () => {
  const written = []
  const rt = await runMain(happy({
    implementer: () => ({ green: true, notes: 'all green' }),
    'verify-planner': () => ({ stopRequested: true, scenarios: [], tools: [], risk: 'high' }),
    'state-writer': call => { written.push(call); return ok() },
  }, 'implement'))
  assert.deepEqual(rt.errors, [])
  assert.equal(rt.result.state, 'paused')
  // the implementer's result was consumed (it was already running), but no verify or review agent started after it
  assert.equal(rt.calls.filter(c => c.role === 'implementer').length, 1)
  // the verify-planner itself finished (it was the running agent); nothing beside or after it started
  assert.deepEqual(rt.roles().filter(r => r === 'verifier' || r === 'reviewer' || (r.startsWith('verify-') && r !== 'verify-planner')), [])
  // the persisted state is still what the round began with: no patch with a phase or counters landed
  const patches = written.filter(c => c.inputs.op === 'patch-slice' && c.inputs.patch && (c.inputs.patch.phase || c.inputs.patch.counters))
  assert.deepEqual(patches, [])
})

test('a stopRequested agent deep in a parallel group unwinds cleanly', async () => {
  const rt = await runMain(happy({
    'verify-http-api': () => ({ ...clearVote(), cases: 2, passed: 2 }),
    'verify-security': () => ({ stopRequested: true, refuted: false, evidence: 'STOP seen before starting' }),
  }, 'implement'))
  assert.deepEqual(rt.errors, [])
  assert.equal(rt.result.state, 'paused')
  // the fold never happens: no collector files the branches, no regression lens runs after it
  assert.equal(rt.roles().includes('verify-collector'), false)
  assert.equal(rt.roles().filter(r => r === 'verifier').length, 1, 'only the spec-fidelity lens already running beside the profiles')
  assert.deepEqual(rt.result.iterations, [])
})

test('an iteration-top stop action still ends stopped, not paused', async () => {
  const rt = await runMain(happy())
  assert.equal(rt.result.state, 'stopped')
  assert.doesNotMatch(rt.result.reason, /stop requested/)
})

test('a stopRequested state-reader pauses instead of stalling into the relaunch loop', async () => {
  const rt = await runMain(happy({
    // the reader no-ops because it saw the stop file: its "failed to report" must not read as a stall,
    // or the driver keeps relaunching into STOP until the stuck limit removes the worktree
    'state-reader': () => ({ stopRequested: true, action: 'stop', reason: 'STOP seen before starting' }),
  }))
  assert.deepEqual(rt.errors, [])
  assert.equal(rt.result.state, 'paused')
  assert.match(rt.result.reason, /stop requested/)
  assert.deepEqual(rt.result.iterations, [])
})

// ---------- lifecycle: the whole slice, plan through integrate ----------

test('lifecycle: a profile refutation promotes into the fix round, the gate commits, the integrator merges', async () => {
  const failingTest = '.sdlc/slices/S-1/verification/r0/tests/http-api-0/replay.test.ts — x — R-1'
  const rt = await runMain(happy({
    'verify-http-api': () => ({ refuted: true, evidence: 'replay drops the dead letter', failingTest }),
  }))
  assert.deepEqual(rt.errors, [])
  const roles = rt.roles()
  // the gate runs after the last review and before the integrator
  const lastReview = roles.lastIndexOf('reviewer')
  const gateAt = roles.indexOf('gate')
  assert.ok(lastReview >= 0 && lastReview < gateAt, 'the gate runs after the last review')
  assert.ok(gateAt < roles.indexOf('integrator'), 'the gate runs before the integrator')
  // the promotion duty trigger: the fix-round implementer receives the profile verifier's failing test
  const impls = rt.calls.filter(c => c.role === 'implementer')
  assert.equal(impls.length, 2)
  assert.ok(impls[1].inputs.evidence.join('\n').includes(failingTest), 'the fix round carries the failing test')
  assert.equal(impls[1].inputs.fixRound, 1)
  // as designed: a failingTest-only refutation promotes the test into the suite, where the regression
  // lens judges it — it does not re-run the profile agent
  assert.equal(rt.calls.filter(c => c.role === 'verify-http-api').length, 1, 'a failingTest-only refutation promotes the test; it does not re-run the profile')
  // the verify-economy ledger rows ride the round-ending persists
  const arrays = ledgerArrays(rt)
  assert.deepEqual(arrays.map(a => a.length), [1, 2, 3])
  assert.deepEqual(arrays[0].at(-1), { kind: 'verify', round: 0, outcome: 'refuted', refutations: 1, failingTests: 1 })
  assert.deepEqual(arrays[1].at(-1), { kind: 'verify', round: 1, outcome: 'verified', refutations: 0, failingTests: 0 })
  assert.deepEqual(arrays[2].at(-1), { kind: 'gate', round: 0, outcome: 'verified', refutations: 0, failingTests: 0 })
  // the gate pass persists the commit it gated on
  const gc = rt.calls.filter(c => c.role === 'state-writer' && c.inputs.patch && c.inputs.patch.counters && c.inputs.patch.counters.gateCommit).at(-1)
  assert.equal(gc.inputs.patch.counters.gateCommit, 'c2')
  // no cherry-pick role exists anywhere, and the collector prompt is still what the loop dispatches
  assert.ok(roles.every(r => !/cherry/i.test(r)))
  assert.ok(rt.calls.every(c => !/cherry/i.test(c.prompt)))
  assert.ok(existsSync(join(SKILL_DIR, 'prompts', 'verify-collector.md')))
  // the loop hands the collector branch names, and only branch names
  const collectors = rt.calls.filter(c => c.role === 'verify-collector')
  assert.equal(collectors.length, 1)
  assert.deepEqual(collectors[0].inputs.branches, ['sdlc/S-1-v0-http-api-0', 'sdlc/S-1-v0-security-0'])
  assert.ok(collectors[0].prompt.includes('sdlc/S-1-v0-http-api-0'))
  assert.ok(collectors[0].prompt.includes('sdlc/S-1-v0-security-0'))
  // the integrator merged in ship mode
  const integrator = rt.calls.find(c => c.role === 'integrator')
  assert.equal(integrator.inputs.mode, 'ship')
  assert.match(rt.result.iterations[0].outcome, /S-1 merged abc123/)
})
