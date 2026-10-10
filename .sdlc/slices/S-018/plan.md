# Plan S-018: SKILL.md gets the flag, the pre-flight bullet and the launch arg

## Approach
This slice edits one driver file, `skills/sdlc/SKILL.md`, and adds tests for it. The Commands line gains `--branch-format "<format>"` and a description bullet beside `--commit-format`. In Pre-flight, one new "Branch format" bullet follows the "Git mode" bullet. The new bullet uses the exact text of spec section 5. It replaces the old "Branch name (first run only)" bullet. It also replaces the `mr`-mode GitLab push-rule sentence inside the Git mode bullet, because the preflight verdict now covers both. A second short bullet follows the new one. It reports both formats and ends the run when the worktree's `config.json` holds a different `branchFormat` than `$FMT`. The Launch args gain `branchFormat`, with a sentence that says its value is `$FMT`. The run-branch naming through `branches.py name` is slice S-019 and is out of scope here. A derived format reaches the worktree's `config.json` through the env-detector (later slices). This slice only instructs the driver to pass `$FMT` and to report a derived format.

## Files
- Modify `skills/sdlc/SKILL.md`: the Commands line and flag bullet; the Git mode bullet (drop the push-rule sentence); the Branch format bullet (replaces the Branch name bullet); the worktree-format-mismatch bullet; the Launch `Workflow` args and one sentence about `branchFormat`.
- Modify `skills/sdlc/test/prompts.test.mjs`: add the new tests below. Rewrite only the one existing assertion `first run only[\s\S]{0,400}runBranch`, which pinned the deleted bullet (see Risks).

## Tests
All tests read `SKILL.md` text in `skills/sdlc/test/prompts.test.mjs`.
- T-R-045: the Commands line matches `--commit-format "<format>"\] \[--branch-format "<format>"\]`, in that order. A flag bullet for `--branch-format` follows the `--commit-format` bullet, and it names the placeholder `{name}`.
- T-R-046a: the Pre-flight has a `**Branch format:**` bullet that comes after `**Git mode:**` and before `rm -f "$REPO/.sdlc/STOP"`. It contains `branches.py" preflight --repo "$REPO" --mode <gitMode>`, `--format "<format>"`, `--branch "$BASE_BRANCH"` in `mr` mode, `branchFormat` from `$REPO/.sdlc/config.json`, `samples`, `rule`, `notes`, `suggestion`, `FMT` from `format`, `derived`, `working`, `branches.py" parse --repo "$REPO" --format "$FMT" --branch "$BASE_BRANCH"`, `git branch -m <new-name>`, and `first run only`.
- T-R-046b: the old text is gone. SKILL.md has no `Branch name (first run only)` and no `branch_name_regex` and no `push_rule`.
- T-R-097: the Branch format bullet says that when `derived` is true the driver tells the user the derived format and that it is now in config.json. It says `FMT` is the `format` of the verdict. It also says that a resume takes the format from the `config.json` `branchFormat`, which gives the same value without `--branch-format`.
- T-R-048: a bullet after the Branch format bullet says that a `branchFormat` in `$WT/.sdlc/config.json` that differs from `$FMT` makes the driver report both values and end. It says a run in progress keeps its names.
- T-R-049: the Launch `Workflow({ ... })` args contain `branchFormat` between `commitFormat` and `maxIterations`. The text says the value is `$FMT` and that the arg is always passed.
- Regression: the whole existing `prompts.test.mjs`, `bootstrap.test.mjs` and `hub.test.mjs` suites stay green.

## Steps
1. Write the failing tests first in `prompts.test.mjs` (the test-writer owns this step).
2. Edit the Commands line: add `[--branch-format "<format>"]` after `[--commit-format "<format>"]`.
3. Add the `--branch-format` bullet after the `--commit-format` bullet. It says the flag sets the format of every branch name the loop makes, with the placeholder `{name}`. It gives the default `sdlc/{name}` and the example `"feature/PROJ-1-{name}"`. It says that without the flag the run uses the format in `config.json`, or derives one when the repo enforces a rule.
4. In the Git mode bullet, delete the sentence "On GitLab, also read the push rule ... passes this check." Keep the rest of the `mr` text.
5. Replace the Branch name bullet with the spec section 5 bullet, word for word.
6. Add the mismatch bullet after it. Text: "After the worktree exists, when `$WT/.sdlc/config.json` holds a `branchFormat` that differs from `$FMT`, report both and end: a run in progress keeps its names."
7. Add `branchFormat` to the Launch args (after `commitFormat`) and a sentence: "`branchFormat` is `$FMT`; pass it on every launch."
8. Rewrite the one stale assertion in `prompts.test.mjs` as the ADR says (see Risks). Edit no other assertion. Then run `npm test`.

## Risks
- The existing test "the skill documents the stack flag..." asserts `first run only[\s\S]{0,400}runBranch` (line 66). The spec removes the bullet that holds this text. Per ADR-20261010-012416-decision-judge-S-018-b1c1 (Option 3), rewrite only this one assertion. The new regex pins the Branch format bullet. It requires `first run only` and the wording `on a resume the current branch is normally the run branch`, and it drops the `runBranch` match. It stays strict. No other assertion changes.
- The Pre-flight now names `$WT` before `FMT` exists (the Run worktree bullet comes first). The mismatch bullet sits after the Branch format bullet, so `FMT` is defined when it applies. S-019 owns the run-branch naming in the Run worktree bullet.
- The spec literal `sdlc/` appears in SKILL.md in many other places. A later slice adds the "no prompt spells a loop branch literally" test. This slice does not touch those places, except the removed bullet. The new text uses `sdlc/{name}` only as the stated default; S-019 and later slices must keep that allowed.
- `--mode <gitMode>`: the git mode is decided before this bullet, because the bullet follows Git mode. No ordering problem.

## Critique responses
- "Resolved by pending: pending": this critique has no content. The plan needs no change for it.
- ADR-20261010-012416-decision-judge-S-018-b1c1, Option 3: the plan rewrites only the one assertion in `prompts.test.mjs`. The new assertion pins the Branch format bullet, requires `first run only` and the resume wording, and drops the `runBranch` match. See Risks and Step 8.
