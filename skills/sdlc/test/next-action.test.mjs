import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { SKILL_DIR } from './harness.mjs'

const SCRIPT = join(SKILL_DIR, 'next-action.py')
let python = true
try { execFileSync('python3', ['--version']) } catch { python = false }
const opts = { skip: !python && 'python3 not installed' }

const SPEC = '# Spec\n'
const specHash = createHash('sha256').update(SPEC).digest('hex')
const ledger = reqs => createHash('sha256').update(JSON.stringify(reqs.map(r => ({ id: r.id, status: r.status }))) + '\n').digest('hex')
const slice = (id, status = 'todo', extra = {}) => ({ id, title: id, requirements: [], dependsOn: [], kind: 'spec', status, phase: 'plan', notes: '', ...extra })
const req = (id, status = 'done', extra = {}) => ({ id, status, flags: [], ...extra })

// files: name → value under .sdlc/ (objects are written as JSON, null skips the file)
function fixture(files = {}, { gitMode = 'direct', config = {} } = {}) {
  const repo = mkdtempSync(join(tmpdir(), 'sdlc-next-'))
  const s = join(repo, '.sdlc')
  mkdirSync(s)
  writeFileSync(join(repo, 'spec.md'), SPEC)
  const all = {
    'config.json': { specPath: 'spec.md', specHash, overridesSeen: 0, gitMode, defaultBranch: 'main', ...config },
    'requirements.json': [],
    'slices.json': [],
    'milestones.json': [],
    'DECISIONS.md': '# Decisions\n',
    ...files,
  }
  for (const [name, value] of Object.entries(all)) {
    if (value === null) continue
    writeFileSync(join(s, name), typeof value === 'string' ? value : JSON.stringify(value, null, 2))
  }
  return repo
}

function decide(repo, { rounds = 0, prs = null } = {}) {
  const args = [SCRIPT, '--repo', repo, '--bar-raiser-rounds', String(rounds)]
  if (prs) {
    const f = join(repo, 'prs.json')
    writeFileSync(f, JSON.stringify({ open: [], merged: [], ...prs }))
    args.push('--prs', f)
  }
  return JSON.parse(execFileSync('python3', args, { encoding: 'utf8' }))
}
const next = (repo, o) => decide(repo, o).next
const pr = (head, extra = {}) => ({ number: 7, headRefName: head, url: `https://example.test/pr/${head}`, mergeable: 'MERGEABLE', reviewDecision: '', statusCheckRollup: [], ...extra })
const passedAudit = reqs => ({ passed: true, ledgerHash: ledger(reqs), auditedIds: reqs.map(r => r.id) })

test('A: a STOP file wins over everything, even a missing config', opts, () => {
  const repo = fixture({ 'config.json': null, STOP: '' })
  assert.equal(next(repo).action, 'stop')
})

test('A: bootstrap when the config is missing, the spec changed, or an override was added', opts, () => {
  assert.match(next(fixture({ 'config.json': null })).reason, /config\.json is missing/)
  const changed = next(fixture({}, { config: { specHash: 'old' } }))
  assert.equal(changed.action, 'bootstrap')
  assert.match(changed.reason, /spec .* changed/)
  const over = next(fixture({ 'DECISIONS.md': '# Decisions\n### ADR-1\n- Status: OVERRIDE\n' }))
  assert.equal(over.action, 'bootstrap')
  assert.match(over.reason, /OVERRIDE/)
})

test('A: in pr mode a ready state PR is merged first, and one that is not ready means wait', opts, () => {
  const repo = fixture({ 'slices.json': [slice('S-1')] }, { gitMode: 'pr' })
  const ready = decide(repo, { prs: { open: [pr('sdlc/state-20260101', { number: 12 }), pr('sdlc/M-1-e2e', { number: 13 })] } })
  assert.deepEqual(ready.sync.slice(0, 2), ['gh pr merge 12 --squash --delete-branch', 'gh pr merge 13 --squash --delete-branch'])
  assert.match(ready.sync[2], /^git (pull --ff-only origin main|fetch origin main:main)$/)
  const blocked = next(repo, { prs: { open: [pr('sdlc/state-20260101', { reviewDecision: 'REVIEW_REQUIRED' })] } })
  assert.equal(blocked.action, 'wait')
  // an e2e PR that is not ready never blocks slices
  assert.equal(next(repo, { prs: { open: [pr('sdlc/M-1-e2e', { mergeable: 'CONFLICTING' })] } }).action, 'slice')
})

test('B: a slice whose PR is mergeable, approved and green is merged; a failing check or pending review is not', opts, () => {
  const repo = fixture({ 'slices.json': [slice('S-1')] }, { gitMode: 'pr' })
  const n = next(repo, { prs: { open: [pr('sdlc/S-1')] } })
  assert.equal(n.action, 'retryMerge')
  assert.equal(n.sliceId, 'S-1')
  assert.equal(n.slice.status, 'awaiting-merge')
  assert.equal(n.slice.pr, 'https://example.test/pr/sdlc/S-1')
  const red = pr('sdlc/S-1', { statusCheckRollup: [{ __typename: 'CheckRun', status: 'COMPLETED', conclusion: 'FAILURE' }] })
  assert.equal(next(repo, { prs: { open: [red] } }).action, 'wait')
  const green = pr('sdlc/S-1', { statusCheckRollup: [{ __typename: 'CheckRun', status: 'COMPLETED', conclusion: 'SKIPPED' }, { __typename: 'StatusContext', state: 'SUCCESS' }] })
  assert.equal(next(repo, { prs: { open: [green] } }).action, 'retryMerge')
  assert.equal(next(repo, { prs: { open: [pr('sdlc/S-1', { reviewDecision: 'CHANGES_REQUESTED' })] } }).action, 'wait')
})

test('B: a slice PR that a human merged is recorded, not rebuilt and not waited on', opts, () => {
  const repo = fixture({ 'slices.json': [slice('S-1', 'awaiting-merge', { pr: 'u' }), slice('S-2')] }, { gitMode: 'pr' })
  const n = next(repo, { prs: { merged: [{ number: 4, headRefName: 'sdlc/S-1', url: 'https://example.test/pr/4' }] } })
  assert.equal(n.action, 'retryMerge')
  assert.equal(n.sliceId, 'S-1')
  assert.match(n.reason, /was merged/)
})

test('B: a slice in progress resumes, with only the fields the workflow uses', opts, () => {
  const s = slice('S-2', 'in_progress', { phase: 'implement', counters: { fixRounds: 1 }, notes: 'x'.repeat(5000), seeds: [{ title: 't', detail: 'd' }] })
  const n = next(fixture({ 'slices.json': [slice('S-1', 'done'), s, slice('S-3')] }))
  assert.equal(n.action, 'slice')
  assert.deepEqual(n.slice, { id: 'S-2', kind: 'spec', status: 'in_progress', phase: 'implement', counters: { planRevisions: 0, fixRounds: 1, ladderStep: 0, parkCycles: 0 }, seeds: [{ title: 't', detail: 'd' }], pr: '' })
})

test('C: milestones are planned when the file is missing, and verified once every member is finished', opts, () => {
  assert.equal(next(fixture({ 'slices.json': [slice('S-1')], 'milestones.json': null })).action, 'milestonePlan')
  const slices = [slice('S-1', 'done'), slice('S-2', 'rejected', { notes: 'split into S-2a, S-2b' }), slice('S-2a', 'done'), slice('S-2b', 'parked', { counters: { parkCycles: 3 } }), slice('S-3')]
  const ms = [{ id: 'M-1', slices: ['S-1', 'S-2', 'S-gone'], status: 'pending', attempts: 0, fixSlices: [] }]
  const n = next(fixture({ 'slices.json': slices, 'milestones.json': ms }))
  assert.equal(n.action, 'milestone')
  assert.equal(n.milestoneId, 'M-1')
  assert.deepEqual(n.milestone, { id: 'M-1', status: 'pending', attempts: 0, fixSlices: [] })
  // a split child still to do holds the milestone back, and the next slice runs instead
  slices[2].status = 'todo'
  assert.equal(next(fixture({ 'slices.json': slices, 'milestones.json': ms })).sliceId, 'S-2a')
})

test('C: a fixing milestone runs again when its fix slices are finished, and never past three attempts', opts, () => {
  const slices = [slice('S-fix-M-1-1', 'done', { kind: 'fix' }), slice('S-1', 'done')]
  const m = { id: 'M-1', slices: ['S-1'], status: 'fixing', attempts: 1, fixSlices: ['S-fix-M-1-1'] }
  assert.equal(next(fixture({ 'slices.json': slices, 'milestones.json': [m] })).action, 'milestone')
  assert.equal(next(fixture({ 'slices.json': slices, 'milestones.json': [{ ...m, attempts: 3 }] })).action, 'audit')
  const split = [slice('S-fix-M-1-1', 'rejected', { kind: 'fix', splitInto: ['S-fix-M-1-1a'] }), slice('S-fix-M-1-1a', 'done', { kind: 'fix' }), slice('S-1', 'done')]
  assert.equal(next(fixture({ 'slices.json': split, 'milestones.json': [m] })).action, 'milestone')
})

test('D: the next todo slice needs its dependencies done, awaiting merge or parked; a missing or split one counts through', opts, () => {
  const ms = [{ id: 'M-1', slices: ['S-9'], status: 'verified' }]
  const run = slices => next(fixture({ 'slices.json': slices, 'milestones.json': ms }))
  assert.equal(run([slice('S-1'), slice('S-2', 'todo', { dependsOn: ['S-1'] })]).sliceId, 'S-1')
  assert.equal(run([slice('S-1', 'parked', { counters: { parkCycles: 3 } }), slice('S-2', 'todo', { dependsOn: ['S-1', 'S-missing'] })]).sliceId, 'S-2')
  const split = [slice('S-1', 'rejected', { splitInto: ['S-1a', 'S-1b'] }), slice('S-1a', 'done'), slice('S-1b'), slice('S-2', 'todo', { dependsOn: ['S-1'] })]
  assert.equal(run(split).sliceId, 'S-1b')
  split[2].status = 'done'
  assert.equal(run(split).sliceId, 'S-2')
})

test('D: a parked slice is retried while it has retries left, after every todo slice', opts, () => {
  const n = next(fixture({ 'slices.json': [slice('S-1', 'parked', { counters: { parkCycles: 2 } }), slice('S-2', 'done')] }))
  assert.equal(n.action, 'parkedRetry')
  assert.equal(n.sliceId, 'S-1')
})

test('E: todo slices that nothing can unblock are a livelock that names them', opts, () => {
  const n = next(fixture({ 'slices.json': [slice('S-1', 'todo', { dependsOn: ['S-2'] }), slice('S-2', 'todo', { dependsOn: ['S-1'] })] }))
  assert.equal(n.action, 'livelock')
  assert.match(n.reason, /S-1 waits on S-2; S-2 waits on S-1/)
  assert.match(n.summary, /requirements 0\/0 done/)
})

test('F: the audit runs when it is missing, failed or older than the ledger', opts, () => {
  const reqs = [req('R-1'), req('R-2')]
  const slices = [slice('S-1', 'done', { requirements: ['R-1', 'R-2'] })]
  const run = audit => next(fixture({ 'slices.json': slices, 'requirements.json': reqs, 'audit.json': audit }))
  assert.match(run(null).reason, /audit is missing/)
  assert.match(run({ passed: false, ledgerHash: '' }).reason, /audit is failed/)
  assert.match(run({ passed: true, ledgerHash: 'stale' }).reason, /out of date/)
  assert.equal(run(passedAudit(reqs)).action, 'done')
})

test('F: parked slices out of retries are a livelock; an unfinished requirement nobody owns is an error', opts, () => {
  const reqs = [req('R-1'), req('R-2', 'parked')]
  const slices = [slice('S-1', 'done', { requirements: ['R-1'] }), slice('S-2', 'parked', { requirements: ['R-2'], counters: { parkCycles: 3 } })]
  const n = next(fixture({ 'slices.json': slices, 'requirements.json': reqs, 'audit.json': passedAudit(reqs) }))
  assert.equal(n.action, 'livelock')
  assert.match(n.reason, /out of retries: S-2/)
  assert.match(n.summary, /requirements 1\/2 done, 1 parked/)
  const orphan = [req('R-1'), req('R-3', 'todo')]
  const e = next(fixture({ 'slices.json': [slices[0]], 'requirements.json': orphan, 'audit.json': passedAudit(orphan) }))
  assert.equal(e.action, 'error')
  assert.match(e.reason, /R-3/)
})

test('F: a milestone that is neither verified nor exhausted blocks done with an error', opts, () => {
  const reqs = [req('R-1')]
  const files = { 'slices.json': [slice('S-1', 'done'), slice('S-fix-M-1-1', 'rejected', { kind: 'fix' })], 'requirements.json': reqs, 'audit.json': passedAudit(reqs) }
  const e = next(fixture({ ...files, 'milestones.json': [{ id: 'M-1', slices: ['S-1'], status: 'fixing', attempts: 3, fixSlices: [] }] }))
  assert.equal(e.action, 'error')
  assert.match(e.reason, /M-1/)
})

test('F: the bar raiser runs only while rounds are left and it has not gone dry twice', opts, () => {
  const reqs = [req('R-1'), req('R-2', 'done', { flags: ['obsolete'] })]
  const files = { 'slices.json': [slice('S-1', 'done')], 'requirements.json': reqs, 'audit.json': passedAudit(reqs), 'DECISIONS.md': '# Decisions\n### ADR-1\n### ADR-2\n' }
  const off = next(fixture(files))
  assert.equal(off.action, 'done')
  assert.match(off.summary, /requirements 1\/1 done.*2 ADRs.*bar raiser off/)
  assert.equal(next(fixture(files), { rounds: 2 }).action, 'barRaiserRound')
  assert.equal(next(fixture({ ...files, 'barraiser.json': { dryRounds: 0, rounds: 2 } }), { rounds: 2 }).action, 'done')
  assert.match(next(fixture({ ...files, 'barraiser.json': { dryRounds: 0, rounds: 2 } }), { rounds: 2 }).summary, /without two dry rounds/)
  assert.equal(next(fixture({ ...files, 'barraiser.json': { dryRounds: 2, rounds: 1 } }), { rounds: 5 }).action, 'done')
})

test('a state file that is not valid JSON is an error; a wrapped slices list is read', opts, () => {
  const e = next(fixture({ 'slices.json': '<<<<<<< HEAD\n[]' }))
  assert.equal(e.action, 'error')
  assert.match(e.reason, /slices\.json is not valid JSON/)
  assert.equal(next(fixture({ 'slices.json': { slices: [slice('S-1')] } })).sliceId, 'S-1')
})

test('the ledger hash matches the jq command in state-schema.md', opts, t => {
  try { execFileSync('jq', ['--version']) } catch { return t.skip('jq not installed') }
  const reqs = [req('R-1'), req('R-2', 'parked'), { id: 'R-3' }]
  const repo = fixture({ 'requirements.json': reqs })
  const jq = execFileSync('sh', ['-c', `jq -c '[.[] | {id, status}]' .sdlc/requirements.json | shasum -a 256 | cut -d' ' -f1`], { cwd: repo, encoding: 'utf8' }).trim()
  // the audit counts as passed only if the script computes the same hash
  writeFileSync(join(repo, '.sdlc', 'audit.json'), JSON.stringify({ passed: true, ledgerHash: jq }))
  writeFileSync(join(repo, '.sdlc', 'slices.json'), JSON.stringify([slice('S-1', 'parked', { requirements: ['R-2', 'R-3'], counters: { parkCycles: 3 } })]))
  assert.equal(next(repo).action, 'livelock')
})

function git(repo, ...args) {
  return execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.test', '-c', 'commit.gpgsign=false', ...args], { cwd: repo, encoding: 'utf8' })
}

test('a slice in progress on its own branch is found from the default branch, and stays the decision after a merge', opts, () => {
  const repo = fixture({ 'slices.json': [slice('S-1')] })
  git(repo, 'init', '-q', '-b', 'main')
  git(repo, 'add', '-A')
  git(repo, 'commit', '-q', '-m', 'bootstrap')
  git(repo, 'checkout', '-q', '-b', 'sdlc/S-1')
  writeFileSync(join(repo, '.sdlc', 'slices.json'), JSON.stringify([slice('S-1', 'in_progress', { phase: 'implement' })]))
  git(repo, 'commit', '-q', '-am', 'state S-1')
  git(repo, 'checkout', '-q', 'main')
  const d = decide(repo)
  assert.equal(d.next.action, 'slice')
  assert.equal(d.next.slice.phase, 'implement')
  assert.equal(d.checkout, 'sdlc/S-1')
  git(repo, 'checkout', '-q', 'sdlc/S-1')
  assert.equal(decide(repo).checkout, null)
})

test('an open PR left by an attempt that was replanned does not hold the slice', opts, () => {
  const repo = fixture({ 'slices.json': [slice('S-1'), slice('S-2')] }, { gitMode: 'pr' })
  git(repo, 'init', '-q', '-b', 'main')
  git(repo, 'add', '-A')
  git(repo, 'commit', '-q', '-m', 'bootstrap')
  git(repo, 'checkout', '-q', '-b', 'sdlc/S-1')
  writeFileSync(join(repo, '.sdlc', 'slices.json'), JSON.stringify([slice('S-1', 'in_progress'), slice('S-2')]))
  git(repo, 'commit', '-q', '-am', 'replanned')
  git(repo, 'checkout', '-q', 'main')
  const n = next(repo, { prs: { open: [pr('sdlc/S-1', { reviewDecision: 'REVIEW_REQUIRED' })] } })
  assert.equal(n.action, 'slice')
  assert.equal(n.sliceId, 'S-1')
  assert.equal(n.slice.status, 'in_progress')
})

test('stack mode waits while a milestone pull request is open', opts, () => {
  const repo = fixture({
    'slices.json': [slice('S-014', 'done')],
    'milestones.json': [{ id: 'M-2', status: 'verified', slices: ['S-014'], fixSlices: [] }],
  }, { gitMode: 'stack', config: { runBranch: 'sdlc/run-1' } })
  const n = next(repo, { prs: { open: [pr('sdlc/M-2', { mergeable: 'CONFLICTING', reviewDecision: 'REVIEW_REQUIRED' })] } })
  assert.equal(n.action, 'wait')
  assert.match(n.reason, /M-2/)
})

test('stack mode waits on a milestone pull request that is green but unreviewed', opts, () => {
  const repo = fixture({
    'slices.json': [slice('S-014', 'done')],
    'milestones.json': [{ id: 'M-2', status: 'verified', slices: ['S-014'], fixSlices: [] }],
  }, { gitMode: 'stack', config: { runBranch: 'sdlc/run-1' } })
  const n = next(repo, { prs: { open: [pr('sdlc/M-2', { reviewDecision: 'REVIEW_REQUIRED' })] } })
  assert.equal(n.action, 'wait')
})

test('stack mode does not wait once the milestone pull request has merged', opts, () => {
  const repo = fixture({
    'slices.json': [slice('S-014', 'done')],
    'milestones.json': [{ id: 'M-2', status: 'verified', slices: ['S-014'], fixSlices: [] }],
  }, { gitMode: 'stack', config: { runBranch: 'sdlc/run-1' } })
  const n = next(repo, { prs: { merged: [pr('sdlc/M-2')] } })
  assert.notEqual(n.action, 'wait')
})

test('stack mode ignores an sdlc/M-1-e2e pull request when deciding whether to wait', opts, () => {
  const repo = fixture({
    'slices.json': [slice('S-014', 'todo')],
    'milestones.json': [{ id: 'M-1', status: 'pending', slices: ['S-014'], fixSlices: [] }],
  }, { gitMode: 'stack', config: { runBranch: 'sdlc/run-1' } })
  const n = next(repo, { prs: { open: [pr('sdlc/M-1-e2e')] } })
  assert.notEqual(n.action, 'wait', 'the e2e branch is merged locally in stack mode, never as a pull request')
})

test('pr mode still merges a ready e2e pull request itself', opts, () => {
  const repo = fixture({ 'slices.json': [slice('S-014', 'todo')] }, { gitMode: 'pr' })
  const r = decide(repo, { prs: { open: [pr('sdlc/M-1-e2e')] } })
  assert.ok(r.sync.some(c => /gh pr merge/.test(c)))
})

test('stack mode holds on a milestone pull request before the milestone is recorded as verified', opts, () => {
  // The milestone's own state is committed on sdlc/M-<n>, so the default branch still records the
  // milestone as unverified with every slice finished. That is exactly section C's trigger, so a hold
  // placed any later would re-hand the milestone to the milestone-writer and loop until a human merged.
  const repo = fixture({
    'slices.json': [slice('S-014', 'done')],
    'milestones.json': [{ id: 'M-2', status: 'fixing', attempts: 1, slices: ['S-014'], fixSlices: [] }],
  }, { gitMode: 'stack', config: { runBranch: 'sdlc/run-1' } })
  const n = next(repo, { prs: { open: [pr('sdlc/M-2', { reviewDecision: 'REVIEW_REQUIRED' })] } })
  assert.equal(n.action, 'wait', 'the milestone must not be handed back to the milestone-writer')
  assert.match(n.reason, /M-2/)
})

test('stack mode does not hold on a milestone pull request that is ready to merge', opts, () => {
  const repo = fixture({
    'slices.json': [slice('S-014', 'todo')],
    'milestones.json': [{ id: 'M-2', status: 'verified', slices: ['S-014'], fixSlices: [] }],
  }, { gitMode: 'stack', config: { runBranch: 'sdlc/run-1' } })
  const n = next(repo, { prs: { open: [pr('sdlc/M-2')] } })
  assert.notEqual(n.action, 'wait')
})
