# Verification: S-035, cli, round 0

Commit 5040928. Verdict: pass (8 of 8 cases). Scenario VS-1, requirement R-131.

Environment: node v24.19.0, python3, git; scratch repos from cli-runner

Command: `node --test .sdlc/slices/S-035/verification/r0/tests/cli-0/cleanup.verify-cli.test.mjs`

Result: 8 pass, 0 fail. Log: .sdlc/slices/S-035/verification/r0/logs/cli-0-run.txt

## TC-cli-1: Clean up section holds the branches.py command, the id filter and no glob

- Given: Scratch git repo made by cli-runner, or the integrator.md text
- When: The Clean up section is read
- Then: The section names `branches.py list --repo . --kind attempt`, `Keep the entries whose id equals this slice id, ignoring case`, no `-attempt-*`, no `sdlc/<id>`
- Result: pass
- Test: `.sdlc/slices/S-035/verification/r0/tests/cli-0/cleanup.verify-cli.test.mjs:22`

## TC-cli-2: Listing S-1 attempts next to S-10, S-1a and a lowercase s-1 keeps only the S-1 ids

- Given: Scratch git repo made by cli-runner, or the integrator.md text
- When: branches.py list --kind attempt runs, and the keep filter from the prompt applies
- Then: S-1 keeps S-1-attempt-1, S-1-attempt-2 and s-1-attempt-3 (ignoring case); S-10 and S-1a keep only their own; exit 0; tree unchanged
- Result: pass
- Test: `.sdlc/slices/S-035/verification/r0/tests/cli-0/cleanup.verify-cli.test.mjs:30`

## TC-cli-3: A slice with no attempt branches keeps nothing; a repo with no attempts lists none

- Given: Scratch git repo made by cli-runner, or the integrator.md text
- When: branches.py list --kind attempt runs, and the keep filter from the prompt applies
- Then: Empty keep list for S-2; branches [] and exit 0 with no attempts
- Result: pass
- Test: `.sdlc/slices/S-035/verification/r0/tests/cli-0/cleanup.verify-cli.test.mjs:39`

## TC-cli-4: Lookalike names (suffix x, empty number, doubled suffix, slash, S-11) never match S-1

- Given: Scratch git repo made by cli-runner, or the integrator.md text
- When: branches.py list --kind attempt runs, and the keep filter from the prompt applies
- Then: Only sdlc/S-1-attempt-<n> style names are kept for S-1 and the tail lookalikes are not listed as S-1 attempts
- Result: pass
- Test: `.sdlc/slices/S-035/verification/r0/tests/cli-0/cleanup.verify-cli.test.mjs:48`

## TC-cli-5: A custom branch format lists attempts under its own spelling and ignores other prefixes

- Given: Scratch git repo made by cli-runner, or the integrator.md text
- When: branches.py list --kind attempt runs, and the keep filter from the prompt applies
- Then: feature/S-1-attempt-1 only for S-1
- Result: pass
- Test: `.sdlc/slices/S-035/verification/r0/tests/cli-0/cleanup.verify-cli.test.mjs:57`

## TC-cli-6: Running list twice gives the same output and changes no ref

- Given: Scratch git repo made by cli-runner, or the integrator.md text
- When: branches.py list --kind attempt runs, and the keep filter from the prompt applies
- Then: Equal JSON; tree unchanged
- Result: pass
- Test: `.sdlc/slices/S-035/verification/r0/tests/cli-0/cleanup.verify-cli.test.mjs:63`

## TC-cli-7: A path that is not a repository exits 2 with an error message

- Given: Scratch git repo made by cli-runner, or the integrator.md text
- When: branches.py list --kind attempt runs, and the keep filter from the prompt applies
- Then: non-zero exit and an error, no list
- Result: pass
- Test: `.sdlc/slices/S-035/verification/r0/tests/cli-0/cleanup.verify-cli.test.mjs:72`

## TC-cli-8: The scan regexes detect a glob added to the section (mutation)

- Given: Scratch git repo made by cli-runner, or the integrator.md text
- When: The Clean up section is read
- Then: Both `-attempt-*` and `sdlc/<id>` regexes match the mutated text
- Result: pass
- Test: `.sdlc/slices/S-035/verification/r0/tests/cli-0/cleanup.verify-cli.test.mjs:80`

## Attacks

None. Git rejects `*` in a branch name, so a glob character cannot reach the filter.

## Seeds

None.
