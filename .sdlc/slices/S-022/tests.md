# Tests S-022

- state-write creates the slice and milestone branches under a custom format — R-056, R-078 — the code creates `sdlc/S-001` and `sdlc/M-1`.
- state-write finds the dependency branch through the module under a custom format — R-056, R-078 — the code looks for `sdlc/S-001` and ignores `feature/PROJ-1-S-001`.
- base-branch names the milestone branch through the format — R-056 — the code answers `sdlc/M-1`.
- a milestone branch with a slice pull request open against it is kept under a custom format — R-096 — the prune never lists `feature/` branches, so it does not delete `feature/PROJ-1-M-2`.
- milestone_branches_with_open_slice_pr returns the milestone branch name from the format — R-096 — the function takes no format and returns `sdlc/M-1`.
- the prune deletes a shipped milestone branch recognized by kind, under a custom format — R-057 — the prune never lists `feature/` branches.
- the prune keeps a branch of another kind under the default format — R-057 — characterization: passes now, pins `sdlc/M-1-e2e` before the change.
- state-write.py holds no MILESTONE_BRANCH regex — R-057 — the file still holds `MILESTONE_BRANCH` and `sdlc/{`.
- a run branch with a custom format is advanced and kept as a full name — R-058 — the code cuts `sdlc/M-2`, so `feature/PROJ-1-M-2` is missing.

## Promotion, fix round 1

- Promoted from `verification/r0/tests/cli-1/format-refusal.verify-cli.test.mjs` into `skills/sdlc/test/scripts.test.mjs`.
- `patch-slice` and `base-branch` exit 2 with `ok:false` for a malformed `branchFormat`. They change nothing.
- The malformed formats have no placeholder, two placeholders, mixed placeholders or an unknown placeholder.
- `patch-slice` exits 2 and moves no branch for a Git-unsafe `branchFormat`.
- The unsafe formats have double dots, a lock suffix, a space, a tilde or a leading dash.
- Dropped: the `cliRunner` import, the absolute paths and the preexisting-crash case.
