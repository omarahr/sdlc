# Plan: S-024 janitor.py sweeps only verify branches through parse

## Approach
Remove `V_BRANCH` and `V_ID` from `skills/sdlc/janitor.py`. Load the format with `branches.load_format(repo)`. In `sweep_branches`, call `branches.parse(fmt, name, ids=<ledger ids>)` on each local branch. Sweep a branch only when it parses to kind `verify` and either `known` is false or the ledger status is `done` or `rejected`. Every other kind (`run`, `attempt`, `slice`, `milestone`, `e2e`, `e2e-area`, `state`) and every name that does not parse is kept. The ledger ids go to `parse`, so a `{name:lower}` format resolves `s-001` to `S-001` and the status lookup uses the ledger id. An unreadable format (`branches.Fail`) becomes a note and no branch is deleted; the scratch reaping still runs first. The old `-attempt-` and `sdlc/run-` guards go away because `parse` classifies by kind. One guard stays: a verify-shaped name whose parsed id itself ends in `-attempt-<n>` is an attempt's verifier branch, and it is kept (see Risks). The `git worktree prune` step, the ledger-unreadable notes and the best-effort `main()` wrapper stay unchanged. The old `sdlc/<id>-v<version>` shape no longer parses, so the janitor leaves those branches. The existing tests move to the verify shape.

## Files
- Modify `skills/sdlc/janitor.py`: delete `V_BRANCH`, `V_ID` and the `re` import if unused; add `fmt` loading in `main()` with `branches.Fail` handled as a note; rewrite `sweep_branches(repo, fmt, statuses, notes)` around `branches.parse`; update the module docstring to describe the verify-branch sweep.
- Modify `skills/sdlc/test/scripts.test.mjs`: rewrite the janitor sweep test and the stale-worktree and unreadable-ledger tests to use verify-shaped names; add the custom-format, derived-format and lowercase tests below.
- No change to `branches.py`, `state-reader.md` or `SKILL.md`.

## Tests
All tests are in `skills/sdlc/test/scripts.test.mjs`, in the janitor section, run through `runJanitor`.
- T-R060-a (R-060) "the janitor has no V_BRANCH or V_ID": read `janitor.py` and assert the text matches neither `V_BRANCH` nor `V_ID`.
- T-R060-b (R-060) "the janitor deletes verify branches of finished and unknown slices and keeps live ones" (rewrites the existing test): default format. Branches `sdlc/S-001-v0-http-api-0` (done), `S-003` (rejected), `S-999` (unknown) are removed. `S-002` (in_progress), `S-004` (todo), `S-005` (no status field) verify branches stay. `sdlc/S-004`, `sdlc/run-1`, `sdlc/S-004-attempt-1`, `sdlc/S-004-attempt-1-v0-http-api-0`, `sdlc/state-20261010000000`, `sdlc/M-1`, `sdlc/M-1-e2e`, `sdlc/-v1`, `sdlc/S-001-v1` and `sdlc/S-001-vextra/nested` stay.
- T-R060-c / T-R079 (R-060, R-079) "the janitor sweeps verify branches under a custom format and never touches run or attempt branches": config `branchFormat: "feature/sdlc/{name}"`. A done slice's verify branch and an unknown id's verify branch are removed. In the same repo, `feature/sdlc/run-1`, `feature/sdlc/S-001-attempt-1`, `feature/sdlc/S-001`, `feature/sdlc/M-1` and the verify branch of a todo slice stay. Assert `removedBranches` and the remaining refs.
- T-R085 (R-085) "the janitor leaves an old-format verify branch under a derived format": config `branchFormat: "feature/sdlc/{name}"`, branch `sdlc/S-001-v0-http-api-0` with S-001 done. The branch stays and `removedBranches` is empty. The same test runs `branches.py parse --branch sdlc/S-001` and `branches.py list --kind slice` with that config and asserts `parse` gives a null result and `list` does not return it.
- T-R086 (R-086) "the janitor resolves a lowercased id through the ledger": config `branchFormat: "feature/p-1-{name:lower}"`; S-001 done, S-002 todo. The branch `feature/p-1-s-001-v0-http-api-0` is removed. The branch `feature/p-1-s-002-v0-http-api-0` stays. An unknown `feature/p-1-s-999-v0-http-api-0` is removed. `feature/p-1-run-1` stays.
- T-notes "the janitor notes an unusable format and deletes nothing": config `branchFormat: "feature/no-placeholder"` with a done slice's verify branch. Assert no branch is removed, `notes` mentions the format, exit status 0.
- T-keep (existing) the stale-worktree test and the missing or unreadable ledger test keep their assertions, with the branch renamed to the verify shape.

## Steps
1. Write the tests first (T-R060-a to T-notes) and confirm they fail against the current janitor.
2. Remove `V_BRANCH`, `V_ID`; load the format in `main()` with a `branches.Fail` handler that adds a note and skips the sweep.
3. Rewrite `sweep_branches` to use `parse` with `ids=list(statuses)` and the keep rules above.
4. Update the module docstring.
5. Run `python3 -m py_compile skills/sdlc/janitor.py`, then `npm test`. All tests must pass.

## Risks
- A wrong parse deletes a branch the loop needs. Mitigation: delete only on kind `verify`, test every other kind under two formats, and keep unknown shapes.
- The verify row `^(.+)-v(\d+)-...` also matches `S-004-attempt-1-v0-x-0`, with id `S-004-attempt-1`. That id is unknown to the ledger, so a plain parse check would sweep it. The plan keeps such a branch (id ends in `-attempt-<n>`). This is a deliberate stricter rule than the spec text; see ambiguities.
- Under `{name:lower}` the parsed id keeps the ledger case only when `ids` is passed. The sweep always passes the ledger ids; T-R086 covers it.
- `sdlc/<id>-v<n>` leftovers from earlier runs now stay on disk. The spec accepts this (old-format branches are the user's to delete).

## Critique responses
- Critique "Resolved by pending: pending" (twice): the text names no defect and no plan section. The plan has no open item to change. The two open decisions have ADRs: ADR-20261010-051408-decision-judge-S-024-b707 (no fallback for old-shape verify branches) and ADR-20261010-051411-decision-judge-S-024-9f6d (keep a verify branch whose id ends in -attempt-<n>). The Approach and Risks sections follow both ADRs.
