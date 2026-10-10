# Verify contract part 0: S-017 round 1

- Slice: S-017
- Profile: contract
- Round: 1
- Commit: da88101
- Verdict: pass (12 of 12 cases)

## Environment
Python 3.14.7, Node 24.19.0, gh and glab stub shims from the testkit, scratch git repos, worktree of sdlc/S-017 on branch sdlc/S-017-v1-contract-0

## Surface
The surface is unchanged from round 0. See `.sdlc/slices/S-017/verification/r1/logs/contract-0-surface.txt`.

Run command: `VERIFY_WORKTREE=<worktree of sdlc/S-017> node --test .sdlc/slices/S-017/verification/r1/tests/contract-0/preflight.verify-contract.test.mjs`

Run log: `.sdlc/slices/S-017/verification/r1/logs/contract-0-run.txt`

## TC-contract-1: Seven preflight scenarios hold through gh and glab shims
- Scenario: VS-4 (R-074)
- Result: pass
- Spec source: R-074 acceptance
- Test: `.sdlc/slices/S-017/verification/r1/tests/contract-0/preflight.verify-contract.test.mjs:61`

## TC-contract-2: glab ok path, mr without branch, pr mode regex failure
- Scenario: VS-4 (R-074)
- Result: pass
- Spec source: R-074 acceptance
- Test: `.sdlc/slices/S-017/verification/r1/tests/contract-0/preflight.verify-contract.test.mjs:140`

## TC-contract-3: Bad input exits 2 with one JSON error
- Scenario: VS-4 (R-074)
- Result: pass
- Spec source: R-074 acceptance
- Test: `.sdlc/slices/S-017/verification/r1/tests/contract-0/preflight.verify-contract.test.mjs:153`

## TC-contract-4: Same input gives the same output and the repo stays unchanged
- Scenario: VS-4 (R-074)
- Result: pass
- Spec source: R-074 acceptance
- Test: `.sdlc/slices/S-017/verification/r1/tests/contract-0/preflight.verify-contract.test.mjs:165`

## TC-contract-5: derive matches the spec table (property, seed 230190388, 1500 runs)
- Scenario: VS-4 (R-074)
- Result: pass
- Spec source: R-074 acceptance
- Test: `.sdlc/slices/S-017/verification/r1/tests/contract-0/preflight.verify-contract.test.mjs:204`

## TC-contract-6: judge matches rule semantics (property, seed 2021877485, 1500 runs)
- Scenario: VS-4 (R-074)
- Result: pass
- Spec source: R-074 acceptance
- Test: `.sdlc/slices/S-017/verification/r1/tests/contract-0/preflight.verify-contract.test.mjs:220`

## TC-contract-7: suggest carries --branch-format after a loop failure (property, seed 2310852601, 1200 runs)
- Scenario: VS-4 (R-074)
- Result: pass
- Spec source: R-074 acceptance
- Test: `.sdlc/slices/S-017/verification/r1/tests/contract-0/preflight.verify-contract.test.mjs:241`

## TC-contract-8: CLI exit code equals ok across 60 random rule sets (seed 2390322430)
- Scenario: VS-4 (R-074)
- Result: pass
- Spec source: R-074 acceptance
- Test: `.sdlc/slices/S-017/verification/r1/tests/contract-0/preflight.verify-contract.test.mjs:265`

## TC-contract-9: Consumer view from a scratch cwd
- Scenario: VS-4 (R-074)
- Result: pass
- Spec source: R-074 acceptance
- Test: `.sdlc/slices/S-017/verification/r1/tests/contract-0/preflight.verify-contract.test.mjs:290`

## TC-contract-10: judge and derive accept a non-string pattern without an exception and never derive from it (fix round 1 change)
- Scenario: VS-4 (R-074)
- Result: pass
- Spec source: R-074 acceptance
- Test: `.sdlc/slices/S-017/verification/r1/tests/contract-0/preflight.verify-contract.test.mjs:304`

## TC-contract-11: CLI with a non-string pattern in all four kinds, with and without a good rule: exit 0 or 1, no traceback, note cannot evaluate, no derived format
- Scenario: VS-4 (R-074)
- Result: pass
- Spec source: R-074 acceptance
- Test: `.sdlc/slices/S-017/verification/r1/tests/contract-0/preflight.verify-contract.test.mjs:322`

## TC-contract-12: glab push rule with a non-string regex does not crash
- Scenario: VS-4 (R-074)
- Result: pass
- Spec source: R-074 acceptance
- Test: `.sdlc/slices/S-017/verification/r1/tests/contract-0/preflight.verify-contract.test.mjs:342`

## Attacks
None. The security profile covers hostile forge answers.

## Seeds
- derive treats an empty pattern as not derivable: Same as round 0. The result is the same in practice.
- preflight output holds the extra keys args and command: Same as round 0. They come from the shared echo.
