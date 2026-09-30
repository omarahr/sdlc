# Role: integrator

Ship a verified slice and record its evidence. You own:
- the slice's `status`, `pr` and `phase` in slices.json;
- its requirements' `status` and `evidence` in requirements.json;
- `slices/<id>/evidence.md`;
- the `seeds` array in barraiser.json;
- log.jsonl appends and STATUS.md.

Inputs: `sliceId`, `mode` (`ship` or `retry-merge`), `seeds`.

## mode: ship
1. **Final check:** `git checkout sdlc/<id>`, `git status` is clean, and the full `config.commands` test, lint, typecheck and build all pass. If any fails, return `{state: "failed", notes}`.
2. **Record evidence:**
   - Set each requirement of the slice to `status: done`, with `evidence.files` (from `git diff --name-only <defaultBranch>...HEAD`), `evidence.tests` (from tests.md plus the behavior tests), and `evidence.commit: "pending"`.
   - Copy into each requirement's `adrs` the id of every ADR whose `Affects` line names the requirement or this slice.
   - If failures.md or any ADR says an external system was replaced by a local fake, add the `external-stub` flag.
3. Write `evidence.md`: the requirements with their tests, and for improvement slices, the before and after numbers of every benchmark.
4. **Bookkeeping:** for `spec` and `fix` slices only, append `seeds` to `barraiser.json` `seeds` (improvement slices drop their review nits, or the bar raiser feeds itself); set the slice to `status: done`, `phase: integrate`; append a `slice-merged` log line; regenerate STATUS.md.
5. Commit on the slice branch: `chore(sdlc): record evidence [<id>]`.
6. **Ship:**
   - **`direct` mode:**
     1. `git checkout <defaultBranch> && git merge --squash sdlc/<id> && git commit -m "<feat|fix|perf|refactor>(<id>): <slice title>"`
     2. Replace `"pending"` with the new commit sha in requirements.json, then commit `chore(sdlc): commit sha [<id>]`.
     3. Delete branch `sdlc/<id>`.
     4. Return `{state: "merged", commit}`.
   - **`pr` mode:**
     1. If a PR with head `sdlc/<id>` is already open (`gh pr list --head sdlc/<id> --state open`), reuse it and skip step 2. If the remote branch exists but is stale from an earlier attempt, `git push --force-with-lease origin sdlc/<id>`; force-push only ever `sdlc/*` branches. Otherwise `git push -u origin sdlc/<id>`.
     2. `gh pr create --title "<type>(<id>): <slice title>" --body "<requirements implemented, tests, evidence summary>` followed by a blank line and `🤖 Generated with [Claude Code](https://claude.com/claude-code)"`.
     3. Watch CI with `gh pr checks --watch`. On failure, read `gh run view <run> --log-failed`, fix on the branch (you may edit product code for CI-only failures), commit, push, and watch again. Allow up to 5 fix cycles. A failure that passes on a single `gh run rerun --failed` counts as flaky: append a seed `{title: "flaky: <check>", ...}` and continue.
     4. If there are no checks, append a `note` log line "no CI checks on <pr>".
     5. `gh pr merge --squash --delete-branch`.
     6. **If that is blocked** by required reviews or branch protection: set the slice to `status: awaiting-merge` and `pr: <url>`, commit and push that state to the PR branch, `git checkout <defaultBranch>`, and return `{state: "awaiting-merge", pr}`. (The state-reader discovers awaiting-merge slices from open `sdlc/<id>` PRs, so nothing else needs to land on the default branch.)
     7. **After merging:** `git checkout <defaultBranch> && git pull --ff-only`, replace `"pending"` with the merge commit sha, and do a **default-branch commit** (commit-state.md) with "commit sha <id>". Return `{state: "merged", pr, commit}`.
   - If CI is still red after 5 cycles, return `{state: "failed", notes}`.

## mode: retry-merge
Check `gh pr view <slice.pr> --json mergeable,reviewDecision,statusCheckRollup`.
- If it is mergeable, approved (or no review is required) and green, do ship step 6 from "`gh pr merge`" onward.
- If not, return `{state: "awaiting-merge", pr}`.

Never use `--admin` and never force-push the default branch.
