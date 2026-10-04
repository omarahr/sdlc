# The slice base branch, decided in code

`state-write.py base-branch --repo . --slice S-014` prints the branch a slice is cut from, and the
prompts ask it instead of spelling the rule out.

## The problem

Six prompt files each described in prose which branch a slice's work belongs on, while `state-write.py`
already computed that answer in `ensure_slice_branch`. Two owners for one rule is what produced the
defects on the branch just merged:

- `commit-state.md` picked the branch from a milestone's `status`. The milestone-writer sets `verified`
  *before* it commits, so that rule sent the commit to the wrong branch. No single status value routes
  every caller correctly — the rule was not merely imprecise, it was unanswerable as stated.
- `milestone-writer.md` described advancing the run branch in a step that never runs. The writer only
  runs while a milestone is *due*, and a merged milestone is `verified` everywhere and due never again.
  The run branch stayed on pre-merge code.
- A third instance: the run branch was advanced in prose while `ensure_milestone_branch` independently
  merged the same upstream into it — two owners for one transition.

The common failure is not carelessness. A prompt is prose, so a test can only assert that certain words
are present, never that the rule they encode is the rule the code applies. Every one of these defects
passed a green suite. Moving the decision into code makes it testable; a wrong branch is now a wrong
string a test can compare against real git topology.

## Design

`base-branch` is read-only. It creates no branch, checks nothing out, deletes nothing and commits
nothing — which is what lets an integrator ask it mid-ship, with a working tree it must not lose. It
prints one JSON object, modelled on `status`:

```
$ python3 skills/sdlc/state-write.py base-branch --repo . --slice S-014
{"ok": true, "slice": "S-014", "branch": "sdlc/M-2"}
```

A failure prints `{"ok": false, "error": ...}` and exits 2, naming no branch:

```
$ python3 skills/sdlc/state-write.py base-branch --repo . --slice S-999
{"ok": false, "error": "no slice S-999 in slices.json"}
```

That last part is the point of the "unknown slice" case. An agent holds a slice id from its inputs, and
*every* branch name in the file is a legal answer for some other slice, so a fallback would hand the
integrator a plausible branch with nothing to do with the work.

### Two rules extracted rather than re-derived

`slice_base` is the read-only decision. Two of its inputs were already encoded inline in
`ensure_slice_branch`, and re-deriving them in a second place would recreate the two-owner problem inside
the one file meant to end it. Both are now named functions that the cut and the answer share:

- **`milestone_shipped(milestones, id)`** — the `verified` rule. This is the rule that defeated
  `commit-state.md`. Extracted so `ensure_milestone_branch` and `slice_base` cannot drift on it.
- **`awaiting_merge_base(repo, slices, slice_id)`** — a dependency that is `awaiting-merge` and still has
  its branch. Its pull request is open, so its work is on no other branch, and a slice cut from anywhere
  else would not contain it.

`ensure_slice_branch` keeps its side effects (creating the milestone branch, advancing the run branch,
the `pr`-mode pull) and now calls `awaiting_merge_base` for the decision it used to compute inline. The
ordering is unchanged: `advance_run_branch` still runs before the run branch is used as a base, and
`ensure_milestone_branch` still runs before the milestone branch is cut from.

### Where the answer stops

`slice_base` names the milestone branch *even where that branch does not exist yet* — `ensure_milestone_branch`
creates it when the slice is cut. That is deliberate: the first slice of a milestone asks this before its
branch exists, and having the command create it would make it a second owner of a branch that function owns.
It never falls back to the default branch in `stack` mode; an unanswerable case is an error.

## What changed, per file

### `skills/sdlc/state-write.py`

- `milestone_shipped`, `awaiting_merge_base`, `slice_base` added; `ensure_milestone_branch` and
  `ensure_slice_branch` call the shared helpers.
- `base-branch` subcommand, read-only, next to `status` in `main()`.
- Module docstring updated with the new usage line.

### `skills/sdlc/prompts/integrator.md` — the main case

Step 2 (evidence diff) and step 6 (`gh pr create --base`) now run the command. The two-case enumeration is
gone. The "do not rediscover it with a git command" prohibition is kept and widened: `gitMode` alone is
also not enough, because it does not say which milestone owns the slice, whether that milestone has
shipped, or whether a dependency is awaiting merge — each of which changes the answer. Added: on a
non-zero exit, report and stop rather than picking a branch. `retry-merge` refers to "the value ship
step 6 defines" instead of "the same two-case value".

### `skills/sdlc/prompts/implementer.md`

The timing baseline names the command instead of the two cases. Kept the `mr` mention, since the command
answers `<defaultBranch>` there too and the suite-wide test requires every mode-branching prompt to say
what `mr` does.

### `skills/sdlc/prompts/escalator.md`

A `<baseBranch>` preamble defines the value once, and the three sites that used to name the milestone
branch or `runBranch` (the archive checkout, the replan cut, the spike scratch branch) now refer to it.
The default-branch-commit sentence points at the same value.

### `skills/sdlc/prompts/state-writer.md` — a split decision, stated

**force-park: routed through the command.** It names a slice's branch, so its answer varies with the
milestone, the shipped state and the dependencies — and a wrong branch here silently strands the slice's
write-up where nothing will read it. Same rule as the other three, so it gets the same owner.

**bootstrap and audit-result: left in prose.** Neither has a slice to ask about. Bootstrap runs before any
milestone exists, and the audit's own commit belongs to no milestone; both answers are the constant
`runBranch`. A command call there would be ceremony around a constant, and it would be ceremony in the
two places a reader most needs to see the reason. Their existing assertions
(`bootstrap belongs to no milestone`, `the audit belongs to no milestone`) still pin *why* they land on
the run branch, which is the part a reader actually has to hold.

### Prompts deliberately left alone

- **`milestone-writer.md`** — untouched. Its step 6 already describes no transition at all ("nothing to do
  here, and that is deliberate"), with the reasoning intact. No branch decision was reintroduced. Its
  step 1 e2e merge names `sdlc/M-<n>`, which is `ensure_milestone_branch`'s branch and is asserted to
  exist rather than created; that is a different question from "which base does a *slice* build on", and
  the milestone writer is keyed by milestone, not slice.
- **`e2e-harness.md`** — untouched, including the constraint that it must not create the milestone branch.
  Its base is keyed by `milestoneId`, not by a slice, so `base-branch --slice` has no slice to resolve and
  routing it through the command would mean inventing a slice-shaped question. The existing test pins the
  do-not-create rule, and that constraint is worth more than the deduplication.
- **`commit-state.md`** — untouched, per instruction. It already names the branch by CASE ("the milestone
  branch the slice or milestone in this commit belongs to... or `runBranch` when it belongs to no
  milestone") rather than by status, which is the defect that was actually fixed. It remains prose, and
  that is the one place where the rule is still stated in words rather than asked for; I flag it below
  rather than churning it, since its tests pin the current wording and the instruction was explicit.

## Tests

`npm test` from the repo root, Node v24.14.1, Python 3.

| | tests | pass | fail |
|---|---|---|---|
| baseline at `6f59a78` | 305 | 305 | 0 |
| after this change | 313 | 313 | 0 |

`pr`, `direct` and `mr` are covered by a new test that builds a milestone *and* a run branch in each of
those modes, asserts the answer is the default branch and not either of them, and then asserts
`patch-slice` still cuts the slice from that same branch — so the three modes are shown unchanged, not
merely unexamined.

### Every new test, and how it was confirmed to fail first

All eight new behaviour tests were run against the unmodified script and **all eight failed** — the
subcommand did not exist, so the process printed argparse usage and no JSON:

```
✖ base-branch names the milestone branch for a slice that belongs to a milestone
✖ base-branch names the run branch for an audit fix that belongs to no milestone
✖ base-branch names the run branch for a fix of a milestone that already shipped
✖ base-branch names the dependency branch for a slice whose dependency is awaiting merge
✖ base-branch names a milestone branch that does not exist yet, without creating it
✖ base-branch reads the repo and changes nothing at all
✖ base-branch fails loudly rather than printing a plausible branch
ℹ tests 7  ℹ pass 0  ℹ fail 7
```

The eighth (the `pr`/`direct`/`mr` test) failed the same way on the first run and is listed with them in
the commit; the seven above are the `--test-name-pattern="base-branch"` selection.

### The topology is real

Each fixture seeds every candidate base — `sdlc/run-1`, `sdlc/M-1`, `sdlc/M-2`, the dependency branch —
as its own commit, via a `seed` helper, so a wrong branch is a different sha rather than an unfalsifiable
string. Where a test asserts a name, it also asserts the commit it points at, and three of them assert
that `patch-slice` really cut the slice from the branch the command named, so the answer cannot drift from
what the code does.

### Tests proven to catch the defect, not just pass

A test that passes whatever the prompt says is worse than none, so each new assertion was checked against
a deliberate regression and then reverted:

| Injected regression | Caught by | Result |
|---|---|---|
| `escalator.md` prose rule restored | `must not name the milestone branch: the command owns that` | fails |
| `integrator.md` prose rule restored | `expected to not match /milestone branch \`sdlc\/M-<n>\`/` | fails |
| `milestone_shipped` check dropped from `slice_base` | `names the run branch for a fix of a milestone that already shipped` | fails |
| `advance_run_branch` called from `base-branch` | `base-branch committed` | fails |

The last one is worth recording, because **the read-only test passed the mutation the first time.** Its
fixture used a slice belonging to a milestone, whose base is `sdlc/M-<n>`, so the injected
`advance_run_branch` never fired — the test could not see the one transition it was written to guard. The
fixture now uses an audit fix slice, whose base *is* the run branch, and asserts the run branch and
`origin/main` are different commits so an advance is observable rather than a no-op. That change is the
test earning its keep; without it the mutation would have shipped.

### Prompt tests touched, and what they now pin

Two assertions changed, both in `prompts.test.mjs`:

1. **`the integrator ships a stack slice into its milestone branch...`** → renamed to *asks the code for
   the slice base branch instead of naming it in prose*. Before, it asserted two prose strings
   (`in \`stack\` mode the slice's milestone branch \`sdlc\/M-<n>\``, `in \`pr\` mode \`<defaultBranch>\``).
   Those strings were the thing being removed, so keeping them would have forbidden the fix. The
   replacement asserts the command is invoked, that the prose rule is **absent** (both names, and
   `Read \`gitMode\` from`), and that the prohibitions survive — do not deduce it from `gitMode` or from
   git, and stop on a non-zero exit. The negative assertions are the load-bearing part: they fail if
   anyone reintroduces a second owner, which is what the first version of this test could not do.

2. **`the escalator and force-park commit to the branch the run lives on...`** → renamed to *ask for the
   branch rather than naming it, and never the default branch*. Before, it counted exactly 4 `stack` lines
   and required each to name both `sdlc/M-<n>` and `runBranch`. That structure assumed the rule would be
   restated at every site, which is exactly what is being removed — there is now one definition and three
   references. The replacement asserts the command is invoked once, that the prose naming is **absent**,
   and that all three former sites now reference `<baseBranch>` — so no site can quietly revert to a
   literal. The stack-mode prohibitions (`the default branch is never committed to`, `Never cut it from
   \`<defaultBranch>\``) and the write-up-follows-the-checkout ordering are all still asserted.

   Bootstrap and audit-result keep their two assertions, with a comment recording why they stay prose.

Both rewritten tests were verified to fail against the restored prose (table above).

## Concerns

- **The working tree was not clean when this started, and the work in it was not mine.** At session start
  HEAD was `c8ec1d5`; it was `6f59a78` ("refactor(stack): one source of truth for the git mode list")
  by the time I began, with uncommitted edits to `next-action.py`, `state-write.py` and
  `git-modes.test.mjs` on top. That uncommitted work **fails `npm test`** at the commit
  (`a missing or malformed git-modes.json stops the scripts instead of falling back to a list`); it passes
  at `6f59a78`, so the failure is introduced by the uncommitted edits, not by this branch. Because I had to
  edit `state-write.py` and commit cleanly, I did all of this in a separate worktree
  (`/tmp/sdlc-base-branch`, branch `refactor/base-branch`) and left the main working copy untouched. The
  two changes both touch `state-write.py`, so **this branch will need a rebase onto whatever that
  work-in-progress becomes** — the `base-branch` command and the `GIT_MODES_ERROR` envelope both land in
  `main()`.
- **`commit-state.md` still states the rule in prose.** Per instruction I did not churn it, and its
  case-based wording is not the defect that was fixed. But it is the one remaining place where an agent
  reads the rule rather than asking for it, so the "exactly one owner" goal is not fully met while it
  stands. It is keyed by milestone as well as slice, so routing it through `base-branch --slice` is not a
  drop-in — it would need a milestone-keyed variant or an explicit "use the command" clause. Worth a
  follow-up decision rather than a quiet edit.
- **The prompts now depend on a script call succeeding.** If `base-branch` cannot run, four prompts stop
  and report instead of proceeding. That is the intended failure direction — a wrong branch is worse than
  a stopped run — but it is a new way for a run to halt, and `pr`/`direct`/`mr` runs now depend on a
  command they did not previously need.
- **Not fixed, reported only:** `advance_run_branch` is still called from inside `ensure_slice_branch`, so
  the run branch advances as a side effect of cutting a branch rather than on its own terms. That is
  pre-existing and deliberate (the comment says so), but it means the run branch's freshness still depends
  on a branch being cut somewhere.
