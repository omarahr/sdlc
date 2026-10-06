import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { scriptSource, SKILL_DIR } from './harness.mjs'

test('every agent role used by the script has a prompt file', () => {
  const roles = [...new Set([...scriptSource().matchAll(/run\('([a-z-]+)'/g)].map(m => m[1]))]
  assert.ok(roles.length > 0)
  assert.deepEqual(roles.filter(r => !existsSync(join(SKILL_DIR, 'prompts', `${r}.md`))), [])
})

test('shared prompt files exist', () => {
  for (const f of ['_common', 'state-schema', 'commit-state', 'env-fixer', 'run-request']) {
    assert.ok(existsSync(join(SKILL_DIR, 'prompts', `${f}.md`)), `${f}.md missing`)
  }
})

test('script avoids APIs the workflow runtime forbids', () => {
  const src = scriptSource()
  assert.doesNotMatch(src, /Date\.now\(|Math\.random\(|new Date\(\)/)
  assert.doesNotMatch(src, /^\s*import\s/m)
  assert.doesNotMatch(src, /require\(/)
  assert.match(src, /^export const meta = \{/m)
})

test('the slicer rates each slice\'s verification risk, low only for harmless changes', () => {
  const slicer = readFileSync(join(SKILL_DIR, 'prompts', 'slicer.md'), 'utf8')
  assert.match(slicer, /`risk` is `low`, `medium` or `high`/)
  assert.match(slicer, /riskReason/)
  assert.match(slicer, /[Ww]hen in doubt, (rate )?`medium`/)
  const schema = readFileSync(join(SKILL_DIR, 'prompts', 'state-schema.md'), 'utf8')
  assert.match(schema, /"risk": ""/)
  assert.match(schema, /"riskReason": ""/)
  assert.match(schema, /no `risk`[\s\S]{0,200}full (verification )?battery|unrated[\s\S]{0,200}full (verification )?battery/i)
})

test('every prompt that branches on the git mode says what mr mode does', () => {
  for (const f of ['integrator', 'commit-state', 'milestone-writer', 'env-detector', 'state-schema', 'state-reader', 'e2e-harness', 'implementer']) {
    assert.match(readFileSync(join(SKILL_DIR, 'prompts', `${f}.md`), 'utf8'), /`mr`/, `${f}.md does not mention mr mode`)
  }
})

test('the mode-agnostic prompts cover stack mode', () => {
  for (const f of ['commit-state', 'state-schema']) {
    const text = readFileSync(join(SKILL_DIR, 'prompts', `${f}.md`), 'utf8')
    assert.match(text, /`stack`/, `${f}.md does not mention stack mode`)
  }
})

test('the skill documents the stack flag, its remote requirement and its resume path', () => {
  const skill = readFileSync(join(SKILL_DIR, 'SKILL.md'), 'utf8')
  assert.match(skill, /--git pr\|direct\|mr\|stack/)
  assert.match(skill, /`sdlc\/run-<n>`/)
  // the "rename your branch" check must not fire on a resume, where the current branch IS the run branch
  assert.match(skill, /first run only[\s\S]{0,400}runBranch/)
})

test('config.json documents runBranch, and milestones document their pr field', () => {
  const schema = readFileSync(join(SKILL_DIR, 'prompts', 'state-schema.md'), 'utf8')
  assert.match(schema, /"runBranch": ""/)
  assert.match(schema, /"fixSlices": \[\],\n\s*"pr": ""/)
})

test('the common rules scope the relayed user request to the driver', () => {
  const common = readFileSync(join(SKILL_DIR, 'prompts', '_common.md'), 'utf8')
  assert.match(common, /relayed user request/)
  assert.match(common, /do not create or switch branches/)
})

test('the e2e harness cuts its branch from the milestone branch in stack mode, and names a base for every mode', () => {
  const e = readFileSync(join(SKILL_DIR, 'prompts', 'e2e-harness.md'), 'utf8')
  // the ownership sentence sits mid-paragraph, so anchor on the sentence rather than the line start
  const owner = e.match(/You commit on branch `sdlc\/<milestoneId>-e2e`\.[^\n]*/)
  assert.ok(owner, 'the ownership sentence is missing')
  assert.match(owner[0], /In `stack` mode it is cut from `sdlc\/M-<n>`, the milestone branch, not the default branch/)
  // anchored on step 1, so a stray mention elsewhere in the file cannot satisfy it
  const step1 = e.match(/^1\. \*\*Branch:\*\*.*$/m)
  assert.ok(step1, 'step 1 is missing')
  // stack mode bases the suite on the milestone branch, and defers to the slice that created it
  assert.match(step1[0], /In `stack` mode cut it from the milestone branch `sdlc\/M-<n>`/)
  assert.match(step1[0], /if it is missing, stop and say so rather than creating it/)
  // the other three modes keep a base of their own, so direct and mr agents are not left without one
  assert.match(step1[0], /In `pr` mode cut it from the up-to-date default branch/)
  assert.match(step1[0], /In `direct` and `mr` mode cut it from the working branch \(`config\.defaultBranch`\)/)
  assert.match(step1[0], /Never cut it from the default branch in `stack` mode/)
})

test('the env-detector creates and pushes the run branch, and refuses stack without a github remote', () => {
  const env = readFileSync(join(SKILL_DIR, 'prompts', 'env-detector.md'), 'utf8')
  assert.match(env, /git checkout -b sdlc\/run-<n> <defaultBranch>/)
  assert.match(env, /git push -u origin sdlc\/run-<n>/)
  // n is 1 + the highest existing, so a second run cannot clobber a live one — local and remote alike
  assert.match(env, /refs\/heads\/sdlc\/run-\*/)
  assert.match(env, /refs\/remotes\/origin\/sdlc\/run-\*/)
  assert.match(env, /drop the `origin\/` prefix before reading `<n>`/)
  // anchored on the stack sentence: a bare /cannot work/ also matches the pre-existing mr bullet,
  // which would let the stack refusal be deleted without this test noticing
  assert.match(env, /`stack` mode cannot work without a github\.com remote and a signed-in `gh`/)
  // a run the user asked to be review-gated is reported and ended, never quietly downgraded to direct
  assert.match(env, /`stack` mode cannot work[\s\S]{0,300}report why and end rather than falling back to `direct`/)
  assert.match(env, /A branch named by `runBranch` that does not exist[\s\S]{0,200}report it and end/)
})

test('the env-detector resolves stack from the input or an existing config, and stores a bare defaultBranch', () => {
  const env = readFileSync(join(SKILL_DIR, 'prompts', 'env-detector.md'), 'utf8')
  // the input and an existing config are both consulted before any detection fallback, so a stack
  // run survives a relaunch. A list guarded by "otherwise:" made the stack arm unreachable.
  assert.match(env, /the `gitMode` input;[\s\S]{0,200}an existing `config\.gitMode`[\s\S]{0,200}otherwise detect one/)
  assert.match(env, /`stack` is never detected/)
  // symbolic-ref without --short prints refs/remotes/origin/main; every later consumer wants main
  assert.match(env, /`defaultBranch`: from `git symbolic-ref --short refs\/remotes\/origin\/HEAD`/)
  assert.match(env, /always a bare branch name/)
})

test('the integrator deletes archived attempt branches once a slice ships', () => {
  const integrator = readFileSync(join(SKILL_DIR, 'prompts', 'integrator.md'), 'utf8')
  assert.match(integrator, /\*\*Clean up\*\*/)
  assert.match(integrator, /sdlc\/<id>-attempt-\*/)
  assert.match(integrator, /splitInto/)
  assert.match(integrator, /Never delete a branch of a slice that is not finished/)
})

test('the integrator asks the code for the slice base branch instead of naming it in prose', () => {
  const i = readFileSync(join(SKILL_DIR, 'prompts', 'integrator.md'), 'utf8')
  assert.match(i, /`stack` mode/)
  // the pull request targets the slice's base branch
  assert.match(i, /--base <baseBranch>/)
  // and the evidence diff uses that same base, not the default branch
  assert.match(i, /git diff --name-only <baseBranch>\.\.\.HEAD/)
  assert.match(i, /--ref sdlc\/<id>/)
  // The base is now the answer `base-branch` prints, and the prompt says so where it is defined —
  // both in the evidence step and in the ship step, since each is read on its own.
  assert.match(i, /state-write\.py" base-branch --repo \. --slice <id>/)
  assert.match(i, /Use what it prints|use the `branch` it returns/)
  // The two-case prose rule is gone, and these are what pin that: an integrator told the rule in
  // words is an integrator re-deriving it, which is how commit-state.md picked the wrong branch. Both
  // the names and the mode-based deduction must be absent, not merely accompanied by a mention.
  assert.doesNotMatch(i, /milestone branch `sdlc\/M-<n>`/)
  assert.doesNotMatch(i, /in `pr` mode `<defaultBranch>`/)
  assert.doesNotMatch(i, /Read `gitMode` from/)
  // and the prohibition stays, now against both routes back to deducing it: gitMode alone cannot say
  // which milestone owns the slice, and a git command fails outright on a shallow clone
  assert.match(i, /Do not work the base out yourself/)
  assert.match(i, /not from `gitMode`, and not with a git command/)
  // a failed run names no branch, so the prompt must tell the agent to stop rather than pick one
  assert.match(i, /exits non-zero it printed why and named no branch/)
  assert.doesNotMatch(i, /merge-base/)
})

test('the milestone-writer opens the milestone pull request and retargets the e2e merge', () => {
  const m = readFileSync(join(SKILL_DIR, 'prompts', 'milestone-writer.md'), 'utf8')
  assert.match(m, /## Ship the milestone/)
  assert.match(m, /--base <defaultBranch>/)
  assert.match(m, /"pr": "<url>"/)
  assert.match(m, /sdlc\/run-<n>/)
  // the e2e suite merges into the milestone branch, not the default branch
  assert.match(m, /`stack` mode[\s\S]{0,300}sdlc\/M-<n>/)
})

test('the milestone-writer defers the milestone branch to its owner rather than creating it', () => {
  const m = readFileSync(join(SKILL_DIR, 'prompts', 'milestone-writer.md'), 'utf8')
  // ensure_milestone_branch is the only owner of sdlc/M-<n>; a second recipe here is the duplicate-owner defect
  assert.match(m, /if it is missing, stop and report it rather than creating it/)
  assert.doesNotMatch(m, /create `sdlc\/M-<n>`/)
})

test('the milestone-writer leaves both branch transitions to the code', () => {
  const m = readFileSync(join(SKILL_DIR, 'prompts', 'milestone-writer.md'), 'utf8')
  const merged = m.slice(m.indexOf('6. **Merged:**'))
  assert.ok(merged.length, 'the Merged step is gone')
  // Both transitions belong to state-write.py. Describing either here is the duplicate owner that left the
  // run branch stale and the milestone branches behind: the writer only runs while a milestone is due, so its
  // Merged step is unreachable for a milestone that already merged, and nothing ran what it described.
  assert.doesNotMatch(merged, /merge --ff-only/, 'the Merged step must not merge anything into the run branch')
  assert.match(merged, /advance_run_branch/)
  assert.match(merged, /prune_stale_milestone_branches/)
  // and the deletion it used to spell out is gone rather than re-described. `-d` was wrong twice over: after
  // a squash merge git refuses a branch whose work did ship, and the step told the agent to stop on a
  // milestone that merged perfectly.
  assert.doesNotMatch(merged, /git branch -[dD]/)
  assert.doesNotMatch(merged, /push origin --delete/)
  assert.doesNotMatch(m, /git branch -[dD]/, 'no step may spell out a branch deletion the code owns')
  assert.doesNotMatch(m, /branch -D/, 'a milestone branch is never forced away')
})

test('the stack commit rule states when the run branch is actually pushed', () => {
  const c = readFileSync(join(SKILL_DIR, 'prompts', 'commit-state.md'), 'utf8')
  // advance_run_branch pushes only when the merge moved the branch, so a commit made while the run branch is
  // already level with origin/<defaultBranch> stays local. Saying it is pushed "at the moment it advances"
  // implies a push on every cut, and the reviewer verified the advance is a no-op in exactly that case.
  assert.match(c, /only by an advance that actually moves it/)
  assert.match(c, /no-op and pushes nothing/)
})

test('the implementer times the suite against the slice base branch in stack mode', () => {
  const i = readFileSync(join(SKILL_DIR, 'prompts', 'implementer.md'), 'utf8')
  assert.match(i, /`stack` mode/)
  assert.match(i, /base branch/)
})

test('the stack commit rule names the branch instead of guessing it from a milestone status', () => {
  const c = readFileSync(join(SKILL_DIR, 'prompts', 'commit-state.md'), 'utf8')
  // the status heuristic misrouted eight callers: a milestone is `verified` by the time its writer commits
  assert.doesNotMatch(c, /whose status is not `verified`/)
  assert.match(c, /commit on the milestone branch the slice or milestone in this commit belongs to/)
  assert.match(c, /`runBranch` when it belongs to no milestone/)
  // every caller that says "default-branch commit" has to say where that is in stack mode
  for (const f of ['stuck-writer', 'barraiser-writer', 'milestone-planner', 'state-writer', 'escalator']) {
    const text = readFileSync(join(SKILL_DIR, 'prompts', `${f}.md`), 'utf8')
    assert.match(text, /`stack` mode/, `${f}.md says "default-branch commit" but never mentions stack mode`)
  }
})

test('the escalator and force-park ask for the branch rather than naming it, and never the default branch', () => {
  const e = readFileSync(join(SKILL_DIR, 'prompts', 'escalator.md'), 'utf8')
  // One owner for the base-branch rule: the command defines `<baseBranch>` once, and every site that
  // used to spell out `sdlc/M-<n>`-or-runBranch now refers to it. Asserting the *absence* of the prose
  // rule is what makes this a real test — a prompt that still names the branch is a second owner, which
  // is how the wrong branch reached a commit in the first place.
  assert.match(e, /state-write\.py" base-branch --repo \. --slice <sliceId>/)
  assert.match(e, /Use the `branch` it prints/)
  assert.doesNotMatch(e, /sdlc\/M-<n>/, 'escalator.md must not name the milestone branch: the command owns that')
  assert.doesNotMatch(e, /runBranch when the slice belongs to no milestone/, 'escalator.md must not restate the no-milestone case')
  // each of the three sites still reaches the same `<baseBranch>`, so none quietly reverted to a literal
  assert.match(e, /`git checkout <baseBranch>`/)
  assert.match(e, /Every \*\*default-branch commit\*\* below lands on `<baseBranch>`/)
  assert.match(e, /Create a fresh `sdlc\/<id>` from `<baseBranch>`/)
  assert.match(e, /from `<baseBranch>`, the same base as the slice itself/)
  // and the prohibition that survives the rewrite: the default branch is never a stack target
  assert.match(e, /In `stack` mode the default branch is never committed to/)
  assert.match(e, /Never cut it from `<defaultBranch>` in `stack` mode/)
  assert.doesNotMatch(e, /On a scratch branch `sdlc\/<id>-spike` from the default branch/)
  // the copy of the write-up still has to follow the checkout
  assert.match(e, /after\*\* the checkout in step 2/)

  const w = readFileSync(join(SKILL_DIR, 'prompts', 'state-writer.md'), 'utf8')
  // bootstrap and the audit keep naming runBranch: neither has a slice to ask about — they run before
  // any milestone exists, and the audit's own commit belongs to no milestone — so a command call would
  // be ceremony around a constant. Their tests below still pin the reason they land there.
  assert.match(w, /bootstrap belongs to no milestone/)
  assert.match(w, /the audit belongs to no milestone/)
  // force-park is the opposite case: it parks a named slice, so its branch varies and is asked for.
  // A wrong branch here silently strands the slice's write-up where nothing will read it.
  const park = w.split('\n').find(l => l.includes('force-park <id>'))
  assert.ok(park, 'the force-park commit line is missing')
  assert.match(park, /on that branch/)
  assert.match(w, /state-write\.py" base-branch --repo \. --slice <sliceId>/)
  assert.match(w, /In `stack` mode the default branch is never committed to/)
  assert.match(w, /after\*\* renaming, and after checking the branch out/)
})
