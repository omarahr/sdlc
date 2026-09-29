import { test } from 'node:test'
import assert from 'node:assert/strict'
import { runMain, scripted, ok, clear } from './harness.mjs'

const BR_ON = { barRaiserRounds: 10 }
const reader = () => [{ action: 'barRaiserRound', reason: 'dryRounds 0' }, { action: 'stop', reason: 'end' }]
const idea = (key, extra = {}) => ({ key, title: key, detail: 'd', behaviorChange: false, ...extra })

test('seven lens finders, dedupe against seen, judge fresh ideas, write verdicts', async () => {
  const rt = await runMain(scripted({
    'state-reader': reader(),
    'barraiser-reader': [{ seenKeys: ['perf-old'], seeds: [{ title: 'Seed Idea', detail: 's' }], dryRounds: 0 }],
    'bar-finder': c => ({ ideas: c.inputs.lens === 'performance' ? [idea('perf-old'), idea('perf-new')] : [] }),
    'bar-judge': c => (c.inputs.idea.key === 'perf-new' ? clear() : { refuted: true, evidence: 'not worth it' }),
    'barraiser-writer': () => ok(),
  }), BR_ON)
  assert.equal(rt.roles().filter(r => r === 'bar-finder').length, 7)
  assert.deepEqual(rt.calls.find(c => c.role === 'bar-finder').inputs.seenKeys, ['perf-old'])
  const w = rt.calls.find(c => c.role === 'barraiser-writer').inputs
  assert.deepEqual(w.verdicts.map(v => [v.idea.key, v.verdict]).sort(), [['perf-new', 'accepted'], ['seed-idea', 'rejected']])
  assert.equal(w.dry, false)
  assert.deepEqual(w.deferred, [])
})

test('behavior-changing ideas become proposals without judging', async () => {
  const rt = await runMain(scripted({
    'state-reader': reader(),
    'barraiser-reader': [{ seenKeys: [], seeds: [], dryRounds: 1 }],
    'bar-finder': c => ({ ideas: c.inputs.lens === 'code-health-dx' ? [idea('new-export-format', { behaviorChange: true })] : [] }),
    'barraiser-writer': () => ok(),
  }), BR_ON)
  assert.equal(rt.roles().includes('bar-judge'), false)
  const w = rt.calls.find(c => c.role === 'barraiser-writer').inputs
  assert.equal(w.verdicts[0].verdict, 'proposal')
  assert.equal(w.dry, true)
})

test('overflow is deferred and the round is not dry', async () => {
  const many = Array.from({ length: 25 }, (_, i) => idea(`perf-${i}`))
  const rt = await runMain(scripted({
    'state-reader': reader(),
    'barraiser-reader': [{ seenKeys: [], seeds: [], dryRounds: 1 }],
    'bar-finder': c => ({ ideas: c.inputs.lens === 'performance' ? many : [] }),
    'bar-judge': () => ({ refuted: true, evidence: 'no' }),
    'barraiser-writer': () => ok(),
  }), BR_ON)
  const w = rt.calls.find(c => c.role === 'barraiser-writer').inputs
  assert.equal(w.verdicts.length, 20)
  assert.equal(w.deferred.length, 5)
  assert.equal(w.dry, false)
  assert.ok(rt.logs.some(l => /judging 20 of 25/.test(l)))
})

test('empty round is dry', async () => {
  const rt = await runMain(scripted({
    'state-reader': reader(),
    'barraiser-reader': [{ seenKeys: [], seeds: [], dryRounds: 1 }],
    'bar-finder': () => ({ ideas: [] }),
    'barraiser-writer': () => ok(),
  }), BR_ON)
  assert.equal(rt.calls.find(c => c.role === 'barraiser-writer').inputs.dry, true)
})

test('a backlog that fills a judging batch is drained before any finder runs', async () => {
  const backlog = Array.from({ length: 25 }, (_, i) => ({ title: `seed ${i}`, detail: 'd' }))
  const rt = await runMain(scripted({
    'state-reader': reader(),
    'barraiser-reader': [{ seenKeys: [], seeds: backlog, dryRounds: 0, rounds: 4 }],
    'bar-judge': () => ({ refuted: true, evidence: 'no' }),
    'barraiser-writer': () => ok(),
  }), BR_ON)
  assert.equal(rt.roles().includes('bar-finder'), false)
  const w = rt.calls.find(c => c.role === 'barraiser-writer').inputs
  assert.equal(w.verdicts.length, 20)
  assert.equal(w.deferred.length, 5)
  assert.equal(w.dry, false)
})

test('judges receive the round number so they can raise the bar', async () => {
  const rt = await runMain(scripted({
    'state-reader': reader(),
    'barraiser-reader': [{ seenKeys: [], seeds: [], dryRounds: 0, rounds: 4 }],
    'bar-finder': c => ({ ideas: c.inputs.lens === 'performance' ? [idea('perf-x')] : [] }),
    'bar-judge': () => clear(),
    'barraiser-writer': () => ok(),
  }), BR_ON)
  assert.equal(rt.calls.find(c => c.role === 'bar-judge').inputs.round, 5)
})

test('bar raiser is off by default: a barRaiserRound action ends the run as done without running it', async () => {
  const rt = await runMain(scripted({ 'state-reader': [{ action: 'barRaiserRound', reason: 'spec complete' }] }))
  assert.equal(rt.result.state, 'done')
  assert.match(rt.result.reason, /bar raiser off/)
  assert.deepEqual(rt.roles(), ['state-reader'])
})

test('the state reader is told the bar-raiser round budget', async () => {
  const rt = await runMain(scripted({ 'state-reader': [{ action: 'stop', reason: 'x' }] }), { barRaiserRounds: 3 })
  assert.equal(rt.calls[0].inputs.barRaiserRounds, 3)
  const off = await runMain(scripted({ 'state-reader': [{ action: 'stop', reason: 'x' }] }))
  assert.equal(off.calls[0].inputs.barRaiserRounds, 0)
})
