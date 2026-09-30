import { test } from 'node:test'
import assert from 'node:assert/strict'
import { runMain, loadInternals, scripted, ok, clear } from './harness.mjs'
import { happy } from './slice.test.mjs'

const refute = (classification, evidence = 'could not reproduce') => ({ refuted: true, classification, evidence })

function milestoneNext(status = 'pending') {
  return { action: 'milestone', milestoneId: 'M-1', milestone: { id: 'M-1', status }, reason: 'milestone complete, not verified' }
}

function campaign(overrides = {}, status = 'pending') {
  return scripted({
    'state-reader': [milestoneNext(status), { action: 'stop', reason: 'test end' }],
    'scenario-planner': () => ({ ok: true, areas: [{ id: 'api', scenarioIds: ['SC-1', 'SC-2'] }, { id: 'ui', scenarioIds: ['SC-3'] }] }),
    'coverage-critic': () => clear(),
    'e2e-harness': () => ({ ok: true, channels: ['api', 'db', 'logs', 'ui'] }),
    'scenario-runner': c => ({ results: c.inputs.scenarioIds.map(scenarioId => ({ scenarioId, status: 'pass', evidence: 'observed as expected' })) }),
    'behavior-judge': () => ({ refuted: false, evidence: 'reproduced' }),
    'milestone-writer': c => ({ ok: true, status: c.inputs.outcome, attempt: 1, fixSlices: c.inputs.confirmed.length ? ['S-fix-M-1-1'] : [] }),
    ...overrides,
  })
}

const failingRunner = failIds => c => ({
  results: c.inputs.scenarioIds.map(scenarioId => (failIds.includes(scenarioId)
    ? { scenarioId, status: 'fail', requirementIds: ['R-1'], specRef: '§6.3', expected: '503', observed: '500', evidence: 'curl -i … → 500' }
    : { scenarioId, status: 'pass', evidence: 'ok' })),
})

test('milestonePlan runs the milestone-planner', async () => {
  const rt = await runMain(scripted({
    'state-reader': [{ action: 'milestonePlan', reason: 'milestones.json missing' }, { action: 'stop', reason: 'end' }],
    'milestone-planner': [{ added: 4, notes: 'M-0 baseline … M-3' }],
  }))
  assert.deepEqual(rt.errors, [])
  assert.match(rt.result.iterations[0].outcome, /milestones planned: 4/)
})

test('a clean campaign plans, reviews coverage, boots the stack, runs every area and reports verified', async () => {
  const rt = await runMain(campaign())
  assert.deepEqual(rt.errors, [])
  const roles = rt.roles()
  assert.ok(roles.indexOf('scenario-planner') < roles.indexOf('coverage-critic'))
  assert.ok(roles.indexOf('coverage-critic') < roles.indexOf('e2e-harness'))
  assert.ok(roles.indexOf('e2e-harness') < roles.indexOf('scenario-runner'))
  assert.deepEqual(rt.calls.filter(c => c.role === 'coverage-critic').map(c => c.inputs.lens).sort(), ['adversary', 'observability', 'spec-coverage'])
  assert.deepEqual(rt.calls.filter(c => c.role === 'scenario-runner').map(c => c.inputs.areaId), ['api', 'ui'])
  assert.deepEqual(rt.calls.find(c => c.role === 'scenario-runner').inputs.channels, ['api', 'db', 'logs', 'ui'])
  assert.equal(roles.includes('behavior-judge'), false)
  const w = rt.calls.find(c => c.role === 'milestone-writer').inputs
  assert.equal(w.outcome, 'verified')
  assert.equal(w.passed, 3)
  assert.match(rt.result.iterations[0].outcome, /M-1 verified .*3\/3 scenarios passed/)
})

test('coverage gaps send the scenario plan back with the critiques', async () => {
  let n = 0
  const rt = await runMain(campaign({
    'coverage-critic': c => (c.inputs.lens === 'adversary' && n++ === 0 ? { refuted: true, evidence: 'no scenario for a replayed submit' } : clear()),
  }))
  const planners = rt.calls.filter(c => c.role === 'scenario-planner')
  assert.equal(planners.length, 2)
  assert.deepEqual(planners[1].inputs.critiques, ['[adversary] no scenario for a replayed submit'])
})

test('critics that never go dry stop after the round limit and the last revision still runs', async () => {
  const rt = await runMain(campaign({ 'coverage-critic': () => ({ refuted: true, evidence: 'more corners' }) }))
  assert.equal(rt.calls.filter(c => c.role === 'scenario-planner').length, 4)
  assert.equal(rt.calls.filter(c => c.role === 'coverage-critic').length, 9)
  assert.ok(rt.roles().includes('scenario-runner'))
})

test('a failure confirmed by the judges becomes a bug for the writer', async () => {
  const rt = await runMain(campaign({ 'scenario-runner': failingRunner(['SC-2']) }))
  assert.equal(rt.calls.filter(c => c.role === 'behavior-judge').length, 3)
  const w = rt.calls.find(c => c.role === 'milestone-writer').inputs
  assert.equal(w.outcome, 'bugs')
  assert.equal(w.confirmed.length, 1)
  assert.equal(w.confirmed[0].scenarioId, 'SC-2')
  assert.equal(w.confirmed[0].verdict, 'product-bug')
  assert.match(rt.result.iterations[0].outcome, /fix slices S-fix-M-1-1/)
})

test('a failure the judges refute is dismissed with their classification', async () => {
  const rt = await runMain(campaign({
    'scenario-runner': failingRunner(['SC-1']),
    'behavior-judge': c => (c.inputs.voter === 2 ? { refuted: false, evidence: 'saw it once' } : refute('flaky')),
  }))
  const w = rt.calls.find(c => c.role === 'milestone-writer').inputs
  assert.equal(w.outcome, 'verified')
  assert.equal(w.dismissed[0].verdict, 'flaky')
  assert.equal(w.confirmed.length, 0)
})

test('dead judges never dismiss a failure', async () => {
  const rt = await runMain(campaign({
    'scenario-runner': failingRunner(['SC-1']),
    'behavior-judge': () => { throw new Error('crashed') },
  }))
  assert.equal(rt.calls.find(c => c.role === 'milestone-writer').inputs.confirmed.length, 1)
})

test('failures beyond the judge limit carry over as unjudged', async () => {
  const ids = Array.from({ length: 10 }, (_, i) => `SC-${i}`)
  const rt = await runMain(campaign({
    'scenario-planner': () => ({ ok: true, areas: [{ id: 'api', scenarioIds: ids }] }),
    'scenario-runner': failingRunner(ids),
    'behavior-judge': () => refute('test-bug'),
  }))
  const w = rt.calls.find(c => c.role === 'milestone-writer').inputs
  assert.equal(rt.calls.filter(c => c.role === 'behavior-judge').length, 24)
  assert.equal(w.unjudged.length, 2)
  assert.equal(w.outcome, 'bugs')
})

test('a runner that dies marks its scenarios blocked and the outcome partial', async () => {
  const rt = await runMain(campaign({
    'scenario-runner': c => { if (c.inputs.areaId === 'ui') throw new Error('browser crashed'); return { results: [{ scenarioId: 'SC-1', status: 'pass', evidence: 'ok' }, { scenarioId: 'SC-2', status: 'pass', evidence: 'ok' }] } },
  }))
  const w = rt.calls.find(c => c.role === 'milestone-writer').inputs
  assert.equal(w.outcome, 'partial')
  assert.deepEqual(w.blocked.map(b => b.scenarioId), ['SC-3'])
})

test('a stack that cannot boot is reported blocked without running scenarios', async () => {
  const rt = await runMain(campaign({ 'e2e-harness': () => ({ ok: false, notes: 'migrations fail' }) }))
  assert.equal(rt.roles().includes('scenario-runner'), false)
  const w = rt.calls.find(c => c.role === 'milestone-writer').inputs
  assert.equal(w.outcome, 'blocked')
  assert.match(w.summary, /migrations fail/)
})

test('runners go in batches of three so one laptop is not flooded', async () => {
  let live = 0, peak = 0
  const areas = Array.from({ length: 7 }, (_, i) => ({ id: `a${i}`, scenarioIds: [`SC-${i}`] }))
  const rt = await runMain(campaign({
    'scenario-planner': () => ({ ok: true, areas }),
    'scenario-runner': async c => {
      live++; peak = Math.max(peak, live)
      await new Promise(r => setTimeout(r, 5))
      live--
      return { results: c.inputs.scenarioIds.map(scenarioId => ({ scenarioId, status: 'pass', evidence: 'ok' })) }
    },
  }))
  assert.equal(rt.calls.filter(c => c.role === 'scenario-runner').length, 7)
  assert.equal(peak, 3)
})

test('a re-run after fixes replays the planned scenarios without new coverage critique', async () => {
  const rt = await runMain(campaign({}, 'fixing'))
  const planner = rt.calls.find(c => c.role === 'scenario-planner')
  assert.equal(planner.inputs.rerun, true)
  assert.equal(rt.roles().includes('coverage-critic'), false)
  assert.equal(rt.calls.find(c => c.role === 'e2e-harness').inputs.rerun, true)
})

test('dismissalClass picks the majority classification among refuting voters', async () => {
  const { I } = await loadInternals()
  assert.equal(I.dismissalClass([refute('flaky'), refute('out-of-scope'), refute('flaky')]), 'flaky')
  assert.equal(I.dismissalClass([refute('spec-gap'), { refuted: false, evidence: 'real' }, null]), 'spec-gap')
  assert.equal(I.dismissalClass([{ refuted: true, evidence: 'x' }]), 'test-bug')
})

test('verifier seeds reach the integrator alongside review seeds', async () => {
  const rt = await runMain(happy({
    verifier: c => (c.inputs.lens === 'behavior'
      ? { refuted: false, evidence: 'in-scope cases hold', seeds: [{ title: 'cap regex size', detail: 'a 10 KB pattern takes 5 s; spec states no bound' }] }
      : clear()),
    reviewer: c => ({ findings: c.inputs.lens === 'architecture' ? [{ title: 'rename helper', detail: 'x', blocking: false }] : [] }),
  }, 'implement'))
  const seeds = rt.calls.find(c => c.role === 'integrator').inputs.seeds.map(s => s.title).sort()
  assert.deepEqual(seeds, ['cap regex size', 'rename helper'])
})

test('a planner that judges the slice too big goes straight to split without critics', async () => {
  const rt = await runMain(happy({ planner: () => ({ ok: true, tooBig: true, notes: '9 requirements across 3 units' }) }))
  assert.equal(rt.roles().includes('plan-critic'), false)
  const esc = rt.calls.find(c => c.role === 'escalator').inputs
  assert.equal(esc.action, 'split')
  assert.match(esc.why, /too big/)
})

test('a too-big verdict after an earlier split escalates one rung further, never back down', async () => {
  const rt = await runMain(scripted({
    'state-reader': [{ action: 'slice', sliceId: 'S-1', slice: { id: 'S-1', kind: 'spec', phase: 'plan', counters: { ladderStep: 2 } }, reason: 'next' }, { action: 'stop', reason: 'end' }],
    planner: () => ({ ok: true, tooBig: true }),
    escalator: () => ok(),
  }))
  assert.equal(rt.calls.find(c => c.role === 'escalator').inputs.action, 'spike')
})
