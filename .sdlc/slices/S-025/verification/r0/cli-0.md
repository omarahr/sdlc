# Verify cli, S-025, round 0

Commit: ddbea4a. Verdict: pass (6 cases, 23 automated checks, 0 failures).

Environment: Node test runner, python3, scratch git repos via cli-runner, branches.py from the slice branch

## TC-cli-1 Each table command runs and prints a formatted name
- Given: Scratch repo with branchFormat feature/{name}
- When: Run the five name commands in the table with sample ids (slice, milestone, e2e, e2e-area, state, attempt)
- Then: Exit 0, JSON with ok true and a branch under feature/
- Expected: Exit 0, JSON with ok true and a branch under feature/
- Actual: All six exit 0; branches feature/S-025, feature/M-1, feature/M-1-e2e, feature/M-1-e2e-api, feature/state-<ts>, feature/S-025-attempt-2; repo tree unchanged
- Result: pass (R-062 acceptance)
- Test: `.sdlc/slices/S-025/verification/r0/tests/cli-0/branch-table.verify-cli.test.mjs`
- Command: `node --test .sdlc/slices/S-025/verification/r0/tests/cli-0/branch-table.verify-cli.test.mjs`

Transcript: `.sdlc/slices/S-025/verification/r0/logs/cli-0-transcript.txt`

## TC-cli-2 Table holds eight placeholders in order; missing --id or --area fails
- Given: _common.md and scratch repo
- When: Parse table rows; run name --kind slice without --id; e2e-area without --area
- Then: Eight rows; non-zero exit with no branch printed
- Expected: Eight rows; non-zero exit with no branch printed
- Actual: Eight rows found; both bad calls exit non-zero with no branch
- Result: pass (R-062 acceptance)
- Test: `.sdlc/slices/S-025/verification/r0/tests/cli-0/branch-table.verify-cli.test.mjs`
- Command: `node --test .sdlc/slices/S-025/verification/r0/tests/cli-0/branch-table.verify-cli.test.mjs`

Transcript: `.sdlc/slices/S-025/verification/r0/logs/cli-0-transcript.txt`

## TC-cli-3 Slice row command prints the formatted slice name
- Given: Custom and default format repos
- When: Run name --kind slice --id S-025
- Then: feature/S-025 with custom format; sdlc/S-025 by default
- Expected: feature/S-025 with custom format; sdlc/S-025 by default
- Actual: Matches in both repos
- Result: pass (R-110 acceptance)
- Test: `.sdlc/slices/S-025/verification/r0/tests/cli-0/branch-table.verify-cli.test.mjs`
- Command: `node --test .sdlc/slices/S-025/verification/r0/tests/cli-0/branch-table.verify-cli.test.mjs`

Transcript: `.sdlc/slices/S-025/verification/r0/logs/cli-0-transcript.txt`

## TC-cli-4 Run row: list --kind run gives runs in numeric order, last is newest
- Given: Branches sdlc/run-1, run-2, run-10, other/run-99, custom format with feature/run-4, and a repo with none
- When: Run list --kind run
- Then: Last entry is run-10 (not run-2); format respected; empty list for none
- Expected: Last entry is run-10 (not run-2); format respected; empty list for none
- Actual: Entries run-1, run-2, run-10 in numeric order; feature/run-4 only under the custom format; empty list when none; exit 0 always
- Result: pass (R-089 acceptance)
- Test: `.sdlc/slices/S-025/verification/r0/tests/cli-0/branch-table.verify-cli.test.mjs`
- Command: `node --test .sdlc/slices/S-025/verification/r0/tests/cli-0/branch-table.verify-cli.test.mjs`

Transcript: `.sdlc/slices/S-025/verification/r0/logs/cli-0-transcript.txt`

## TC-cli-5 parse prints kind and ids for a loop branch and kind null for a foreign branch
- Given: Repo with format feature/{name}
- When: parse feature/S-025, sdlc/S-025, main, dev
- Then: kind slice with id for the loop branch; kind null for others
- Expected: kind slice with id for the loop branch; kind null for others
- Actual: As expected; exit 0
- Result: pass (R-117 acceptance)
- Test: `.sdlc/slices/S-025/verification/r0/tests/cli-0/branch-table.verify-cli.test.mjs`
- Command: `node --test .sdlc/slices/S-025/verification/r0/tests/cli-0/branch-table.verify-cli.test.mjs`

Transcript: `.sdlc/slices/S-025/verification/r0/logs/cli-0-transcript.txt`

## TC-cli-6 Hostile branch names never crash parse or yield a loop kind
- Given: Attack corpus families flag-like-values, traversal, control-chars, unicode-confusables, unicode-whitespace, injection, oversized, format-strings; NUL argument
- When: parse --branch=<value> for every corpus entry
- Then: Exit 0 or 2, no traceback, kind null; NUL cannot reach the process
- Expected: Exit 0 or 2, no traceback, kind null; NUL cannot reach the process
- Actual: All entries pass in 8 families; NUL gives spawnError
- Result: pass (R-117 acceptance)
- Test: `.sdlc/slices/S-025/verification/r0/tests/cli-0/branch-table.verify-cli.test.mjs`
- Command: `node --test .sdlc/slices/S-025/verification/r0/tests/cli-0/branch-table.verify-cli.test.mjs`

Transcript: `.sdlc/slices/S-025/verification/r0/logs/cli-0-transcript.txt`

## Attacks
Nine hostile families fed to parse. No crash, no loop kind.

## Seeds
- _common.md says parse prints null; it prints JSON with kind null: The Branch names bullet says parse prints 'null' for a foreign branch. The command prints a JSON object with "kind": null. The same bullet says name 'prints' a name, but the command prints JSON with a branch field. A reader may look for the bare word null or a bare name. Say 'prints kind null' and 'the branch field'.
