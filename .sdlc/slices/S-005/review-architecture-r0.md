# Review: S-005, lens architecture, round 0

Diff reviewed: `git diff 41de37e...sdlc/S-005` (the slice commits on top of S-004).

## Scope

- `skills/sdlc/branches.py`: two new rows in `TAILS` (`verify`, `attempt`).
- `skills/sdlc/test/branches.test.mjs`: T-R-008a to T-R-119.

## Findings

1. Non-blocking. The R-119 source scan lives in `branches.test.mjs`, but it reads `sdlc-loop.js` and the other scripts, not `branches.py`. Move it to a file for script-wide checks, such as `scripts.test.mjs`. This keeps `branches.test.mjs` about the `branches.py` unit.
2. Non-blocking. The new helper `assertMissingPart` copies the inline loop body of the S-004 test "name for the run, milestone and e2e kinds ...". Make that test call `assertMissingPart`, so one helper owns the missing-part check.

## Notes

- The rows match the spec section 1 table: `<sliceId>-v<round>-<profile>-<part>` and `<sliceId>-attempt-<n>`.
- The rows extend the one `TAILS` table. `tail`, `name` and `cmd_name` do not change. The unit boundary holds.
- The R-119 check pins `const branch = g =>`, `branch: branch(g)` and `groups.map(branch)` in `verifyPhase`. Spec section 7 keeps the name `branch` and only wraps its body in `branchName`. So S-020 does not break this check.
- The slice does not bound `--profile` or `--round`. The verifier raised this as a seed. S-009 owns `parse` and the round trip.
