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
