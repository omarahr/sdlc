import { test } from 'node:test'
import assert from 'node:assert/strict'
import { runMain, scripted, ok, clear } from './harness.mjs'
import { happy, sliceNext } from './slice.test.mjs'

test('I1: a blocking finding whose refuters all die is kept, not dropped', async () => {
  let reviews = 0
  const rt = await runMain(happy({
    reviewer: c => (c.inputs.lens === 'security' && reviews++ === 0
      ? { findings: [{ title: 'SQL injection', detail: 'raw concat', blocking: true }] }
      : { findings: [] }),
    'finding-refuter': () => null,
  }, 'implement'))
  assert.equal(rt.roles().filter(r => r === 'implementer').length, 2)
})

test('I1: bar raiser round where every finder died is not dry', async () => {
  const rt = await runMain(scripted({
    'state-reader': [{ action: 'barRaiserRound', reason: 'r' }, { action: 'stop', reason: 'end' }],
    'barraiser-reader': [{ seenKeys: [], seeds: [], dryRounds: 1, rounds: 3 }],
    'bar-finder': () => null,
    'barraiser-writer': () => ok(),
  }), { barRaiserRounds: 10 })
  assert.equal(rt.calls.find(c => c.role === 'barraiser-writer').inputs.dry, false)
})

test('I1: an idea whose judges died is deferred, not rejected', async () => {
  const rt = await runMain(scripted({
    'state-reader': [{ action: 'barRaiserRound', reason: 'r' }, { action: 'stop', reason: 'end' }],
    'barraiser-reader': [{ seenKeys: [], seeds: [{ key: 'perf-a', title: 'perf a', detail: 'd', behaviorChange: false }], dryRounds: 0, rounds: 3 }],
    'bar-finder': () => ({ ideas: [] }),
    'bar-judge': () => null,
    'barraiser-writer': () => ok(),
  }), { barRaiserRounds: 10 })
  const w = rt.calls.find(c => c.role === 'barraiser-writer').inputs
  assert.deepEqual(w.verdicts, [])
  assert.deepEqual(w.deferred.map(i => i.key), ['perf-a'])
  assert.equal(w.dry, false)
})

test('I3: a retryMerge that keeps waiting returns waiting instead of force-parking', async () => {
  const rt = await runMain(scripted({
    'state-reader': () => ({ action: 'retryMerge', sliceId: 'S-1', slice: { id: 'S-1' }, reason: 'try' }),
    integrator: () => ({ state: 'awaiting-merge', pr: '#12' }),
  }))
  assert.equal(rt.result.state, 'waiting')
  assert.equal(rt.roles().includes('state-writer'), false)
})

test('I3: a force-park that fails ends the run as stalled', async () => {
  const rt = await runMain(scripted({
    'state-reader': () => ({ action: 'slice', sliceId: 'S-1', slice: { id: 'S-1', phase: 'integrate' }, reason: 'r' }),
    integrator: () => ({ state: 'failed', notes: 'red' }),
    escalator: () => ok(),
    'state-writer': () => null,
  }))
  assert.equal(rt.result.state, 'stalled')
  assert.match(rt.result.reason, /force-park failed/)
})

test('I4: the no-progress streak carries across runs through args and is returned', async () => {
  const key = 'audit||audit aborted: audit-planner failed'
  const rt = await runMain(scripted({
    'state-reader': () => ({ action: 'audit', reason: 'pending' }),
    'audit-planner': () => null,
  }), { lastKey: key, streak: 2 })
  assert.equal(rt.result.state, 'stalled')
  assert.equal(rt.result.iterations.length, 1)
  const rt2 = await runMain(scripted({ 'state-reader': [{ action: 'stop', reason: 'x' }] }), { lastKey: key, streak: 1 })
  assert.equal(rt2.result.lastKey, key)
  assert.equal(rt2.result.streak, 1)
})

test('I4: a bar-raiser writer failure yields a constant outcome', async () => {
  const rt = await runMain(scripted({
    'state-reader': [{ action: 'barRaiserRound', reason: 'r' }, { action: 'stop', reason: 'end' }],
    'barraiser-reader': [{ seenKeys: [], seeds: [], dryRounds: 0, rounds: 1 }],
    'bar-finder': c => ({ ideas: c.inputs.lens === 'performance' ? [{ key: 'k1', title: 't', detail: 'd', behaviorChange: false }] : [] }),
    'bar-judge': () => clear(),
    'barraiser-writer': () => null,
  }), { barRaiserRounds: 10 })
  assert.equal(rt.result.iterations[0].outcome, 'bar raiser: writer failed')
})

test('I5: at most five blocking findings are judged per round', async () => {
  let reviews = 0
  const many = Array.from({ length: 7 }, (_, i) => ({ title: `bug ${i}`, detail: 'd', blocking: true }))
  const rt = await runMain(happy({
    reviewer: c => (c.inputs.lens === 'security' && reviews++ === 0 ? { findings: many } : { findings: [] }),
  }, 'implement'))
  assert.equal(rt.roles().filter(r => r === 'finding-refuter').length, 15)
})

test('I5: when the first five blocking findings are all refuted, the rest are judged too', async () => {
  const many = Array.from({ length: 7 }, (_, i) => ({ title: `bug ${i}`, detail: 'd', blocking: true }))
  const rt = await runMain(happy({
    reviewer: c => (c.inputs.lens === 'security' ? { findings: many } : { findings: [] }),
    'finding-refuter': () => ({ refuted: true, evidence: 'not reachable' }),
  }, 'implement'))
  assert.equal(rt.roles().filter(r => r === 'finding-refuter').length, 21)
  assert.equal(rt.roles().filter(r => r === 'implementer').length, 1)
})

test('I5: a blocking finding past the first five still forces a fix round when it holds', async () => {
  let reviews = 0
  const many = Array.from({ length: 7 }, (_, i) => ({ title: `bug ${i}`, detail: 'd', blocking: true }))
  const rt = await runMain(happy({
    reviewer: c => (c.inputs.lens === 'security' && reviews++ === 0 ? { findings: many } : { findings: [] }),
    'finding-refuter': c => (c.inputs.finding.title === 'bug 6' ? clear() : { refuted: true, evidence: 'not reachable' }),
  }, 'implement'))
  const impls = rt.calls.filter(c => c.role === 'implementer')
  assert.equal(impls.length, 2)
  assert.match(impls[1].inputs.evidence[0], /\[review\] bug 6/)
})

test('I5: at most three ambiguities go to decision panels per planner round', async () => {
  let n = 0
  const amb = Array.from({ length: 5 }, (_, i) => ({ question: `q${i}` }))
  const rt = await runMain(happy({
    planner: () => (n++ === 0 ? { ok: true, ambiguities: amb } : { ok: true }),
    'decision-proposer': () => ({ option: 'o', rationale: 'r' }),
    'decision-judge': () => ({ adrId: 'A', choice: 'o' }),
  }))
  assert.equal(rt.roles().filter(r => r === 'decision-judge').length, 3)
})

test('I5: a build loop that would pass the agent cap pauses without escalating', async () => {
  const five = Array.from({ length: 5 }, (_, i) => ({ title: `bug ${i}`, detail: 'd', blocking: true }))
  const rt = await runMain(happy({
    reviewer: c => (c.inputs.lens === 'security' ? { findings: five } : { findings: [] }),
  }, 'implement'), { runAgentCap: 61 })
  assert.equal(rt.roles().includes('escalator'), false)
  assert.match(rt.result.iterations[0].outcome, /S-1 paused: agent cap/)
})

test('I9: a lone regression refutation fails verification', async () => {
  let n = 0
  const rt = await runMain(happy({
    verifier: c => (c.inputs.lens === 'regression' && n++ === 0 ? { refuted: true, evidence: 'lint red' } : clear()),
  }, 'implement'))
  assert.equal(rt.roles().filter(r => r === 'implementer').length, 2)
})
