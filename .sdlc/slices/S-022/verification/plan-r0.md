# Verification plan S-022, round 0

Risk: medium. state-write creates slice and milestone branches and deletes shipped milestone branches; a wrong name puts a pull request on the wrong base or deletes a branch in use.

## Scenarios

| Id | Title | Requirements | Profiles |
|---|---|---|---|
| VS-1 | Slice and milestone branches are created under a custom format | R-056, R-078 | cli, security |
| VS-2 | The awaiting-merge dependency branch is found through the format | R-056, R-078 | cli |
| VS-3 | base-branch names the milestone branch from the format | R-056 | cli, security |
| VS-4 | The prune keeps a milestone branch with an open slice pull request and deletes the others | R-096 | cli, contract |
| VS-5 | The prune recognizes milestone branches by kind, not by a regex | R-057 | cli, contract, security |
| VS-6 | The run branch stays a full name and is advanced as before | R-058 | cli |
| VS-7 | Format problems become clean refusals | R-056, R-057 | security, cli |

## Notes per scenario

- VS-1: Run patch-slice in a stack-mode repo with a remote and branchFormat feature/PROJ-1-{name}. Expect feature/PROJ-1-S-001 cut from feature/PROJ-1-M-1, and no sdlc/ branch. Try the lowercase format feature/{name:lower}, the default format, and a format taken from the repo file when config has none. Hostile slice ids (traversal, flag-like, NUL, unicode digits) must give a clean refusal and leave the tree unchanged.
- VS-2: S-002 depends on S-001 with status awaiting-merge. Branch feature/PROJ-1-S-001 exists. patch-slice and base-branch must both answer feature/PROJ-1-S-001. A decoy branch sdlc/S-001 must not be used. Also test a dependency not awaiting-merge, and a dependency whose branch is gone: both must fall back to the milestone or run branch.
- VS-3: Stack mode, slice in M-1. Expect feature/PROJ-1-M-1, and feature/m-1 under feature/{name:lower}. Check a milestone that shipped (answer is the run branch), a slice with no milestone, an unknown slice id, and an invalid branchFormat in config (a clear refusal and a nonzero exit code, not a Python traceback from branches.Fail).
- VS-4: Two shipped milestone branches feature/PROJ-1-M-1 and feature/PROJ-1-M-2. Slice S-001 in M-1 is awaiting-merge. Expect M-2 deleted, M-1 kept. Call milestone_branches_with_open_slice_pr(repo, fmt) directly: the set must be exactly {feature/PROJ-1-M-1}. Check no pending slice, a slice with no milestone, and a format with lowercase.
- VS-5: Shipped feature/PROJ-1-M-1 is deleted. feature/PROJ-1-M-1-e2e, feature/PROJ-1-S-001, feature/PROJ-1-run-1 and unrelated branches (main, feature/other, names with extra slashes or a look-alike prefix) stay. Repeat with the default format: sdlc/M-1 deleted, sdlc/M-1-e2e kept. Branches checked out in a worktree stay. The file holds no MILESTONE_BRANCH and no sdlc/{ literal. Try odd branch names (unicode digits M-١, long names, M-0, leading zeros) to confirm parse and the old regex agree.
- VS-6: runBranch feature/PROJ-1-run-1. After the default branch moves, cutting the milestone branch advances the run branch as the existing tests show. config.runBranch is unchanged on disk. Check the same with the default format, and that a run branch outside the format is not rewritten.
- VS-7: branches.Fail must become the local Fail on every path: format_of, branch_name, branch_kind. Try a branchFormat with no placeholder, with two placeholders, a non-string value, an empty string (falls back to the repo file), git-unsafe characters, and a broken repo format file. Expect a JSON error and a nonzero exit code, with no traceback, no partial branch and no changed files.

## Tools

| Id | Profile | Purpose | Exists |
|---|---|---|---|
| cli-runner | cli | run state-write.py patch-slice and base-branch in scratch git repos with a remote, and record the tree diff and git refs | True |
| attack-corpus | security | hostile slice ids and format values | True |
| property | contract | call milestone_branches_with_open_slice_pr and the helpers with generated formats and ids | True |
| stub-server | security | gh shim so the prune and pull request lookups never touch the network | True |

## Coverage

| Requirement | Scenarios |
|---|---|
| R-056 | VS-1, VS-2, VS-3, VS-7 |
| R-057 | VS-5, VS-7 |
| R-058 | VS-6 |
| R-078 | VS-1, VS-2 |
| R-096 | VS-4 |

## Notes

The limits profile is not tagged: the spec states no number. The prune now lists all of refs/heads/, a small cost that no scenario measures. The four most useful profiles are cli, security, contract; the cap for medium risk is 4, so all three run.
