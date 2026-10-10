# Run: docs (M-1)

Test file: `e2e/tests/docs.test.mjs` on branch `sdlc/M-1-e2e-docs`. Channels used: api, logs, events (a clean `git status --porcelain` stands in for db).

## Summary
- Pass: SC-M-1-051 to 058.
- Fail: none.
- Blocked: none.

## SC-M-1-051: pass
Expected: no prompt and no SKILL.md line outside fences matches the loop-branch regex. A copy with `sdlc/S-001` appended makes the guard fail.
Observed: 55 files scanned, 0 matches. The guard test T-R-080 passed on a clean copy of the tree (exit 0). It failed on a copy with the line appended to planner.md (exit 1, message "planner.md spells a loop branch literally"). The working tree stayed clean. Stderr held no Traceback.

## SC-M-1-052: pass
Expected: eight placeholders, each command exits 0, `parse` gives a kind for a loop branch and null for `main`.
Observed: the eight rows are present in order. The `<verify branch>` row names the `branch` input and no `branches.py` call. The `<run branch>` row names `config.runBranch` in `stack` mode, else the last `list --kind run` entry. Each command (taken from the table text) exited 0 with empty stderr. `parse` printed kind `slice` for `sdlc/S-001` and kind null for `main`. Refs and files of the scratch repo did not change.

## SC-M-1-053: pass
Observed: flag row at SKILL.md line 12, `--commit-format` row line 15, `--branch-format` row line 16. One Branch format bullet (line 43) follows Git mode directly. The old "Branch name (first run only)" text is gone. `--format` is only given when known. `--branch` is only given in `mr` mode. `RUN_BRANCH` comes from `branches.py name --kind run`. A relaunch uses the last list entry. A format mismatch with the worktree config is reported and ends the run. A resume runs no parse check.
Wording note: the Launch line lists `branchFormat` in the args and states "`branchFormat` is `$FMT`". It does not spell `branchFormat: "$FMT"` letter for letter. It uses the same shorthand as `commitFormat`. I judged this as present.
Observation (not a failure): the Branch format bullet reads the format from `$REPO/.sdlc/config.json`. The Git mode bullet reads `$WT/.sdlc/config.json` first. The words follow the spec. A resume with no `--branch-format` and no `$REPO` config would pass no format, and the mismatch check in the Run worktree bullet could then end the run.

## SC-M-1-054: pass
Observed: env-detector has the `branchFormat` input and the exact config line. state-schema holds `"branchFormat": "sdlc/{name}"` and the spec sentence. commit-state has no `date -u` branch build and uses `<state branch>`. slicer writes `branch: <slice branch>`. On a fixture with `sdlc/S-001-attempt-1`, `sdlc/S-001-attempt-10` and `sdlc/S-010-attempt-1`, the integrator's `list --kind attempt` step kept ids equal to `S-001` and deleted the first two. `sdlc/S-010-attempt-1` stayed.

## SC-M-1-055: pass
Observed: README Usage row (line 102) holds `[--branch-format "<format>"]`. The flag bullet (line 111) has the example `"feature/PROJ-1-{name}"`. The Branch names paragraph (line 115) comes after the git-mode and flag bullets. The config row (line 183) names `branchFormat`. The tree lists `branches.py` (line 397). `ste-style.md` has no diff against the merge base with main. `ste-check.py` exited 0 for all 25 edited prompts. It exited 1 on a copy with a long sentence, naming `long-sentence` at line 3. The working tree stayed clean.

## SC-M-1-056: pass
Expected: the copy fails with a message naming the sentence; the original passes.
Observed: the original exits 0 with no output. The copy with a 35-word passive sentence exits 1 with `long-sentence` and `multi-clause` lines that quote the sentence. Stderr is empty.
Note: `ste-check.py` has no passive rule. A short passive sentence alone passes (exit 0). ste-style.md and the spec name no such rule, so I did not count this as a defect.

## SC-M-1-057: pass
Observed: each of the 13 named cases has one matching test title in the four files. Some titles carry a `T-R-` prefix or are split in two (derive, state-write); the content matches the spec case. No title repeats in a file. `npm test` exited 0 (782 tests, 781 pass, 1 skipped for a missing `go`). It exited 0 again with `TZ=Pacific/Kiritimati`. The four files exited 0 under `node --test` with absolute paths from another cwd (451 tests). No Traceback or unhandled rejection. No new file in the repo or in the other cwd.

## SC-M-1-058: pass
Observed: `preflight --mode pr` on a fresh one-commit repo ran at least three times until the state timestamp crossed a second. Every run exited 0, stderr was empty, and stdout was one JSON object. The outputs were byte-equal after the `state-<timestamp>` name was masked. Refs and files did not change.
