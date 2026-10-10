Verdict: HELD

Worktree: `$TMPDIR/sdlc-S-024-spec-fidelity-r0` (detached, since removed). Commit: d23dd8ad9082881506001a16f26597fd2a292484 (`sdlc/S-024`).

## Requirement checks
| Requirement | Spec says | Checked how | Tests | Result |
|---|---|---|---|---|
| R-060 | "`V_BRANCH` and `V_ID` are replaced by `parse`: a branch is swept only when it parses to `verify`, its `id` is unknown to the ledger or its status is `done` or `rejected`; `run`, `attempt` and every other kind are never deleted. The format comes from `load_format(repo)`." | Read janitor.py: no V_BRANCH or V_ID; `sweep_branches` calls `branches.parse` with the ledger ids and deletes only kind `verify`; format comes from `branches.load_format`. Ran a scratch repo with extra names. | skills/sdlc/test/scripts.test.mjs:1690, :1696, :1764 | holds |
| R-079 | "`janitor sweeps verify branches under a custom format and never touches run or attempt branches`." | Read the custom-format test: it asserts the removed list and the remaining refs. | skills/sdlc/test/scripts.test.mjs:1717 | holds |
| R-085 | "An old run's branches under the default when the new run gets a derived format: ... the janitor leaves them" | Read the test: asserts `removedBranches` empty, branch kept, `parse` of `sdlc/S-001` null, `list` empty. | skills/sdlc/test/scripts.test.mjs:1732 | holds |
| R-086 | "`next-action.py` and `janitor.py` always pass the ledger's ids." | janitor passes `ids=list(statuses)`. Test covers `{name:lower}`: done swept, todo kept, unknown swept. | skills/sdlc/test/scripts.test.mjs:1750 | holds |

Verification plan r0: every requirement has a scenario (R-060 VS-1..3,5..7; R-079 VS-3,7; R-085 VS-4; R-086 VS-5). No test gap.

## Defects
None.

## Commands
- `npm test` in the worktree: 721 tests, 720 pass, 0 fail, 1 skipped.
- Scratch repo probe with the default format: the janitor removed the verify-shaped `sdlc/M-1-v0-x-0`, `sdlc/S-001-e2e-v0-a-0`, `sdlc/run-1-v0-http-api-0` (unknown ids) and the done slice's branch. The spec allows this (unknown id). See seeds.

## Seeds
- A verify-shaped name whose parsed id is a run, milestone or e2e id (for example `sdlc/run-1-v0-http-api-0`) is swept as an unknown id. The spec allows it. A stricter id check could keep it.
