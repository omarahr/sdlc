import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { join } from 'node:path'
import { scriptSource, SKILL_DIR } from './harness.mjs'

test('the reviewer can demand the verification battery for a mis-rated slice, and the schema passes the flag', () => {
  const reviewer = readFileSync(join(SKILL_DIR, 'prompts', 'reviewer.md'), 'utf8')
  assert.match(reviewer, /needsVerify/)
  assert.match(reviewer, /riskier than (that|the) (label|rating)|mis-rated/)
  const loop = readFileSync(join(SKILL_DIR, 'sdlc-loop.js'), 'utf8')
  const findings = loop.match(/const FINDINGS = \{[\s\S]*?\n\}/)[0]
  assert.match(findings, /needsVerify/, 'a flag the schema strips never reaches the loop')
})

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
  assert.match(owner[0], /In `stack` mode the branch is cut from `sdlc\/M-<n>`, the milestone branch, not the default branch/)
  // anchored on step 1, so a stray mention elsewhere in the file cannot satisfy it
  const step1 = e.match(/^1\. \*\*Branch:\*\*.*$/m)
  assert.ok(step1, 'step 1 is missing')
  // stack mode bases the suite on the milestone branch, and defers to the slice that created it
  assert.match(step1[0], /In `stack` mode cut it from the milestone branch `sdlc\/M-<n>`/)
  assert.match(step1[0], /[Ii]f it is missing, stop and say so rather than creating it/)
  // the other three modes keep a base of their own, so direct and mr agents are not left without one
  assert.match(step1[0], /In `pr` mode cut it from the up-to-date `<defaultBranch>` ref/)
  assert.match(step1[0], /In `direct` and `mr` mode cut it from the run branch/)
  // branching from a ref is always allowed; only checking a branch out is blocked by another worktree
  assert.match(step1[0], /git refuses only \*checking out\* a branch another worktree holds/)
  assert.match(step1[0], /Never cut it from the default branch in `stack` mode/)
})

test('the env-detector adopts the driver-created run branch, and numbers a fresh one the way the driver does', () => {
  const env = readFileSync(join(SKILL_DIR, 'prompts', 'env-detector.md'), 'utf8')
  // the driver pre-creates the worktree on `sdlc/run-<n>`: adopt it, verify the push, never create a second
  assert.match(env, /git branch --show-current/)
  assert.match(env, /sdlc\/run-\*/)
  assert.match(env, /do not create( or push)? (a|another) (new one|run branch)|do not create or push/)
  assert.match(env, /git ls-remote --heads origin <current-branch>/)
  assert.match(env, /git push -u origin <current-branch>/)
  // the create path survives for a run the driver did not set up, numbered by the driver's own rule:
  // (count of local `sdlc/run-*` branches) + 1 — remote-tracking refs no longer feed the number
  assert.match(env, /git checkout -b sdlc\/run-<n> <defaultBranch>/)
  assert.match(env, /git push -u origin sdlc\/run-<n>/)
  assert.match(env, /count of `sdlc\/run-\*` branches\) \+ 1/)
  assert.match(env, /refs\/heads\/sdlc\/run-\*/)
  assert.doesNotMatch(env, /refs\/remotes\/origin\/sdlc\/run-\*/)
  assert.doesNotMatch(env, /drop the `origin\/` prefix before reading `<n>`/)
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
  assert.match(env, /`defaultBranch`: applied per mode from the `defaultBranch` input/)
  assert.match(env, /always a bare branch name/)
})

test('direct mode ships from the run worktree: sync, squash, push to the default branch', () => {
  const i = readFileSync(join(SKILL_DIR, 'prompts', 'integrator.md'), 'utf8')
  // scope to the direct block: pr/mr/stack still name the default branch in their own, legitimate ways
  const direct = i.slice(i.indexOf('**`direct` mode:**'), i.indexOf('**`mr` mode:**'))
  assert.ok(direct.length > 0, 'the direct block is missing')
  // the owner's checkout holds the default branch, so the worktree can never check it out: push to it instead
  assert.doesNotMatch(direct, /git checkout <defaultBranch>/)
  // the ff-only sync comes first, so the squash lands on the default branch's tip; a failed sync changes nothing
  assert.match(direct, /merge --ff-only origin\/<defaultBranch>/)
  assert.match(direct, /state: "inconclusive"/)
  assert.match(direct, /git push origin HEAD:<defaultBranch>/)
  // no-remote fallback: the shared refs move the owner's branch, and the note walks them through the recovery
  assert.match(direct, /git update-ref refs\/heads\/<defaultBranch> HEAD/)
  assert.match(direct, /your checkout is behind the moved branch/)
  assert.match(direct, /git reset --hard <defaultBranch>/)
  // a failed evidence-sha push is retried once, then reported: the next slice's sync must not be left wedged
  assert.match(direct, /On a failed evidence-sha push, retry once/)
  assert.match(direct, /state: "failed"/)
})

test('the default-branch state commit runs from the worktree and pushes, instead of checking the branch out', () => {
  const c = readFileSync(join(SKILL_DIR, 'prompts', 'commit-state.md'), 'utf8')
  const arm = c.slice(c.indexOf('- `direct` or `mr` mode:'), c.indexOf('- `pr` mode:'))
  assert.ok(arm.length > 0, 'the direct/mr arm is missing')
  assert.doesNotMatch(arm, /git checkout <defaultBranch>/)
  assert.match(arm, /merge --ff-only origin\/<defaultBranch>/)
  assert.match(arm, /git push origin HEAD:<defaultBranch>/)
  assert.match(arm, /git update-ref refs\/heads\/<defaultBranch> HEAD/)
  assert.match(arm, /your checkout is behind the moved branch/)
  assert.match(arm, /git reset --hard <defaultBranch>/)
})

test('slice creation cuts from refs, and no prompt presents the default branch as a place to be', () => {
  const c = readFileSync(join(SKILL_DIR, 'prompts', 'commit-state.md'), 'utf8')
  const sliceStep = c.slice(c.indexOf('**Slice commit**'), c.indexOf('**Default-branch commit**'))
  assert.match(sliceStep, /cut it from the up-to-date `<defaultBranch>` ref/)
  assert.match(sliceStep, /git refuses only \*checking out\* a branch another worktree holds/)
  const rr = readFileSync(join(SKILL_DIR, 'prompts', 'run-request.md'), 'utf8')
  // mr's working branch is the run branch: the sentence may not name config.defaultBranch as the place
  assert.doesNotMatch(rr, /committed to the working branch \(`config\.defaultBranch`\)/)
  assert.match(rr, /the working branch \(the run branch/)
})

test('the pr state-commit arm syncs the run branch too, and no arm checks the default branch out', () => {
  const c = readFileSync(join(SKILL_DIR, 'prompts', 'commit-state.md'), 'utf8')
  const pr = c.slice(c.indexOf('- `pr` mode:'))
  assert.ok(pr.length > 0, 'the pr arm is missing')
  // step 1 and the after-merge step sync the run branch onto the default tip, the way the direct/mr arm does
  assert.match(pr, /merge --ff-only origin\/<defaultBranch>/)
  assert.match(pr, /git update-ref refs\/heads\/<defaultBranch> HEAD/)
  // and the checkout is gone from the whole file: no arm may check the default branch out in the worktree
  assert.doesNotMatch(c, /git checkout <defaultBranch>/)
})

test('the schema documents the mainRoot input and the direct mode push it now implies', () => {
  const schema = readFileSync(join(SKILL_DIR, 'prompts', 'state-schema.md'), 'utf8')
  // the stop probe reads the owner's checkout, not the worktree: mainRoot is where that is written down
  assert.match(schema, /`mainRoot`/)
  assert.match(schema, /mainRoot[\s\S]{0,200}\.sdlc\/STOP|\.sdlc\/STOP[\s\S]{0,200}mainRoot/)
  // direct mode now pushes: the stale "nothing is pushed" must go
  const direct = schema.split('\n').find(l => l.includes('`direct`:'))
  assert.ok(direct, 'the direct bullet is missing')
  assert.doesNotMatch(direct, /nothing is pushed/)
  // the defaultBranch description matches env-detector's per-mode rules: pr takes the owner's
  // branch, and mr's IS the working branch
  const db = schema.split('\n').find(l => l.startsWith('- `defaultBranch` is per mode'))
  assert.ok(db, 'the per-mode defaultBranch line is missing')
  assert.match(db, /in `pr` mode the branch the owner's checkout is on/)
  assert.match(db, /in `mr` mode the working branch itself/)
})

test('the pr after-merge step syncs the run branch onto the base and pushes, and no held branch is ever checked out', () => {
  const i = readFileSync(join(SKILL_DIR, 'prompts', 'integrator.md'), 'utf8')
  const after = i.slice(i.indexOf('**After merging:**'))
  assert.ok(after.length > 0, 'the after-merge step is missing')
  // the base branch may be held by the owner's checkout (pr mode), so the sync is commit-state's shape
  assert.match(after, /git fetch origin <baseBranch>/)
  assert.match(after, /git merge --ff-only FETCH_HEAD/)
  assert.match(after, /state: "inconclusive"/)
  assert.match(after, /never rebase/)
  assert.match(after, /git push origin HEAD:<baseBranch>/)
  assert.match(after, /git update-ref refs\/heads\/<baseBranch> HEAD/)
  assert.match(after, /commit-state\.md's reworked flow/)
  // stack keeps its carve-out: the milestone branch is never held elsewhere, and its PR carries the state
  assert.match(after, /per commit-state\.md's stack arm/)
  // no step may check the base or default branch out anywhere in the file; slice-branch checkouts
  // (git checkout sdlc/<id>) stay — those branches are never held elsewhere
  assert.doesNotMatch(i, /git checkout <baseBranch>/)
  assert.doesNotMatch(i, /git checkout <defaultBranch>/)
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

test('every agent writes comment-free code in the target repo, and its prose in STE', () => {
  const common = readFileSync(join(SKILL_DIR, 'prompts', '_common.md'), 'utf8')
  assert.match(common, /[Nn]o comments in (the )?(code|target)/, 'the no-comments rule')
  assert.match(common, /line comments/, 'line comments are named')
  assert.match(common, /block comments/, 'block comments are named')
  assert.match(common, /doc comments/, 'doc comments are named')
  assert.match(common, /noqa/, 'toolchain directives are the named exception')
  assert.match(common, /license headers/, 'repo-convention license headers are the named exception')
  assert.match(common, /ASD-STE100/, 'the prose rule names the standard')
  assert.match(common, /active voice/)
  assert.match(common, /imperative/)
  assert.match(common, /one word, one meaning/)
  // the prose rule names its source: every report, note and status text follows ste-style.md
  assert.match(common, /Write all reports, notes and status text in the style of `ste-style\.md`\./)
  const style = readFileSync(join(SKILL_DIR, 'prompts', 'ste-style.md'), 'utf8')
  assert.match(style, /`check` means verify with evidence/)
  assert.match(style, /`confirm` means read a result/)
  assert.ok(existsSync(join(SKILL_DIR, 'ste-check.py')), 'the linter behind the style rule exists')
  // the reviewer enforces: comments in code block; STE prose slips never do
  const reviewer = readFileSync(join(SKILL_DIR, 'prompts', 'reviewer.md'), 'utf8')
  assert.match(reviewer, /[Cc]omments in (the )?(code|slice)/)
  assert.match(reviewer, /comments[\s\S]{0,240}blocking: true/, 'a comment in code is worth a fix round')
  assert.match(reviewer, /STE[\s\S]{0,240}blocking: false/, 'a prose slip is a seed, never a fix round')
})

test('the regression lens is slice-scoped during build rounds and full only at the gate', () => {
  const v = readFileSync(join(SKILL_DIR, 'prompts', 'verifier.md'), 'utf8')
  // the lens section only, so a mention elsewhere cannot satisfy the scope rules
  const lens = v.slice(v.indexOf('- **Lens `regression`'), v.indexOf('## Report file'))
  assert.ok(lens.length > 0, 'the regression lens section is missing')
  assert.match(lens, /impact\.py/, 'the slice scope maps the diff with impact.py')
  assert.match(lens, /scope from your inputs/)
  assert.match(lens, /`slice` scope/)
  assert.match(lens, /`full` scope/)
  // every line that mentions the budget marks it full-scope-only: a slice-scoped run never pays it
  const budgetLines = lens.split('\n').filter(l => /[Bb]udget/.test(l))
  assert.ok(budgetLines.length > 0, 'the test-time budget rule is missing')
  for (const l of budgetLines) assert.match(l, /full scope only/, `a budget rule outside the full-scope scope: ${l}`)
  // the receipt and the classification are full-scope era rules the gate follows verbatim
  assert.match(lens, /\*\*Receipt \(full scope only\)/)
  assert.match(lens, /outcome: "infra"/)
  assert.equal((lens.match(/Classify the run:/g) || []).length, 1, 'the outcome classification rule appears exactly once')
  // profile verifier tests are no longer folded into the branch, so the known-failing carve-out is gone
  assert.doesNotMatch(v, /Known failing verification tests/)
  assert.match(v, /Return `\{refuted, evidence, failingTest, seeds, outcome\}`/)
})

test('profile agents write their tests as evidence in the main tree, and the collector only files and cleans', () => {
  const common = readFileSync(join(SKILL_DIR, 'prompts', 'verify-profile-common.md'), 'utf8')
  assert.match(common, /verification\/r<round>\/tests\/<profile>-<part>\//)
  assert.match(common, /never committed to `sdlc\/<id>`/)
  assert.match(common, /commit nothing to your branch/)
  assert.match(common, /A verification test runs in milliseconds-to-seconds\./)
  assert.match(common, /never invoke the repo's test command from a test/)
  assert.match(common, /The verify-collector deletes it/)
  // the old fold-into-the-branch mechanics are gone, not merely accompanied by the new rule
  assert.doesNotMatch(common, /join the slice's test suite/)
  assert.doesNotMatch(common, /cherry-pick/)
  const collector = readFileSync(join(SKILL_DIR, 'prompts', 'verify-collector.md'), 'utf8')
  assert.match(collector, /You fold nothing into the slice branch/)
  assert.match(collector, /verification\/r<round>\/tests\/<profile>-<part>\//)
  assert.match(collector, /copy them unmodified/i)
  assert.match(collector, /git branch -D/)
  assert.doesNotMatch(collector, /cherry-pick/)
  assert.doesNotMatch(collector, /checkout sdlc\/<id>/)
  assert.doesNotMatch(collector, /[Rr]un the newly added verification test files/)
  // the agents write into the main tree, so the move from the worktree is the fallback, not the routine
  assert.match(collector, /file the test files its agent wrote under/)
  assert.match(collector, /move them in from its worktree only when it left them there instead/i)
  // the ui profile boots the app in a browser inside its test fixture, so the fast-test rule carves it out
  assert.match(common, /The ui profile's browser fixture is the exception/)
  // a security attack is evidence under tests/, promoted later only if the finding holds — never a commit
  const security = readFileSync(join(SKILL_DIR, 'prompts', 'verify-security.md'), 'utf8')
  assert.match(security, /tests\/security-<part>\/` like any profile test/)
  assert.match(security, /promoted into the suite later only if the finding holds/)
  assert.doesNotMatch(security, /committed failing test|passing regression tests/)
})

test('verifier tests promote into the suite only with a demonstrated catch, under a quality bar', () => {
  const impl = readFileSync(join(SKILL_DIR, 'prompts', 'implementer.md'), 'utf8')
  assert.match(impl, /## Promotion/, 'the implementer owns the promotion duty for evidence-dir tests')
  assert.match(impl, /verification\/r<round>\/tests\//)
  assert.match(impl, /Record promoted files in tests\.md/)
  // door 2: a reviewer's keep-worthy finding promotes a verifier test too, not only a demonstrated catch
  assert.match(impl, /review finding names a verifier test/)
  const checker = readFileSync(join(SKILL_DIR, 'prompts', 'test-checker.md'), 'utf8')
  assert.match(checker, /suite-count/)
  const reviewer = readFileSync(join(SKILL_DIR, 'prompts', 'reviewer.md'), 'utf8')
  const quality = reviewer.slice(reviewer.indexOf('- **Lens `test-quality`'), reviewer.indexOf('`blocking: true` only for'))
  assert.ok(quality.length > 0, 'the test-quality lens section is missing')
  assert.match(quality, /serial-pass/)
  assert.match(quality, /nested/)
  // the reviewer reports a keep-worthy verifier test as blocking, naming its path under verification/
  assert.match(quality, /keep-worthy/)
  assert.match(quality, /verification\//)
})

test('the regression lens holds the suite slot in full scope, and the slice scope survives an impact.py failure', () => {
  const v = readFileSync(join(SKILL_DIR, 'prompts', 'verifier.md'), 'utf8')
  // the scope bullets are single lines, so a full-scope rule cannot leak into the slice scope
  const sliceLine = v.split('\n').find(l => l.startsWith('  - **`slice` scope:**'))
  const fullLine = v.split('\n').find(l => l.startsWith('  - **`full` scope:**'))
  assert.ok(sliceLine && fullLine, 'the regression scope bullets are missing')
  // the full scope holds the suite slot before running the suite, and releases it in every exit path
  assert.match(fullLine, /Hold the suite slot first: `python3 "<skill>\/suite-receipt\.py" slot --repo \.`/)
  assert.match(fullLine, /blocks until free/)
  assert.match(fullLine, /elease it with `slot-release` in every exit path/)
  // the holder is a background process: it keeps holding the slot until slot-release ends it
  assert.match(fullLine, /[Rr]un it in the background/)
  // a busy slot across attempts means a live orphaned holder, not a crashed one (a crashed holder's
  // flock dies with the process): one slot-release recovers, and a handover is never re-entered
  assert.match(fullLine, /an orphaned holder \(a slot process that outlived its run\)/)
  assert.match(fullLine, /slot-release` once to recover/)
  assert.match(fullLine, /never re-enter during a handover/)
  assert.match(fullLine, /do not retry aggressively/i)
  // the mapping is best effort: a failed impact.py never refutes the slice on its own
  assert.match(sliceLine, /best effort/)
  assert.match(sliceLine, /a mapping failure alone never refutes the slice/)
  // the static Inputs line names scope, so the agent reads its scope from its inputs
  assert.match(v, /Inputs: `sliceId`, `lens`, `round`, `scope`\./)
  // the spec-fidelity note matches the lens's actual scoping (now split into STE sentences)
  assert.match(v, /The regression lens tests the suite at the slice scope during build rounds\./)
  assert.match(v, /It runs in full at the gate\./)
  assert.match(v, /Do not run it here\./)
  assert.doesNotMatch(v, /The regression lens runs the full suite, so do not run it here\./)
  // SKILL.md's phase list places the Gate between the verify group and Integrate
  const skill = readFileSync(join(SKILL_DIR, 'SKILL.md'), 'utf8')
  assert.match(skill, /full-suite Gate, integrate/)
  // the gate holds the slot itself, so it skips the lens's slot step rather than re-holding, and an
  // orphaned holder never stalls it: it releases once and holds again
  const gate = readFileSync(join(SKILL_DIR, 'prompts', 'gate.md'), 'utf8')
  const gateStep2 = gate.split('\n').find(l => l.startsWith('2. Hold the suite slot'))
  const gateStep3 = gate.split('\n').find(l => l.startsWith('3. Run the **full** regression lens'))
  assert.ok(gateStep2 && gateStep3, 'the gate steps are missing')
  assert.match(gateStep2, /a previous holder was orphaned/)
  assert.match(gateStep2, /[Rr]un it in the background/)
  assert.match(gateStep2, /suite-receipt\.py" slot-release --repo \.` once and hold again/)
  assert.match(gateStep3, /skipping its slot step/)
  assert.match(gateStep3, /every other rule there verbatim/)
  assert.doesNotMatch(gateStep3, /Follow every rule there verbatim/)
  assert.ok(gate.endsWith('\n'), 'gate.md ends with a newline')
})

test('the campaign covers slices that skipped verification, and the integrator receipt note is scoped to them', () => {
  const planner = readFileSync(join(SKILL_DIR, 'prompts', 'scenario-planner.md'), 'utf8')
  assert.match(planner, /`risk`[\s\S]{0,200}`low`/, 'the planner reads the slices\' risk')
  assert.match(planner, /skipped (its|the per-slice) verification battery/)
  const integrator = readFileSync(join(SKILL_DIR, 'prompts', 'integrator.md'), 'utf8')
  assert.match(integrator, /low-risk/)
  assert.match(integrator, /never (carries|carry|carried) a receipt|no receipt[\s\S]{0,80}expected/)
  // the note must not weaken the receipt rule for rated slices
  assert.match(integrator, /suite-receipt\.py" check/)
})

test('the integrator trusts the gate receipt, regates after a product-code CI fix, and prunes bulk at merge', () => {
  const i = readFileSync(join(SKILL_DIR, 'prompts', 'integrator.md'), 'utf8')
  // the receipt is the merge authority, and a code change after the gate is a regate, not a self-run
  assert.match(i, /state: "regate"/)
  assert.match(i, /code changed after the passed gate/)
  // the low-risk cheap gate keeps its self-run clause
  assert.match(i, /counters\.gateCommit/)
  assert.match(i, /impact\.py/)
  // reports move to .sdlc/reports/<id>/ at the prune
  assert.match(i, /\.sdlc\/reports\/<id>\//)
  // the retention prune and its opt-out
  assert.match(i, /delete `verification\/`/)
  assert.match(i, /keepEvidence/)
  // the receipt is the one exception: it stays readable where suite-receipt.py reads it,
  // and a copy lands in the reports dir
  assert.match(i, /except `verification\/suite-receipt\.json`/)
  assert.match(i, /\.sdlc\/reports\/<id>\/suite-receipt\.json/)
  // the stale-branch sweep covers the versioned and attempt branches
  assert.match(i, /sdlc\/<id>-v\*/)
  // a crashed receipt check is infra: inconclusive, never a self-run of the suite
  assert.match(i, /cannot run[\s\S]{0,120}inconclusive/)
  // the old self-run fallback for battery slices is gone; the low-risk clause
  // ("run build and typecheck plus the impact-mapped slice tests yourself") stays
  assert.ok(!i.includes('run the full `config.commands` test, lint, typecheck and build yourself'),
    'the integrator must not run the full battery itself when the receipt is valid')
  const reporter = readFileSync(join(SKILL_DIR, 'prompts', 'test-reporter.md'), 'utf8')
  assert.match(reporter, /\.sdlc\/reports\/<id>\/REPORT\.md/)
  assert.doesNotMatch(reporter, /\.sdlc\/slices\/<id>\/REPORT\.md/)
  // screenshots are embedded from the report's own assets folder, so the links survive the prune
  assert.match(reporter, /!\[<state>\]\(assets\/<file>\.png\)/)
  assert.doesNotMatch(reporter, /verification\/r<n>\/assets/)
  // and the commit stages the assets too, so the images ship with the slice's PR — but only
  // when the folder exists: a screenshot-free report must not fail its git add on a missing pathspec
  assert.match(reporter, /git add \.sdlc\/reports\/<id>\/REPORT\.md \.sdlc\/reports\/<id>\/assets/)
  assert.match(reporter, /assets\/` folder does not exist/)
})

test('the state-reader runs the janitor once per run without letting it block the decision', () => {
  const reader = readFileSync(join(SKILL_DIR, 'prompts', 'state-reader.md'), 'utf8')
  assert.match(reader, /janitor\.py/)
  assert.match(reader, /never block the decision on it/)
  // the "return exactly as printed" rule carves out the one exception, or the two lines contradict
  assert.match(reader, /no change to `action`[\s\S]{0,200}janitor[\s\S]{0,120}`reason`/)
})

test('the state-reader passes the main root to the stop probe', () => {
  const reader = readFileSync(join(SKILL_DIR, 'prompts', 'state-reader.md'), 'utf8')
  assert.match(reader, /--main-root "<mainRoot>"/)
})

test('the state schema documents the verify economy the loop implements', () => {
  const schema = readFileSync(join(SKILL_DIR, 'prompts', 'state-schema.md'), 'utf8')
  // the slice lifecycle runs through the gate: the phase enum names all five in order
  assert.match(schema, /`phase` is `plan`, `tests`, `implement`, `gate` or `integrate`/)
  // the counters the loop seeds and resets, in the json an agent copies — every field, not a sample
  const counters = schema.match(/"counters": \{[^}]*\}/)[0]
  assert.ok(counters, 'the counters json is missing')
  assert.match(counters, /"planRevisions": 0/)
  assert.match(counters, /"fixRounds": 0/)
  assert.match(counters, /"ladderStep": 0/)
  assert.match(counters, /"parkCycles": 0/)
  assert.match(counters, /"verifyDemanded": false/, 'a reviewer\'s battery demand has nowhere to persist')
  assert.match(counters, /"infraRetries": 0/)
  assert.match(counters, /"gateCommit": ""/)
  // three consecutive infra rounds park the slice with infra debt, and resuming is not re-planning
  assert.match(schema, /three in a row parks the slice with `infraDebt`/)
  assert.match(schema, /resuming it keeps the slice's phase and counters instead of re-planning/)
  // the ledger row's shape, and the rule that keeps refutation outcomes out of the stored state
  assert.match(schema, /"kind": "verify" \| "gate", "round": <n>, "outcome": "verified" \| "refuted" \| "infra"/)
  assert.match(schema, /[Tt]he tracker derives it from consecutive rounds/)
  // a review-blocked round on a low slice stores its blocking findings as the row's refutations
  assert.match(schema, /review-blocked round on a `low` slice carries the blocking findings' count in `refutations`/)
  // the profile agents' unpromoted tests are evidence files the schema lists where they are written
  assert.match(schema, /verification\/r<round>\/tests\//)
  // reports live in their own directory, never under the slice
  assert.match(schema, /## reports\/<id>\//)
  assert.doesNotMatch(schema, /slices\/<id>\/REPORT\.md/)
})

test('the driver resolves the default branch in the owner checkout and hands it to the loop per mode', () => {
  const skill = readFileSync(join(SKILL_DIR, 'SKILL.md'), 'utf8')
  // inside the worktree the current branch is sdlc/run-<n>, so "defaultBranch = current branch" would
  // corrupt every direct-mode push target: the driver resolves it from the owner's checkout instead
  assert.match(skill, /DEFAULT_BRANCH=\$\(git -C "\$REPO" symbolic-ref --short refs\/remotes\/origin\/HEAD 2>\/dev\/null \|\| true\)/)
  // symbolic-ref unset falls back to the owner's branch; detached HEAD is reported and ended
  assert.match(skill, /when that is empty, `DEFAULT_BRANCH=\$\(git -C "\$REPO" branch --show-current\)`/)
  assert.match(skill, /detached HEAD\), report and end/)
  // pr hands the branch the owner's checkout is on, not the remote's default
  assert.match(skill, /BASE_BRANCH=\$\(git -C "\$REPO" branch --show-current\)/)
  // the launch hands the resolved value per mode: direct/stack get the resolved default, pr the
  // owner's branch, and mr nothing at all
  assert.match(skill, /in `direct` and `stack` pass `defaultBranch: "\$DEFAULT_BRANCH"`/)
  assert.match(skill, /in `pr` pass `defaultBranch: "\$BASE_BRANCH"`/)
  assert.match(skill, /in `mr` omit it entirely/)
})

test('the env-detector applies the defaultBranch input per mode, and mr ignores it', () => {
  const env = readFileSync(join(SKILL_DIR, 'prompts', 'env-detector.md'), 'utf8')
  assert.match(env, /Inputs: `specPath`[\s\S]{0,200}`defaultBranch`/)
  // direct and stack take the driver-resolved input; pr takes the owner's branch
  assert.match(env, /`direct` and `stack`: the input when it is non-empty/)
  assert.match(env, /`pr`: the input when it is non-empty[\s\S]{0,200}the branch the owner's checkout is on/)
  // the fallback for an empty input is the legacy detection
  assert.match(env, /When the input is empty, fall back to the old detection/)
  assert.match(env, /from `git symbolic-ref --short refs\/remotes\/origin\/HEAD`/)
  assert.match(env, /else the current branch name/)
  // mr ignores the input entirely: its defaultBranch is the working branch, and an input naming the
  // remote's default branch would equal targetBranch and wrongly downgrade the run to direct
  assert.match(env, /`mr`: ignore the input entirely/)
  assert.match(env, /Never feed the input to the `targetBranch` check/)
  // symbolic-ref without --short prints refs/remotes/origin/main; every later consumer wants main
  assert.match(env, /always a bare branch name/)
})

test('the driver ensures the run worktree before the config checks, and points the loop at it', () => {
  const skill = readFileSync(join(SKILL_DIR, 'SKILL.md'), 'utf8')
  // the worktree comes first, and WT is its one name: run state (config, gitMode, resume) reads $WT after it
  const wt = skill.indexOf('**Run worktree:**')
  assert.ok(wt > -1, 'the run worktree step is missing')
  assert.ok(wt < skill.indexOf('specPath'), 'the worktree step must precede the config checks')
  assert.match(skill, /WT="\$REPO\/\.claude\/worktrees\/sdlc-run"/)
  // pre-flight: the folder is git-ignored first, the worktree is created or reused, never reset
  assert.match(skill, /git-ignored[\s\S]{0,200}\.claude\/worktrees\//, '.claude/worktrees/ is ignored before use')
  assert.match(skill, /worktree add "\$WT" -b sdlc\/run-<n>/)
  assert.match(skill, /\(count of `sdlc\/run-\*` branches\) \+ 1/, 'n comes from the existing run branches')
  assert.match(skill, /merge --ff-only origin\/<defaultBranch>/, 'a relaunch reuses and fast-forwards the worktree')
  assert.match(skill, /diverged and end[\s\S]{0,80}the owner decides/, 'a failed ff-only sync is the owner\'s call')
  assert.match(skill, /[Dd]irty[\s\S]{0,120}report and end[\s\S]{0,120}owner/, 'a dirty worktree is the owner\'s, never reset')
  // run state reads the worktree: the specPath check, and never a checkout in the owner's tree
  assert.match(skill, /`\$WT\/\.sdlc\/config\.json` exists and its `specPath` differs/)
  assert.doesNotMatch(skill, /git -C "\$REPO" checkout <config\.runBranch>/, 'the owner\'s checkout is never moved to the run branch')
  // the launch hands the loop the worktree as its repo, and the stop probe the owner's checkout
  assert.match(skill, /repoRoot: "<worktree path>", mainRoot: REPO/)
})

test('the stop wording promises a pause, and the paused bullet keeps the worktree', () => {
  const skill = readFileSync(join(SKILL_DIR, 'SKILL.md'), 'utf8')
  assert.match(skill, /the current agent finishes first, then the run pauses, and that `\/sdlc <spec>` resumes it/)
  const paused = skill.split('\n').find(l => l.includes('**`paused`'))
  assert.ok(paused, 'the paused bullet is missing')
  assert.match(paused, /keep the worktree/)
  assert.match(paused, /`\/sdlc <spec>` resumes/)
  assert.match(paused, /ScheduleWakeup\(\{stop: true\}\)/)
})

test('the loop-end cleanup removes the worktree and the run branch, and reports a refusal', () => {
  const skill = readFileSync(join(SKILL_DIR, 'SKILL.md'), 'utf8')
  const whenever = skill.split('\n').find(l => l.includes('Whenever the loop ends'))
  assert.ok(whenever, 'the whenever-the-loop-ends bullet is missing')
  assert.match(whenever, /worktree remove "\$WT"/)
  // -d, not -D: the deletion refuses unmerged work, so the report path is real
  assert.match(whenever, /branch -d sdlc\/run-<n>/)
  assert.doesNotMatch(whenever, /branch -D/)
  assert.match(whenever, /slice state is committed to `<defaultBranch>`/)
  assert.match(whenever, /[Rr]efusal[\s\S]{0,160}keep both, end/)
})

test('the tracker reads run state from the worktree and writes to the owner\'s checkout', () => {
  const skill = readFileSync(join(SKILL_DIR, 'SKILL.md'), 'utf8')
  // both collect.py invocations read the run worktree and land the page in the owner's checkout
  const sites = skill.split('\n').filter(l => l.includes('collect.py'))
  assert.ok(sites.length >= 2, 'the build and watch commands are missing')
  for (const l of sites) assert.match(l, /--repo "\$WT" --out "\$REPO\/\.sdlc\/tracker"/, `a collect.py call misses the split: ${l}`)
  // /sdlc status prints the run worktree's STATUS.md first, the repo root's as fallback
  const status = skill.split('\n').find(l => l.includes('/sdlc status`:'))
  assert.ok(status, 'the status line is missing')
  assert.match(status, /worktrees\/sdlc-run\/\.sdlc\/STATUS\.md/)
  // the bar-raiser round count is read where the run writes it
  assert.match(skill, /`rounds` in the run worktree's `\.sdlc\/barraiser\.json`/)
  // the driver file stays on the owner's checkout, never in the worktree
  assert.match(skill, /\$REPO\/\.sdlc\/tracker\/driver\.json/)
})

test('every prompt file passes the STE linter, with no allowlist and no skips', () => {
  const files = readdirSync(join(SKILL_DIR, 'prompts')).filter(f => f.endsWith('.md')).sort()
  assert.ok(files.length > 0, 'the prompts directory holds markdown files')
  const r = spawnSync('python3', [join(SKILL_DIR, 'ste-check.py'), ...files.map(f => join(SKILL_DIR, 'prompts', f))], { encoding: 'utf8' })
  assert.equal(r.status, 0, `ste-check.py found violations:\n${r.stdout}`)
})

test('the schema pins the merge prune and the run request names the moved reports', () => {
  const schema = readFileSync(join(SKILL_DIR, 'prompts', 'state-schema.md'), 'utf8')
  // the receipt's keep-in-place-and-copy rule: suite-receipt.py reads only the in-place path
  assert.match(schema, /except `verification\/suite-receipt\.json`/)
  assert.match(schema, /\.sdlc\/reports\/<id>\/suite-receipt\.json/)
  assert.match(schema, /suite-receipt\.py[\s\S]{0,60}(check|read)[\s\S]{0,120}only/)
  // gate-r0.md and the regression logs' final copies move to the reports dir, not stay behind
  assert.match(schema, /`gate-r0\.md`[\s\S]{0,200}\.sdlc\/reports\/<id>\//)
  // the keep list and its opt-out
  assert.match(schema, /keepEvidence/)
  assert.match(schema, /`verify-\*\.md` and `review-\*\.md`/)
  const rr = readFileSync(join(SKILL_DIR, 'prompts', 'run-request.md'), 'utf8')
  assert.match(rr, /\.sdlc\/reports\/<id>\/REPORT\.md/)
  assert.doesNotMatch(rr, /\.sdlc\/slices\/<id>\/REPORT\.md/)
})
