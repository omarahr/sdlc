# Verification: S-026, profile contract, round 0

Commit: 48d8ffe. Verdict: verified (6 of 6 cases pass).

Environment: Python 3.14.7, node test runner, run through the testkit property and cli-runner modules from a worktree of sdlc/S-026

Surface: `_common.md` Branch names table lists eight placeholders: run, slice, milestone, e2e, e2e area, state, attempt, verify.

## TC-contract-1 (VS-1): Milestone row equals the spec cell

- Given: The branch sdlc/S-026 at 48d8ffe
- When: The case runs
- Then: The row reads exactly the spec cell
- Expected: The row reads exactly the spec cell
- Actual: Equal
- Result: pass
- Test: `.sdlc/slices/S-026/verification/r0/tests/contract-0/placeholder-table.verify-contract.test.mjs:25`
- Command: `cd .sdlc/slices/S-026/verification/r0/tests/contract-0 && VERIFY_WT=<worktree of sdlc/S-026> node --test placeholder-table.verify-contract.test.mjs`
- Log: `.sdlc/slices/S-026/verification/r0/logs/contract-0.txt`

## TC-contract-2 (VS-2): E2E row equals the spec cell and has no --area

- Given: The branch sdlc/S-026 at 48d8ffe
- When: The case runs
- Then: The row reads exactly the spec cell
- Expected: The row reads exactly the spec cell
- Actual: Equal; name differs from e2e-area and milestone names
- Result: pass
- Test: `.sdlc/slices/S-026/verification/r0/tests/contract-0/placeholder-table.verify-contract.test.mjs:25`
- Command: `cd .sdlc/slices/S-026/verification/r0/tests/contract-0 && VERIFY_WT=<worktree of sdlc/S-026> node --test placeholder-table.verify-contract.test.mjs`
- Log: `.sdlc/slices/S-026/verification/r0/logs/contract-0.txt`

## TC-contract-3 (VS-3): E2E area row equals the spec cell; missing --area is refused

- Given: The branch sdlc/S-026 at 48d8ffe
- When: The case runs
- Then: Row equals the cell; exit 2 with a clear error without --area
- Expected: Row equals the cell; exit 2 with a clear error without --area
- Actual: Equal; exit 2: a e2e-area branch name needs a non-empty area
- Result: pass
- Test: `.sdlc/slices/S-026/verification/r0/tests/contract-0/placeholder-table.verify-contract.test.mjs:25`
- Command: `cd .sdlc/slices/S-026/verification/r0/tests/contract-0 && VERIFY_WT=<worktree of sdlc/S-026> node --test placeholder-table.verify-contract.test.mjs`
- Log: `.sdlc/slices/S-026/verification/r0/logs/contract-0.txt`

## TC-contract-4 (VS-4): State row equals the spec cell; the name holds a 14-digit timestamp

- Given: The branch sdlc/S-026 at 48d8ffe
- When: The case runs
- Then: Row equals the cell; name matches state-<14 digits>
- Expected: Row equals the cell; name matches state-<14 digits>
- Actual: Equal; sdlc/state-20261010063120
- Result: pass
- Test: `.sdlc/slices/S-026/verification/r0/tests/contract-0/placeholder-table.verify-contract.test.mjs:25`
- Command: `cd .sdlc/slices/S-026/verification/r0/tests/contract-0 && VERIFY_WT=<worktree of sdlc/S-026> node --test placeholder-table.verify-contract.test.mjs`
- Log: `.sdlc/slices/S-026/verification/r0/logs/contract-0.txt`

## TC-contract-5 (VS-5): Attempt row equals the spec cell; n=2 gives S-012-attempt-2; abc refused

- Given: The branch sdlc/S-026 at 48d8ffe
- When: The case runs
- Then: Row equals the cell; valid names
- Expected: Row equals the cell; valid names
- Actual: Equal; sdlc/S-012-attempt-2; abc exits 2
- Result: pass
- Test: `.sdlc/slices/S-026/verification/r0/tests/contract-0/placeholder-table.verify-contract.test.mjs:25`
- Command: `cd .sdlc/slices/S-026/verification/r0/tests/contract-0 && VERIFY_WT=<worktree of sdlc/S-026> node --test placeholder-table.verify-contract.test.mjs`
- Log: `.sdlc/slices/S-026/verification/r0/logs/contract-0.txt`

## TC-contract-6 (VS-6): Table lists eight placeholders; name() equals a reference model over 2000 runs

- Given: The branch sdlc/S-026 at 48d8ffe
- When: The case runs
- Then: Eight rows; zero violations
- Expected: Eight rows; zero violations
- Actual: Eight rows; seed=477210938 runs=2000 violations=0; ste-check.py on _common.md exit 0
- Result: pass
- Test: `.sdlc/slices/S-026/verification/r0/tests/contract-0/placeholder-table.verify-contract.test.mjs:44`
- Command: `cd .sdlc/slices/S-026/verification/r0/tests/contract-0 && VERIFY_WT=<worktree of sdlc/S-026> node --test placeholder-table.verify-contract.test.mjs`
- Log: `.sdlc/slices/S-026/verification/r0/logs/contract-0.txt`

## Seeds

- attempt --n accepts 0 and negative numbers: branches.py name --kind attempt --n 0 gives sdlc/S-012-attempt-0, and --n -1 gives sdlc/S-012-attempt--1. The spec does not forbid them. A double dash may break parse for some ids.
