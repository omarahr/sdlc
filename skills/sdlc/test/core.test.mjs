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

test('state reader failing twice returns continue after exactly one retry', async () => {
  const rt = await runMain(scripted({ 'state-reader': () => null }))
  assert.equal(rt.result.state, 'continue')
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
  assert.equal(rt.result.state, 'continue')
  assert.match(rt.result.reason, /agent cap/)
  assert.deepEqual(rt.roles(), ['state-reader'])
})

test('low remaining budget stops before the next iteration', async () => {
  const rt = await runMain(scripted({ 'state-reader': [{ action: 'slice', sliceId: 'S-1', reason: 'next' }] }), {}, 10000)
  assert.equal(rt.result.state, 'continue')
  assert.match(rt.result.reason, /agent cap|budget/)
})

test('unknown action returns continue', async () => {
  const rt = await runMain(scripted({ 'state-reader': [{ action: 'bogus', reason: 'x' }] }))
  assert.equal(rt.result.state, 'continue')
  assert.match(rt.result.reason, /unknown action: bogus/)
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
