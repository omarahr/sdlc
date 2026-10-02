import { test } from 'node:test'
import assert from 'node:assert/strict'
import { runMain, scripted, ok } from './harness.mjs'

const reader = () => [{ action: 'bootstrap', reason: 'no config' }, { action: 'stop', reason: 'test end' }]

test('bootstrap runs env, extractor, three critics per round until a dry round, slicer, then commits', async () => {
  const rt = await runMain(scripted({
    'state-reader': reader(),
    'env-detector': [{ gitMode: 'direct', commands: { test: 'npm test' } }],
    'requirements-extractor': [{ added: 8 }],
    // round 0: one critic adds; round 1: all three are dry
    'completeness-critic': [{ added: 2 }, { added: 0 }, { added: 0 }, { added: 0 }, { added: 0 }, { added: 0 }],
    slicer: [{ added: 3 }],
    'state-writer': () => ok(),
  }), { specPath: 'docs/spec.md', gitMode: 'direct' })
  assert.deepEqual(rt.errors, [])
  assert.equal(rt.result.state, 'stopped')
  const critics = rt.calls.filter(c => c.role === 'completeness-critic')
  assert.deepEqual(critics.map(c => [c.inputs.round, c.inputs.lens]), [
    [0, 'statements'], [0, 'structures'], [0, 'cross-cutting'], [1, 'statements'], [1, 'structures'], [1, 'cross-cutting'],
  ])
  assert.equal(rt.calls.find(c => c.role === 'state-writer').inputs.op, 'bootstrap-complete')
  assert.deepEqual(rt.calls.find(c => c.role === 'env-detector').inputs, { specPath: 'docs/spec.md', gitMode: 'direct', commitFormat: null })
  assert.match(rt.result.iterations[0].outcome, /8 extracted.*2 critic rounds.*3 slices/)
})

test('a critic that fails to report keeps the round from counting as dry', async () => {
  const rt = await runMain(scripted({
    'state-reader': reader(),
    'env-detector': [{ gitMode: 'direct', commands: {} }],
    'requirements-extractor': [{ added: 1 }],
    // one critic of round 0 never reports (both attempts); everything else is dry
    'completeness-critic': c => (c.inputs.round === 0 && c.inputs.lens === 'statements' ? null : { added: 0 }),
    slicer: [{ added: 1 }],
    'state-writer': () => ok(),
  }))
  assert.deepEqual(rt.calls.filter(c => c.role === 'completeness-critic').map(c => c.inputs.round).sort(), [0, 0, 0, 0, 1, 1, 1])
})

test('bootstrap passes mr mode and the commit format to the env-detector, whose schema allows mr', async () => {
  const rt = await runMain(scripted({
    'state-reader': reader(),
    'env-detector': [{ gitMode: 'mr', commands: {} }],
    'requirements-extractor': [{ added: 1 }],
    'completeness-critic': () => ({ added: 0 }),
    slicer: [{ added: 1 }],
    'state-writer': () => ok(),
  }), { specPath: 'docs/spec.md', gitMode: 'mr', commitFormat: '{type}: [PROJ-123] {subject}' })
  const env = rt.calls.find(c => c.role === 'env-detector')
  assert.deepEqual(env.inputs, { specPath: 'docs/spec.md', gitMode: 'mr', commitFormat: '{type}: [PROJ-123] {subject}' })
  assert.deepEqual(env.opts.schema.properties.gitMode.enum, ['pr', 'direct', 'mr'])
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
  assert.equal(rt.roles().filter(r => r === 'completeness-critic').length, 9)
  assert.ok(rt.logs.some(l => /3-round limit/.test(l)))
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
