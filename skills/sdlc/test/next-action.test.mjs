import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { SKILL_DIR } from './harness.mjs'

const SCRIPT = join(SKILL_DIR, 'next-action.py')
// the modes the script accepts, from the one file that names them, so this test cannot assert a list
// that has quietly stopped being the script's own
const GIT_MODES = JSON.parse(readFileSync(join(SKILL_DIR, 'git-modes.json'), 'utf8')).gitModes
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

test('a gitMode this script does not know is an error, not a mode it falls through', opts, () => {
  // config.json is written by an agent, so nothing but this check constrains gitMode to the modes named in
  // git-modes.json. A typo falls through every arm and behaves like direct: slices committed to the default
  // branch, no pull request, no push — which in stack mode is the one thing the mode exists to prevent.
  // Failing loudly costs a rerun; falling through costs the guarantee, silently. The expected list is read
  // from that file rather than spelled out here, so it cannot drift from the script it checks.
  for (const mode of ['stak', 'STACK', 'PullRequest', '']) {
    const repo = fixture({ 'slices.json': [slice('S-1')] }, { gitMode: mode })
    const n = next(repo)
    if (mode === '') {
      assert.notEqual(n.action, 'error', 'an unset gitMode is pre-existing behaviour and must not change')
      continue
    }
    assert.equal(n.action, 'error', `${mode} must not be silently accepted`)
    assert.match(n.reason, new RegExp(mode))
    assert.match(n.reason, new RegExp(GIT_MODES.join(', ')))
  }
  // every known mode is still accepted (the pr-shaped ones are given a prs file so they need no gh)
  for (const mode of GIT_MODES) {
    const repo = fixture({ 'slices.json': [slice('S-1')] }, { gitMode: mode })
    assert.notEqual(next(repo, { prs: {} }).action, 'error', `${mode} mode was rejected`)
  }
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
  const d = decide(repo, { prs: { open: [pr('sdlc/M-2', { mergeable: 'CONFLICTING', reviewDecision: 'REVIEW_REQUIRED' })] } })
  assert.equal(d.next?.action, 'wait')
  assert.match(d.next?.reason ?? '', /M-2/)
})

test('stack mode waits on a milestone pull request that is green but unreviewed', opts, () => {
  const repo = fixture({
    'slices.json': [slice('S-014', 'done')],
    'milestones.json': [{ id: 'M-2', status: 'verified', slices: ['S-014'], fixSlices: [] }],
  }, { gitMode: 'stack', config: { runBranch: 'sdlc/run-1' } })
  const d = decide(repo, { prs: { open: [pr('sdlc/M-2', { reviewDecision: 'REVIEW_REQUIRED' })] } })
  assert.equal(d.next?.action, 'wait')
})

test('stack mode does not wait once the milestone pull request has merged', opts, () => {
  const repo = fixture({
    'slices.json': [slice('S-014', 'done')],
    'milestones.json': [{ id: 'M-2', status: 'verified', slices: ['S-014'], fixSlices: [] }],
  }, { gitMode: 'stack', config: { runBranch: 'sdlc/run-1' } })
  const d = decide(repo, { prs: { merged: [pr('sdlc/M-2')] } })
  assert.notEqual(d.next?.action, 'wait')
})

test('stack mode ignores an sdlc/M-1-e2e pull request when deciding whether to wait', opts, () => {
  const repo = fixture({
    'slices.json': [slice('S-014', 'todo')],
    'milestones.json': [{ id: 'M-1', status: 'pending', slices: ['S-014'], fixSlices: [] }],
  }, { gitMode: 'stack', config: { runBranch: 'sdlc/run-1' } })
  const d = decide(repo, { prs: { open: [pr('sdlc/M-1-e2e')] } })
  assert.notEqual(d.next?.action, 'wait', 'the e2e branch is merged locally in stack mode, never as a pull request')
})

test('stack mode does not hold on an unreviewed e2e pull request left by a run that changed mode', opts, () => {
  // Stack mode has no e2e-pull-request arm, so nothing would ever merge one of these: holding on it would
  // livelock the run forever. The head matches a milestone-branch shape, so the exclusion has to be the
  // e2e suffix itself and cannot be left to the pattern that decides "this is a milestone branch" —
  // `sdlc/M-1-e2e` matches `sdlc/M-[^/]+` exactly as `sdlc/M-1` does. Every head shape is checked, because
  // an exclusion written as a pattern suffix or a lookbehind is easy to get right for one and wrong for another.
  for (const head of ['sdlc/M-1-e2e', 'sdlc/M-10-e2e', 'sdlc/M-0-e2e']) {
    const repo = fixture({
      'slices.json': [slice('S-014', 'todo')],
      'milestones.json': [{ id: 'M-1', status: 'pending', slices: ['S-014'], fixSlices: [] }],
    }, { gitMode: 'stack', config: { runBranch: 'sdlc/run-1' } })
    const d = decide(repo, { prs: { open: [pr(head, { reviewDecision: 'REVIEW_REQUIRED' })] } })
    assert.notEqual(d.next?.action, 'wait', `a stale ${head} pull request must never hold the run`)
  }
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
  const d = decide(repo, { prs: { open: [pr('sdlc/M-2', { reviewDecision: 'REVIEW_REQUIRED' })] } })
  assert.equal(d.next?.action, 'wait', 'the milestone must not be handed back to the milestone-writer')
  assert.match(d.next?.reason ?? '', /M-2/)
})

test('stack mode holds on a milestone pull request that is green and ready to merge', opts, () => {
  // The topology an OPEN, ready milestone pull request actually leaves. The milestone's own record is
  // committed on sdlc/M-1 and reaches the default branch only when the pull request merges, so main still
  // reads M-1 as pending with its only slice finished — section C's exact trigger, which hands the
  // milestone back to the milestone-writer to re-run the whole behavior campaign. On a repository with no
  // required reviews a green pull request is `pr_ready`, so a hold that skipped ready pull requests never
  // fired here and the loop spun. Built with a real git repo because the record's branch is the whole point.
  const repo = fixture({
    'slices.json': [slice('S-014', 'done')],
    'milestones.json': [{ id: 'M-1', status: 'pending', attempts: 0, slices: ['S-014'], fixSlices: [] }],
  }, { gitMode: 'stack', config: { runBranch: 'sdlc/run-1' } })
  git(repo, 'init', '-q', '-b', 'main')
  git(repo, 'add', '-A')
  git(repo, 'commit', '-q', '-m', 'bootstrap')
  git(repo, 'checkout', '-q', '-b', 'sdlc/M-1')
  writeFileSync(join(repo, '.sdlc', 'milestones.json'), JSON.stringify([
    { id: 'M-1', status: 'verified', attempts: 1, slices: ['S-014'], fixSlices: [], pr: 'https://example.test/pr/sdlc/M-1' },
  ]))
  git(repo, 'commit', '-q', '-am', 'milestone M-1 verified')
  git(repo, 'checkout', '-q', 'main')
  // main genuinely still reads the milestone as pending with everything finished
  const onMain = JSON.parse(git(repo, 'show', 'main:.sdlc/milestones.json'))
  assert.deepEqual([onMain[0].status, onMain[0].slices], ['pending', ['S-014']])
  // ready: mergeable, no review required, no failing check
  const d = decide(repo, { prs: { open: [pr('sdlc/M-1')] } })
  assert.equal(d.next?.action, 'wait', 'an open milestone PR holds the run whether or not it is ready to merge')
  assert.match(d.next?.reason ?? '', /M-1/)
})

test('stack mode holds on a milestone pull request whose milestone is not on the default branch yet', opts, () => {
  // The topology the other stack tests cannot see: M-2's record is committed on sdlc/M-2 only and reaches
  // the default branch when its pull request merges. Deciding from the default branch, milestones.json
  // holds M-1 and never mentions M-2 — so a hold keyed on milestones.json never fires, and the mode's
  // central guarantee silently does not hold. Built with a real git repo for exactly that reason.
  const repo = fixture({
    'slices.json': [slice('S-014', 'done')],
    'milestones.json': [{ id: 'M-1', status: 'verified', attempts: 1, slices: [], fixSlices: [] }],
  }, { gitMode: 'stack', config: { runBranch: 'sdlc/run-1' } })
  git(repo, 'init', '-q', '-b', 'main')
  git(repo, 'add', '-A')
  git(repo, 'commit', '-q', '-m', 'bootstrap')
  // the milestone branch carries the record the default branch does not have yet
  git(repo, 'checkout', '-q', '-b', 'sdlc/M-2')
  writeFileSync(join(repo, '.sdlc', 'milestones.json'), JSON.stringify([
    { id: 'M-1', status: 'verified', attempts: 1, slices: [], fixSlices: [] },
    { id: 'M-2', status: 'verified', attempts: 1, slices: ['S-014'], fixSlices: [], pr: 'https://example.test/pr/sdlc/M-2' },
  ]))
  git(repo, 'commit', '-q', '-am', 'milestone M-2 verified')
  git(repo, 'checkout', '-q', 'main')
  // the default branch really does not know about M-2
  assert.doesNotMatch(JSON.stringify(JSON.parse(git(repo, 'show', 'main:.sdlc/milestones.json'))), /M-2/)
  // decide(), not next(): a mutated script that answers with a sync list has no .next, and next() would
  // die on a null deref that names neither the test nor the cause
  const d = decide(repo, { prs: { open: [pr('sdlc/M-2', { reviewDecision: 'REVIEW_REQUIRED' })] } })
  assert.equal(d.next?.action, 'wait', 'an open milestone PR must hold the run even before its record reaches the default branch')
  assert.match(d.next?.reason ?? '', /M-2/)
})

test('stack mode stops holding once the milestone pull request is merged into the default branch', opts, () => {
  const repo = fixture({
    'slices.json': [slice('S-014', 'done')],
    'milestones.json': [{ id: 'M-1', status: 'verified', attempts: 1, slices: [], fixSlices: [] }],
  }, { gitMode: 'stack', config: { runBranch: 'sdlc/run-1' } })
  git(repo, 'init', '-q', '-b', 'main')
  git(repo, 'add', '-A')
  git(repo, 'commit', '-q', '-m', 'bootstrap')
  git(repo, 'checkout', '-q', '-b', 'sdlc/M-2')
  writeFileSync(join(repo, '.sdlc', 'milestones.json'), JSON.stringify([
    { id: 'M-1', status: 'verified', attempts: 1, slices: [], fixSlices: [] },
    { id: 'M-2', status: 'verified', attempts: 1, slices: ['S-014'], fixSlices: [], pr: 'https://example.test/pr/sdlc/M-2' },
  ]))
  git(repo, 'commit', '-q', '-am', 'milestone M-2 verified')
  // merged: the record is now on the default branch too, and the pull request is closed
  git(repo, 'checkout', '-q', 'main')
  git(repo, 'merge', '-q', '--no-edit', 'sdlc/M-2')
  const d = decide(repo, { prs: { merged: [pr('sdlc/M-2')] } })
  assert.notEqual(d.next?.action, 'wait', 'a merged milestone PR must not hold the run')
})
