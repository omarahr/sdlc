import { test } from 'node:test'
import assert from 'node:assert/strict'
import { loadInternals } from './harness.mjs'

const { I } = await loadInternals()
const yes = { refuted: false, evidence: 'ok' }
const no = { refuted: true, evidence: 'broken' }

test('tallyVerify passes only when no vote refutes and there is no failing test', () => {
  assert.equal(I.tallyVerify([yes, yes, yes]).pass, true)
  assert.equal(I.tallyVerify([yes, yes, no]).pass, false)
  assert.equal(I.tallyVerify([yes, no, no]).pass, false)
})

test('tallyVerify: a spec-fidelity refutation with no failing test fails verification on its own', () => {
  const r = I.tallyVerify([{ refuted: true, evidence: 'R-3 is only half implemented', failingTest: '' }, yes, yes], ['spec-fidelity', 'profiles', 'regression'])
  assert.equal(r.pass, false)
  assert.equal(r.refutations, 1)
  assert.equal(I.tallyVerify([null, yes, yes], ['spec-fidelity', 'profiles', 'regression']).pass, false)
})

test('tallyVerify: one failing test beats any number of approvals', () => {
  const r = I.tallyVerify([yes, yes, { refuted: false, evidence: 'x', failingTest: 'edge.test.ts > empty input' }])
  assert.equal(r.pass, false)
  assert.deepEqual(r.failingTests, ['edge.test.ts > empty input'])
})

test('tallyVerify counts null votes as refutations', () => {
  const r = I.tallyVerify([yes, null, null])
  assert.equal(r.pass, false)
  assert.equal(r.refutations, 2)
})

test('allClear needs every vote present and not refuted', () => {
  assert.equal(I.allClear([yes, yes]), true)
  assert.equal(I.allClear([yes, no]), false)
  assert.equal(I.allClear([yes, null]), false)
})

test('survives needs a strict majority of non-refuting votes', () => {
  assert.equal(I.survives([yes, yes, no]), true)
  assert.equal(I.survives([yes, no, no]), false)
  assert.equal(I.survives([yes, null, null]), false)
  assert.equal(I.survives([]), false)
})

test('dedupeIdeas drops seen keys and in-batch duplicates, normalizing keys', () => {
  const out = I.dedupeIdeas(
    [{ key: 'Perf: Memo Graph', title: 'a' }, { key: 'perf-memo-graph', title: 'b' }, { title: 'Add fuzz tests' }, { key: 'old-one', title: 'c' }],
    ['OLD one'])
  assert.deepEqual(out.map(i => i.key), ['perf-memo-graph', 'add-fuzz-tests'])
})

test('tallyAudit reopens a requirement only when a majority of auditors refute it', () => {
  const out = I.tallyAudit(['R-1', 'R-2'], [
    { refuted: [{ id: 'R-1', reason: 'test missing' }] },
    { refuted: [{ id: 'R-1', reason: 'no assertion' }, { id: 'R-2', reason: 'maybe' }] },
    { refuted: [] },
  ])
  assert.deepEqual(out, [{ id: 'R-1', reasons: ['test missing', 'no assertion'] }])
})

test('tallyAudit treats a failed auditor as refuting every id in its chunk', () => {
  const out = I.tallyAudit(['R-1'], [null, { refuted: [{ id: 'R-1', reason: 'x' }] }, { refuted: [] }])
  assert.equal(out.length, 1)
  assert.deepEqual(out[0].reasons, ['auditor failed to report', 'x'])
})

test('normalizeCounters fills missing counters with zero and keeps given ones', () => {
  assert.deepEqual(I.normalizeCounters({ fixRounds: 2 }), { planRevisions: 0, fixRounds: 2, ladderStep: 0, parkCycles: 0, verifyDemanded: false })
  assert.deepEqual(I.normalizeCounters(undefined), { planRevisions: 0, fixRounds: 0, ladderStep: 0, parkCycles: 0, verifyDemanded: false })
})

test('chunk splits into fixed-size groups', () => {
  assert.deepEqual(I.chunk([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]])
})

test('groupScenarios gives each profile its scenarios, splitting only past the agent limit', async () => {
  const { I } = await loadInternals()
  const sc = [
    { id: 'VS-1', profiles: ['http-api', 'async', 'security'] },
    { id: 'VS-2', profiles: ['http-api', 'http-api'] },
    { id: 'VS-3', profiles: ['made-up', 'ui'] },
  ]
  assert.deepEqual(I.groupScenarios(sc), [
    { profile: 'http-api', part: 0, scenarioIds: ['VS-1', 'VS-2'] },
    { profile: 'async', part: 0, scenarioIds: ['VS-1'] },
    { profile: 'ui', part: 0, scenarioIds: ['VS-3'] },
    { profile: 'security', part: 0, scenarioIds: ['VS-1'] },
  ])
  const many = Array.from({ length: 20 }, (_, i) => ({ id: `VS-${i}`, profiles: ['http-api'] }))
  assert.deepEqual(I.groupScenarios(many).map(g => g.scenarioIds.length), [6, 6, 6, 2])
  // twelve profiles' worth of chunks never exceed the limit: chunks grow instead
  const wide = Array.from({ length: 30 }, (_, i) => ({ id: `VS-${i}`, profiles: ['http-api', 'async'] }))
  const g = I.groupScenarios(wide, 8)
  assert.ok(g.length <= 8)
  assert.equal(g.filter(x => x.profile === 'async').flatMap(x => x.scenarioIds).length, 30)
  assert.deepEqual(I.groupScenarios([]), [])
})

test('profileVote refutes on a failing test, a blocked scenario or a silent agent, and keeps seeds', async () => {
  const { I } = await loadInternals()
  const groups = [{ profile: 'http-api', part: 0, scenarioIds: ['VS-1'] }, { profile: 'ui', part: 1, scenarioIds: ['VS-2', 'VS-3'] }]
  const clean = I.profileVote([{ refuted: false, evidence: 'ok', seeds: [{ title: 's1', detail: 'd' }] }, { refuted: false, evidence: 'ok' }], groups)
  assert.equal(clean.refuted, false)
  assert.deepEqual(clean.seeds.map(s => s.title), ['s1'])
  const failing = I.profileVote([{ refuted: true, evidence: 'bad', failingTest: 't1 — go test — R-1' }, { refuted: false, evidence: 'ok' }], groups)
  assert.equal(failing.refuted, true)
  assert.match(failing.failingTest, /\[http-api\] t1/)
  const blocked = I.profileVote([{ refuted: false, evidence: 'ok' }, { refuted: true, evidence: 'no browser', blocked: [{ scenarioId: 'VS-2', reason: 'chromium did not start' }] }], groups)
  assert.match(blocked.failingTest, /blocked: \[ui#1\] VS-2: chromium did not start/)
  const silent = I.profileVote([{ refuted: false, evidence: 'ok' }, null], groups)
  assert.equal(silent.refuted, true)
  assert.match(silent.failingTest, /VS-3: profile verifier failed to report/)
  assert.equal(I.profileVote([], []).refuted, false)
})
