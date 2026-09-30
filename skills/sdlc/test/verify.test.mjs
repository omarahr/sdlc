import { test } from 'node:test'
import assert from 'node:assert/strict'
import { runMain, loadInternals, scripted, ok, clear } from './harness.mjs'
import { happy } from './slice.test.mjs'

const plan = (profiles, tools = []) => () => ({ scenarios: [{ id: 'VS-1', title: 't', requirementIds: ['R-1'], profiles }], tools })

test('the profile group gets its scenarios, branch and unavailable tools; the toolsmith runs only for missing tools', async () => {
  const rt = await loadInternals(scripted({
    'verify-planner': plan(['ui', 'i18n'], [{ id: 'ui-harness', profile: 'ui', purpose: 'playwright', exists: false }, { id: 'stub-server', profile: 'http-api', purpose: 'x', exists: true }]),
    'verify-toolsmith': () => ({ ok: true, built: [], failed: [{ id: 'ui-harness', reason: 'chromium failed to launch' }] }),
    verifier: () => clear(),
    'verify-ui': () => ({ refuted: true, evidence: 'blocked', blocked: [{ scenarioId: 'VS-1', reason: 'ui-harness unavailable' }] }),
    'verify-i18n': () => clear(),
    'verify-collector': () => ok(),
  }))
  const { votes, lenses } = await rt.I.verifyPhase('S-1', 2)
  assert.deepEqual(lenses, ['spec-fidelity', 'profiles', 'regression'])
  assert.deepEqual(rt.calls.find(c => c.role === 'verify-toolsmith').inputs.tools.map(t => t.id), ['ui-harness'])
  const ui = rt.calls.find(c => c.role === 'verify-ui').inputs
  assert.deepEqual(ui, { sliceId: 'S-1', round: 2, part: 0, scenarioIds: ['VS-1'], branch: 'sdlc/S-1-v2-ui-0', unavailableTools: [{ id: 'ui-harness', reason: 'chromium failed to launch' }] })
  assert.deepEqual(rt.calls.find(c => c.role === 'verify-collector').inputs.branches, ['sdlc/S-1-v2-ui-0', 'sdlc/S-1-v2-i18n-0'])
  assert.equal(votes[1].refuted, true)
  assert.equal(rt.I.tallyVerify(votes, lenses).pass, false)
})

test('no missing tools means no toolsmith, and a clean group passes', async () => {
  const rt = await loadInternals(scripted({
    'verify-planner': plan(['contract']),
    verifier: () => clear(),
    'verify-contract': () => clear(),
    'verify-collector': () => ok(),
  }))
  const { votes, lenses } = await rt.I.verifyPhase('S-1', 0)
  assert.equal(rt.roles().includes('verify-toolsmith'), false)
  assert.equal(rt.I.tallyVerify(votes, lenses).pass, true)
})

test('a collector that cannot fold the profile branches refutes the round', async () => {
  const rt = await loadInternals(scripted({
    'verify-planner': plan(['http-api']),
    verifier: () => clear(),
    'verify-http-api': () => clear(),
    'verify-collector': () => ({ ok: false, notes: 'conflict in go.sum' }),
  }))
  const { votes } = await rt.I.verifyPhase('S-1', 0)
  assert.equal(votes[1].refuted, true)
  assert.match(votes[1].evidence, /conflict in go\.sum/)
})

test('a planner that fails to report refutes the profiles vote without running any profile agent', async () => {
  const rt = await loadInternals(scripted({ 'verify-planner': () => null, verifier: () => clear() }))
  const { votes, lenses } = await rt.I.verifyPhase('S-1', 0)
  assert.equal(rt.roles().some(r => r.startsWith('verify-') && r !== 'verify-planner'), false)
  assert.equal(votes[1].refuted, true)
  // with spec-fidelity and regression clear, a lone evidence-only refutation does not fail the round by itself
  assert.equal(rt.I.tallyVerify(votes, lenses).refutations, 1)
})

test('a later round passes the round number through and profile seeds reach the integrator', async () => {
  let n = 0
  const rt = await runMain(happy({
    'verify-http-api': c => (n++ === 0 ? { refuted: true, evidence: 'x', failingTest: 'a — b — R-1' } : { ...clear(), seeds: [{ title: 'faster replay', detail: 'd' }] }),
  }, 'implement'))
  assert.deepEqual(rt.calls.filter(c => c.role === 'verify-planner').map(c => c.inputs.round), [0, 1])
  assert.deepEqual(rt.calls.filter(c => c.role === 'verify-http-api').map(c => c.inputs.branch), ['sdlc/S-1-v0-http-api-0', 'sdlc/S-1-v1-http-api-0'])
  assert.ok(rt.calls.find(c => c.role === 'integrator').inputs.seeds.some(s => s.title === 'faster replay'))
})

test('every profile has a prompt file that reads the shared profile rules', async () => {
  const { readFileSync, existsSync } = await import('node:fs')
  const { join } = await import('node:path')
  const { SKILL_DIR } = await import('./harness.mjs')
  const { I } = await loadInternals()
  for (const p of I.PROFILES) {
    const f = join(SKILL_DIR, 'prompts', `verify-${p}.md`)
    assert.ok(existsSync(f), `verify-${p}.md missing`)
    assert.match(readFileSync(f, 'utf8'), /verify-profile-common\.md/)
  }
  for (const r of ['verify-planner', 'verify-toolsmith', 'verify-collector', 'test-reporter', 'verify-profile-common']) {
    assert.ok(existsSync(join(SKILL_DIR, 'prompts', `${r}.md`)), `${r}.md missing`)
  }
})
