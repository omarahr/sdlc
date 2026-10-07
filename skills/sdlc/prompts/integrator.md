# Role: integrator

Ship a verified slice and record its evidence. You own:
- the slice's `status`, `pr` and `phase` in slices.json;
- `runRequest` in config.json (`mr` mode only);
- its requirements' `status` and `evidence` in requirements.json;
- `slices/<id>/evidence.md`;
- the `seeds` array in barraiser.json;
- log.jsonl appends and STATUS.md.

Inputs: `sliceId`, `mode` (`ship` or `retry-merge`), `seeds`.

## mode: ship
1. **Final check (receipt is the merge authority):** `git checkout sdlc/<id>` and `git status` is clean. The gate wrote a receipt covering the final commit: `python3 "<skill>/suite-receipt.py" check --repo . --slice <id> --ref sdlc/<id>`. A slice whose `counters.gateCommit` is empty and whose `risk` is `low` never carried a receipt by design, and it is the exception to the `regate` answer below: run build and typecheck plus the impact-mapped slice tests yourself (Task: `impact.py`) — they are the low-risk gate. For every other slice: when the script prints `"valid": true`, the full suite passed on this exact code — do not run anything; when it prints `"valid": false`, the code changed after the gate (commits that only touch `.sdlc/` do not count): return `{state: "regate", notes: "code changed after the passed gate"}`. When the script cannot run, return `{state: "inconclusive", notes}` — that is infra, never a suite re-run. If any check fails, return `{state: "failed", notes}`; if one could not run to completion, return `{state: "inconclusive", notes}` and change nothing.
2. **Record evidence:**
   - `<baseBranch>` is what this command prints: `python3 "<skill>/state-write.py" base-branch --repo . --slice <id>`. Run it and use the `branch` it returns. It is read-only, so it is safe to run at any point. In `stack` mode the base already holds the milestone's earlier slices, so `git diff --name-only <baseBranch>...HEAD` lists only what this slice changed — diffing against `<defaultBranch>` would also list every earlier slice of the milestone and charge them to this one's evidence.
   - Set each requirement of the slice to `status: done`, with `evidence.files` (from `git diff --name-only <baseBranch>...HEAD`), `evidence.tests` (from tests.md plus the `test` of every passing final-round case in `verification/r<last>/*.json`), and `evidence.commit: "pending"`.
   - Copy into each requirement's `adrs` the id of every ADR whose `Affects` line names the requirement or this slice.
   - If failures.md or any ADR says an external system was replaced by a local fake, add the `external-stub` flag.
3. Write `evidence.md`: the requirements with their tests, and for improvement slices, the before and after numbers of every benchmark.
4. **Bookkeeping:** for `spec` and `fix` slices only, append `seeds` to `barraiser.json` `seeds` (improvement slices drop their review nits, or the bar raiser feeds itself); set the slice to `status: done`, `phase: integrate`; append a `slice-merged` log line; regenerate STATUS.md (state-schema.md says how).
5. Commit on the slice branch: `chore(sdlc): record evidence [<id>]`.
6. **Ship:**
   - **`direct` mode:**
     1. `git checkout <defaultBranch> && git merge --squash sdlc/<id> && git commit -m "<feat|fix|perf|refactor>(<id>): <slice title>"`
     2. Replace `"pending"` with the new commit sha in requirements.json, then commit `chore(sdlc): commit sha [<id>]`.
     3. Delete branch `sdlc/<id>`.
     4. Return `{state: "merged", commit}`.
   - **`mr` mode:** do `direct` steps 1 to 3. Then publish the working branch to the run's merge request as `<prompts>/run-request.md` says ("Publish"). Return `{state: "merged", commit, pr: <the run request's url>, notes}`, with any publishing problem in `notes`. A publishing problem never makes the result `failed`.
   - **`pr` mode and `stack` mode.** In both, the slice's pull request is created against `<baseBranch>` and merged by hand-free automation once it is green. `<baseBranch>` is the branch `sdlc/<id>` was cut from, and step 2's `base-branch` command is what tells you: run it and use what it prints.

     Do not work the base out yourself — not from `gitMode`, and not with a git command. The usual ways of asking git which branch this came from are recent, behave differently across versions, and fail outright on a shallow clone, so an agent that goes looking can end up with no base at all. `gitMode` alone is not enough either: it does not say which milestone owns the slice, whether that milestone has already shipped, or whether a dependency is still awaiting merge, and each of those changes the answer. If the command exits non-zero it printed why and named no branch; report that and stop rather than picking a branch yourself.

     The two modes differ only in what `<baseBranch>` is; every command below is otherwise identical.
     1. If a PR with head `sdlc/<id>` is already open (`gh pr list --head sdlc/<id> --state open`), reuse it and skip step 2. If the remote branch exists but is stale from an earlier attempt, `git push --force-with-lease origin sdlc/<id>`; force-push only ever `sdlc/<id>`. Otherwise `git push -u origin sdlc/<id>`.
     2. `gh pr create --base <baseBranch> --title "<type>(<id>): <slice title>" --body "<requirements implemented, tests, evidence summary>` followed by a blank line and `🤖 Generated with [Claude Code](https://claude.com/claude-code)"`. In `stack` mode this pull request is reviewed and merged inside the milestone, not into the default branch: a human sees the whole milestone on one pull request, at the milestone's own PR.
     3. Watch CI with `gh pr checks --watch`. On failure, read `gh run view <run> --log-failed`, fix on the branch (you may edit product code for CI-only failures), commit, push, and watch again. A product-code CI fix changes the code after the gate: after committing one, return `{state: "regate", notes}` instead of continuing (pr/mr/stack modes) — the loop re-gates and re-integrates. Allow up to 5 fix cycles for failures that need no product-code change. A failure that passes on a single `gh run rerun --failed` counts as flaky: append a seed `{title: "flaky: <check>", ...}` and continue.
     4. If there are no checks, append a `note` log line "no CI checks on <pr>".
     5. `gh pr merge --squash --delete-branch`.
     6. **If that is blocked** by required reviews or branch protection: set the slice to `status: awaiting-merge` and `pr: <url>`, commit and push that state to the PR branch, `git checkout <baseBranch>`, and return `{state: "awaiting-merge", pr}`. (The state-reader discovers awaiting-merge slices from open `sdlc/<id>` PRs, so nothing else needs to land on `<baseBranch>`.) In `stack` mode `<baseBranch>` does not move while this pull request is open, so nothing downstream is disturbed.
     7. **After merging:** `git checkout <baseBranch> && git pull --ff-only`, replace `"pending"` with the merge commit sha, set the slice to `status: done` if it says `awaiting-merge`, and do a **default-branch commit** (commit-state.md) with "commit sha <id>". In `stack` mode that lands on the milestone branch, per commit-state.md's stack arm. Return `{state: "merged", pr, commit}`.
     8. Never `gh pr merge --admin`, never force-push `<baseBranch>`, and never force-push `sdlc/run-<n>`.
   - If CI is still red after 5 cycles, return `{state: "failed", notes}`.

**Clean up** before you return `merged`, in every mode (and in retry-merge after a merge). An escalation archives a failed attempt as `sdlc/<id>-attempt-<n>`; its write-up has already been committed to the branch the rest of the run lives on (the default branch in `direct`, `mr` and `pr` mode, the milestone branch in `stack` mode), so once the slice ships the branch only holds dead code.
0. **Retention prune (idempotent):** under `.sdlc/slices/<id>/`, delete `verification/` (logs, per-agent JSON and md parts, assets, unpromoted `tests/`) except `verification/suite-receipt.json`: keep that file where it is — `suite-receipt.py` `check` and `baseline` read only `.sdlc/slices/<id>/verification/suite-receipt.json` — and copy it to `.sdlc/reports/<id>/suite-receipt.json`. Move to `.sdlc/reports/<id>/`: `gate-r0.md`, and the regression logs' final copies. Keep `plan.md`, `tests.md`, `failures.md`, `evidence.md`, every `verify-*.md` and `review-*.md`, ADRs and ledger rows. Skip the prune entirely when `config.json` has `"keepEvidence": true`.
1. **Stale-branch sweep:** `git branch --list 'sdlc/*'` — delete every `sdlc/<id>-v*` and `sdlc/<id>-attempt-*` branch not deleted by its owner. Never delete a branch of a slice that is not finished.
2. Delete every local branch matching `sdlc/<id>-attempt-*`. In `pr`, `mr` and `stack` modes also delete each name on `origin` (`git push origin --delete <name>`); a name the remote does not have is fine.
3. Then the slice it was split from: strip the trailing letter one at a time (`S-013ab` -> `S-013a` -> `S-013`). For each parent that is `rejected` and now finished (every slice in its `splitInto` is `done` or itself finished, as state-schema.md says), delete its `sdlc/<parent>-attempt-*` branches the same way. Stop at the first parent that is not finished.
4. Never delete a branch of a slice that is not finished, and never any other branch. A failed deletion goes into `notes`; it never changes the result.

## mode: retry-merge
Check `gh pr view <slice.pr> --json state,mergeable,reviewDecision,statusCheckRollup`. This mode exists in `pr` and `stack` mode, so `<baseBranch>` is the same value ship step 6 defines — the one `base-branch` prints.
- If its `state` is `MERGED` (a human merged it), do ship step 6's **After merging** step only, then **Clean up**.
- If it is mergeable, approved (or no review is required) and green, do ship step 6 from `gh pr merge --squash --delete-branch` onward, then **Clean up**.
- If not, return `{state: "awaiting-merge", pr}`.

Never use `--admin` and never force-push the default branch or `<baseBranch>`.
