import { test } from 'node:test'
import assert from 'node:assert/strict'
import { runMain, scripted, ok } from './harness.mjs'

const reader = () => [{ action: 'bootstrap', reason: 'no config' }, { action: 'stop', reason: 'test end' }]

test('bootstrap runs env, extractor, critic until two dry rounds, slicer, then commits', async () => {
  const rt = await runMain(scripted({
    'state-reader': reader(),
    'env-detector': [{ gitMode: 'direct', commands: { test: 'npm test' } }],
    'requirements-extractor': [{ added: 8 }],
    'completeness-critic': [{ added: 2 }, { added: 0 }, { added: 1 }, { added: 0 }, { added: 0 }],
    slicer: [{ added: 3 }],
    'state-writer': () => ok(),
  }), { specPath: 'docs/spec.md', gitMode: 'direct' })
  assert.deepEqual(rt.errors, [])
  assert.equal(rt.result.state, 'stopped')
  assert.equal(rt.roles().filter(r => r === 'completeness-critic').length, 5)
  assert.equal(rt.calls.find(c => c.role === 'state-writer').inputs.op, 'bootstrap-complete')
  assert.deepEqual(rt.calls.find(c => c.role === 'env-detector').inputs, { specPath: 'docs/spec.md', gitMode: 'direct' })
  assert.match(rt.result.iterations[0].outcome, /8 extracted.*5 critic rounds.*3 slices/)
})

test('critic that never goes dry is capped and the cap is logged', async () => {
  const rt = await runMain(scripted({
    'state-reader': reader(),
    'env-detector': [{ gitMode: 'direct', commands: {} }],
    'requirements-extractor': [{ added: 1 }],
    'completeness-critic': () => ({ added: 1 }),
    slicer: [{ added: 1 }],
    'state-writer': () => ok(),
  }))
  assert.equal(rt.roles().filter(r => r === 'completeness-critic').length, 8)
  assert.ok(rt.logs.some(l => /8-round limit/.test(l)))
})

test('bootstrap aborts without committing when the extractor fails', async () => {
  const rt = await runMain(scripted({
    'state-reader': reader(),
    'env-detector': [{ gitMode: 'direct', commands: {} }],
    'requirements-extractor': () => null,
  }))
  assert.equal(rt.roles().includes('state-writer'), false)
  assert.match(rt.result.iterations[0].outcome, /aborted: requirements-extractor/)
})
