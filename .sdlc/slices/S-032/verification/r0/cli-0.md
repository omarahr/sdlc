# Verification: S-032, profile cli, round 0

Commit: bf55a29. Verdict: all 5 cases pass.

Environment: node test runner, python3, scratch git repos from cli-runner, attack-corpus.

Command: `node --test .sdlc/slices/S-032/verification/r0/tests/cli-0/kinds.verify-cli.test.mjs`

## TC-cli-1 (VS-1, R-136): The pr preflight samples one state branch named sdlc/state-<14 digits>; the stack preflight samples none; a custom format changes the prefix only

- Given: A scratch git repo built by cli-runner with a controlled environment
- When: branches.py preflight runs with the mode, flags and config the scenario names
- Then: The samples hold the kinds the spec table allows for that mode
- Expected: The pr preflight samples one state branch named sdlc/state-<14 digits>; the stack preflight samples none; a custom format changes the prefix only
- Actual: pr samples: slice, state (sdlc/state-20261010101651), e2e. stack samples: run, milestone, slice. Custom config format feature/{name} and --format x/{name} gave feature/state-<14 digits> and x/state-<14 digits>. Stack with custom format: no state.
- Result: pass
- Test: `.sdlc/slices/S-032/verification/r0/tests/cli-0/kinds.verify-cli.test.mjs:21`
- Transcript: `.sdlc/slices/S-032/verification/r0/logs/cli-0-transcripts.txt`

## TC-cli-2 (VS-2, R-136): mr and direct preflights sample no state kind, with and without --branch

- Given: A scratch git repo built by cli-runner with a controlled environment
- When: branches.py preflight runs with the mode, flags and config the scenario names
- Then: The samples hold the kinds the spec table allows for that mode
- Expected: mr and direct preflights sample no state kind, with and without --branch
- Actual: mr without --branch: no samples. mr with --branch: one working sample only. direct: no samples in both cases.
- Result: pass
- Test: `.sdlc/slices/S-032/verification/r0/tests/cli-0/kinds.verify-cli.test.mjs:34`
- Transcript: `.sdlc/slices/S-032/verification/r0/logs/cli-0-transcripts.txt`

## TC-cli-3 (VS-3, R-137): Only stack samples run and milestone, and both follow the branch format

- Given: A scratch git repo built by cli-runner with a controlled environment
- When: branches.py preflight runs with the mode, flags and config the scenario names
- Then: The samples hold the kinds the spec table allows for that mode
- Expected: Only stack samples run and milestone, and both follow the branch format
- Actual: stack: sdlc/run-1, sdlc/M-1. pr, mr, direct: no run or milestone. With feature/{name}: feature/run-1, feature/M-1.
- Result: pass
- Test: `.sdlc/slices/S-032/verification/r0/tests/cli-0/kinds.verify-cli.test.mjs:46`
- Transcript: `.sdlc/slices/S-032/verification/r0/logs/cli-0-transcripts.txt`

## TC-cli-4 (VS-4, R-137): Only pr samples an e2e branch

- Given: A scratch git repo built by cli-runner with a controlled environment
- When: branches.py preflight runs with the mode, flags and config the scenario names
- Then: The samples hold the kinds the spec table allows for that mode
- Expected: Only pr samples an e2e branch
- Actual: pr: sdlc/M-1-e2e (feature/M-1-e2e with a custom format). stack, mr, direct: no e2e sample.
- Result: pass
- Test: `.sdlc/slices/S-032/verification/r0/tests/cli-0/kinds.verify-cli.test.mjs:58`
- Transcript: `.sdlc/slices/S-032/verification/r0/logs/cli-0-transcripts.txt`

## TC-cli-5 (VS-5, R-137): No mode samples e2e-area, verify or attempt, also with hostile --branch, --format and config branchFormat values

- Given: A scratch git repo built by cli-runner with a controlled environment
- When: branches.py preflight runs with the mode, flags and config the scenario names
- Then: The samples hold the kinds the spec table allows for that mode
- Expected: No mode samples e2e-area, verify or attempt, also with hostile --branch, --format and config branchFormat values
- Actual: Plain run: each mode held only its allowed kinds. 130 attack-corpus entries run as --branch (4 modes), --format (pr) and config branchFormat (stack): no traceback, no new kind in any sample.
- Result: pass
- Test: `.sdlc/slices/S-032/verification/r0/tests/cli-0/kinds.verify-cli.test.mjs:64`
- Transcript: `.sdlc/slices/S-032/verification/r0/logs/cli-0-transcripts.txt`

## Attacks

The 130 attack-corpus entries ran as --branch, --format and config branchFormat. No traceback. No new sampled kind.

## Seeds

- verify: hostile sweep of preflight is slow (about 144 s for 130 entries x 4 modes).
