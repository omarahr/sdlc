import { test } from 'node:test'
import assert from 'node:assert/strict'
import { runMain, scripted, ok, clear } from './harness.mjs'

export function sliceNext(phase = 'plan', extra = {}) {
  return { action: 'slice', sliceId: 'S-1', slice: { id: 'S-1', kind: 'spec', phase, counters: {}, ...extra }, reason: 'next' }
}

export function happy(overrides = {}, phase = 'plan') {
  return scripted({
    'state-reader': [sliceNext(phase), { action: 'stop', reason: 'test end' }],
    planner: () => ({ ok: true }),
    'plan-critic': () => clear(),
    'test-writer': () => ({ ok: true }),
    'test-checker': () => ({ allFailCorrectly: true, problems: [] }),
    implementer: () => ({ green: true, notes: 'all green' }),
    verifier: () => clear(),
    'verify-planner': () => ({ scenarios: [{ id: 'VS-1', title: 'replay a dead letter', requirementIds: ['R-1'], profiles: ['http-api', 'security'] }], tools: [], risk: 'high' }),
    'verify-http-api': () => ({ ...clear(), cases: 2, passed: 2 }),
    'verify-security': () => ({ ...clear(), cases: 3, passed: 3 }),
    'verify-collector': () => ok(),
    'test-reporter': () => ok(),
    reviewer: () => ({ findings: [] }),
    'finding-refuter': () => clear(),
    integrator: () => ({ state: 'merged', commit: 'abc123' }),
    'state-writer': () => ok(),
    escalator: () => ok(),
    ...overrides,
  })
}

test('plan passes both critics, tests fail correctly, slice advances to implement', async () => {
  const rt = await runMain(happy())
  assert.deepEqual(rt.errors, [])
  const roles = rt.roles()
  assert.ok(roles.indexOf('planner') < roles.indexOf('plan-critic'))
  assert.ok(roles.indexOf('plan-critic') < roles.indexOf('test-writer'))
  assert.deepEqual(rt.calls.filter(c => c.role === 'plan-critic').map(c => c.inputs.lens).sort(), ['architecture', 'spec-fidelity'])
  const patches = rt.calls.filter(c => c.role === 'state-writer').map(c => c.inputs.patch)
  assert.equal(patches[0].phase, 'tests')
  assert.equal(patches[0].status, 'in_progress')
  assert.equal(patches[1].phase, 'implement')
})

test('ambiguities go to the decision panel and the planner re-runs with the ADRs', async () => {
  let n = 0
  const rt = await runMain(happy({
    planner: () => (n++ === 0 ? { ok: true, ambiguities: [{ question: 'Which date format?', kind: 'ambiguity' }] } : { ok: true }),
    'decision-proposer': () => ({ option: 'ISO-8601', rationale: 'spec says locale-neutral' }),
    'decision-judge': () => ({ adrId: 'ADR-9', choice: 'ISO-8601' }),
  }))
  const planners = rt.calls.filter(c => c.role === 'planner')
  assert.equal(planners.length, 2)
  assert.deepEqual(planners[1].inputs.critiques, ['Resolved by ADR-9: ISO-8601'])
  assert.equal(planners[1].inputs.revision, 0)
})

test('plan refuted three times escalates to replan', async () => {
  const rt = await runMain(happy({ 'plan-critic': c => (c.inputs.lens === 'architecture' ? { refuted: true, evidence: 'breaks layering' } : clear()) }))
  assert.equal(rt.roles().filter(r => r === 'planner').length, 3)
  assert.equal(rt.calls.find(c => c.role === 'escalator').inputs.action, 'replan')
  assert.equal(rt.roles().includes('test-writer'), false)
  assert.match(rt.calls.filter(c => c.role === 'planner')[1].inputs.critiques[1], /\[architecture\] breaks layering/)
})

test('tests that never fail for the right reason escalate after three attempts', async () => {
  const rt = await runMain(happy({ 'test-checker': () => ({ allFailCorrectly: false, problems: ['T1 passes already'] }) }))
  assert.equal(rt.roles().filter(r => r === 'test-writer').length, 3)
  assert.deepEqual(rt.calls.filter(c => c.role === 'test-writer')[1].inputs.problems, ['T1 passes already'])
  assert.equal(rt.calls.find(c => c.role === 'escalator').inputs.action, 'replan')
})
test('happy path runs implement, core verifiers, the profile group, three reviewers, the report, integrate', async () => {
  const rt = await runMain(happy())
  assert.deepEqual(rt.errors, [])
  assert.deepEqual(rt.calls.filter(c => c.role === 'verifier').map(c => c.inputs.lens).sort(), ['regression', 'spec-fidelity'])
  assert.deepEqual(rt.roles().filter(r => r.startsWith('verify-')), ['verify-planner', 'verify-http-api', 'verify-security', 'verify-collector'])
  const roles = rt.roles()
  assert.ok(roles.indexOf('reviewer') < roles.indexOf('test-reporter'))
  assert.ok(roles.indexOf('test-reporter') < roles.indexOf('integrator'))
  assert.equal(rt.calls.find(c => c.role === 'test-reporter').inputs.mode, 'ship')
  assert.deepEqual(rt.calls.filter(c => c.role === 'reviewer').map(c => c.inputs.lens).sort(), ['architecture', 'security', 'test-quality'])
  assert.equal(rt.calls.find(c => c.role === 'integrator').inputs.mode, 'ship')
  assert.match(rt.result.iterations[0].outcome, /S-1 merged abc123/)
})

test('resume at implement skips plan and tests', async () => {
  const rt = await runMain(happy({}, 'implement'))
  assert.equal(rt.roles().includes('planner'), false)
  assert.equal(rt.roles().includes('test-writer'), false)
  assert.ok(rt.roles().includes('implementer'))
})

test('resume at integrate goes straight to the integrator with persisted seeds', async () => {
  const rt = await runMain(scripted({
    'state-reader': [sliceNext('integrate', { seeds: [{ title: 's', detail: 'd', blocking: false }] }), { action: 'stop', reason: 'end' }],
    integrator: () => ({ state: 'merged', commit: 'c1' }),
    'test-reporter': () => ok(),
  }))
  assert.deepEqual(rt.roles(), ['state-reader', 'test-reporter', 'integrator', 'state-reader'])
  assert.equal(rt.calls[2].inputs.seeds[0].title, 's')
})

test('a profile verifier failing test forces a fix round carrying the evidence', async () => {
  let round = 0
  const rt = await runMain(happy({
    'verify-http-api': () => (round++ === 0
      ? { refuted: true, evidence: 'empty input crashes', failingTest: 'edge.test.ts > empty' }
      : clear()),
  }, 'implement'))
  const impls = rt.calls.filter(c => c.role === 'implementer')
  assert.equal(impls.length, 2)
  assert.match(impls[1].inputs.evidence.join('\n'), /failing test: \[http-api\] edge\.test\.ts > empty/)
  assert.equal(impls[1].inputs.fixRound, 1)
})

test('three failed fix rounds escalate', async () => {
  const rt = await runMain(happy({ implementer: () => ({ green: false, notes: 'lint fails' }) }, 'implement'))
  assert.equal(rt.roles().filter(r => r === 'implementer').length, 3)
  assert.equal(rt.calls.find(c => c.role === 'escalator').inputs.action, 'replan')
  assert.match(rt.calls.find(c => c.role === 'escalator').inputs.why, /fix rounds exhausted/)
})

test('an inconclusive implementer run is re-run without spending a fix round', async () => {
  let n = 0
  const rt = await runMain(happy({
    implementer: () => (n++ === 0 ? { green: false, inconclusive: true, notes: 'pnpm test cut off at 600s' } : { green: true, notes: 'all green' }),
  }, 'implement'))
  const impls = rt.calls.filter(c => c.role === 'implementer')
  assert.equal(impls.length, 2)
  assert.equal(impls[1].inputs.fixRound, 0)
  assert.equal(impls[1].inputs.rerun, 'inconclusive')
  assert.equal(rt.roles().includes('escalator'), false)
  assert.equal(rt.calls.find(c => c.role === 'integrator').inputs.mode, 'ship')
})

test('a fix round is spent only when the implementer stays inconclusive after its re-run', async () => {
  const rt = await runMain(happy({ implementer: () => ({ green: false, inconclusive: true, notes: 'cut off' }) }, 'implement'))
  assert.equal(rt.roles().filter(r => r === 'implementer').length, 6)
  assert.match(rt.calls.find(c => c.role === 'escalator').inputs.why, /still did not finish/)
})

test('a blocking finding that survives refutation forces a fix round', async () => {
  let reviews = 0
  const rt = await runMain(happy({
    reviewer: c => (c.inputs.lens === 'security' && reviews++ === 0
      ? { findings: [{ title: 'SQL injection', detail: 'raw concat in query', blocking: true }, { title: 'rename var', detail: 'x', blocking: false }] }
      : { findings: [] }),
  }, 'implement'))
  assert.equal(rt.roles().filter(r => r === 'finding-refuter').length, 3)
  const impls = rt.calls.filter(c => c.role === 'implementer')
  assert.equal(impls.length, 2)
  assert.match(impls[1].inputs.evidence[0], /\[review\] SQL injection/)
  assert.deepEqual(rt.calls.find(c => c.role === 'integrator').inputs.seeds, [])
})

test('a blocking finding refuted by the majority is dropped and non-blocking ones become seeds', async () => {
  const rt = await runMain(happy({
    reviewer: c => (c.inputs.lens === 'security'
      ? { findings: [{ title: 'fake issue', detail: 'd', blocking: true }, { title: 'nit', detail: 'n', blocking: false }] }
      : { findings: [] }),
    'finding-refuter': () => ({ refuted: true, evidence: 'not reachable' }),
  }, 'implement'))
  assert.equal(rt.roles().filter(r => r === 'implementer').length, 1)
  assert.deepEqual(rt.calls.find(c => c.role === 'integrator').inputs.seeds.map(s => s.title), ['nit'])
})

test('reviewer that fails to report blocks the slice', async () => {
  let calls = 0
  const rt = await runMain(happy({ reviewer: c => (c.inputs.lens === 'architecture' && calls++ < 4 ? null : { findings: [] }) }, 'implement'))
  const impls = rt.calls.filter(c => c.role === 'implementer')
  assert.equal(impls.length, 2)
  assert.match(impls[1].inputs.evidence[0], /reviewer architecture failed to report/)
})

test('integration failure escalates', async () => {
  const rt = await runMain(happy({ integrator: () => ({ state: 'failed', notes: 'CI red after 5 cycles' }) }, 'implement'))
  assert.match(rt.calls.find(c => c.role === 'escalator').inputs.why, /integration failed: CI red/)
})

test('an inconclusive final check is re-run, and never escalates', async () => {
  let n = 0
  const rt = await runMain(happy({
    integrator: () => (n++ === 0 ? { state: 'inconclusive', notes: 'pnpm test cut off' } : { state: 'merged', commit: 'abc' }),
  }, 'implement'))
  const ints = rt.calls.filter(c => c.role === 'integrator')
  assert.equal(ints.length, 2)
  assert.equal(ints[1].inputs.rerun, 'inconclusive')
  assert.equal(rt.roles().includes('escalator'), false)
})

test('a final check still inconclusive after its re-run leaves the slice in integrate', async () => {
  const rt = await runMain(happy({ integrator: () => ({ state: 'inconclusive', notes: 'cut off' }) }, 'implement'))
  assert.equal(rt.roles().filter(r => r === 'integrator').length, 2)
  assert.equal(rt.roles().includes('escalator'), false)
})

test('parkedRetry unparks then runs the slice from plan with reset counters', async () => {
  const rt = await runMain(happy({
    'state-reader': [
      { action: 'parkedRetry', sliceId: 'S-1', slice: { id: 'S-1', kind: 'spec', phase: 'implement', counters: { fixRounds: 3, ladderStep: 5, parkCycles: 1 } }, reason: 'retry' },
      { action: 'stop', reason: 'end' },
    ],
  }))
  assert.equal(rt.calls[1].role, 'state-writer')
  assert.equal(rt.calls[1].inputs.op, 'unpark')
  assert.equal(rt.calls[2].role, 'planner')
  const patch = rt.calls.find(c => c.role === 'state-writer' && c.inputs.op === 'patch-slice').inputs.patch
  assert.deepEqual(patch.counters, { planRevisions: 0, fixRounds: 0, ladderStep: 0, parkCycles: 1 })
})

test('retryMerge calls the integrator in retry-merge mode', async () => {
  const rt = await runMain(scripted({
    'state-reader': [{ action: 'retryMerge', sliceId: 'S-1', slice: { id: 'S-1', status: 'awaiting-merge' }, reason: 'approved' }, { action: 'stop', reason: 'end' }],
    integrator: () => ({ state: 'merged', pr: '#12' }),
  }))
  assert.equal(rt.calls[1].inputs.mode, 'retry-merge')
  assert.match(rt.result.iterations[0].outcome, /S-1 merged #12/)
})

test('no-progress guard force-parks a slice after three identical outcomes', async () => {
  let reads = 0
  const rt = await runMain(scripted({
    'state-reader': () => (reads++ < 3
      ? { action: 'slice', sliceId: 'S-1', slice: { id: 'S-1', kind: 'spec', phase: 'integrate' }, reason: 'again' }
      : { action: 'stop', reason: 'end' }),
    integrator: () => ({ state: 'failed', notes: 'red' }),
    escalator: () => ({ ok: false }),
    'state-writer': () => ok(),
  }))
  const fp = rt.calls.filter(c => c.role === 'state-writer' && c.inputs.op === 'force-park')
  assert.equal(fp.length, 1)
  assert.match(fp[0].inputs.reason, /no progress/)
  assert.equal(fp[0].inputs.kind, 'spec')
  assert.equal(rt.result.state, 'stopped')
})
