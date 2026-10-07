import { test } from 'node:test'
import assert from 'node:assert/strict'
import { runMain, loadInternals, scripted, ok, clear } from './harness.mjs'
import { happy } from './slice.test.mjs'

const plan = (profiles, tools = [], risk = 'high') => () => ({ scenarios: [{ id: 'VS-1', title: 't', requirementIds: ['R-1'], profiles }], tools, risk })

test('the profile group gets its scenarios, branch and unavailable tools; the toolsmith runs only for missing tools', async () => {
  const rt = await loadInternals(scripted({
    'verify-planner': plan(['ui', 'i18n'], [{ id: 'ui-harness', profile: 'ui', purpose: 'playwright', exists: false }, { id: 'stub-server', profile: 'http-api', purpose: 'x', exists: true }]),
    'verify-toolsmith': () => ({ ok: true, built: [], failed: [{ id: 'ui-harness', reason: 'chromium failed to launch' }] }),
    verifier: () => clear(),
    'verify-ui': () => ({ refuted: false, evidence: 'blocked', blocked: [{ scenarioId: 'VS-1', reason: 'ui-harness unavailable' }] }),
    'verify-i18n': () => clear(),
    'verify-collector': () => ok(),
  }))
  const { votes, lenses } = await rt.I.verifyPhase('S-1', 2)
  assert.deepEqual(lenses, ['spec-fidelity', 'profiles', 'regression'])
  assert.deepEqual(rt.calls.find(c => c.role === 'verify-toolsmith').inputs.tools.map(t => t.id), ['ui-harness'])
  const ui = rt.calls.find(c => c.role === 'verify-ui').inputs
  assert.deepEqual(ui, { sliceId: 'S-1', round: 2, planRound: 2, part: 0, scenarioIds: ['VS-1'], branch: 'sdlc/S-1-v2-ui-0', unavailableTools: [{ id: 'ui-harness', reason: 'chromium failed to launch' }] })
  assert.deepEqual(rt.calls.find(c => c.role === 'verify-collector').inputs.branches, ['sdlc/S-1-v2-ui-0', 'sdlc/S-1-v2-i18n-0'])
  // a blocked scenario proves nothing about the slice: it is infra, retried outside the fix-round economy
  assert.equal(votes[1].outcome, 'infra')
  assert.equal(votes[1].refuted, false)
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
  // nothing was verified at its boundary, so the round fails even with spec-fidelity and regression clear
  assert.equal(rt.I.tallyVerify(votes, lenses).refutations, 1)
  assert.equal(rt.I.tallyVerify(votes, lenses).pass, false)
})

test('a fix round reuses the round-0 plan and re-runs only the failed (scenario, profile) pairs', async () => {
  let n = 0
  const rt = await runMain(happy({
    'verify-planner': () => ({
      scenarios: [
        { id: 'VS-1', title: 'a', requirementIds: ['R-1'], profiles: ['http-api', 'security'] },
        { id: 'VS-2', title: 'b', requirementIds: ['R-1'], profiles: ['http-api'] },
      ],
      tools: [],
      risk: 'high',
    }),
    'verify-http-api': () => (n++ === 0
      ? { refuted: true, evidence: 'x', failingTest: 'a — b — R-1', failedScenarios: ['VS-2'] }
      : { ...clear(), seeds: [{ title: 'faster replay', detail: 'd' }] }),
  }, 'implement'))
  assert.deepEqual(rt.calls.filter(c => c.role === 'verify-planner').map(c => c.inputs.round), [0])
  const http = rt.calls.filter(c => c.role === 'verify-http-api').map(c => c.inputs)
  assert.deepEqual(http.map(i => [i.round, i.planRound, i.scenarioIds, i.branch]), [
    [0, 0, ['VS-1', 'VS-2'], 'sdlc/S-1-v0-http-api-0'],
    [1, 0, ['VS-2'], 'sdlc/S-1-v1-http-api-0'],
  ])
  // security held in round 0, so it does not run again
  assert.equal(rt.calls.filter(c => c.role === 'verify-security').length, 1)
  assert.deepEqual(rt.calls.filter(c => c.role === 'verifier').map(c => c.inputs.round), [0, 0, 1, 1])
  assert.ok(rt.calls.find(c => c.role === 'integrator').inputs.seeds.some(s => s.title === 'faster replay'))
})

test('a fix round after a review finding runs no profile agent when every scenario held', async () => {
  let reviews = 0
  const rt = await runMain(happy({
    reviewer: c => (c.inputs.lens === 'security' && reviews++ === 0 ? { findings: [{ title: 'bug', detail: 'd', blocking: true }] } : { findings: [] }),
  }, 'implement'))
  assert.equal(rt.calls.filter(c => c.role === 'verify-http-api').length, 1)
  assert.equal(rt.calls.filter(c => c.role === 'verify-collector').length, 1)
  assert.equal(rt.calls.filter(c => c.role === 'verifier').length, 4)
})

test('a blocked tool is rebuilt in the fix round and its scenario re-run', async () => {
  let t = 0
  const rt = await loadInternals(scripted({
    'verify-planner': plan(['ui'], [{ id: 'ui-harness', profile: 'ui', purpose: 'p', exists: false }]),
    'verify-toolsmith': () => (t++ === 0 ? { ok: false, failed: [{ id: 'ui-harness', reason: 'no chromium' }] } : { ok: true, built: ['ui-harness'] }),
    verifier: () => clear(),
    'verify-ui': c => (c.inputs.round === 0 ? { refuted: true, evidence: 'b', blocked: [{ scenarioId: 'VS-1', reason: 'ui-harness unavailable' }] } : clear()),
    'verify-collector': () => ok(),
  }))
  const r0 = await rt.I.verifyPhase('S-1', 0)
  assert.deepEqual(r0.next.pending, [{ profile: 'ui', scenarioId: 'VS-1' }])
  const r1 = await rt.I.verifyPhase('S-1', 1, r0.next)
  assert.deepEqual(rt.calls.filter(c => c.role === 'verify-toolsmith').map(c => c.inputs.tools.map(x => x.id)), [['ui-harness'], ['ui-harness']])
  assert.equal(rt.I.tallyVerify(r1.votes, r1.lenses).pass, true)
  assert.deepEqual(r1.next.pending, [])
})

test('the planner\'s risk rating caps the profile group', async () => {
  const rt = await loadInternals(scripted({
    'verify-planner': () => ({
      scenarios: [
        { id: 'VS-1', title: 'a', requirementIds: ['R-1'], profiles: ['contract', 'i18n', 'security'] },
        { id: 'VS-2', title: 'b', requirementIds: ['R-2'], profiles: ['contract', 'i18n'] },
      ],
      tools: [],
      risk: 'low',
    }),
    verifier: () => clear(),
    'verify-contract': () => clear(),
    'verify-i18n': () => clear(),
    'verify-collector': () => ok(),
  }))
  await rt.I.verifyPhase('S-1', 0)
  assert.deepEqual(rt.roles().filter(r => r.startsWith('verify-') && r !== 'verify-planner' && r !== 'verify-collector'), ['verify-i18n', 'verify-contract'])
  assert.match(rt.logs.join('\n'), /low risk allows 2 profile\(s\); dropped security/)
})

test('capProfiles keeps the profiles that cover most scenarios, and pendingPairs picks failed and blocked ones', async () => {
  const { I } = await loadInternals()
  const sc = [{ id: 'VS-1', profiles: ['http-api', 'async', 'limits'] }, { id: 'VS-2', profiles: ['async', 'limits'] }, { id: 'VS-3', profiles: ['async'] }]
  const c = I.capProfiles(sc, 2)
  assert.deepEqual(c.dropped, ['http-api'])
  assert.deepEqual(c.scenarios.map(s => s.profiles), [['async', 'limits'], ['async', 'limits'], ['async']])
  const groups = [{ profile: 'async', part: 0, scenarioIds: ['VS-1', 'VS-2'] }, { profile: 'limits', part: 0, scenarioIds: ['VS-1'] }, { profile: 'ui', part: 0, scenarioIds: ['VS-4'] }]
  const pairs = I.pendingPairs([{ refuted: true, failedScenarios: ['VS-2', 'VS-9'], blocked: [{ scenarioId: 'VS-2', reason: 'r' }] }, clear(), null], groups)
  assert.deepEqual(pairs, [{ profile: 'async', scenarioId: 'VS-2' }, { profile: 'ui', scenarioId: 'VS-4' }])
  assert.deepEqual(I.pairsToScenarios([{ profile: 'a', scenarioId: 'VS-1' }, { profile: 'b', scenarioId: 'VS-1' }]), [{ id: 'VS-1', profiles: ['a', 'b'] }])
})

test('capProfiles breaks a tie by the order the planner tagged the profiles, not by catalog order', async () => {
  const { I } = await loadInternals()
  const sc = [{ id: 'VS-1', profiles: ['security', 'http-api'] }, { id: 'VS-2', profiles: ['data'] }]
  const c = I.capProfiles(sc, 2)
  assert.deepEqual(c.dropped, ['data'])
  assert.deepEqual(c.scenarios.map(s => s.profiles), [['security', 'http-api'], []])
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

test('by default every agent runs on the session model', async () => {
  const rt = await runMain(happy({}, 'implement'))
  assert.equal(rt.calls.some(c => c.opts.model), false)
})

test('with a review model set, the spec-fidelity verifier and the reviewers run on it; everyone else inherits', async () => {
  const rt = await runMain(happy({}, 'implement'), { reviewModel: 'fable' })
  const model = r => [...new Set(rt.calls.filter(c => c.role === r).map(c => c.opts.model))]
  assert.deepEqual(rt.calls.filter(c => c.role === 'verifier').map(c => [c.inputs.lens, c.opts.model]).sort(), [['regression', undefined], ['spec-fidelity', 'fable']])
  assert.deepEqual(model('reviewer'), ['fable'])
  for (const r of ['implementer', 'verify-planner', 'verify-http-api', 'finding-refuter', 'integrator', 'test-reporter']) {
    assert.deepEqual(model(r).filter(Boolean), [], `${r} should inherit the session model`)
  }
})

test('reviewModel null keeps every agent on the session model', async () => {
  const rt = await runMain(happy({}, 'implement'), { reviewModel: null })
  assert.equal(rt.calls.some(c => c.opts.model), false)
})

test('a review model that fails falls back to the session model', async () => {
  const rt = await loadInternals(c => {
    if (c.opts.model) throw new Error('model not available')
    return { findings: [] }
  }, { reviewModel: 'fable' })
  const out = await rt.I.run('reviewer', { sliceId: 'S-1' }, rt.I.reviewOpts({ label: 'x' }))
  assert.deepEqual(out, { findings: [] })
  assert.deepEqual(rt.calls.map(c => c.opts.model), ['fable', undefined])
  assert.match(rt.logs.join('\n'), /model fable failed .*trying the session model/)
})

test('a list of review models is tried in order before the session model', async () => {
  const rt = await loadInternals(c => {
    if (c.opts.model === 'fable') throw new Error('model not available')
    return { findings: [] }
  }, { reviewModel: ['fable', 'opus'] })
  assert.deepEqual(await rt.I.run('reviewer', {}, rt.I.reviewOpts({ label: 'x' })), { findings: [] })
  assert.deepEqual(rt.calls.map(c => c.opts.model), ['fable', 'opus'])
  assert.match(rt.logs.join('\n'), /model fable failed .*trying opus/)
})

test('the session model gets its two attempts after every review model failed', async () => {
  let inherited = 0
  const rt = await loadInternals(c => {
    if (c.opts.model) throw new Error('model not available')
    return inherited++ === 0 ? null : { findings: [] }
  }, { reviewModel: 'fable' })
  assert.deepEqual(await rt.I.run('reviewer', {}, rt.I.reviewOpts({ label: 'x' })), { findings: [] })
  assert.deepEqual(rt.calls.map(c => c.opts.model), ['fable', undefined, undefined])
})

test('a review model that failed twice in a row is skipped for the rest of the run, and one success resets the count', async () => {
  const rt = await loadInternals(c => {
    if (c.opts.model === 'fable') throw new Error('model not available')
    return { findings: [] }
  }, { reviewModel: 'fable' })
  for (let i = 0; i < 3; i++) await rt.I.run('reviewer', {}, rt.I.reviewOpts({ label: `r${i}` }))
  assert.deepEqual(rt.calls.map(c => c.opts.model), ['fable', undefined, 'fable', undefined, undefined])
  assert.match(rt.logs.join('\n'), /fable failed twice in a row; not using it again in this run/)

  let n = 0
  const flaky = await loadInternals(c => (c.opts.model === 'fable' && n++ % 2 === 0 ? null : { findings: [] }), { reviewModel: 'fable' })
  for (let i = 0; i < 4; i++) await flaky.I.run('reviewer', {}, flaky.I.reviewOpts({ label: `r${i}` }))
  assert.equal(flaky.calls.filter(c => c.opts.model === 'fable').length, 4)
})

test('reviewModel accepts one model name or a list', async () => {
  const one = await runMain(happy({}, 'implement'), { reviewModel: 'sonnet' })
  assert.deepEqual([...new Set(one.calls.filter(c => c.role === 'reviewer').map(c => c.opts.model))], ['sonnet'])
  const list = await loadInternals(() => ({ findings: [] }), { reviewModel: ['haiku', 'sonnet'] })
  assert.deepEqual(list.I.reviewOpts({}).model, ['haiku', 'sonnet'])
})

test('profile agents run in batches of four', async () => {
  let live = 0
  let peak = 0
  const slow = () => new Promise(r => setTimeout(r, 5))
  const profiles = ['http-api', 'async', 'concurrency', 'data', 'i18n', 'cli', 'security']
  const table = {
    'verify-planner': () => ({ scenarios: [{ id: 'VS-1', title: 't', requirementIds: ['R-1'], profiles }], tools: [], risk: 'high' }),
    verifier: () => clear(),
    'verify-collector': () => ok(),
  }
  for (const p of profiles) table[`verify-${p}`] = async () => { live++; peak = Math.max(peak, live); await slow(); live--; return clear() }
  const rt = await loadInternals(scripted(table))
  const { votes, lenses } = await rt.I.verifyPhase('S-1', 0)
  assert.equal(rt.roles().filter(r => profiles.includes(r.replace('verify-', ''))).length, 7)
  assert.equal(peak, 4)
  assert.equal(rt.I.tallyVerify(votes, lenses).pass, true)
})

const reviewFix = (planner, extra = {}) => {
  let reviews = 0
  let plans = 0
  return happy({
    reviewer: c => (c.inputs.lens === 'security' && reviews++ === 0 ? { findings: [{ title: 'SQL injection', detail: 'raw concat', blocking: true }] } : { findings: [] }),
    'verify-planner': c => (plans++ === 0
      ? { scenarios: [{ id: 'VS-1', title: 't', requirementIds: ['R-1'], profiles: ['http-api', 'security'] }], tools: [], risk: 'high' }
      : planner(c)),
    ...extra,
  }, 'implement')
}

test('after a review fix, the planner adds scenarios for the fix and only those run', async () => {
  const rt = await runMain(reviewFix(() => ({
    scenarios: [
      { id: 'VS-1', title: 't', requirementIds: ['R-1'], profiles: ['http-api', 'security'] },
      { id: 'VS-2', title: 'query input is parameterized', requirementIds: ['R-1'], profiles: ['http-api'] },
    ],
    added: ['VS-2'], tools: [], risk: 'high',
  })))
  assert.deepEqual(rt.errors, [])
  const planners = rt.calls.filter(c => c.role === 'verify-planner').map(c => c.inputs)
  assert.deepEqual(planners, [{ sliceId: 'S-1', round: 0 }, { sliceId: 'S-1', round: 1, after: 'review-fix' }])
  const api = rt.calls.filter(c => c.role === 'verify-http-api').map(c => c.inputs)
  assert.equal(api.length, 2)
  assert.deepEqual([api[1].round, api[1].planRound, api[1].scenarioIds], [1, 1, ['VS-2']])
  assert.equal(rt.calls.filter(c => c.role === 'verify-security').length, 1)
  assert.equal(rt.roles().includes('integrator'), true)
})

test('after a review fix that changed no behavior, the planner adds nothing and no profile agent runs', async () => {
  const rt = await runMain(reviewFix(() => ({ scenarios: [{ id: 'VS-1', title: 't', requirementIds: ['R-1'], profiles: ['http-api', 'security'] }], added: [], tools: [], risk: 'high' })))
  assert.equal(rt.calls.filter(c => c.role === 'verify-planner').length, 2)
  assert.equal(rt.calls.filter(c => c.role === 'verify-http-api').length, 1)
  assert.equal(rt.roles().includes('integrator'), true)
})

test('after a review fix, a planner that fails to report falls back to the earlier plan', async () => {
  const rt = await runMain(reviewFix(() => null))
  assert.equal(rt.calls.filter(c => c.role === 'verify-http-api').length, 1)
  assert.equal(rt.roles().includes('integrator'), true)
  assert.ok(rt.logs.some(l => /could not plan the review fix/.test(l)))
})

test('a fix round after a verification failure does not plan again', async () => {
  let n = 0
  const rt = await runMain(happy({
    'verify-http-api': () => (n++ === 0 ? { refuted: true, evidence: 'x', failingTest: 'TC-1', failedScenarios: ['VS-1'] } : clear()),
  }, 'implement'))
  assert.equal(rt.calls.filter(c => c.role === 'verify-planner').length, 1)
})

test('the regression verifier runs after the collector, and alongside spec-fidelity when there are no profile tests', async () => {
  const rt = await loadInternals(scripted({
    'verify-planner': plan(['ui', 'i18n']),
    verifier: () => clear(),
    'verify-ui': () => clear(),
    'verify-i18n': () => clear(),
    'verify-collector': () => ok(),
  }))
  const { votes, lenses } = await rt.I.verifyPhase('S-1', 0)
  assert.equal(rt.I.tallyVerify(votes, lenses).pass, true)
  const order = rt.calls.map(c => (c.role === 'verifier' ? c.inputs.lens : c.role))
  assert.ok(order.indexOf('spec-fidelity') < order.indexOf('verify-collector'))
  assert.equal(order.indexOf('regression'), order.length - 1)
  assert.equal(order[order.length - 2], 'verify-collector')

  const none = await loadInternals(scripted({ 'verify-planner': plan([]), verifier: c => ({ ...clear(), evidence: c.inputs.lens }) }))
  const r = await none.I.verifyPhase('S-1', 0)
  assert.deepEqual([r.votes[0].evidence, r.votes[2].evidence], ['spec-fidelity', 'regression'])
  assert.equal(none.roles().includes('verify-collector'), false)
})

test('a failed collector still gets a regression run', async () => {
  const rt = await loadInternals(scripted({
    'verify-planner': plan(['ui']),
    verifier: () => clear(),
    'verify-ui': () => clear(),
    'verify-collector': () => ({ ok: false, notes: 'conflict' }),
  }))
  const { votes } = await rt.I.verifyPhase('S-1', 0)
  assert.equal(rt.calls.filter(c => c.role === 'verifier' && c.inputs.lens === 'regression').length, 1)
  assert.equal(votes[2].refuted, false)
  assert.equal(votes[1].refuted, true)
})

test('the review runs next to the regression verifier when everything before it held, and only once', async () => {
  const rt = await runMain(happy({}, 'implement'))
  assert.deepEqual(rt.errors, [])
  const order = rt.calls.map(c => (c.role === 'verifier' ? c.inputs.lens : c.role))
  assert.equal(order.filter(r => r === 'reviewer').length, 3)
  // the reviewers start with the regression run, after the collector, and before the report
  assert.ok(order.indexOf('verify-collector') < order.indexOf('reviewer'))
  assert.ok(order.indexOf('reviewer') - order.indexOf('regression') <= 1)
  assert.ok(order.lastIndexOf('reviewer') < order.indexOf('test-reporter'))
  assert.equal(rt.roles().filter(r => r === 'implementer').length, 1)
})

test('no review is started when a profile verifier or the spec-fidelity verifier refuted the slice', async () => {
  for (const overrides of [
    { 'verify-security': () => ({ refuted: true, evidence: 'IDOR', failingTest: 't1', failedScenarios: ['VS-1'] }) },
    { verifier: c => (c.inputs.lens === 'spec-fidelity' ? { refuted: true, evidence: 'R-1 half done' } : clear()) },
    { 'verify-collector': () => ({ ok: false, notes: 'conflict' }) },
  ]) {
    const rt = await loadInternals(happy(overrides))
    let reviews = 0
    const { votes, review } = await rt.I.verifyPhase('S-1', 0, null, false, async () => { reviews++; return { blocking: [], seeds: [] } })
    assert.equal(reviews, 0)
    assert.equal(review, undefined)
    assert.equal(votes[2].refuted, false, 'the regression verifier still runs')
  }
})

test('a regression failure and a blocking review finding reach the implementer in the same round', async () => {
  let reg = 0
  let rev = 0
  const rt = await runMain(happy({
    verifier: c => (c.inputs.lens === 'regression' && reg++ === 0 ? { refuted: true, evidence: 'lint red', failingTest: 'lint' } : clear()),
    reviewer: c => (c.inputs.lens === 'security' && rev++ === 0 ? { findings: [{ title: 'token logged', detail: 'remove it', blocking: true }] } : { findings: [] }),
    'finding-refuter': () => ({ refuted: false, evidence: 'real' }),
  }, 'implement'))
  assert.deepEqual(rt.errors, [])
  const impl = rt.calls.filter(c => c.role === 'implementer')
  assert.equal(impl.length, 2)
  assert.ok(impl[1].inputs.evidence.some(e => /\[regression\] REFUTED: lint red/.test(e)))
  assert.ok(impl[1].inputs.evidence.some(e => /\[review\] token logged/.test(e)))
  // the fix answered a review finding, so the next round plans scenarios for it
  assert.equal(rt.calls.filter(c => c.role === 'verify-planner')[1].inputs.after, 'review-fix')
  assert.equal(rt.roles().includes('integrator'), true)
})

test('with no profile tests the review still runs, after verification', async () => {
  const rt = await runMain(happy({ 'verify-planner': () => ({ scenarios: [{ id: 'VS-1', title: 't', requirementIds: ['R-1'], profiles: [] }], tools: [], risk: 'low' }) }, 'implement'))
  const order = rt.calls.map(c => (c.role === 'verifier' ? c.inputs.lens : c.role))
  assert.equal(order.filter(r => r === 'reviewer').length, 3)
  assert.ok(order.indexOf('regression') < order.indexOf('reviewer'))
})
