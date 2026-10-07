import { test } from 'node:test'
import assert from 'node:assert/strict'
import { loadInternals } from './harness.mjs'

const clear = { refuted: false, evidence: 'holds' }

test('an infra vote never counts as a refutation, but stops the round from passing', async () => {
  const rt = await loadInternals()
  const votes = [clear, { refuted: false, evidence: 'timed out', outcome: 'infra' }, clear]
  const t = rt.I.tallyVerify(votes, ['spec-fidelity', 'profiles', 'regression'])
  assert.equal(t.refutations, 0)
  assert.equal(t.pass, false)
  assert.equal(t.infra, true)
})

test('a refuting vote wins over infra classification (infra must not mask a real bug)', async () => {
  const rt = await loadInternals()
  const votes = [clear, { refuted: false, evidence: 'cut off', outcome: 'infra' }, { refuted: true, evidence: 'x', failingTest: 't — a — R-1' }]
  const t = rt.I.tallyVerify(votes, ['spec-fidelity', 'profiles', 'regression'])
  assert.equal(t.pass, false)
  assert.equal(t.refutations, 1)
  assert.equal(t.infra, false)
})

test('profileVote folds blocked scenarios and silent agents into infra, not refutation', async () => {
  const rt = await loadInternals()
  const groups = [{ profile: 'ui', part: 0, scenarioIds: ['VS-1'] }]
  const silent = rt.I.profileVote([null], groups)
  assert.equal(silent.refuted, false)
  assert.equal(silent.outcome, 'infra')
  const blocked = rt.I.profileVote([{ refuted: false, evidence: 'env', blocked: [{ scenarioId: 'VS-1', reason: 'no chromium' }] }], groups)
  assert.equal(blocked.refuted, false)
  assert.equal(blocked.outcome, 'infra')
  const failing = rt.I.profileVote([{ refuted: true, evidence: 'bug', failingTest: 't — b — R-1', blocked: [{ scenarioId: 'VS-1', reason: 'also no chromium' }] }], groups)
  assert.equal(failing.refuted, true)
  assert.equal(failing.outcome, 'refuted')
})