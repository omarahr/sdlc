# `--git stack`: milestone-layered delivery

Date: 2026-10-04
Status: approved design, awaiting spec review

## Intent

The loop already pushes when a slice ships, but only in `pr` and `mr` mode, and only to the default branch. There is no unit of delivery between "one slice" and "the whole run". A human reviewing this repo cannot take a coherent, demoable chunk of work and land it.

Goal: a fourth git mode where a **milestone is the unit a human reviews and merges**, with slices reviewed underneath it as they are built.

**What the user asked for:** push to the remote when a slice completes if the project has one; one branch the SDLC builds on top of; milestone branches out of that branch; slice branches out of the milestone branch, merging back into it.

**Decisions taken during brainstorming:**

| Question | Answer |
|---|---|
| Unit of human review and merge | The milestone: `sdlc/M-<n>` → `main`, one PR |
| Slices | Keep their own PR, base = the milestone branch |
| Fit with existing modes | A new `--git stack`; `pr`/`direct`/`mr` unchanged |
| Run branch | The tool creates and pushes `sdlc/run-<n>` at bootstrap |
| After a milestone merges | Fast-forward `sdlc/run-<n>` to `main`; branch the next milestone from there |
| Audit fix slices (`S-fix-<n>`) | Branch from `sdlc/run-<n>`, PR straight into `main` |
| Milestone PR blocked by review | Hold the run: state `waiting`, no progress |
| Forge support | GitHub only |
| `.sdlc/` state commits | On the milestone branch when one exists, else the run branch |

**Assumptions:**
- The repo has a GitHub remote and `gh` is signed in. Without one, stack mode is not available and the mode falls back as `pr` mode's does.
- Milestones remain sequential, as today. The mode makes the sequential structure legible and reviewable; it does not enable parallel milestones.

### Non-goals

- Changing what `pr`, `mr` or `direct` do. Stack is additive.
- Parallel milestone branches.
- GitLab or any other forge.
- Migrating a run that is already in flight. Stack is a new mode, so no existing run can be in it.
- Retrying, resuming or auto-reconciling a milestone PR that a human edited.

## Topology

```
main      A─────B─────C                              M-1 merged
 ╲
sdlc/run   R1────R2──────F────────C                  ff to main
                 ╲
sdlc/M-1          M1'                                   PR → main
   ├─ sdlc/S-014  S014'                                  PR → sdlc/M-1
   └─ sdlc/S-015  S015'
```

Four branch classes:

| Branch | Cut from | PR base | Created by |
|---|---|---|---|
| `sdlc/run-<n>` | `main` at bootstrap | — | env-detector, `git push -u` |
| `sdlc/M-<n>` | `sdlc/run-<n>`, at the milestone's first slice | `main` | state-write, `git push -u` |
| `sdlc/<id>` | its milestone branch; `sdlc/run-<n>` for audit fixes | its base branch | state-write |
| `sdlc/M-<n>-e2e` | the milestone branch | — | e2e-harness (unchanged) |

The run branch holds bootstrap state before the first milestone and is the base the next milestone branches from. It never carries product code itself, so between milestones it is equal to `main`.

## State commits

A `.sdlc/` state commit lands on **the current milestone's branch when that branch exists, otherwise on `sdlc/run-<n>`.**

"Current milestone" is the first entry in `milestones.json` whose status is not `verified`. Whether its branch exists is the test. So:

- bootstrap ledger and milestone planning → `sdlc/run-1` (no `sdlc/M-1` exists yet)
- from the first slice onward → `sdlc/M-1`

`main` therefore receives `.sdlc/` state in milestone-sized batches, rather than in today's stream of one-PR-per-state-commit.

**No `sdlc/state-*` pull requests exist in stack mode.** That entire arm of `commit-state.md` stays `pr`-only.

## Slice lifecycle

`state-write.py:159-186` (`ensure_slice_branch`) gains a stack arm:

- **Base** is the slice's milestone branch. Create it from `sdlc/run-<n>` and `git push -u` it if absent; merge `sdlc/run-<n>` into it first if `main` has moved (see *Edge cases*).
- **Audit fixes** (`S-fix-<n>` from the final audit) base on `sdlc/run-<n>`. This is sound because the audit runs after every milestone has merged, so the run branch equals `main` at that point.
- **Behavior-campaign fixes** (`S-fix-<milestone>-<n>`) are ordinary milestone slices.

The consequential detail: **the evidence and timing baseline becomes the slice's base branch, not `main`.** `integrator.md:16` currently runs `git diff --name-only <defaultBranch>...HEAD`; in stack mode that would attribute every earlier slice in the milestone to this one. The same swap applies to the implementer's test-time budget and the suite receipt.

The integrator's ship step, stack arm, otherwise matches `pr` mode exactly: PR head `sdlc/<id>`, base = the slice's base branch, `gh pr checks --watch`, up to 5 CI fix cycles, a single-pass failure recorded as a flaky seed, and blocked-by-protection → `status: awaiting-merge` with the PR url, leaving the PR open. The blocked path is safe because the base branch does not move while its slice PR is open.

## Milestone lifecycle

The milestone PR opens when a campaign reaches `verified` — not before. On `bugs`, the milestone-writer creates `S-fix-<milestone>-<n>` slices that merge into the milestone branch, and the campaign runs again.

`milestone-writer.md` gains a ship step after it commits the report on the milestone branch:

1. Merge `sdlc/<milestoneId>-e2e` into `sdlc/M-<n>` (the existing step 1.4, retargeted) and delete the e2e branches.
2. Open `sdlc/M-<n>` → `main`, `gh pr checks --watch`, up to 3 CI fix cycles.
3. On merge: `git checkout sdlc/run-<n>`, bring it to `main`, delete `sdlc/M-<n>` locally and on the remote.
4. On blocked by review: record `pr: <url>` on the milestone, return without changing status.

`milestones.json` gains `pr`. Its `status` enum is unchanged (`pending`, `fixing`, `verified`, `exhausted`); whether the PR is merged is read from `gh pr view`, the same way slice PRs are.

**A blocked milestone PR holds the run.** `next-action.py` discovers open `sdlc/M-*` PRs exactly as it discovers slice PRs today and returns `wait`; under `/loop` the skill backs off 30 minutes. This is the honest consequence of milestone-delivers-to-`main`: the next milestone branches from `main`, so proceeding would stack work on unshipped ground.

## Pre-flight, config and mode detection

`config.json` gains `runBranch`. In stack mode `defaultBranch` is read from `git symbolic-ref refs/remotes/origin/HEAD`, **not** from the current branch name — slices must never land on `main` in this mode. This is the same rule `pr` mode uses and differs from `direct`/`mr`, where `defaultBranch` is the working branch.

**Bootstrap:** `n` is 1 + the highest existing `sdlc/run-*` across local branches and `origin`. Create `sdlc/run-<n>` from `main` and `git push -u origin sdlc/run-<n>`.

**Resume:** `config.runBranch` is authoritative — check it out. The existing pre-flight check that rejects a current branch starting with `sdlc/` (SKILL.md:37) must be scoped to the first run only, or it would misfire on every resume, since after bootstrap the current branch *is* `sdlc/run-<n>`.

Mode detection is agreed in three places that must stay in sync: `SKILL.md:29-36`, `env-detector.md:20-22`, and `next-action.py:215`. The failure mode of disagreement is silent and bad: a `stack` that `env-detector` sets but `next-action.py` does not understand degrades into something that behaves like `direct`, committing slices with no PR and no push. A shared exported constant is preferred over three string literals.

## Edge cases

- **`main` moves under the run.** `git merge --ff-only origin/main` into `sdlc/run-<n>` fails; merge `main` into `sdlc/run-<n>` instead, then branch the milestone. Never force-push either branch.
- **`M-0` baseline milestone** (repos already in progress) gets a branch and a PR into `main` carrying just the e2e suite and the report. It is small and legitimate; the prompt says so explicitly so it does not read as a bug.
- **A human merges the milestone PR while the loop sleeps.** `next-action.py` sees it merged, fast-forwards the run branch, continues. No special case needed.
- **`exhausted` milestone.** No PR opens; `gaps` is listed and the loop reports and stops. Already the current contract.
- **A slice whose dependency is `awaiting-merge`.** The existing rule (branch from the dependency's branch) still applies, and in stack mode that is a milestone branch.

## Testing

- `bootstrap.test.mjs:52` asserts the `gitMode` enum `['pr','direct','mr']`; it becomes four values.
- `ensure_slice_branch` in stack mode: cuts from the milestone branch; creates and pushes `sdlc/M-<n>` from the run branch when absent; audit fixes cut from `sdlc/run-<n>`.
- `next-action.py`: an open `sdlc/M-*` PR yields `wait`.
- `gitMode: "stack"` resolves `defaultBranch` from `origin/HEAD`, not the current branch.
- `prompts.test.mjs`: prompt-level assertions for the new arms.

`ensure_slice_branch` is the seam to test first. If it cuts a slice from the wrong base, every downstream artifact — evidence files, timing budget, PR base — is wrong in a way that still looks plausible.

## Files

| File | Change |
|---|---|
| `SKILL.md` | `--git stack` flag, mode detection, run-branch bootstrap and resume |
| `prompts/state-schema.md` | `runBranch` and `pr` fields, `gitMode` enum, stack mode description |
| `prompts/env-detector.md` | detect `stack`; `defaultBranch` from `origin/HEAD`; create and push the run branch |
| `prompts/commit-state.md` | stack arm for slice commits and state commits |
| `prompts/integrator.md` | stack ship step; base-branch evidence diff and timing baseline |
| `prompts/milestone-writer.md` | milestone PR ship step, retargeted e2e merge |
| `prompts/implementer.md` | test-time budget against the base branch |
| `prompts/e2e-harness.md` | e2e branch cut from the milestone branch |
| `state-write.py` | `ensure_slice_branch` stack arm |
| `next-action.py` | discover `sdlc/M-*` PRs; mode agreement |
| `sdlc-loop.js` | cost and action wiring if the milestone wait needs its own path |
| `README.md` | mode table and the topology diagram |
| `test/*.test.mjs` | the cases above |