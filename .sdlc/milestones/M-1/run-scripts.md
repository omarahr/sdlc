# Run: scripts (M-1)

Test file: `e2e/tests/scripts.test.mjs` on branch `sdlc/M-1-e2e-scripts`. Channels used: api, logs, events (state-tree and ref checks stand in for db).

## Summary
- Pass: all 13 scenarios (SC-M-1-039 to 050 and 074).
- Fail: none.

## SC-M-1-039: pass
Expected: active slice, state PR and e2e PR are recognized. The e2e-area head and `sdlc/` heads are not.
Observed: with `main` checked out, `checkout` was `feature/PROJ-1-S-001` and `sliceId` was `S-001`. With the slice branch checked out, `checkout` was null.
Head `feature/PROJ-1-state-20261008101500` gave `gh pr merge 11 --squash --delete-branch`. Head `feature/PROJ-1-M-1-e2e` gave `gh pr merge 12 ...`.
Head `feature/PROJ-1-M-1-e2e-api` gave no sync. Heads `sdlc/S-002` and `sdlc/state-...` gave no sync. A foreign `sdlc/S-002` ledger with S-002 in progress did not become active.
Merged head `feature/PROJ-1-S-003` gave `retryMerge` for S-003. Merged head `sdlc/S-003` did not.
Refs, `.sdlc/` files and the gh shim log were unchanged. Stderr was empty on every call.

## SC-M-1-040: pass
Both variants (no key, empty string) gave `sdlc/S-001` as `checkout` and `S-001` as the slice. Two runs gave identical output. The state PR head `sdlc/state-...` gave the same sync on both runs. The tree was unchanged.

## SC-M-1-041: pass
Calls `patch-slice` S-001 in_progress, S-001 awaiting-merge and S-002 in_progress exited 0 with `ok: true`.
`base-branch --slice S-002` printed `feature/PROJ-1-S-001`.
Branches `feature/PROJ-1-M-1`, `feature/PROJ-1-S-001` and `feature/PROJ-1-S-002` exist. No `sdlc/` branch exists.
The `branch` field of each slice in `slices.json` equals the git branch. The scripts never write that field; the fixture seeded it, and no call changed it.
An unknown slice gave exit 2 and `{"ok": false, "error": ...}`.

## SC-M-1-042: pass
Direct call of `prune_stale_milestone_branches` printed `["feature/PROJ-1-M-2"]`. Branches `sdlc/M-3`, `feature/PROJ-1-S-001`, `feature/PROJ-1-M-1`, `main` and the run branch remained. `slices.json`, `log.jsonl` and `config.json` were byte-equal. `runBranch` stayed `feature/PROJ-1-run-1`.
A `patch-slice` call for a fresh fixture pruned the same branch and kept the same set.
Note: the CLI result is `{"ok": true, "branch": ..., "commit": ...}`. It does not list the pruned branches, because `ensure_milestone_branch` drops the return value. The source (R-138) does not require a list. I judged the scenario on the source and the branch set.

## SC-M-1-043: pass (not applicable)
`state-write.py` has no `ship-prune` and no `collect-verification` command. Both exit 2 with "invalid choice". The scenario states that this case is not applicable and not a failure. The fixture tree did not change.

## SC-M-1-044: pass
`removedBranches` was exactly `feature/p-1-s-001-v0-http-api-0` and `feature/p-1-s-009-v0-cli-0`. The other five branches, the old-format `sdlc/S-001-v0-http-api-0` and `main` remained. `slices.json` and `log.jsonl` were byte-equal. Notes were empty. The gh and glab shim logs were empty. `git ls-remote` was unchanged.

## SC-M-1-045: pass
Removed only `sdlc/S-001-v0-cli-0`. Kept `sdlc/S-001-attempt-2-v0-cli-0`, `sdlc/S-001-attempt-3` and `sdlc/run-1`. The checked-out `sdlc/S-001-v1-cli-0` stayed, with the note "git branch -D sdlc/S-001-v1-cli-0 failed: error: cannot delete branch ... used by worktree". The exit code was 0. No forge call, no remote change.

## SC-M-1-046: pass
Three fixtures (invalid `slices.json`, `branchFormat` "no placeholder", no `.sdlc`) each gave exit 0, one JSON object, `removedBranches: []` and a non-empty `notes`. Refs and files were byte-equal. No forge call.

## SC-M-1-047: pass
For `sdlc/{name}`, `feature/PROJ-1-{name}` and `feature/p-1-{name:lower}`, `rt.I.branchName('S-001-v0-http-api-0')` equalled `branches.py name --kind verify`. `BRANCH_FORMAT` matched each format. With no arg, `BRANCH_FORMAT` was `sdlc/{name}`. Stderr was empty.

## SC-M-1-048: pass
Six tails with `$&`, `$1`, `$` + backtick, `$$` and `{name}` matched `branches.py name` byte for byte in all three formats. JS output equalled the literal substitution. No difference was found.

## SC-M-1-049: pass
With `branchFormat: 'feature/PROJ-1-{name}'` the env-detector input carried that value. Without the arg it carried `null`. The scratch repo was unchanged.

## SC-M-1-050: pass
Six mode and format pairs (pr, stack, mr, direct; default and custom format) ran `patch-slice` (in_progress, awaiting-merge, done), `next-action` sync commands as printed, and the janitor. The fixture held local verify, e2e-area and attempt branches, and PR heads of those kinds.
Remote heads held only `main`, plus milestone and run branches in stack mode. No verify, e2e-area or attempt branch was on the remote. The gh shim saw only `pr merge 31/32` (state and e2e heads) in pr mode and no `pr create`. The `branch` fields in `slices.json` classify as slice.

## SC-M-1-074: pass
Custom format gave `feature/PROJ-1-M-1` and `feature/PROJ-1-S-001`. A config with no key gave `sdlc/M-1` and `sdlc/S-001`. Format `{name}{name}` gave exit 2 and `{"ok": false, "error": "the branch format '{name}{name}' must hold exactly one {name} or {name:lower}, found 2"}` for `patch-slice` and `base-branch`. Refs and files were byte-equal after both. `main()` calls `format_of` once per command path (two calls in the source: one in `base-branch`, one in `patch-slice`).
