import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const WT = process.env.VERIFY_WT
const SCRIPT = join(WT, 'skills/sdlc/next-action.py')
const SPEC = '# Spec\n'
const specHash = createHash('sha256').update(SPEC).digest('hex')
const slice = (id, status = 'todo', extra = {}) => ({ id, title: id, requirements: [], dependsOn: [], kind: 'spec', status, phase: 'plan', notes: '', ...extra })
const CUSTOM = 'feature/PROJ-1-{name}'
const LOWER = 'feature/PROJ-1-{name:lower}'
const git = (cwd, ...a) => execFileSync('git', a, { cwd, encoding: 'utf8', env: { ...process.env, GIT_AUTHOR_NAME: 'v', GIT_AUTHOR_EMAIL: 'v@x', GIT_COMMITTER_NAME: 'v', GIT_COMMITTER_EMAIL: 'v@x' } })

function fixture(files = {}, { gitMode = 'direct', config = {} } = {}) {
  const repo = mkdtempSync(join(tmpdir(), 'vsec-'))
  mkdirSync(join(repo, '.sdlc'))
  writeFileSync(join(repo, 'spec.md'), SPEC)
  const all = {
    'config.json': { specPath: 'spec.md', specHash, overridesSeen: 0, gitMode, defaultBranch: 'main', ...config },
    'requirements.json': [], 'slices.json': [], 'milestones.json': [], 'DECISIONS.md': '# Decisions\n', ...files,
  }
  for (const [n, v] of Object.entries(all)) writeFileSync(join(repo, '.sdlc', n), typeof v === 'string' ? v : JSON.stringify(v, null, 2))
  git(repo, 'init', '-q', '-b', 'main'); git(repo, 'add', '-A'); git(repo, 'commit', '-q', '-m', 'b')
  return repo
}
function branchWith(repo, branch, slices) {
  git(repo, 'checkout', '-q', '-b', branch)
  writeFileSync(join(repo, '.sdlc', 'slices.json'), JSON.stringify(slices))
  git(repo, 'commit', '-q', '-am', 'x')
  git(repo, 'checkout', '-q', 'main')
}
function stubGh(dir) {
  const bin = mkdtempSync(join(dir, 'ghbin-'))
  const log = join(bin, 'gh.log')
  writeFileSync(join(bin, 'gh'), `#!/bin/sh\necho "$@" >> ${log}\nexit 1\n`, { mode: 0o755 })
  return { bin, log }
}
function decide(repo, prs = null) {
  const args = [SCRIPT, '--repo', repo, '--bar-raiser-rounds', '0']
  if (prs) { const f = join(repo, '..', `prs-${Math.random()}.json`); writeFileSync(f, JSON.stringify({ open: [], merged: [], ...prs })); args.push('--prs', f) }
  const r = spawnSync('python3', args, { encoding: 'utf8' })
  return { status: r.status, stderr: r.stderr, out: r.stdout ? JSON.parse(r.stdout) : null }
}
const pr = (head, extra = {}) => ({ number: 7, headRefName: head, url: `https://example.test/pr/7`, mergeable: 'MERGEABLE', reviewDecision: '', statusCheckRollup: [], ...extra })
const merges = d => (d.sync ?? []).filter(c => c.startsWith('gh pr merge'))
const refs = repo => git(repo, 'for-each-ref', '--format=%(refname) %(objectname)')

test('verify security VS-1 A1: hostile and foreign branch names never read as the active slice', () => {
  const names = [
    'feature/PROJ-1-S-1-attempt-2', 'feature/PROJ-1-S-1-v1-http-api-0', 'feature/PROJ-1-sdlc-foo', 'sdlc/S-1',
    'feature/PROJ-1-s-1', 'feature/PROJ-1-S-1​', 'feature/PROJ-1-S-１', 'feature/PROJ-1-S-1/x',
    'feature/PROJ-1-Ѕ-1', 'feature/PROJ-2-S-1', 'other/feature/PROJ-1-S-1',
    'feature/PROJ-1-state-20261010000000', 'feature/PROJ-1-M-1',
  ]
  for (const n of names) {
    const repo = fixture({ 'slices.json': [slice('S-1')] }, { config: { branchFormat: CUSTOM } })
    try { branchWith(repo, n, [slice('S-1', 'in_progress'), slice(n.split('PROJ-1-')[1] ?? 'x', 'in_progress')]) } catch { continue }
    const before = refs(repo)
    const d = decide(repo)
    assert.equal(d.status, 0, `${JSON.stringify(n)} ${d.stderr}`)
    assert.equal(d.out.checkout, null, `branch ${JSON.stringify(n)} read as active`)
    assert.equal(refs(repo), before)
  }
})

test('verify security VS-1 A2: a parsing slice branch without a matching in-progress ledger entry stays inactive', () => {
  const repo = fixture({ 'slices.json': [slice('S-1')] }, { config: { branchFormat: CUSTOM } })
  branchWith(repo, 'feature/PROJ-1-S-002', [slice('S-1', 'in_progress')])
  branchWith(repo, 'feature/PROJ-1-S-3', [slice('S-3', 'todo')])
  assert.equal(decide(repo).out.checkout, null)
})

test('verify security VS-1 A3: the checked-out branch wins over another in-progress branch', () => {
  const repo = fixture({ 'slices.json': [slice('S-1')] }, { config: { branchFormat: CUSTOM } })
  branchWith(repo, 'feature/PROJ-1-S-1', [slice('S-1', 'in_progress', { phase: 'implement' })])
  branchWith(repo, 'feature/PROJ-1-S-2', [slice('S-2', 'in_progress', { phase: 'tests' })])
  git(repo, 'checkout', '-q', 'feature/PROJ-1-S-2')
  const d = decide(repo)
  assert.equal(d.out.checkout, null)
  assert.equal(d.out.next.sliceId, 'S-2')
})

test('verify security VS-1 A4: Kelvin sign and long s confusables in a lowercased format do not activate S-K1', () => {
  for (const bad of ['feature/PROJ-1-s-K1', 'feature/PROJ-1-ſ-k1']) {
    const repo = fixture({ 'slices.json': [slice('S-K1')] }, { config: { branchFormat: LOWER } })
    branchWith(repo, bad, [slice('S-K1', 'in_progress')])
    const d = decide(repo)
    assert.equal(d.status, 0, d.stderr)
    assert.equal(d.out.checkout, null, `confusable ${JSON.stringify(bad)} activated S-K1`)
  }
})

test('verify security VS-1 A5: no gh call and no ref change while deciding on hostile branches', () => {
  const repo = fixture({ 'slices.json': [slice('S-1')] }, { config: { branchFormat: CUSTOM } })
  branchWith(repo, 'feature/PROJ-1-sdlc-foo', [slice('sdlc-foo', 'in_progress')])
  const { bin, log } = stubGh(repo)
  const before = refs(repo)
  const r = spawnSync('python3', [SCRIPT, '--repo', repo, '--bar-raiser-rounds', '0'], { encoding: 'utf8', env: { ...process.env, PATH: `${bin}:${process.env.PATH}` } })
  assert.equal(r.status, 0, r.stderr)
  assert.equal(JSON.parse(r.stdout).checkout, null)
  assert.equal(refs(repo), before)
  let calls = ''; try { calls = readFileSync(log, 'utf8') } catch {}
  assert.equal(calls, '', 'direct mode must not call gh')
})

test('verify security VS-2 A6: hostile state and e2e heads give no merge command', () => {
  const heads = [
    'sdlc/state-20261010000000', 'feature/PROJ-1-sdlc-state-20261010000000', 'feature/PROJ-1-M-1-e2e-ui', 'feature/PROJ-1-M-1-e2e-',
    'x/feature/PROJ-1-state-20261010000000', 'feature/PROJ-2-state-20261010000000',
    'feature/PROJ-1-M-1-e2e-' + 'a'.repeat(5000), 'feature/PROJ-1-run-1', 'feature/PROJ-1-S-1-attempt-1',
  ]
  const repo = fixture({ 'slices.json': [slice('S-1')] }, { gitMode: 'pr', config: { branchFormat: CUSTOM } })
  for (const h of heads) {
    const d = decide(repo, { open: [pr(h, { number: 99 })] })
    assert.equal(d.status, 0, `${JSON.stringify(h)} ${d.stderr}`)
    assert.deepEqual(merges(d.out), [], `head ${JSON.stringify(h)} produced a merge`)
  }
})

test('verify security VS-2 A7: an unready state head and an unready e2e head give no merge', () => {
  const repo = fixture({ 'slices.json': [slice('S-1')] }, { gitMode: 'pr', config: { branchFormat: CUSTOM } })
  for (const extra of [{ mergeable: 'CONFLICTING' }, { reviewDecision: 'REVIEW_REQUIRED' }, { statusCheckRollup: [{ conclusion: 'FAILURE', status: 'COMPLETED' }] }]) {
    const d = decide(repo, { open: [pr('feature/PROJ-1-M-1-e2e', { number: 5, ...extra }), pr('feature/PROJ-1-state-20261010000000', { number: 6, ...extra })] })
    assert.deepEqual(merges(d.out), [])
  }
})

test('verify security VS-2 A8: a head that is not a string does not crash the decision', () => {
  const repo = fixture({ 'slices.json': [slice('S-1')] }, { gitMode: 'pr', config: { branchFormat: CUSTOM } })
  for (const h of [null, 5, ['feature/PROJ-1-state-20261010000000'], {}]) {
    const d = decide(repo, { open: [{ number: 3, headRefName: h, url: 'u', mergeable: 'MERGEABLE' }] })
    assert.equal(d.status, 0, `headRefName ${JSON.stringify(h)}: ${d.stderr.split('\n').slice(-3).join(' | ')}`)
    assert.deepEqual(merges(d.out), [])
  }
})

test('verify security VS-2 A9: the state fallback and trailing text in a state head', () => {
  const repo = fixture({ 'slices.json': [slice('S-1')] }, { gitMode: 'pr', config: { branchFormat: CUSTOM } })
  const ok = decide(repo, { open: [pr('feature/PROJ-1-state-2026', { number: 21 })] })
  assert.deepEqual(merges(ok.out), ['gh pr merge 21 --squash --delete-branch'])
  const evil = decide(repo, { open: [pr('feature/PROJ-1-state-$(touch pwn)', { number: 22 })] })
  assert.ok(merges(evil.out).every(c => c === 'gh pr merge 22 --squash --delete-branch'))
})

test('verify security VS-6 A10: the foreign head changes no decision', () => {
  const foreign = ['feature/PROJ-1-sdlc-foo', 'feature/PROJ-1-S-002', 'sdlc/S-1', 'feature/proj-1-s-1', 'feature/PROJ-1-S-1-attempt-3', 'feature/PROJ-1-M-9-e2e-ui', 'other/PROJ-1-state-20261010000000']
  const mk = () => fixture({ 'slices.json': [slice('S-1')], 'milestones.json': [{ id: 'M-2', status: 'verified', attempts: 1, slices: ['S-014'], fixSlices: [] }] }, { gitMode: 'pr', config: { branchFormat: CUSTOM } })
  const base = [pr('feature/PROJ-1-state-20261010000000', { number: 12 }), pr('feature/PROJ-1-M-1-e2e', { number: 13 }), pr('feature/PROJ-1-S-1', { number: 14 })]
  const without = decide(mk(), { open: base })
  for (const f of foreign) {
    const withF = decide(mk(), { open: [...base, pr(f, { number: 50 })] })
    assert.equal(withF.status, 0, withF.stderr)
    assert.deepEqual(withF.out, without.out, `foreign head ${f} changed the decision`)
  }
  const stackMk = () => fixture({ 'slices.json': [slice('S-014', 'done')], 'milestones.json': [{ id: 'M-2', status: 'verified', attempts: 1, slices: ['S-014'], fixSlices: [] }] }, { gitMode: 'stack', config: { runBranch: 'feature/PROJ-1-run-1', branchFormat: CUSTOM } })
  const sb = decide(stackMk(), { open: [pr('feature/PROJ-1-M-2', { reviewDecision: 'REVIEW_REQUIRED' })] })
  for (const f of foreign) {
    const w = decide(stackMk(), { open: [pr(f, { number: 50 }), pr('feature/PROJ-1-M-2', { reviewDecision: 'REVIEW_REQUIRED' })] })
    assert.deepEqual(w.out, sb.out, `foreign head ${f} changed the stack hold`)
  }
})

test('verify security VS-6 A11: a foreign branch without the M anchor never holds the stack', () => {
  const mk = () => fixture({ 'slices.json': [slice('S-014', 'done')], 'milestones.json': [{ id: 'M-2', status: 'verified', attempts: 1, slices: ['S-014'], fixSlices: [] }] }, { gitMode: 'stack', config: { runBranch: 'feature/PROJ-1-run-1', branchFormat: CUSTOM } })
  for (const h of ['feature/PROJ-1-m-2', 'feature/PROJ-1-sdlc-M-2', 'sdlc/M-2']) {
    const d = decide(mk(), { open: [pr(h, { reviewDecision: 'REVIEW_REQUIRED' })] })
    assert.equal(d.status, 0, d.stderr)
    assert.notEqual(d.out.next?.action, 'wait', `head ${JSON.stringify(h)} held the stack`)
  }
})

test('verify security VS-2 A12 (out of scope, seed): a head with a trailing newline is not a state, e2e or milestone head', () => {
  const repo = fixture({ 'slices.json': [slice('S-1')] }, { gitMode: 'pr', config: { branchFormat: CUSTOM } })
  for (const h of ['feature/PROJ-1-M-1-e2e\n', 'feature/PROJ-1-state-20261010000000\n']) {
    assert.deepEqual(merges(decide(repo, { open: [pr(h, { number: 99 })] }).out), [], `head ${JSON.stringify(h)} produced a merge`)
  }
  const stack = fixture({ 'slices.json': [slice('S-014', 'done')], 'milestones.json': [{ id: 'M-2', status: 'verified', attempts: 1, slices: ['S-014'], fixSlices: [] }] }, { gitMode: 'stack', config: { runBranch: 'feature/PROJ-1-run-1', branchFormat: CUSTOM } })
  assert.notEqual(decide(stack, { open: [pr('feature/PROJ-1-M-2\n', { reviewDecision: 'REVIEW_REQUIRED' })] }).out.next?.action, 'wait')
})

test('verify security VS-2 A13 (out of scope, seed): non-ASCII digits in an e2e or milestone head are foreign', () => {
  const repo = fixture({ 'slices.json': [slice('S-1')] }, { gitMode: 'pr', config: { branchFormat: CUSTOM } })
  assert.deepEqual(merges(decide(repo, { open: [pr('feature/PROJ-1-M-\uff12-e2e', { number: 99 })] }).out), [])
  const stack = fixture({ 'slices.json': [slice('S-014', 'done')], 'milestones.json': [{ id: 'M-2', status: 'verified', attempts: 1, slices: ['S-014'], fixSlices: [] }] }, { gitMode: 'stack', config: { runBranch: 'feature/PROJ-1-run-1', branchFormat: CUSTOM } })
  assert.notEqual(decide(stack, { open: [pr('feature/PROJ-1-M-\uff12', { reviewDecision: 'REVIEW_REQUIRED' })] }).out.next?.action, 'wait')
})
