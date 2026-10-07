import { test } from 'node:test'
import assert from 'node:assert/strict'
import { runMain, scripted, scriptSource, loadInternals } from './harness.mjs'

test('stop action ends the run as stopped', async () => {
  const rt = await runMain(scripted({ 'state-reader': [{ action: 'stop', reason: 'STOP file present' }] }))
  assert.equal(rt.result.state, 'stopped')
  assert.deepEqual(rt.roles(), ['state-reader'])
  assert.deepEqual(rt.errors, [])
})

test('done returns the summary', async () => {
  const rt = await runMain(scripted({ 'state-reader': [{ action: 'done', reason: 'all done', summary: '12/12 requirements' }] }))
  assert.equal(rt.result.state, 'done')
  assert.equal(rt.result.reason, '12/12 requirements')
})

test('wait returns waiting', async () => {
  const rt = await runMain(scripted({ 'state-reader': [{ action: 'wait', reason: 'only awaiting-merge PRs' }] }))
  assert.equal(rt.result.state, 'waiting')
})

test('state reader failing twice in a run that did nothing returns stalled after exactly one retry', async () => {
  const rt = await runMain(scripted({ 'state-reader': () => null }))
  assert.equal(rt.result.state, 'stalled')
  assert.match(rt.result.reason, /state reader failed/)
  assert.equal(rt.calls.length, 2)
})

test('maxIterations 0 starts no agents', async () => {
  const rt = await runMain(scripted({}), { maxIterations: 0 })
  assert.equal(rt.result.state, 'continue')
  assert.equal(rt.calls.length, 0)
})

test('agent cap stops before an iteration that does not fit', async () => {
  const rt = await runMain(scripted({ 'state-reader': [{ action: 'slice', sliceId: 'S-1', reason: 'next' }] }), { runAgentCap: 10 })
  assert.equal(rt.result.state, 'stalled')
  assert.match(rt.result.reason, /agent cap/)
  assert.deepEqual(rt.roles(), ['state-reader'])
})

test('low remaining budget stops before the next iteration', async () => {
  const rt = await runMain(scripted({ 'state-reader': [{ action: 'slice', sliceId: 'S-1', reason: 'next' }] }), {}, 10000)
  assert.equal(rt.result.state, 'stalled')
  assert.match(rt.result.reason, /agent cap|budget/)
})

// ---------- per-milestone agent cap ----------
// The cap is an allowance per milestone: it holds inside one milestone and comes back whole when a new one
// begins. The run's own agent total never resets. One campaign over CAMPAIGN_AREAS areas costs
// CAMPAIGN_AREAS + 6 agents (planner, three coverage critics, harness, one runner per area, writer), plus the
// state-reader that asks for it. The milestone action is costed at 90 by the headroom check, so a cap below 91
// never lets a campaign start at all.
const CAMPAIGN_AREAS = 40 // 47 agents a campaign, which is what makes a 100-agent cap bite
function milestoneNext(id, status = 'pending') {
  return { action: 'milestone', milestoneId: id, milestone: { id, status }, reason: 'every slice is finished' }
}
function campaignScript(milestones, overrides = {}) {
  return scripted({
    'state-reader': [...milestones, { action: 'stop', reason: 'test end' }],
    'scenario-planner': () => ({ ok: true, areas: Array.from({ length: CAMPAIGN_AREAS }, (_, i) => ({ id: `a${i}`, scenarioIds: [`SC-${i}`] })) }),
    'coverage-critic': () => ({ refuted: false, evidence: 'checked, holds' }),
    'e2e-harness': () => ({ ok: true, channels: ['api'] }),
    'scenario-runner': c => ({ results: c.inputs.scenarioIds.map(scenarioId => ({ scenarioId, status: 'pass', evidence: 'as expected' })) }),
    'milestone-writer': c => ({ ok: true, status: c.inputs.outcome, attempt: 1, fixSlices: [] }),
    ...overrides,
  })
}

test('the agent cap holds inside one milestone: a fixing round of the same milestone gets no headroom', async () => {
  const rt = await runMain(campaignScript([milestoneNext('M-1'), milestoneNext('M-1', 'fixing')]), { runAgentCap: 100 })
  assert.equal(rt.result.state, 'continue')
  // only the first campaign ran: the second round of the same milestone is over the cap
  assert.equal(rt.calls.filter(c => c.role === 'milestone-writer').length, 1)
  assert.match(rt.result.reason, /47\/100 agents spent since milestone M-1 began \(48 in this run\)/)
})

test('crossing a milestone boundary restores the cap: the next milestone gets a whole allowance', async () => {
  const rt = await runMain(campaignScript([milestoneNext('M-1'), milestoneNext('M-2')]), { runAgentCap: 100 })
  assert.deepEqual(rt.errors, [])
  assert.equal(rt.result.state, 'stopped')
  const writers = rt.calls.filter(c => c.role === 'milestone-writer')
  assert.deepEqual(writers.map(c => c.inputs.milestoneId), ['M-1', 'M-2'])
})

test('the run total is not reset at a milestone boundary, and the pause message says which number it means', async () => {
  // M-1's campaign puts 48 agents on the milestone clock; M-2's boundary resets that clock, its own campaign
  // puts 47 back on it, and 47 + a slice's 60 is over the cap while the run total is nowhere near it
  const rt = await runMain(campaignScript([milestoneNext('M-1'), milestoneNext('M-2'), { action: 'slice', sliceId: 'S-9', reason: 'next' }]), { runAgentCap: 100 })
  assert.equal(rt.result.state, 'continue')
  assert.match(rt.result.reason, /47\/100 agents spent since milestone M-2 began \(95 in this run\), slice needs ~60/)
  // the run's own total is the whole run, boundary or not
  assert.equal(rt.result.agentsSpent, 95)
  assert.equal(rt.result.agentsSpent, rt.calls.length)
})

test('the money brake still stops a run whose milestone allowance was just made whole', async () => {
  // the budget runs out only once M-2's boundary has just reset the cap, so the run stops with 100 of its
  // 100 agents unspent: the money brake is run-wide and the reset does not, and must not, clear it
  let left = Infinity
  const rt = await runMain(campaignScript([milestoneNext('M-1'), milestoneNext('M-2')], {
    'state-reader': c => (c.inputs.iteration === 1 ? (left = 10000, milestoneNext('M-2')) : milestoneNext('M-1')),
  }), { runAgentCap: 100 }, () => left)
  assert.equal(rt.result.state, 'continue')
  assert.match(rt.result.reason, /0\/100 agents spent since milestone M-2 began \(48 in this run\)/)
  assert.equal(rt.calls.filter(c => c.role === 'milestone-writer').length, 1)
})

test('unknown action in a run that did nothing returns stalled', async () => {
  const rt = await runMain(scripted({ 'state-reader': [{ action: 'bogus', reason: 'x' }] }))
  assert.equal(rt.result.state, 'stalled')
  assert.match(rt.result.reason, /unknown action: bogus/)
})

test('a run that completed an action before the state reader failed returns continue', async () => {
  const rt = await runMain(scripted({
    'state-reader': [{ action: 'milestonePlan', reason: 'no milestones yet' }],
    'milestone-planner': [{ added: 2 }],
  }), { stalledRuns: 5 })
  assert.equal(rt.result.state, 'continue')
  assert.match(rt.result.reason, /state reader failed/)
  assert.equal(rt.result.iterations.length, 1)
  assert.equal(rt.result.stalledRuns, 0)
})

test('each stalled run adds one to stalledRuns, carried through args', async () => {
  const rt = await runMain(scripted({ 'state-reader': () => null }))
  assert.equal(rt.result.stalledRuns, 1)
  const rt2 = await runMain(scripted({ 'state-reader': () => null }), { stalledRuns: 7 })
  assert.equal(rt2.result.state, 'stalled')
  assert.equal(rt2.result.stalledRuns, 8)
})

test('the 24th stalled run in a row returns stuck', async () => {
  const rt = await runMain(scripted({ 'state-reader': () => null }), { stalledRuns: 23 })
  assert.equal(rt.result.state, 'stuck')
  assert.equal(rt.result.stalledRuns, 24)
  assert.match(rt.result.reason, /state reader failed/)
})

test('a repeated outcome that stalls counts toward stuck, and does not reset stalledRuns', async () => {
  const key = 'audit||audit aborted: audit-planner failed'
  const responder = () => scripted({
    'state-reader': () => ({ action: 'audit', reason: 'pending' }),
    'audit-planner': () => null,
  })
  const rt = await runMain(responder(), { lastKey: key, streak: 3, stalledRuns: 4 })
  assert.equal(rt.result.state, 'stalled')
  assert.equal(rt.result.stalledRuns, 5)
  assert.equal(rt.result.iterations.length, 1)
  const rt2 = await runMain(responder(), { lastKey: key, streak: 25, stalledRuns: 23 })
  assert.equal(rt2.result.state, 'stuck')
})

test('stop, done and wait leave stalledRuns as it came in', async () => {
  const rt = await runMain(scripted({ 'state-reader': [{ action: 'wait', reason: 'PRs' }] }), { stalledRuns: 3 })
  assert.equal(rt.result.state, 'waiting')
  assert.equal(rt.result.stalledRuns, 3)
})

test('an error from the state reader ends a run that did nothing as stalled, with the reason', async () => {
  const rt = await runMain(scripted({ 'state-reader': [{ action: 'error', reason: 'slices.json is not valid JSON' }] }))
  assert.equal(rt.result.state, 'stalled')
  assert.match(rt.result.reason, /state error: slices\.json is not valid JSON/)
  assert.deepEqual(rt.roles(), ['state-reader'])
})

test('the state reader is given the decision script path', async () => {
  const rt = await runMain(scripted({ 'state-reader': [{ action: 'stop', reason: 'x' }] }), { skillDir: '/S' })
  assert.equal(rt.calls[0].inputs.script, '/S/next-action.py')
  assert.ok(rt.calls[0].opts.schema.properties.action.enum.includes('error'))
})

test('prompt names the common and role prompt files and embeds inputs', async () => {
  const rt = await runMain(
    scripted({ 'state-reader': [{ action: 'stop', reason: 'x' }] }),
    { skillDir: '/S', repoRoot: '/R', specPath: 'docs/spec.md' })
  const p = rt.calls[0].prompt
  assert.match(p, /\/S\/prompts\/_common\.md/)
  assert.match(p, /\/S\/prompts\/state-reader\.md/)
  assert.match(p, /Target repo: \/R/)
  assert.equal(rt.calls[0].inputs.specPath, 'docs/spec.md')
  assert.equal(rt.calls[0].opts.effort, 'low')
})

test('run() counts every attempt and returns null after two failures', async () => {
  const rt = await loadInternals(scripted({ x: () => null }))
  const out = await rt.I.run('x', {}, {})
  assert.equal(out, null)
  assert.equal(rt.I.spent(), 2)
})

test('every phase title used in the script is declared in meta.phases', async () => {
  const rt = await loadInternals()
  const declared = new Set(rt.meta.phases.map(p => p.title))
  const src = scriptSource()
  const used = [
    ...[...src.matchAll(/phase\('([^']+)'\)/g)].map(m => m[1]),
    ...[...src.matchAll(/phase: '([A-Z][^']*)'/g)].map(m => m[1]), // capitalized = progress phase; lowercase = slice phase
    ...[...src.matchAll(/const P = '([^']+)'/g)].map(m => m[1]),
  ]
  assert.deepEqual(used.filter(t => !declared.has(t)), [])
})

test('the Gate phase is declared after the verify group and before Integrate', async () => {
  const rt = await loadInternals()
  const titles = rt.meta.phases.map(p => p.title)
  const gate = titles.indexOf('Gate')
  assert.ok(gate >= 0, 'Gate is missing from meta.phases')
  const verify = titles.indexOf('Verify')
  const implement = titles.indexOf('Implement')
  const integrate = titles.indexOf('Integrate')
  assert.ok(gate > verify && gate > implement, 'Gate must follow the Implement/Verify group')
  assert.ok(gate < integrate, 'Gate must precede Integrate')
})
