import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { writeFileSync, appendFileSync } from 'node:fs'
import { join } from 'node:path'

const WT = process.env.VERIFY_WT
const { cliRunner } = await import(`${WT}/skills/sdlc/test/testkit/cli-runner.mjs`)
const { load } = await import(`${WT}/skills/sdlc/test/testkit/attack-corpus.mjs`)
const LOG = process.env.VERIFY_LOG
const log = (id, t) => LOG && appendFileSync(LOG, `=== ${id}\n${t.text()}\n`)

const SPEC = '# Spec\n'
const specHash = createHash('sha256').update(SPEC).digest('hex')
const slice = (id, status = 'todo', extra = {}) => ({ id, title: id, requirements: [], dependsOn: [], kind: 'spec', status, phase: 'plan', notes: '', ...extra })
const CUSTOM = 'feature/PROJ-1-{name}'
const LOWER = 'feature/PROJ-1-{name:lower}'

function mk(r, { slices = [], milestones = [], mode = 'pr', config = {}, branches = {} } = {}) {
  const repo = r.gitRepo({
    files: {
      'spec.md': SPEC,
      '.sdlc/config.json': { specPath: 'spec.md', specHash, overridesSeen: 0, gitMode: mode, defaultBranch: 'main', ...config },
      '.sdlc/requirements.json': [], '.sdlc/slices.json': slices, '.sdlc/milestones.json': milestones, '.sdlc/DECISIONS.md': '# Decisions\n',
    },
  })
  for (const [b, bs] of Object.entries(branches)) {
    r.git(repo, 'checkout', '-q', '-b', b)
    writeFileSync(join(repo, '.sdlc', 'slices.json'), JSON.stringify(bs))
    r.git(repo, 'commit', '-q', '-am', `state on ${b}`)
    r.git(repo, 'checkout', '-q', 'main')
  }
  return repo
}
function decide(r, repo, prs, id) {
  const args = ['--repo', repo, '--bar-raiser-rounds', '0']
  if (prs) {
    const f = join(r.dir('prs'), 'prs.json')
    writeFileSync(f, JSON.stringify({ open: [], merged: [], ...prs }))
    args.push('--prs', f)
  }
  const t = r.run('next-action.py', args, { cwd: repo })
  if (id) log(id, t)
  assert.equal(t.status, 0, t.text())
  return { t, d: t.json }
}
const pr = (head, extra = {}) => ({ number: 7, headRefName: head, url: `https://example.test/pr/${head}`, mergeable: 'MERGEABLE', reviewDecision: '', statusCheckRollup: [], ...extra })
const merges = d => (d.sync ?? []).filter(c => c.startsWith('gh pr merge'))
const inProg = (id = 'S-1') => [slice(id, 'in_progress', { phase: 'implement' })]

test('verify cli VS-1 TC-cli-1: active slice found by parse under custom format; foreign never active', () => {
  const r = cliRunner()
  const repo = mk(r, { slices: [slice('S-1')], mode: 'direct', config: { branchFormat: CUSTOM }, branches: { 'feature/PROJ-1-S-1': inProg() } })
  const { d } = decide(r, repo, null, 'TC-cli-1a')
  assert.equal(d.checkout, 'feature/PROJ-1-S-1')
  assert.equal(d.next.action, 'slice'); assert.equal(d.next.slice.phase, 'implement')

  const foreign = mk(r, { slices: [slice('S-1')], mode: 'direct', config: { branchFormat: CUSTOM }, branches: {
    'feature/PROJ-1-sdlc-foo': [slice('sdlc-foo', 'in_progress')],
    'sdlc/S-1': inProg(),
    'feature/PROJ-1-S-002': inProg('S-1'),
  } })
  const f = decide(r, foreign, null, 'TC-cli-1b')
  assert.equal(f.d.checkout, null)
  assert.equal(f.d.next.action, 'slice'); assert.equal(f.d.next.sliceId ?? f.d.next.slice.id, 'S-1'); assert.equal(f.d.next.slice.phase, 'plan')

  // S-002 in the branch's own ledger, but main has no S-002 and branch only: still active by branch ledger? record behaviour
  const two = mk(r, { slices: [slice('S-1')], mode: 'direct', config: { branchFormat: CUSTOM }, branches: {
    'feature/PROJ-1-S-1': inProg(), 'feature/PROJ-1-S-2': inProg('S-2') } })
  const g = decide(r, two, null, 'TC-cli-1c')
  assert.ok(['feature/PROJ-1-S-1', 'feature/PROJ-1-S-2'].includes(g.d.checkout))
})

test('verify cli VS-1 TC-cli-2: a checked-out branch wins over other branches', () => {
  const r = cliRunner()
  const repo = mk(r, { slices: [slice('S-1'), slice('S-2')], mode: 'direct', config: { branchFormat: CUSTOM }, branches: {
    'feature/PROJ-1-S-1': inProg('S-1'), 'feature/PROJ-1-S-2': inProg('S-2') } })
  r.git(repo, 'checkout', '-q', 'feature/PROJ-1-S-2')
  const { d } = decide(r, repo, null, 'TC-cli-2')
  assert.equal(d.checkout, null, 'the active branch is the current one: no checkout needed')
  assert.equal(d.next.slice.id, 'S-2')
})

test('verify cli VS-1 TC-cli-3: hostile branch names never crash or read as active', () => {
  const r = cliRunner()
  const names = ['feature/PROJ-1-S-１', 'feature/PROJ-1--x', 'feature/PROJ-1---help', 'feature/PROJ-1-S-1-' + 'a'.repeat(200), 'feature/PROJ-1-ѕ-1', 'feature/PROJ-1-S-1​', 'feature/PROJ-1-日本語', 'feature/PROJ-1-S-99999999999999999999']
  const branches = {}
  const made = []
  const repo = mk(r, { slices: [slice('S-1')], mode: 'direct', config: { branchFormat: CUSTOM } })
  for (const n of names) {
    try { r.git(repo, 'checkout', '-q', '-b', n); writeFileSync(join(repo, '.sdlc', 'slices.json'), JSON.stringify(inProg('S-1'))); r.git(repo, 'commit', '-q', '-am', 'x'); r.git(repo, 'checkout', '-q', 'main'); made.push(n) } catch { r.git(repo, 'checkout', '-q', 'main') }
  }
  const { d, t } = decide(r, repo, null, 'TC-cli-3')
  assert.ok(made.length >= 5, `branches created: ${made.length}`)
  assert.ok(!t.stderr.includes('Traceback'), t.stderr)
  assert.equal(d.checkout, null, `hostile names read as active: ${d.checkout}`)
})

test('verify cli VS-2 TC-cli-4: state and e2e heads recognized; e2e-area and foreign ignored; prefix fallback', () => {
  const r = cliRunner()
  const repo = mk(r, { slices: [slice('S-1')], config: { branchFormat: CUSTOM } })
  const a = decide(r, repo, { open: [pr('feature/PROJ-1-state-20261010000000', { number: 12 })] }, 'TC-cli-4a')
  assert.deepEqual(merges(a.d), ['gh pr merge 12 --squash --delete-branch'])
  const b = decide(r, repo, { open: [pr('feature/PROJ-1-M-1-e2e', { number: 13 })] }, 'TC-cli-4b')
  assert.deepEqual(merges(b.d), ['gh pr merge 13 --squash --delete-branch'])
  const c = decide(r, repo, { open: [pr('feature/PROJ-1-M-1-e2e-ui', { number: 14 }), pr('feature/PROJ-1-sdlc-foo', { number: 15 }), pr('sdlc/state-20261010000000', { number: 16 })] }, 'TC-cli-4c')
  assert.deepEqual(merges(c.d), [])
  const d2 = decide(r, repo, { open: [pr('feature/PROJ-1-state-abc', { number: 17 })] }, 'TC-cli-4d')
  assert.deepEqual(merges(d2.d), ['gh pr merge 17 --squash --delete-branch'])
  const e = decide(r, repo, { open: [pr('feature/PROJ-1-state-abc', { number: 18, reviewDecision: 'REVIEW_REQUIRED' })] }, 'TC-cli-4e')
  assert.equal(e.d.next.action, 'wait')
  const sd = mk(r, { slices: [slice('S-1')], mode: 'stack', config: { branchFormat: CUSTOM, runBranch: 'feature/PROJ-1-run-1' } })
  const f = decide(r, sd, { open: [pr('feature/PROJ-1-M-1-e2e', { number: 19 }), pr('feature/PROJ-1-state-20261010000000', { number: 20 })] }, 'TC-cli-4f')
  assert.deepEqual(merges(f.d), [], 'stack mode merges no state or e2e PR')
  const dm = mk(r, { slices: [slice('S-1')], mode: 'direct', config: { branchFormat: CUSTOM } })
  const g = decide(r, dm, { open: [pr('feature/PROJ-1-state-20261010000000', { number: 21 })] }, 'TC-cli-4g')
  assert.deepEqual(merges(g.d), [])
})

test('verify cli VS-3 TC-cli-5: lowercased head resolves to ledger id; case-only id differences; unknown ids ignored', () => {
  const r = cliRunner()
  const repo = mk(r, { slices: [slice('S-1')], config: { branchFormat: LOWER } })
  const a = decide(r, repo, { open: [pr('feature/proj-1-s-1')] }, 'TC-cli-5a')
  assert.equal(a.d.next.action, 'retryMerge'); assert.equal(a.d.next.sliceId, 'S-1'); assert.equal(a.d.next.slice.status, 'awaiting-merge')
  const aw = mk(r, { slices: [slice('S-1', 'awaiting-merge', { pr: 'u' })], config: { branchFormat: LOWER } })
  const b = decide(r, aw, { merged: [{ number: 4, headRefName: 'feature/proj-1-s-1', url: 'https://example.test/pr/4' }] }, 'TC-cli-5b')
  assert.equal(b.d.next.action, 'retryMerge'); assert.equal(b.d.next.slice.pr, 'https://example.test/pr/4')
  const c = decide(r, repo, { open: [pr('feature/proj-1-s-9')] }, 'TC-cli-5c')
  assert.notEqual(c.d.next.action, 'retryMerge'); assert.equal(c.d.next.sliceId ?? c.d.next.slice?.id, 'S-1')
  const up = decide(r, repo, { open: [pr('feature/PROJ-1-S-1')] }, 'TC-cli-5d')
  assert.equal(up.d.next.action, 'retryMerge')
  const ci = mk(r, { slices: [slice('S-1'), slice('s-1')], config: { branchFormat: LOWER } })
  const e = decide(r, ci, { open: [pr('feature/proj-1-s-1')] }, 'TC-cli-5e')
  assert.ok(e.d.next, 'ids differing only in case: no crash')
  const strict = mk(r, { slices: [slice('S-1')], config: { branchFormat: CUSTOM } })
  const f = decide(r, strict, { open: [pr('feature/PROJ-1-s-1')] }, 'TC-cli-5f')
  assert.notEqual(f.d.next.action, 'retryMerge', 'non-lower format must not accept a lowercased head')
})

test('verify cli VS-4 TC-cli-6: stack milestone hold', () => {
  const r = cliRunner()
  const ms = [{ id: 'M-2', status: 'verified', attempts: 1, slices: ['S-014'], fixSlices: [] }]
  const stack = mk(r, { slices: [slice('S-014', 'done')], milestones: ms, mode: 'stack', config: { runBranch: 'feature/PROJ-1-run-1', branchFormat: CUSTOM } })
  const a = decide(r, stack, { open: [pr('feature/PROJ-1-M-2', { reviewDecision: 'REVIEW_REQUIRED' })] }, 'TC-cli-6a')
  assert.equal(a.d.next.action, 'wait'); assert.match(a.d.next.reason, /M-2/); assert.match(JSON.stringify(a.d), /example\.test\/pr\/feature\/PROJ-1-M-2/)
  for (const [i, head] of ['feature/PROJ-1-M-2-e2e', 'feature/PROJ-1-sdlc-foo', 'sdlc/M-2'].entries()) {
    const x = decide(r, stack, { open: [pr(head, { reviewDecision: 'REVIEW_REQUIRED' })] }, `TC-cli-6b${i}`)
    assert.notEqual(x.d.next.action, 'wait', head)
  }
  const prm = mk(r, { slices: [slice('S-014', 'done')], milestones: ms, mode: 'pr', config: { branchFormat: CUSTOM } })
  const y = decide(r, prm, { open: [pr('feature/PROJ-1-M-2', { reviewDecision: 'REVIEW_REQUIRED' })] }, 'TC-cli-6c')
  assert.notEqual(y.d.next.action, 'wait')
})

test('verify cli VS-5 TC-cli-7: missing, empty, null branchFormat fall back; bad values fail clearly', () => {
  const r = cliRunner()
  for (const config of [{}, { branchFormat: '' }, { branchFormat: null }]) {
    const tag = JSON.stringify(config)
    const repo = mk(r, { slices: [slice('S-1')], config })
    assert.equal(decide(r, repo, { open: [pr('sdlc/S-1')] }, 'TC-cli-7a' + tag).d.next.action, 'retryMerge', tag)
    assert.deepEqual(merges(decide(r, repo, { open: [pr('sdlc/state-20261010000000', { number: 3 })] }).d), ['gh pr merge 3 --squash --delete-branch'], tag)
    assert.deepEqual(merges(decide(r, repo, { open: [pr('sdlc/M-1-e2e', { number: 4 })] }).d), ['gh pr merge 4 --squash --delete-branch'], tag)
    const act = mk(r, { slices: [slice('S-1')], mode: 'direct', config, branches: { 'sdlc/S-1': inProg() } })
    assert.equal(decide(r, act).d.checkout, 'sdlc/S-1', tag)
    const st = mk(r, { slices: [slice('S-014', 'done')], milestones: [{ id: 'M-1', status: 'verified', attempts: 1, slices: ['S-014'], fixSlices: [] }], mode: 'stack', config: { ...config, runBranch: 'sdlc/run-1' } })
    assert.equal(decide(r, st, { open: [pr('sdlc/M-1', { reviewDecision: 'REVIEW_REQUIRED' })] }).d.next.action, 'wait', tag)
  }
  for (const bad of [123, ['a'], { a: 1 }, true, 'no-placeholder', 'x/{foo}', '{name}{name}', 'a/{name']) {
    for (const mode of ['direct', 'pr']) {
      const repo = mk(r, { slices: [slice('S-1')], mode, config: { branchFormat: bad }, branches: { 'sdlc/S-1': inProg() } })
      const f = join(r.dir('prs'), 'prs.json')
      writeFileSync(f, JSON.stringify({ open: [pr('sdlc/S-1'), pr('sdlc/state-20261010000000', { number: 3 })], merged: [] }))
      const t = r.run('next-action.py', ['--repo', repo, '--bar-raiser-rounds', '0', '--prs', f], { cwd: repo })
      log(`TC-cli-7bad ${mode} ${JSON.stringify(bad)}`, t)
      assert.ok(!t.stderr.includes('Traceback'), `trace for ${JSON.stringify(bad)} ${mode}: ${t.stderr}`)
      assert.ok(t.json, `no JSON for ${JSON.stringify(bad)} ${mode}: ${t.stdout}`)
      const failsClearly = t.json.next?.action === 'error' && /branchFormat|format/i.test(t.json.next.reason)
      assert.ok(failsClearly, `${JSON.stringify(bad)} ${mode} did not fail clearly: ${t.stdout}`)
    }
  }
})

test('verify cli VS-6 TC-cli-8: one fixture, five recognitions, foreign head changes nothing', () => {
  const r = cliRunner()
  const base = { slices: [slice('S-1')], config: { branchFormat: CUSTOM } }
  const open = [pr('feature/PROJ-1-state-20261010000000', { number: 12 }), pr('feature/PROJ-1-M-1-e2e', { number: 13 }), pr('feature/PROJ-1-M-1-e2e-ui', { number: 14 })]
  const foreign = pr('feature/PROJ-1-sdlc-foo', { number: 15 })
  const withF = decide(r, mk(r, { ...base, branches: { 'feature/PROJ-1-sdlc-foo': [slice('sdlc-foo', 'in_progress')] } }), { open: [...open, foreign] }, 'TC-cli-8a')
  const without = decide(r, mk(r, base), { open }, 'TC-cli-8b')
  assert.deepEqual(withF.d, without.d)
  assert.deepEqual(merges(withF.d), ['gh pr merge 12 --squash --delete-branch', 'gh pr merge 13 --squash --delete-branch'])
  const sl = [pr('feature/PROJ-1-S-1')]
  assert.deepEqual(decide(r, mk(r, base), { open: [...sl, foreign] }).d, decide(r, mk(r, base), { open: sl }).d)
  const stack = { slices: [slice('S-014', 'done')], milestones: [{ id: 'M-2', status: 'verified', attempts: 1, slices: ['S-014'], fixSlices: [] }], mode: 'stack', config: { runBranch: 'feature/PROJ-1-run-1', branchFormat: CUSTOM } }
  const hold = pr('feature/PROJ-1-M-2', { reviewDecision: 'REVIEW_REQUIRED' })
  assert.deepEqual(decide(r, mk(r, stack), { open: [hold, foreign] }).d, decide(r, mk(r, stack), { open: [hold] }).d)
  const act = mk(r, { ...base, mode: 'direct', branches: { 'feature/PROJ-1-S-1': inProg() } })
  const act2 = mk(r, { ...base, mode: 'direct', branches: { 'feature/PROJ-1-S-1': inProg(), 'feature/PROJ-1-sdlc-foo': [slice('sdlc-foo', 'in_progress')] } })
  assert.deepEqual(decide(r, act).d, decide(r, act2).d)
})

test('verify cli VS-7 TC-cli-9: default format keeps the base-branch decision on the same inputs', () => {
  const r = cliRunner()
  const cases = [
    { open: [pr('sdlc/S-1')] },
    { open: [pr('sdlc/state-20261010000000', { number: 12 }), pr('sdlc/M-1-e2e', { number: 13 }), pr('sdlc/M-1-e2e-ui', { number: 14 })] },
    { open: [pr('sdlc/state-20261010000000', { number: 12, reviewDecision: 'REVIEW_REQUIRED' })] },
    { open: [], merged: [{ number: 4, headRefName: 'sdlc/S-1', url: 'u4' }] },
    { open: [pr('feature/x'), pr('sdlc/S-9')] },
  ]
  for (const [i, prs] of cases.entries()) {
    const repo = mk(r, { slices: [slice('S-1', i === 3 ? 'awaiting-merge' : 'todo', i === 3 ? { pr: 'u' } : {})] })
    const f = join(r.dir('prs'), 'prs.json')
    writeFileSync(f, JSON.stringify({ open: [], merged: [], ...prs }))
    const args = ['--repo', repo, '--bar-raiser-rounds', '0', '--prs', f]
    const head = r.run('next-action.py', args, { cwd: repo })
    const base = r.run('next-action.py', args, { cwd: repo, skillDir: process.env.VERIFY_BASE + '/skills/sdlc' })
    log('TC-cli-9 case ' + i + ' head', head); log('TC-cli-9 case ' + i + ' base', base)
    assert.equal(head.status, base.status)
    assert.deepEqual(head.json, base.json, `case ${i}`)
  }
  const act = mk(r, { slices: [slice('S-1')], mode: 'direct', branches: { 'sdlc/S-1': inProg() } })
  const a1 = r.run('next-action.py', ['--repo', act], { cwd: act }); const a2 = r.run('next-action.py', ['--repo', act], { cwd: act, skillDir: process.env.VERIFY_BASE + '/skills/sdlc' })
  assert.deepEqual(a1.json, a2.json)
})
