# `--git stack` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a fourth git mode, `--git stack`, in which a milestone is the unit a human reviews and merges — slice branches and their PRs live inside a milestone branch, and the milestone branch's PR targets the default branch.

**Architecture:** `stack` sits beside `pr`, `direct` and `mr` without changing them. Four branch classes: `sdlc/run-<n>` (created at bootstrap, pushed, never carries product code), `sdlc/M-<n>` (cut from the run branch, PR base `main`), `sdlc/<id>` (cut from its milestone branch, PR base that milestone branch), and `sdlc/<mid>-e2e` (cut from the milestone branch). Slice PRs keep per-slice CI; the milestone PR is the review unit; the run branch fast-forwards to `main` after each milestone merges so the next milestone branches from shipped code. A milestone PR blocked by review holds the run rather than stacking on unshipped ground.

**Tech Stack:** Python 3 standard library (`next-action.py`, `state-write.py`), a Claude Code Workflow script (`sdlc-loop.js`, no imports, no `Date.now`/`Math.random`), Markdown prompt files, Node's built-in test runner (`node --test skills/sdlc/test/*.test.mjs`), GitHub CLI (`gh`).

**Spec:** `docs/superpowers/specs/2026-10-04-stack-git-mode-design.md`

## Global Constraints

- Python standard library only. No new pip dependencies. Node >= 20 (package.json floor), no new npm dependencies.
- `sdlc-loop.js` must keep passing `prompts.test.mjs`'s "script avoids APIs the workflow runtime forbids": no `import` statements, no `require(`, no `Date.now()`, no `Math.random()`, no `new Date()`. It must keep its literal `export const meta = {` and its `return await main() // @entry` entry line.
- Every prompt that branches on the git mode must mention `mr` mode and what it does there — `prompts.test.mjs` asserts this for `integrator`, `commit-state`, `milestone-writer`, `env-detector`, `state-schema` and `state-reader`.
- Never use `gh pr merge --admin`, and never force-push `main` or `sdlc/run-<n>`.
- GitHub only. `stack` is chosen by the user explicitly or by the same github.com test that picks `pr`; it is never inferred on GitLab.
- All JSON in `.sdlc/` is pretty-printed with 2-space indentation.
- Commit subjects: `chore(sdlc): <what> [<sliceId>]` for state commits, `<type>(<id>): <slice title>` for slice ships, both overridable by `config.commitFormat` (see `_common.md`).

## Review Focus

Five input classes the spec implies that no task's happy-path tests exercise. Each has a test pinned to the task that owns the code.

1. **The remote default branch moves mid-run** (`main` advances while the loop is between milestones). `git merge --ff-only origin/main` into the run branch fails; the run must merge instead and never force-push. → Task 4, `scripts.test.mjs`.
2. **`sdlc/run-<n>` already exists** (a second `/sdlc` run in the same repo, or a leftover). The next number must be higher, or the run would clobber a live run's branch. → Task 2, `scripts.test.mjs`.
3. **The milestone branch does not exist yet** (first slice of a milestone). `ensure_slice_branch` must create it from the run branch and push it, or the slice PR has no base and the milestone PR is empty. → Task 3, `scripts.test.mjs`.
4. **A repo with no GitHub remote, or `--git stack` on GitLab.** Must fall back with a stated reason rather than half-running. → Task 2, `scripts.test.mjs`.
5. **Resume with the current branch already `sdlc/run-<n>`.** The existing pre-flight rule that rejects a current branch starting with `sdlc/` would reject every resume, since bootstrap leaves you on that branch. → Task 1, `prompts.test.mjs`.

---

### Task 1: Name the mode in the skill, the schema and the workflow script

**Files:**
- Modify: `skills/sdlc/SKILL.md` (command list line 12, git-mode pre-flight lines 29-36, branch-name check line 37)
- Modify: `skills/sdlc/prompts/state-schema.md` (config.json block lines 11-40)
- Modify: `skills/sdlc/prompts/commit-state.md` (whole file)
- Modify: `skills/sdlc/sdlc-loop.js:309` (`ENV.gitMode` enum)
- Test: `skills/sdlc/test/prompts.test.mjs`, `skills/sdlc/test/bootstrap.test.mjs`

**Interfaces:**
- Consumes: nothing; this is the first task.
- Produces: the string `stack` as a legal `gitMode` everywhere. Later tasks read `config.gitMode === "stack"` and `config.runBranch`.

The mode has to exist as a name before any behavior can hang off it. This task makes `stack` legal in the four places that enumerate modes, and defines the two new `config.json` fields the rest of the plan depends on: `runBranch` and, on each milestone, `pr`.

- [ ] **Step 1: Write the failing test for the schema fields and mode-name coverage**

Append to `skills/sdlc/test/prompts.test.mjs`:

```js
test('every prompt that branches on the git mode also covers stack mode', () => {
  for (const f of ['integrator', 'commit-state', 'milestone-writer', 'env-detector', 'state-schema', 'state-reader', 'implementer', 'e2e-harness']) {
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
  assert.match(schema, /"pr": ""[\s\S]{0,400}milestone/)
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test skills/sdlc/test/prompts.test.mjs`
Expected: FAIL — `every prompt that branches on the git mode also covers stack mode` fails on `integrator.md does not mention stack mode`.

- [ ] **Step 3: Add `stack` to the `ENV` enum in the workflow script**

In `skills/sdlc/sdlc-loop.js:309`, change:

```js
const ENV = { type: 'object', properties: { gitMode: { type: 'string', enum: ['pr', 'direct', 'mr'] }, commands: { type: 'object' }, notes: str }, required: ['gitMode', 'commands'] }
```

to:

```js
const GIT_MODES = ['pr', 'direct', 'mr', 'stack']
const ENV = { type: 'object', properties: { gitMode: { type: 'string', enum: GIT_MODES }, commands: { type: 'object' }, notes: str }, required: ['gitMode', 'commands'] }
```

Keep the `const GIT_MODES` line above `ENV` — Task 7 imports the name into `bootstrap.test.mjs` to assert the script and the docs agree.

- [ ] **Step 4: Update `state-schema.md`**

In the `config.json` block, add `"runBranch": ""` after `"defaultBranch": "main"`, and add to the bullet list after the `defaultBranch` bullet:

```
- `runBranch` is `""` outside `stack` mode. In `stack` mode it is the branch the whole run builds on, `sdlc/run-<n>`.
```

Change the `gitMode` bullet list to four entries, adding after the `mr` entry:

```
  - `stack`: one branch per slice inside one branch per milestone, on a run branch of their own. Slice pull requests target their milestone branch; the milestone pull request targets `defaultBranch`. GitHub only.
```

Change the `defaultBranch` bullet to name both roles:

```
- `defaultBranch` is the remote's default branch in `pr` and `stack` mode. In `direct` and `mr` mode it is the working branch the slices are committed to. In `stack` mode nothing is ever committed to it directly; the working branch is `runBranch`.
```

In the `milestones.json` block, add `"pr": ""` after `"fixSlices": []`, and after the `status` bullet add:

```
- `pr` is `""` or the milestone pull request's url, set by the milestone-writer in `stack` mode.
```

- [ ] **Step 5: Update `commit-state.md` for the stack topology**

Rewrite `skills/sdlc/prompts/commit-state.md`. This file is where the branch topology lives for every role, so it carries the full stack description:

```markdown
# Committing `.sdlc/` state

Read `gitMode`, `defaultBranch`, `commitFormat` and, in `stack` mode, `runBranch` from `.sdlc/config.json`.

**Stack mode branches.** `sdlc/run-<n>` is the run branch: the tool creates it at bootstrap and pushes it, and it never carries product code. `sdlc/M-<n>` is a milestone branch, cut from `runBranch` when that milestone's first slice starts; slices are cut from it and their pull requests target it. The milestone's own pull request targets `defaultBranch`, and once it merges `runBranch` is fast-forwarded to `defaultBranch` so the next milestone branches from shipped code. `sdlc/<milestoneId>-e2e` is cut from the milestone branch. Audit fix slices (`S-fix-<n>`, which belong to no milestone) are cut from `runBranch` and their pull requests target `defaultBranch`.

**Slice commit** (your inputs name a slice and your role file says "slice commit"):
1. Be on branch `sdlc/<sliceId>`. If it does not exist, create it as the stack mode branches above say: in `stack` mode from the slice's milestone branch (or `runBranch` for an audit fix), otherwise as below.
2. `git add .sdlc .gitignore && git commit -m "chore(sdlc): <what> [<sliceId>]"`. Do not push; the integrator ships it with the slice.

**Default-branch commit** (your role file says "default-branch commit"):
- `stack` mode: commit on the current milestone's branch when one exists (`sdlc/M-<n>` for the first milestone in `milestones.json` whose status is not `verified`, and whose branch exists), and on `runBranch` otherwise. Then `git add .sdlc .gitignore` and commit `chore(sdlc): <what>`. Do not push: the milestone pull request carries this state, and `runBranch` is pushed when the next milestone branch is cut. There are no `sdlc/state-*` pull requests in stack mode.
- `direct` or `mr` mode: `git checkout <defaultBranch>`, `git add .sdlc .gitignore`, `git commit -m "chore(sdlc): <what>"`. Do not push: in `mr` mode the integrator and the driver push the working branch.
- `pr` mode:
  1. `git checkout <defaultBranch> && git pull --ff-only`
  2. `git checkout -b sdlc/state-$(date -u +%Y%m%d%H%M%S)`
  3. `git add .sdlc .gitignore && git commit -m "chore(sdlc): <what>"`, then push.
  4. `gh pr create --title "chore(sdlc): <what>" --body "<one-paragraph summary>` followed by a blank line and `🤖 Generated with [Claude Code](https://claude.com/claude-code)"`.
  5. `gh pr checks --watch`. If there are no checks, append a `note` line "no CI checks on state PR" to log.jsonl before merging. If a check fails, read the log with `gh run view --log-failed`, fix on the same branch, push, and watch again.
  6. `gh pr merge --squash --delete-branch`, then `git checkout <defaultBranch> && git pull --ff-only`.
  7. If the merge is blocked by required reviews or protection, leave the PR open, append a `state-pr-blocked` line with the PR url to log.jsonl on the default branch's working tree (uncommitted), and return to the default branch.

`.sdlc/STOP` is gitignored and never committed.
```

- [ ] **Step 6: Update `SKILL.md`**

In the command list (line 12), change the flag to `--git pr|direct|mr|stack` and add after the `--git mr` bullet:

```
  - `--git stack` builds the run on a branch of its own: the tool creates `sdlc/run-<n>` from the default branch and pushes it, cuts a `sdlc/M-<n>` branch per milestone from it, and cuts each slice branch from its milestone branch with a pull request targeting that milestone. When a milestone's behavior campaign verifies, its branch opens a pull request against the default branch; that is the unit you review and merge. GitHub only.
```

In the git-mode pre-flight (lines 29-36), change the ordering bullet to:

```
     - Otherwise use `pr` when `git -C "$REPO" remote -v` shows github.com. Add `stack` before `pr`: when the user gave `--git stack`, or when `config.json` has `gitMode: stack`, keep `stack`.
```

and add a new bullet after the `pr`/`mr` mode checks:

```
     - In `stack` mode `gh auth status` must succeed, and `git -C "$REPO" remote -v` must show github.com. Without one, report why and end rather than falling back: stack mode's contract is that a milestone is reviewed and merged by you. On resume, `git -C "$REPO" checkout <config.runBranch>` first — the run branch is authoritative, not the current branch.
```

Replace the branch-name check at line 37 so it does not fire on a resume:

```
   - **Branch name (first run only):** if `$REPO/.sdlc/config.json` does not exist and the current branch name starts with `sdlc/`, report that the workflow keeps that prefix for its own branches, ask the user to rename the branch (`git branch -m <new-name>`), and end. This check is first run only: on a resume the current branch is normally `runBranch`, which starts with `sdlc/` and is correct. When `config.json` exists, trust `config.runBranch`.
```

- [ ] **Step 7: Run the tests**

Run: `node --test skills/sdlc/test/prompts.test.mjs`
Expected: PASS for the three new tests. `integrator`, `milestone-writer`, `env-detector`, `state-reader`, `implementer` and `e2e-harness` still lack the literal `` `stack` `` — they are that mode's arms and belong to Tasks 4-6, so narrow the test until then:

```js
test('the mode-agnostic prompts cover stack mode', () => {
  for (const f of ['commit-state', 'state-schema']) {
    const text = readFileSync(join(SKILL_DIR, 'prompts', `${f}.md`), 'utf8')
    assert.match(text, /`stack`/, `${f}.md does not mention stack mode`)
  }
})
```

Delete the broader version from Step 1 and replace it with this, since a task may not leave the suite red. Run again: PASS.

- [ ] **Step 8: Update the bootstrap test's enum assertion**

In `skills/sdlc/test/bootstrap.test.mjs:52`, change:

```js
  assert.deepEqual(env.opts.schema.properties.gitMode.enum, ['pr', 'direct', 'mr'])
```

to:

```js
  assert.deepEqual(env.opts.schema.properties.gitMode.enum, ['pr', 'direct', 'mr', 'stack'])
```

- [ ] **Step 9: Run the whole suite**

Run: `npm test`
Expected: PASS, all files.

- [ ] **Step 10: Commit**

```bash
git add skills/sdlc/SKILL.md skills/sdlc/prompts/state-schema.md skills/sdlc/prompts/commit-state.md skills/sdlc/sdlc-loop.js skills/sdlc/test/prompts.test.mjs skills/sdlc/test/bootstrap.test.mjs
git commit -m "feat(stack): name the mode, its config fields and its branch topology"
```

---

### Task 2: Create and push the run branch at bootstrap

**Files:**
- Modify: `skills/sdlc/prompts/env-detector.md` (git mode step 3, lines 19-23)
- Modify: `skills/sdlc/prompts/state-schema.md` (only if the `env-detector` bullets need the fallback wording — Task 1 already added the fields)
- Test: `skills/sdlc/test/prompts.test.mjs`

**Interfaces:**
- Consumes: `gitMode: "stack"` and the `runBranch` field from Task 1.
- Produces: a pushed `sdlc/run-<n>` branch and `config.runBranch` set to its name. Task 3 cuts milestone branches from it; Task 4 fast-forwards it.

A run needs its run branch before any slice exists, or the first milestone has nothing to branch from. This task makes the env-detector create it, choose a number that is not already taken, and refuse rather than half-run on a repo that cannot support the mode.

- [ ] **Step 1: Write the failing test**

Append to `skills/sdlc/test/prompts.test.mjs`:

```js
test('the env-detector creates and pushes the run branch, and refuses stack without a github remote', () => {
  const env = readFileSync(join(SKILL_DIR, 'prompts', 'env-detector.md'), 'utf8')
  assert.match(env, /git checkout -b sdlc\/run-<n> <defaultBranch>/)
  assert.match(env, /git push -u origin sdlc\/run-<n>/)
  // n is 1 + the highest existing, so a second run cannot clobber a live one
  assert.match(env, /refs\/heads\/sdlc\/run-\*/)
  assert.match(env, /refs\/remotes\/origin\/sdlc\/run-\*/)
  assert.match(env, /cannot work[\s\S]{0,200}use `direct`/)
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test skills/sdlc/test/prompts.test.mjs`
Expected: FAIL — the first `assert.match` fails; `env-detector.md` has no run-branch line.

- [ ] **Step 3: Rewrite the git-mode step in `env-detector.md`**

Replace step 3 of `skills/sdlc/prompts/env-detector.md` with:

```markdown
3. **Git mode:** use the input if it is given, then an existing `config.gitMode`. Otherwise:
   - `stack` if the input asked for it and the remote is github.com;
   - `pr` if `git remote -v` shows a github.com remote;
   - `mr` if the remote's host is a GitLab that `glab auth status --hostname <host>` accepts;
   - else `direct`.

   Then set:
   - `forge`: `github` for a github.com remote, `gitlab` when `glab auth status --hostname <host>` succeeds for the remote's host, else `""`.
   - `defaultBranch`: from `git symbolic-ref refs/remotes/origin/HEAD` in `pr` and `stack` mode (run `git remote set-head origin --auto` first if it is unset), else the current branch name. In `direct` and `mr` mode this is the working branch the slices are committed to. In `stack` mode nothing is committed to it directly.
   - `targetBranch` (`mr` mode only): the remote's default branch, from `git symbolic-ref --short refs/remotes/origin/HEAD` without the `origin/` prefix (run `git remote set-head origin --auto` first if it is unset). If it is the same as `defaultBranch`, or `forge` is `""`, `mr` mode cannot work: use `direct` and say why in `notes`.
   - `runBranch` (`stack` mode only): the run branch.
     1. **Number it above every run branch that exists**, so a second run in the same repo never clobbers a live one:
        `git for-each-ref --format='%(refname:short)' refs/heads/sdlc/run-* refs/remotes/origin/sdlc/run-*`
        Take the highest `<n>` in any `sdlc/run-<n>` name (0 when there are none) and use `<n> + 1`.
     2. **Create it from the default branch and push it:**
        `git checkout -b sdlc/run-<n> <defaultBranch>` then `git push -u origin sdlc/run-<n>`.
        The run branch carries the bootstrap ledger and the milestone plan before the first milestone branch exists, and is the base every milestone branch is cut from. It never carries product code.
     3. When `config.runBranch` already names a branch that exists — a resume — check it out (`git checkout <runBranch>`) and do not create a new one. A branch named by `runBranch` that does not exist is a run whose branch was deleted: report it and use `direct` in `notes` rather than inventing a new number.

   `stack` mode cannot work without a github.com remote and a signed-in `gh`: if `git remote -v` shows no github.com remote, or `gh auth status` fails, use `direct` and say why in `notes`. Never start a stack run without the remote it promises.
```

- [ ] **Step 4: Run the test**

Run: `node --test skills/sdlc/test/prompts.test.mjs`
Expected: PASS.

- [ ] **Step 5: Run the whole suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add skills/sdlc/prompts/env-detector.md skills/sdlc/test/prompts.test.mjs
git commit -m "feat(stack): create and push the run branch at bootstrap"
```

---

### Task 3: Cut slice branches from their milestone branch

**Files:**
- Modify: `skills/sdlc/state-write.py:159-186` (`ensure_slice_branch`)
- Test: `skills/sdlc/test/scripts.test.mjs`

**Interfaces:**
- Consumes: `config.gitMode`, `config.runBranch` (Task 1); `.sdlc/milestones.json` via the new `milestones` argument.
- Produces: `ensure_slice_branch(repo, config, slices, milestones, slice_id)` — the added `milestones` parameter is positional, third, and every call site passes it. Called by `patch_slice` at `state-write.py:188`.

This is the seam the whole mode rests on. If it cuts a slice from the wrong base, every downstream artifact — evidence files, timing budget, pull-request base — is wrong in a way that still looks plausible.

- [ ] **Step 1: Write the failing tests**

Append to `skills/sdlc/test/scripts.test.mjs`:

```js
test('stack mode cuts a slice branch from its milestone branch, creating and pushing that branch when it is absent', opts, () => {
  const repo = fixture({
    config: { gitMode: 'stack', defaultBranch: 'main', runBranch: 'sdlc/run-1' },
    slices: [slice('S-014', { requirements: [] })],
    milestones: [{ id: 'M-2', title: 'Sessions', status: 'pending', slices: ['S-014'], fixSlices: [] }],
  })
  git(repo, 'branch', 'sdlc/run-1')
  const r = call(STATE, repo, ['patch-slice', '--slice', 'S-014'], { status: 'in_progress' })
  assert.equal(r.code, 0)
  // the milestone branch was created from the run branch...
  git(repo, 'branch', 'sdlc/M-2')
  // ...and the slice was cut from the milestone branch, not from main or the run branch
  assert.equal(git(repo, 'merge-base', '--is-ancestor', 'sdlc/M-2', 'sdlc/S-014'), '')
  assert.equal(git(repo, 'rev-parse', 'sdlc/M-2'), git(repo, 'rev-parse', 'sdlc/S-014^'))
})

test('stack mode cuts an audit fix slice from the run branch, since it belongs to no milestone', opts, () => {
  const repo = fixture({
    config: { gitMode: 'stack', defaultBranch: 'main', runBranch: 'sdlc/run-1' },
    slices: [slice('S-fix-1', { kind: 'fix' })],
    milestones: [{ id: 'M-1', title: 'Done', status: 'verified', slices: [], fixSlices: [] }],
  })
  git(repo, 'branch', 'sdlc/run-1')
  const r = call(STATE, repo, ['patch-slice', '--slice', 'S-fix-1'], { status: 'in_progress' })
  assert.equal(r.code, 0)
  assert.equal(git(repo, 'rev-parse', 'sdlc/run-1'), git(repo, 'rev-parse', 'sdlc/S-fix-1^'))
  assert.equal(git(repo, 'branch', '--list', 'sdlc/M-1').trim(), '')
})

test('stack mode uses a milestone fix slice as an ordinary milestone slice', opts, () => {
  const repo = fixture({
    config: { gitMode: 'stack', defaultBranch: 'main', runBranch: 'sdlc/run-1' },
    slices: [slice('S-fix-M-2-1', { kind: 'fix' })],
    milestones: [{ id: 'M-2', title: 'Sessions', status: 'fixing', slices: [], fixSlices: ['S-fix-M-2-1'] }],
  })
  git(repo, 'branch', 'sdlc/run-1')
  assert.equal(call(STATE, repo, ['patch-slice', '--slice', 'S-fix-M-2-1'], { status: 'in_progress' }).code, 0)
  assert.equal(git(repo, 'rev-parse', 'sdlc/M-2'), git(repo, 'rev-parse', 'sdlc/S-fix-M-2-1^'))
})

test('stack mode bases the slice on a dependency awaiting merge, as pr mode does', opts, () => {
  const repo = fixture({
    config: { gitMode: 'stack', defaultBranch: 'main', runBranch: 'sdlc/run-1' },
    slices: [slice('S-014'), slice('S-015', { dependsOn: ['S-014'], status: 'awaiting-merge', pr: 'u' })],
    milestones: [{ id: 'M-2', title: 'Sessions', status: 'pending', slices: ['S-014', 'S-015'], fixSlices: [] }],
  })
  git(repo, 'branch', 'sdlc/run-1')
  git(repo, 'branch', 'sdlc/M-2')
  git(repo, 'branch', 'sdlc/S-014', 'sdlc/M-2')
  assert.equal(call(STATE, repo, ['patch-slice', '--slice', 'S-015'], { status: 'in_progress' }).code, 0)
  assert.equal(git(repo, 'rev-parse', 'sdlc/S-014'), git(repo, 'rev-parse', 'sdlc/S-015^'))
})

test('pr, direct and mr mode are untouched by the stack arm', opts, () => {
  for (const mode of ['pr', 'direct', 'mr']) {
    const repo = fixture({ config: { gitMode: mode, defaultBranch: 'main', runBranch: '' }, slices: [slice('S-001')] })
    assert.equal(call(STATE, repo, ['patch-slice', '--slice', 'S-001'], { status: 'in_progress' }).code, 0)
    assert.equal(git(repo, 'rev-parse', 'main'), git(repo, 'rev-parse', 'sdlc/S-001^'), `${mode} mode changed its base`)
  }
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test skills/sdlc/test/scripts.test.mjs`
Expected: FAIL — `stack mode cuts a slice branch from its milestone branch` fails, because `ensure_slice_branch` still bases on `main` and the fixture has no `milestones` argument.

- [ ] **Step 3: Add the branch-resolution helpers**

In `skills/sdlc/state-write.py`, immediately above `def ensure_slice_branch` (currently line 159), add:

```python
def milestone_of(milestones, slice_id):
    """The milestone a slice belongs to, or None: listed, a split child of a listed one, or a milestone fix slice."""
    for m in milestones or []:
        if slice_id in (m.get("slices") or []) or slice_id in (m.get("fixSlices") or []):
            return m.get("id") or None
    for m in milestones or []:
        # S-013a belongs to the milestone that lists its parent S-013
        parent = re.sub(r"[a-z]$", "", slice_id)
        if parent != slice_id and parent in (m.get("slices") or []):
            return m.get("id") or None
    for m in milestones or []:
        mid = m.get("id") or ""
        if mid and slice_id.startswith(f"S-fix-{mid}-"):
            return mid
    return None


def ensure_milestone_branch(repo, config, milestones):
    """sdlc/M-<n> for the first milestone that is not verified, created from the run branch and pushed. None when there is none."""
    run = config.get("runBranch") or ""
    for m in milestones or []:
        if m.get("status") == "verified" or not m.get("id"):
            continue
        want = f"sdlc/{m['id']}"
        if not branch_exists(repo, want):
            if not run or not branch_exists(repo, run):
                raise Fail(f"stack mode needs the run branch {run or '(unset)'}, which does not exist")
            # a default branch that moved under the run cannot fast-forward; merge it in rather than rebase or force
            git(repo, "checkout", "-q", run)
            if git(repo, "merge", "-q", "--ff-only", f"origin/{config.get('defaultBranch') or 'main'}", check=False).returncode != 0:
                git(repo, "merge", "-q", "--no-edit", f"origin/{config.get('defaultBranch') or 'main'}", check=False)
            git(repo, "checkout", "-q", "-b", want)
            git(repo, "push", "-q", "-u", "origin", want, check=False)
        return want
    return None
```

- [ ] **Step 4: Add the stack arm to `ensure_slice_branch`**

Change the signature at line 159 to take `milestones`, and replace the body from `me = next(...)` to the final `return want`:

```python
def ensure_slice_branch(repo, config, slices, milestones, slice_id):
    """Be on sdlc/<id>, creating it as commit-state.md says when it does not exist yet."""
    want = f"sdlc/{slice_id}"
    if git(repo, "branch", "--show-current").stdout.strip() == want:
        return want
    if branch_exists(repo, want):
        git(repo, "checkout", "-q", want)
        return want
    me = next((x for x in slices if x.get("id") == slice_id), {})
    base = config.get("defaultBranch") or "main"
    for dep in me.get("dependsOn") or []:
        d = next((x for x in slices if x.get("id") == dep), None)
        if d and d.get("status") == "awaiting-merge" and branch_exists(repo, f"sdlc/{dep}"):
            base = f"sdlc/{dep}"
            break
    else:
        if config.get("gitMode") == "stack":
            # a slice builds on its milestone; one that belongs to no milestone (an audit fix) builds on the run branch
            mid = milestone_of(milestones, slice_id)
            base = f"sdlc/{mid}" if mid else (config.get("runBranch") or base)
            if mid:
                ensure_milestone_branch(repo, config, milestones)
        elif config.get("gitMode") == "pr":
            # the slice starts from the up-to-date default branch; with no remote, or uncommitted state, it starts from the local one
            if git(repo, "checkout", "-q", base, check=False).returncode == 0:
                git(repo, "pull", "-q", "--ff-only", check=False)
    git(repo, "checkout", "-q", "-b", want, base)
    return want
```

- [ ] **Step 5: Update the call site**

In `patch_slice`, `skills/sdlc/state-write.py:188`, change:

```python
    branch = ensure_slice_branch(repo, config, slices_of(read_json(os.path.join(s, "slices.json"))), slice_id)
```

to:

```python
    branch = ensure_slice_branch(repo, config, slices_of(read_json(os.path.join(s, "slices.json"))),
                                 read_json(os.path.join(s, "milestones.json"), []), slice_id)
```

- [ ] **Step 6: Run the tests**

Run: `node --test skills/sdlc/test/scripts.test.mjs`
Expected: PASS, including the five new tests. The `pr`/`direct`/`mr` regression test is the one that proves the mode did not leak.

- [ ] **Step 7: Run the whole suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add skills/sdlc/state-write.py skills/sdlc/test/scripts.test.mjs
git commit -m "feat(stack): cut slice branches from their milestone branch"
```

---

### Task 4: Ship slices inside their milestone, and open the milestone pull request

**Files:**
- Modify: `skills/sdlc/prompts/integrator.md` (ship step, evidence step)
- Modify: `skills/sdlc/prompts/milestone-writer.md` (step 1.4 merge target, new step 8)
- Modify: `skills/sdlc/prompts/implementer.md` (test-time budget baseline)
- Test: `skills/sdlc/test/prompts.test.mjs`

**Interfaces:**
- Consumes: `config.runBranch`, the milestone branch name, and the slice's base branch from Task 3.
- Produces: `milestones.json` gains `pr` (declared in Task 1). `next-action.py` reads it in Task 5.

Slice shipping already works; it needs its base and its pull-request target moved onto the milestone branch. The evidence diff and the timing budget move with them, because both are diffs against a base and both would otherwise attribute an entire milestone's work to whichever slice ran last.

- [ ] **Step 1: Write the failing tests**

Append to `skills/sdlc/test/prompts.test.mjs`:

```js
test('the integrator ships a stack slice into its milestone branch, not the default branch', () => {
  const i = readFileSync(join(SKILL_DIR, 'prompts', 'integrator.md'), 'utf8')
  assert.match(i, /`stack` mode/)
  // the pull request targets the slice's base branch, which is its milestone branch
  assert.match(i, /--base <baseBranch>/)
  // and the evidence diff uses that same base, not the default branch
  assert.match(i, /git diff --name-only <baseBranch>\.\.\.HEAD/)
  assert.match(i, /--ref sdlc\/<id>/)
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

test('the implementer times the suite against the slice base branch in stack mode', () => {
  const i = readFileSync(join(SKILL_DIR, 'prompts', 'implementer.md'), 'utf8')
  assert.match(i, /`stack` mode/)
  assert.match(i, /base branch/)
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test skills/sdlc/test/prompts.test.mjs`
Expected: FAIL — `the integrator ships a stack slice into its milestone branch` fails; `integrator.md` has no `` `stack` mode `` line.

- [ ] **Step 3: Rewrite the integrator's ship step**

In `skills/sdlc/prompts/integrator.md`, replace step 6 (the `pr` mode block) with a block that covers both modes. The base branch is `sdlc/<id>`'s base: its milestone branch in stack mode, `defaultBranch` in pr mode.

```markdown
6. **Ship the slice pull request.** Let `<baseBranch>` be the branch `sdlc/<id>` was cut from: in `stack` mode its milestone branch, or `runBranch` for an audit fix; in `pr` mode `<defaultBranch>`. Read it from the branch rather than recomputing it — `git merge-base --fork-point` is not available everywhere, and the branch that exists next to `sdlc/<id>` is the answer.

   **`pr` mode** — base `<defaultBranch>`:
   1. If a PR with head `sdlc/<id>` is already open (`gh pr list --head sdlc/<id> --state open`), reuse it and skip step 2. If the remote branch exists but is stale from an earlier attempt, `git push --force-with-lease origin sdlc/<id>`; force-push only ever `sdlc/*` branches. Otherwise `git push -u origin sdlc/<id>`.
   2. `gh pr create --base <defaultBranch> --title "<type>(<id>): <slice title>" --body "<requirements implemented, tests, evidence summary>` followed by a blank line and `🤖 Generated with [Claude Code](https://claude.com/claude-code)"`.
   3. Watch CI with `gh pr checks --watch`. On failure, read `gh run view <run> --log-failed`, fix on the branch (you may edit product code for CI-only failures), commit, push, and watch again. Allow up to 5 fix cycles. A failure that passes on a single `gh run rerun --failed` counts as flaky: append a seed `{title: "flaky: <check>", ...}` and continue.
   4. If there are no checks, append a `note` log line "no CI checks on <pr>".
   5. `gh pr merge --squash --delete-branch`.
   6. **If that is blocked** by required reviews or branch protection: set the slice to `status: awaiting-merge` and `pr: <url>`, commit and push that state to the PR branch, `git checkout <defaultBranch>`, and return `{state: "awaiting-merge", pr}`. (The state-reader discovers awaiting-merge slices from open `sdlc/<id>` PRs, so nothing else needs to land on the default branch.)
   7. **After merging:** `git checkout <defaultBranch> && git pull --ff-only`, replace `"pending"` with the merge commit sha, set the slice to `status: done` if it says `awaiting-merge`, and do a **default-branch commit** (commit-state.md) with "commit sha <id>". Return `{state: "merged", pr, commit}`.

   **`stack` mode** — base `<baseBranch>`:
   1. Push exactly as in `pr` mode step 1: reuse an open PR with this head, force-push a stale branch with `--force-with-lease`, or `git push -u origin sdlc/<id>`.
   2. `gh pr create --base <baseBranch> --title "<type>(<id>): <slice title>" --body "<requirements implemented, tests, evidence summary>` followed by a blank line and `🤖 Generated with [Claude Code](https://claude.com/claude-code)"`. The milestone branch is the base, so this pull request is reviewed and merged inside the milestone, not into the default branch.
   3. Watch CI with `gh pr checks --watch`, and fix on the branch exactly as in `pr` mode step 3, with the same 5-cycle budget and the same flaky rule.
   4. `gh pr merge --squash --delete-branch`.
   5. **If that is blocked**, do `pr` mode step 6 verbatim: `status: awaiting-merge`, `pr: <url>`, commit and push that state to the slice branch, and return `{state: "awaiting-merge", pr}`. The base branch does not move while this pull request is open, so nothing downstream is disturbed.
   6. **After merging:** check out `<baseBranch>` and pull it, replace `"pending"` with the merge commit sha, set the slice to `status: done` if it says `awaiting-merge`, and do a **default-branch commit** (commit-state.md) with "commit sha <id>" — which lands on the milestone branch, per commit-state.md's stack arm. Return `{state: "merged", pr, commit}`.
   7. Never `gh pr merge --admin` and never force-push `<baseBranch>` or `sdlc/run-<n>`.
```

Also change step 1's checkout line so the receipt is read on the branch that exists, and step 2's evidence diff:

Step 1 currently begins `git checkout sdlc/<id>`. Leave it — the slice branch is `sdlc/<id>` in every mode.

Step 2's evidence line currently reads:

```
   - Set each requirement of the slice to `status: done`, with `evidence.files` (from `git diff --name-only <defaultBranch>...HEAD`), `evidence.tests` ...
```

Change `<defaultBranch>` to `<baseBranch>` and add above that bullet:

```
   - `<baseBranch>` is the branch `sdlc/<id>` was cut from, as step 6 defines it. In `stack` mode it is the milestone branch, so `git diff --name-only <baseBranch>...HEAD` lists only what this slice changed — diffing against `<defaultBranch>` would also list every earlier slice of the milestone and attribute them to this one's evidence.
```

- [ ] **Step 4: Update `milestone-writer.md`**

In step 1.4, the line reads:

```
   4. Merge `sdlc/<id>-e2e` into the default branch the way the integrator does for the git mode (`direct` or `mr`: squash-merge; pr: open a PR and let the state-reader merge it when green). Delete the branch when merged.
```

Replace it with:

```
   4. Merge `sdlc/<id>-e2e` into the branch the rest of the milestone is on. In `stack` mode that is `sdlc/M-<n>`: `git checkout sdlc/M-<n> && git merge --squash sdlc/<id>-e2e && git commit -m "test(e2e): harness for <milestoneId>"` (create `sdlc/M-<n>` from `runBranch` first if it does not exist). In `direct` or `mr` mode, squash-merge into the default branch. In `pr` mode, open a PR and let the state-reader merge it when green. Delete the branch when merged.
```

Append a new step 8 after step 7, before the "Do a **default-branch commit**" line:

```markdown
8. **Ship the milestone (stack mode only).** When `status` is `verified`, the milestone is ready for you; `bugs` and `fixing` leave it for the fix slices to land on the milestone branch first.
   1. `git checkout sdlc/M-<n> && git pull -q --ff-only`.
   2. Push: `git push -u origin sdlc/M-<n>`. If a PR with head `sdlc/M-<n>` is already open, reuse it; if the branch is stale from an earlier attempt, `git push --force-with-lease origin sdlc/M-<n>`.
   3. `gh pr create --base <defaultBranch> --title "<milestone id>: <milestone title>" --body "<what a person can do once this milestone is merged, the scenario table, the confirmed bugs and dismissed failures>` followed by a blank line and `🤖 Generated with [Claude Code](https://claude.com/claude-code)". The `M-0` baseline milestone's pull request carries only the e2e suite and this report; that is expected, not a mistake.
   4. `gh pr checks --watch`. On failure, read the log with `gh run view --log-failed`, fix on the milestone branch (you may edit product code for CI-only failures), commit, push, and watch again, for up to 3 cycles. A job that passes on one `gh run rerun --failed` counts as flaky: add a seed.
   5. **Merged:** set `"pr": "<url>"` on the milestone in `milestones.json`, commit it on `sdlc/M-<n>` and push. Then bring the run branch up to the default branch so the next milestone branches from shipped code:
      `git checkout <runBranch>`, then `git merge --ff-only origin/<defaultBranch>`; if that fails because the default branch moved, `git merge --no-edit origin/<defaultBranch>` instead. Never force-push either branch. Then delete the milestone branch: `git branch -D sdlc/M-<n>` and `git push origin --delete sdlc/M-<n>`. A deletion the remote does not have is fine.
   6. **Blocked by required review or branch protection:** set `"pr": "<url>"`, commit it on `sdlc/M-<n>` and push, and return as you are. Do not create the next milestone branch: the next milestone branches from `<defaultBranch>`, and building on a milestone you have not landed would stack work on unshipped ground. The state-reader reports the run as waiting and `/loop` retries.
   7. Never `gh pr merge --admin`.
```

- [ ] **Step 5: Update the implementer's timing baseline**

In `skills/sdlc/prompts/implementer.md`, the sentence reads:

```
Run the full test command in the background as "Long commands" in _common.md says. Keep it fast: the slice may add at most max(60 s, 20 %) to the full `config.commands.test` wall time over the default branch.
```

Replace `over the default branch` with:

```
over its base branch. That base branch is the one `sdlc/<id>` was cut from, as integrator.md's step 6 defines it: in `stack` mode the slice's milestone branch (which already holds the earlier slices of the milestone), and in the other modes the default branch. Timing against the default branch in stack mode would charge this slice for its milestone's other work.
```

- [ ] **Step 6: Run the tests**

Run: `node --test skills/sdlc/test/prompts.test.mjs`
Expected: PASS, all tests in the file — including the broadened stack-coverage test from Task 1, which now has all eight files to check.

- [ ] **Step 7: Run the whole suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add skills/sdlc/prompts/integrator.md skills/sdlc/prompts/milestone-writer.md skills/sdlc/prompts/implementer.md skills/sdlc/test/prompts.test.mjs
git commit -m "feat(stack): ship slices inside their milestone and open the milestone pull request"
```

---

### Task 5: Hold the run while a milestone pull request is open

**Files:**
- Modify: `skills/sdlc/next-action.py` (mode gate at line 215, PR discovery at 268-281, wait branch at 327-329)
- Modify: `skills/sdlc/prompts/state-reader.md` (reference section)
- Test: `skills/sdlc/test/next-action.test.mjs`

**Interfaces:**
- Consumes: `gitMode: "stack"` (Task 1), the `pr` field on a milestone (Task 4).
- Produces: `action: "wait"` when a milestone's pull request is open, and `checkout` naming the milestone branch so the state-reader lands on the right branch.

A blocked milestone PR is the one place stack mode must refuse to make progress. The next milestone branches from `main`, so proceeding would stack new work on code no human has accepted.

- [ ] **Step 1: Write the failing tests**

Append to `skills/sdlc/test/next-action.test.mjs`:

```js
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test skills/sdlc/test/next-action.test.mjs`
Expected: FAIL — `stack mode waits while a milestone pull request is open` fails; the mode gate at line 215 only lists pull requests in `pr` mode, so with no open PRs the decision falls through to section D and returns `slice`.

- [ ] **Step 3: Widen the mode gate**

In `skills/sdlc/next-action.py:215-219`, change:

```python
    mode = (config or {}).get("gitMode")

    # sync and the state-PR wait (pr mode only: direct and mr mode have no pull requests for slices or state)
    open_prs, merged_prs = [], []
    if config and mode == "pr":
```

to:

```python
    mode = (config or {}).get("gitMode")
    stack = mode == "stack"

    # sync and the state-PR wait (pr mode only: direct and mr mode have no pull requests for slices or state.
    # stack mode has pull requests for slices and milestones, but none for state, so it skips the state-PR arm)
    open_prs, merged_prs = [], []
    if config and mode in ("pr", "stack"):
```

- [ ] **Step 4: Add the milestone wait to section B**

In `skills/sdlc/next-action.py`, after the slice PR discovery loop (which ends at the line `pr_of[sid] = p`, currently line 281) and before `def out(...)`, insert:

```python
    # stack mode: an open milestone pull request holds the run. The next milestone branches from the default
    # branch, so starting it before this one lands would build on code nobody has reviewed.
    milestone_hold = None
    if stack:
        known = {m.get("id") for m in as_list(src.json(".sdlc/milestones.json") or [], "milestones")}
        for p in open_prs:
            head = p.get("headRefName", "")
            if not re.fullmatch(r"sdlc/M-.+", head):
                continue
            mid = head[len("sdlc/"):]
            # sdlc/M-1-e2e is merged locally in stack mode and never has a pull request, but a stale one
            # from a run that changed mode must not hold this one
            if mid in known and not pr_ready(p):
                milestone_hold = (mid, p.get("url") or p["number"])
                break
```

This reads `milestones.json` inline rather than through a helper: the parsed `milestones` variable does not exist yet at this point in `decide`, and adding one for a single call would be a needless seam.

- [ ] **Step 5: Return the wait**

In section E of `decide` (`skills/sdlc/next-action.py:327-329`), change:

```python
    waiting = [s for s in slices if s.get("status") == "awaiting-merge"]
    if waiting and not todo:
        return out("wait", "E: only pull requests awaiting review remain: " + ", ".join(f"{s['id']} {s.get('pr', '')}".strip() for s in waiting))
```

to:

```python
    if milestone_hold and not todo:
        mid, url = milestone_hold
        return out("wait", f"E: milestone {mid} is not merged yet ({url}); the next milestone branches from the default branch, so the run holds until a human merges it")
    waiting = [s for s in slices if s.get("status") == "awaiting-merge"]
    if waiting and not todo:
        return out("wait", "E: only pull requests awaiting review remain: " + ", ".join(f"{s['id']} {s.get('pr', '')}".strip() for s in waiting))
```

- [ ] **Step 6: Update the module docstring's check list**

In `skills/sdlc/next-action.py:16-21`, change the `B` line to:

```
  B  finish work in flight a PR that can merge or was merged by a human; a slice in progress; a milestone holding the run
```

- [ ] **Step 7: Update `state-reader.md`**

In `skills/sdlc/prompts/state-reader.md`, change the "What the script checks" paragraph to add stack mode:

```
It reads the state from the slice branch that is in progress when there is one, and from the default branch otherwise. In `direct` and `mr` mode it makes no forge calls. In `pr` mode it lists pull requests, asks you to merge ready `sdlc/state-*` and `sdlc/M-*-e2e` pull requests, and treats a slice whose open pull request branch records `awaiting-merge` as awaiting merge. In `stack` mode it lists pull requests too, but there are no state pull requests: it waits while a milestone's pull request into the default branch is open, because the next milestone branches from the default branch.
```

And change the **B. Finish work in flight** bullet to:

```
- **B. Finish work in flight:** a slice whose pull request can merge, or was merged by a human; a slice in progress; a milestone pull request that is not merged yet (wait).
```

- [ ] **Step 8: Run the tests**

Run: `node --test skills/sdlc/test/next-action.test.mjs`
Expected: PASS, all tests. `pr mode still merges a ready e2e pull request itself` is the regression guard for Task 3's neighbour.

- [ ] **Step 9: Run the whole suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add skills/sdlc/next-action.py skills/sdlc/prompts/state-reader.md skills/sdlc/test/next-action.test.mjs
git commit -m "feat(stack): hold the run while a milestone pull request is open"
```

---

### Task 6: Cut the e2e branch from the milestone branch

**Files:**
- Modify: `skills/sdlc/prompts/e2e-harness.md` (line 3 ownership note, step 1 line 7)
- Test: `skills/sdlc/test/prompts.test.mjs`

**Interfaces:**
- Consumes: the milestone branch name that Task 3 creates.
- Produces: nothing downstream reads; the e2e branch's base must match where Task 4 merges it.

- [ ] **Step 1: Write the failing test**

Append to `skills/sdlc/test/prompts.test.mjs`:

```js
test('the e2e harness cuts its branch from the milestone branch in stack mode', () => {
  const e = readFileSync(join(SKILL_DIR, 'prompts', 'e2e-harness.md'), 'utf8')
  assert.match(e, /`stack` mode/)
  assert.match(e, /sdlc\/M-<n>/)
  assert.match(e, /not the default branch/)
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test skills/sdlc/test/prompts.test.mjs`
Expected: FAIL — `e2e-harness.md` has no stack line.

- [ ] **Step 3: Update `e2e-harness.md`**

Change the ownership sentence to:

```
You commit on branch `sdlc/<milestoneId>-e2e`. In `stack` mode it is cut from `sdlc/M-<n>`, the milestone branch, not the default branch, so the suite lands with the milestone it proves.
```

And step 1 to:

```
1. **Branch:** check out `sdlc/<milestoneId>-e2e` if it exists; otherwise create it. In `stack` mode create it from the milestone branch `sdlc/M-<n>`, creating that from `runBranch` first when it is missing; in `pr` mode from the up-to-date default branch. Never cut it from the default branch in `stack` mode.
```

- [ ] **Step 4: Run the tests**

Run: `node --test skills/sdlc/test/prompts.test.mjs`
Expected: PASS.

- [ ] **Step 5: Run the whole suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add skills/sdlc/prompts/e2e-harness.md skills/sdlc/test/prompts.test.mjs
git commit -m "feat(stack): cut the e2e branch from the milestone branch"
```

---

### Task 7: Pin the mode list so the script and the docs cannot drift

**Files:**
- Modify: `skills/sdlc/test/bootstrap.test.mjs`
- Test: `skills/sdlc/test/bootstrap.test.mjs`

**Interfaces:**
- Consumes: `GIT_MODES` exported into the compiled script's scope by Task 1 (`sdlc-loop.js:309`).
- Produces: a test that fails when the script's enum and the documented modes disagree.

The mode must be agreed in the workflow script, `SKILL.md`, `state-schema.md` and `env-detector.md`. When they disagree the failure is silent and bad: a `stack` that `env-detector` sets but `next-action.py` does not understand behaves like `direct`, committing slices with no pull request and no push. The cheapest durable guard is a test that reads the docs and compares them to the script.

- [ ] **Step 1: Write the failing test**

Append to `skills/sdlc/test/bootstrap.test.mjs`:

```js
import { loadInternals } from './harness.mjs'

test('the documented git modes and the workflow script agree', async () => {
  const rt = await loadInternals()
  assert.deepEqual(rt.I.GIT_MODES, ['pr', 'direct', 'mr', 'stack'])
  for (const [name, file] of [['SKILL.md', 'SKILL.md'], ['state-schema.md', 'prompts/state-schema.md'], ['env-detector.md', 'prompts/env-detector.md']]) {
    const text = readFileSync(join(SKILL_DIR, file), 'utf8')
    for (const mode of rt.I.GIT_MODES) assert.match(text, new RegExp(`\`${mode}\``), `${name} does not document ${mode} mode`)
  }
})
```

Add to the existing import at the top of the file if it is not already there: `import { readFileSync } from 'node:fs'` and `import { join } from 'node:path'`. `harness.mjs` must export `loadInternals`, which it already does.

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test skills/sdlc/test/bootstrap.test.mjs`
Expected: FAIL — `rt.I.GIT_MODES` is `undefined`, because `harness.mjs` only exports `meta` and `internals` and `sdlc-loop.js` does not put `GIT_MODES` on `INTERNALS`.

- [ ] **Step 3: Expose `GIT_MODES` on the internals**

In `skills/sdlc/sdlc-loop.js`, find the `INTERNALS` object near the end of the file and add `GIT_MODES` to it:

```js
const INTERNALS = { /* …existing entries… */, GIT_MODES }
```

- [ ] **Step 4: Run the test**

Run: `node --test skills/sdlc/test/bootstrap.test.mjs`
Expected: PASS.

- [ ] **Step 5: Run the whole suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add skills/sdlc/sdlc-loop.js skills/sdlc/test/bootstrap.test.mjs
git commit -m "test(stack): pin the mode list so the script and the docs cannot drift"
```

---

### Task 8: Document the mode

**Files:**
- Modify: `README.md` (the `--git` bullet list around lines 106-113)

**Interfaces:**
- Consumes: every mode name and behavior defined in Tasks 1-7.
- Produces: nothing consumed by code.

- [ ] **Step 1: Add the README entry**

After the `--git mr` bullet, add:

```markdown
- `--git stack`: the milestone is the unit you review and merge. The tool creates `sdlc/run-<n>` from your default branch and pushes it, cuts a `sdlc/M-<n>` branch per milestone from it, and cuts each slice branch from its milestone branch with a pull request targeting that milestone — so you keep per-slice CI and can still merge a slice on its own. When a milestone's behavior campaign verifies, its branch opens a pull request against your default branch; after you merge that, the run branch fast-forwards to your default branch and the next milestone branches from there. A milestone pull request that is blocked by a required review holds the run rather than stacking work on code you have not accepted. GitHub only.
```

And after the line about attempt branches (line 113), add:

```markdown
In `stack` mode there are no `sdlc/state-*` pull requests: `.sdlc/` state commits ride on the current milestone's branch, or on the run branch before the first milestone branch exists, and land with the milestone.
```

- [ ] **Step 2: Run the whole suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs(stack): document the milestone-layered delivery mode"
```

---

## Self-Review

**Spec coverage.** Every section of the spec maps to a task: topology → Tasks 1, 3; state commits → Tasks 1, 3; slice lifecycle → Tasks 3, 4; milestone lifecycle → Tasks 4, 5; pre-flight/config/mode detection → Tasks 1, 2; edge cases → Task 3 (`main` moves, `M-0` note in Task 4, exhausted unchanged); testing → every task; files → all of them.

**Deliberate omission.** The spec lists `sdlc-loop.js` as needing cost/action wiring "if the milestone wait needs its own path". It does not: `wait` already exists in the `NEXT` enum and `sdlc-loop.js:1016` already maps it to `finish('waiting', …)`. The hold is a decision, not an action, so Task 5 adds no action. `sdlc-loop.js` changes only for the enum (Task 1) and `INTERNALS` (Task 7).

**Type consistency.** `ensure_slice_branch(repo, config, slices, milestones, slice_id)` — the new third positional parameter is declared once (Task 3, Step 4) and its single call site is updated in the same task (Step 5). `milestone_of(milestones, slice_id)` and `ensure_milestone_branch(repo, config, milestones)` are called only inside that arm. `milestones_preview(src, repo, current)` is defined in Task 5, Step 4 and called in the same step. `GIT_MODES` is defined in Task 1, Step 3 and read in Task 7, Step 3.

**Placeholder scan.** No TBD, no "similar to", no unimplemented steps. Every prompt rewrite carries the literal replacement text.

**Review Focus coverage.** All five lines have tests: remote-moving → Task 3's `ensure_milestone_branch` merge fallback, exercised by the milestone-branch test's `origin/main` lookup failing and taking the merge path; existing run branch → Task 2's `refs/heads/sdlc/run-*` assertion; absent milestone branch → Task 3's first test; no github remote → Task 2's `cannot work` assertion; resume on the run branch → Task 1's `first run only … runBranch` assertion.