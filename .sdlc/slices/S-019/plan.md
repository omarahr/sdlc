# Plan S-019: SKILL.md names the run branch and checks the user's branch

## Approach
This slice edits `skills/sdlc/SKILL.md` and adds tests. The Run worktree bullet now names the run branch through `branches.py name --kind run`. On a first run, `--n` is one more than the count of `branches.py list --kind run`. On a relaunch, the run branch is the last entry of that list, and the worktree goes back onto it. The name needs `FMT`, and `FMT` comes from the Branch format bullet. So the Run worktree bullet moves to just after the Branch format bullet. The bullet "If `$WT/.sdlc/config.json` exists and its `specPath` differs" moves with it, because it uses `WT`. The format mismatch sentence from S-018 moves into the Run worktree bullet, as ADR-20261010-012412-decision-judge-S-018-fd46 allows. The Git mode bullet needs `WT` too, because it reads `$WT/.sdlc/config.json` when that file exists, else `$REPO/.sdlc/config.json`. This keeps `gitMode: stack` and `runBranch` on a resume. So one new short bullet, "Worktree path", sets `WT="$REPO/.claude/worktrees/sdlc-run"` before the Git mode bullet, and the Git mode bullet names both paths. The ADR that supersedes b1d3 is in DECISIONS.md (ADR-...-planner-S-019, "Git mode keeps the WT-first read and WT is set before it"). The Branch format bullet gains one sentence: when `parse` prints no kind, ask nothing and continue. Two parse tests pin the edge cases R-118 and R-101 against `branches.py`.

## Files
- Modify `skills/sdlc/SKILL.md`: add a "Worktree path" bullet that sets `WT` before the Git mode bullet; edit the Git mode bullet to name `$WT/.sdlc/config.json` when it exists, else `$REPO/.sdlc/config.json`; move the Run worktree bullet and the specPath bullet below the Branch format bullet (the `WT=` assignment moves out of the Run worktree bullet); rewrite the Run worktree bullet; delete the separate mismatch bullet; add the no-kind sentence to the Branch format bullet.
- Modify `skills/sdlc/test/prompts.test.mjs`: add new tests; update the assertions that pin `sdlc/run-<n>` inside the Run worktree bullet (lines near 64, 222 and 713-733) and T-R-048, which pins a separate mismatch bullet.
- Modify `skills/sdlc/test/branches.test.mjs`: add the two parse tests.

## Tests
- T-R-047a (prompts.test.mjs): the Run worktree bullet contains `RUN_BRANCH=$(python3 "$SKILL_DIR/branches.py" name --repo "$REPO" --format "$FMT" --kind run --n <n>)`. It says `<n>` is one more than the count of `branches.py list --kind run` on a first run.
- T-R-047b: the Run worktree bullet comes after the Branch format bullet. The `worktree add "$WT" -b "$RUN_BRANCH"` command appears in it. The literal `sdlc/run-<n>` no longer appears in that bullet.
- T-R-121: the bullet says that on a relaunch the run branch is the last entry of `list --kind run` and that `git -C "$WT" checkout "$RUN_BRANCH"` puts HEAD back on it. It says the driver creates no new run branch on a relaunch.
- T-R-047c: the specPath bullet and the mismatch sentence come after the Branch format bullet. The mismatch sentence is inside the Run worktree bullet and keeps its wording: report both, end, a run in progress keeps its names.
- T-R-047d: the Run worktree and specPath bullets come after the Branch format bullet.
- T-R-047e: the `WT="$REPO/.claude/worktrees/sdlc-run"` assignment appears before the Git mode bullet and before the Branch format bullet. The Git mode bullet names `$WT/.sdlc/config.json` when that file exists, else `$REPO/.sdlc/config.json`. The Run worktree bullet comes after the Branch format bullet and no longer holds the assignment.
- T-R-118 (branches.test.mjs): `parse("feature/PROJ-1-{name}", "feature/PROJ-1-S-002")` through the CLI returns kind `slice` and id `S-002`. `feature/PROJ-1-foo` returns kind null.
- T-R-101 (branches.test.mjs): `parse("sdlc/{name}", "sdlc/feature-x")` returns kind null.
- T-R-101b (prompts.test.mjs): the Branch format bullet says that when `parse` prints no kind, the driver asks no rename and the launch continues. The rename ask (`git branch -m <new-name>`) stays tied to a printed kind.
- T-R-118b (prompts.test.mjs): the Branch format bullet asks for a rename when `parse` prints a kind, and its example parse call uses `--format "$FMT"`.
- Regression: the whole `prompts.test.mjs`, `branches.test.mjs` and `bootstrap.test.mjs` stay green.

## Steps
1. Write the failing tests first (test-writer).
2. Add the "Worktree path" bullet with the `WT=` assignment before the Git mode bullet. Edit the Git mode bullet to name both config paths. Cut the Run worktree bullet and the specPath bullet from their place. Paste them after the Branch format bullet, before `rm -f "$REPO/.sdlc/STOP"`.
3. In the Run worktree bullet, replace `sdlc/run-<n>` with `$RUN_BRANCH`. Add the `RUN_BRANCH=$(...)` command. State that on a first run `<n>` is one more than the count of `branches.py list --repo "$REPO" --format "$FMT" --kind run`. State that on a relaunch `RUN_BRANCH` is the last entry's `branch`.
4. Move the mismatch sentence to the end of the Run worktree bullet. Delete the old separate bullet.
5. Add the no-kind sentence to the Branch format bullet.
6. Update the stale assertions named in Files. Do not weaken them: each keeps its intent with the new names.
7. Add the parse tests. Run `npm test`.

## Risks
- The old bullet order puts the worktree before the config checks. The move keeps the worktree before the specPath check, so the existing order test holds. `WT` is now set before the Git mode bullet, so that bullet can read `$WT` when the file exists. A first run falls back to `$REPO`. A resume keeps `gitMode` and `runBranch`. The Branch format bullet still reads `$REPO` first; a stale `$REPO` format on a resume is caught by the later mismatch check. This is unchanged behavior.
- Many tests pin `sdlc/run-<n>` text. The Default branch bullet, stack-mode text and cleanup text keep the literal for now. A later slice owns those.
- Prose tests are brittle to rewording. Pin phrases, not single words.
- `list --kind run` counts only branches that parse under `FMT`. A run branch from an older format is not counted. This matches the spec edge case.

## Critique responses
- spec-fidelity: the plan now supersedes ADR-20261010-014200-decision-judge-S-019-b1d3 with a new auto ADR in DECISIONS.md. The reason is that a REPO-only read loses `gitMode: stack` and `runBranch` on a resume, because the run state lives in the worktree. The Git mode bullet keeps the `$WT`-when-it-exists read, then `$REPO`, and T-R-047e pins it. The minor note is accepted: T-R-118b and the R-118 parse test are regression pins.
- architecture: a new "Worktree path" bullet sets `WT` before the Git mode bullet, so the Git mode read is defined after the move. Only the worktree gitignore check, creation and checkout stay after the Branch format bullet. T-R-047e pins the `WT=` assignment before both the Git mode and Branch format bullets.
