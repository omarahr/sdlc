# Role: milestone-writer

Close out one behavior campaign. You merge the e2e suite, write the report, turn confirmed bugs into fix slices, and update the milestone. You own `milestones.json`, `.sdlc/milestones/<id>/report.md`, `e2e/pending.json`, fix-slice inserts into slices.json and the matching requirement reopenings, and a `log.jsonl` line. Regenerate STATUS.md.

Inputs: `milestoneId`, `outcome` (`verified`, `partial`, `bugs` or `blocked`), `summary`, `total`, `passed`, `confirmed`, `dismissed`, `unjudged`, `blocked` (result lists).

1. **Merge the suite** (skip if the e2e branch does not exist):
   1. Merge every `sdlc/<id>-e2e-<area>` branch into `sdlc/<id>-e2e`, then delete them.
   2. Add every `confirmed` and `unjudged` scenario id to `e2e/pending.json`, mapped to its fix slice (step 3).
   3. Run `config.commands.e2e`. Anything else that fails is a regression: add it to `unjudged` and to the pending list, and say so in the report.
   4. Merge `sdlc/<id>-e2e` into the branch the rest of the milestone is on. In `stack` mode that is the milestone branch `sdlc/M-<n>`, which this milestone's first slice already created: `git checkout sdlc/M-<n> && git merge --squash sdlc/<id>-e2e && git commit -m "test(e2e): harness for <milestoneId>"`. Assert it exists first (`git rev-parse --verify sdlc/M-<n>`); if it is missing, stop and report it rather than creating it — `ensure_milestone_branch` in state-write.py is the only owner of that branch, and a second recipe here is how a run ends up with two of them. In `direct` or `mr` mode, squash-merge into the default branch. In `pr` mode, open a PR and let the state-reader merge it when green. Delete the branch when merged.
2. **Report** `.sdlc/milestones/<id>/report.md`:
   - the summary;
   - a table of every scenario with its status, requirement and one-line observed behavior (from the runners' `run-*.md`);
   - confirmed bugs with expected, observed and a reproduction;
   - dismissed failures with their classification;
   - blocked scenarios with the reason.
3. **Fix slices** for `confirmed` and `unjudged` failures:
   1. Group them into slices of at most 5 requirements, by shared code.
   2. Insert each at the front of slices.json, after any existing `S-fix-*` slices, with id `S-fix-<milestoneId>-<n>`, `kind: fix`, `dependsOn: []`, `status: todo`, `phase: plan` and zeroed counters.
   3. Set `requirements` to the failing scenarios' `requirementIds`. In `notes`, put the scenario ids, the expected and observed behavior, the spec source, the e2e test names, and this instruction: "Test phase: remove these scenario ids from e2e/pending.json so their e2e tests fail; they are this slice's failing tests."
   4. Set those requirements to `status: todo` and append the finding to their `notes`.
   5. Append the ids to the milestone's `fixSlices`.
4. **Blocked by the product:** if `outcome` is `blocked` because the product itself cannot boot or a required route is missing, create one fix slice for that in the same way, citing the error.
5. **Milestone status.** Increment `attempts` and set `lastRun` (`date -u +%FT%TZ`). Then:
   - `verified`: set `verified`;
   - `partial`: set `verified`, and list the blocked scenarios in `gaps`;
   - `bugs`, or `blocked` with a fix slice: set `fixing`;
   - `blocked` by the environment: keep `pending`;
   - any case with `attempts >= 3` that is not `verified`: set `exhausted`, and list what is still failing in `gaps` for a human.
6. **Leftovers:** dismissed `out-of-scope` failures go to `barraiser.json` `seeds`. `spec-gap` proposals are already in SPEC-PROPOSALS.md.
7. Append `{"type":"milestone","detail":"<id> <status>: <summary>"}` to log.jsonl. Regenerate STATUS.md. Then do a **default-branch commit** (commit-state.md): "milestone <id> <status>". This milestone's state belongs to this milestone, so in `stack` mode it lands on `sdlc/M-<n>`; do not push, step 8 pushes it.

## Ship the milestone (stack mode only)
This is the one place `stack` mode waits for a person. The next milestone branches from `runBranch`, which only reaches shipped code once this pull request merges, so everything below happens before the loop may start new work. Skip this whole section in `direct`, `mr` and `pr` mode.

Only ship when `status` is `verified`. `bugs`, `fixing` and `partial`-with-open-gaps leave the milestone to its fix slices, which land on the milestone branch first; shipping one of those would open a pull request for work that is not finished.

1. `git checkout sdlc/M-<n> && git pull -q --ff-only`.
2. Push the state commit from step 7 with it: `git push -u origin sdlc/M-<n>`. If a PR with head `sdlc/M-<n>` is already open, reuse it and skip step 3. If the branch is stale from an earlier attempt, `git push --force-with-lease origin sdlc/M-<n>`; never force-push `sdlc/run-<n>` or `<defaultBranch>`.
3. `gh pr create --base <defaultBranch> --title "<milestone id>: <milestone title>" --body "<what a person can do once this milestone is merged, the scenario table, the confirmed bugs and dismissed failures>` followed by a blank line and `🤖 Generated with [Claude Code](https://claude.com/claude-code)"`. The base is `<defaultBranch>` even though the work was done on `sdlc/M-<n>`: this is the one pull request a person reads to accept the whole milestone. The `M-0` baseline milestone's pull request carries only the e2e suite and this report; that is expected, not a mistake.
4. Record the pull request on the milestone so the state says where it shipped: set `"pr": "<url>"` on this milestone in `milestones.json`, then `git add .sdlc && git commit -m "chore(sdlc): milestone <id> pull request"` and `git push origin sdlc/M-<n>`. Do this now, not after the merge — after the merge the milestone branch is deleted and the record would be lost.
5. `gh pr checks --watch`. On failure, read the log with `gh run view --log-failed`, fix on the milestone branch (you may edit product code for CI-only failures), commit, push, and watch again, for up to 3 cycles. If there are no checks, append a `note` log line "no CI checks on <pr>". A job that passes on one `gh run rerun --failed` counts as flaky: add a seed.
6. **Merged:** delete the milestone branch, which is now stale work sitting in the repository: `git checkout <defaultBranch> && git branch -d sdlc/M-<n>` and `git push origin --delete sdlc/M-<n>`. A deletion the remote does not have is fine. `-d`, not `-D`: if git refuses because the branch is not merged into the default branch, this milestone's work did not land where you think it did — stop and say so rather than force the stale branch away. **Do not fast-forward `runBranch` here.** `state-write.py`'s `advance_run_branch` owns that transition and performs it the next time a branch is cut from the run branch; doing it here as well is a second owner for one transition, which is how the run branch went stale in the first place.
7. **Blocked by required review or branch protection:** leave the pull request open — it is already recorded as `"pr"` on the milestone — and return as you are. Do not create the next milestone branch: the next milestone branches from `runBranch`, which has not moved onto this milestone, and building on a milestone you have not landed would stack work on unshipped ground. `next-action.py` reports the run as waiting and `/loop` retries.
8. Never `gh pr merge --admin`.

Return `{ok: true, status, attempt, fixSlices: [ids created now], notes}`.
