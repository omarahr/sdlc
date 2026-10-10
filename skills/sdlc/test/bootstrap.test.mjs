import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { runMain, scripted, ok, loadInternals, SKILL_DIR } from './harness.mjs'

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
  assert.deepEqual(rt.calls.find(c => c.role === 'env-detector').inputs, { specPath: 'docs/spec.md', gitMode: 'direct', commitFormat: null, defaultBranch: '', branchFormat: null })
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
  assert.deepEqual(env.inputs, { specPath: 'docs/spec.md', gitMode: 'mr', commitFormat: '{type}: [PROJ-123] {subject}', defaultBranch: '', branchFormat: null })
  assert.deepEqual(env.opts.schema.properties.gitMode.enum, ['pr', 'direct', 'mr', 'stack'])
})

test('the env-detector vars carry the driver-resolved defaultBranch, empty when the driver had none', async () => {
  // in the run worktree the current branch is sdlc/run-<n>, so the input — not the worktree's branch —
  // is what keeps the direct-mode push target from being corrupted
  const rt = await runMain(scripted({
    'state-reader': reader(),
    'env-detector': [{ gitMode: 'direct', commands: {} }],
    'requirements-extractor': [{ added: 1 }],
    'completeness-critic': () => ({ added: 0 }),
    slicer: [{ added: 1 }],
    'state-writer': () => ok(),
  }), { specPath: 'docs/spec.md', gitMode: 'direct', defaultBranch: 'trunk' })
  assert.equal(rt.calls.find(c => c.role === 'env-detector').inputs.defaultBranch, 'trunk')
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

// each doc states the mode list in its own shape; [name, path, pattern, extractor] reads that list
// back out so it can be compared with the script's enum rather than merely searched for.
// The patterns must stay unambiguous: a doc states its list exactly once, and a second mention is
// itself the failure — otherwise an earlier decoy shadows the authoritative line and the guard
// reports green while checking prose. Assert the single occurrence rather than taking the first.
const MODE_DOCS = [
  ['SKILL.md', 'SKILL.md', /--git ([a-z|]+)\]/g, s => s.split('|').map(m => m.trim())],
  ['state-schema.md', 'prompts/state-schema.md', /`gitMode` is ([^\n]+)/g, s => [...s.matchAll(/`([a-z]+)`/g)].map(m => m[1])],
  ['env-detector.md', 'prompts/env-detector.md', /`gitMode` \(([^)]*)\)/g, s => [...s.matchAll(/`([a-z]+)`/g)].map(m => m[1])],
]

test('the documented git modes and the workflow script agree', async () => {
  const { I } = await loadInternals()
  assert.deepEqual(I.GIT_MODES, ['pr', 'direct', 'mr', 'stack'])
  for (const [name, path, pattern, extract] of MODE_DOCS) {
    const text = readFileSync(join(SKILL_DIR, path), 'utf8')
    const hits = [...text.matchAll(pattern)]
    assert.equal(hits.length, 1, `${name} states its git mode list ${hits.length} times; it must be stated exactly once, unambiguously`)
    const documented = [...extract(hits[0][1])].sort()
    assert.deepEqual(documented, [...I.GIT_MODES].sort(), `${name} documents modes the script does not allow, or omits modes it does`)
  }
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

test('T-R-052a the env-detector carries args.branchFormat when set', async () => {
  const rt = await runMain(scripted({
    'state-reader': reader(),
    'env-detector': [{ gitMode: 'direct', commands: {} }],
    'requirements-extractor': [{ added: 1 }],
    'completeness-critic': () => ({ added: 0 }),
    slicer: [{ added: 1 }],
    'state-writer': () => ok(),
  }), { specPath: 'docs/spec.md', gitMode: 'direct', branchFormat: 'feature/PROJ-1-{name}' })
  assert.equal(rt.calls.find(c => c.role === 'env-detector').inputs.branchFormat, 'feature/PROJ-1-{name}')
})
