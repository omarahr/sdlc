# S-005b contract verification, round 0

Slice: S-005b. Profile: contract. Part: 0. Round: 0. Commit: 527e86b. Verdict: verified (32 of 32 cases pass).

Environment: macOS, node 24.19, python 3.14.7 (homebrew), 3.12.14 (uv), 3.9.6 (/usr/bin); scratch copies of skills and hooks

Surface: the scanner prints 14 keys. See `.sdlc/slices/S-005b/verification/r0/logs/contract-0-surface.txt`. No extra export.

Property: `body_text` with 1000 runs at seed 20261009 on three Python versions. 0 failures.

## TC-contract-1 (VS-1): Conditional verb in state-write git body changes wrapperBodies

- Expected: conditional verb in state-write git body changes wrapperBodies
- Actual: As expected
- Result: pass
- Test: `.sdlc/slices/S-005b/verification/r0/tests/contract-0/push-guard.verify-contract.test.mjs:50`
- Evidence: `.sdlc/slices/S-005b/verification/r0/logs/contract-0-run.txt`

## TC-contract-2 (VS-1): Parameter rebind before the call in state-write git body changes wrapperBodies

- Expected: parameter rebind before the call in state-write git body changes wrapperBodies
- Actual: As expected
- Result: pass
- Test: `.sdlc/slices/S-005b/verification/r0/tests/contract-0/push-guard.verify-contract.test.mjs:51`
- Evidence: `.sdlc/slices/S-005b/verification/r0/logs/contract-0-run.txt`

## TC-contract-3 (VS-1): Try/finally push in next-action run body changes wrapperBodies

- Expected: try/finally push in next-action run body changes wrapperBodies
- Actual: As expected
- Result: pass
- Test: `.sdlc/slices/S-005b/verification/r0/tests/contract-0/push-guard.verify-contract.test.mjs:52`
- Evidence: `.sdlc/slices/S-005b/verification/r0/logs/contract-0-run.txt`

## TC-contract-4 (VS-1): With block push in impact run body changes wrapperBodies

- Expected: with block push in impact run body changes wrapperBodies
- Actual: As expected
- Result: pass
- Test: `.sdlc/slices/S-005b/verification/r0/tests/contract-0/push-guard.verify-contract.test.mjs:53`
- Evidence: `.sdlc/slices/S-005b/verification/r0/logs/contract-0-run.txt`

## TC-contract-5 (VS-1): Lambda push inside suite-receipt git body changes wrapperBodies

- Expected: lambda push inside suite-receipt git body changes wrapperBodies
- Actual: As expected
- Result: pass
- Test: `.sdlc/slices/S-005b/verification/r0/tests/contract-0/push-guard.verify-contract.test.mjs:54`
- Evidence: `.sdlc/slices/S-005b/verification/r0/logs/contract-0-run.txt`

## TC-contract-6 (VS-1): Comprehension push inside next-action run body changes wrapperBodies

- Expected: comprehension push inside next-action run body changes wrapperBodies
- Actual: As expected
- Result: pass
- Test: `.sdlc/slices/S-005b/verification/r0/tests/contract-0/push-guard.verify-contract.test.mjs:55`
- Evidence: `.sdlc/slices/S-005b/verification/r0/logs/contract-0-run.txt`

## TC-contract-7 (VS-1): Call to an outside helper from impact git_lines body changes wrapperBodies

- Expected: call to an outside helper from impact git_lines body changes wrapperBodies
- Actual: As expected
- Result: pass
- Test: `.sdlc/slices/S-005b/verification/r0/tests/contract-0/push-guard.verify-contract.test.mjs:56`
- Evidence: `.sdlc/slices/S-005b/verification/r0/logs/contract-0-run.txt`

## TC-contract-8 (VS-2): New decorator on suite-receipt git changes wrapperBodies

- Expected: new decorator on suite-receipt git changes wrapperBodies
- Actual: As expected
- Result: pass
- Test: `.sdlc/slices/S-005b/verification/r0/tests/contract-0/push-guard.verify-contract.test.mjs:57`
- Evidence: `.sdlc/slices/S-005b/verification/r0/logs/contract-0-run.txt`

## TC-contract-9 (VS-2): Changed default check=False on state-write git changes wrapperBodies

- Expected: changed default check=False on state-write git changes wrapperBodies
- Actual: As expected
- Result: pass
- Test: `.sdlc/slices/S-005b/verification/r0/tests/contract-0/push-guard.verify-contract.test.mjs:58`
- Evidence: `.sdlc/slices/S-005b/verification/r0/logs/contract-0-run.txt`

## TC-contract-10 (VS-2): New keyword-only parameter on state-write git changes wrapperBodies

- Expected: new keyword-only parameter on state-write git changes wrapperBodies
- Actual: As expected
- Result: pass
- Test: `.sdlc/slices/S-005b/verification/r0/tests/contract-0/push-guard.verify-contract.test.mjs:59`
- Evidence: `.sdlc/slices/S-005b/verification/r0/logs/contract-0-run.txt`

## TC-contract-11 (VS-2): Return annotation on impact run changes wrapperBodies

- Expected: return annotation on impact run changes wrapperBodies
- Actual: As expected
- Result: pass
- Test: `.sdlc/slices/S-005b/verification/r0/tests/contract-0/push-guard.verify-contract.test.mjs:60`
- Evidence: `.sdlc/slices/S-005b/verification/r0/logs/contract-0-run.txt`

## TC-contract-12 (VS-2): Duplicate module-level def run in impact changes wrapperBodies

- Expected: duplicate module-level def run in impact changes wrapperBodies
- Actual: As expected
- Result: pass
- Test: `.sdlc/slices/S-005b/verification/r0/tests/contract-0/push-guard.verify-contract.test.mjs:61`
- Evidence: `.sdlc/slices/S-005b/verification/r0/logs/contract-0-run.txt`

## TC-contract-13 (VS-2): Nested def git inside another state-write function changes wrapperBodies

- Expected: nested def git inside another state-write function changes wrapperBodies
- Actual: As expected
- Result: pass
- Test: `.sdlc/slices/S-005b/verification/r0/tests/contract-0/push-guard.verify-contract.test.mjs:62`
- Evidence: `.sdlc/slices/S-005b/verification/r0/logs/contract-0-run.txt`

## TC-contract-14 (VS-2): Class method run in next-action changes wrapperBodies

- Expected: class method run in next-action changes wrapperBodies
- Actual: As expected
- Result: pass
- Test: `.sdlc/slices/S-005b/verification/r0/tests/contract-0/push-guard.verify-contract.test.mjs:63`
- Evidence: `.sdlc/slices/S-005b/verification/r0/logs/contract-0-run.txt`

## TC-contract-15 (VS-2): Async def git in suite-receipt changes wrapperBodies

- Expected: async def git in suite-receipt changes wrapperBodies
- Actual: As expected
- Result: pass
- Test: `.sdlc/slices/S-005b/verification/r0/tests/contract-0/push-guard.verify-contract.test.mjs:64`
- Evidence: `.sdlc/slices/S-005b/verification/r0/logs/contract-0-run.txt`

## TC-contract-16 (VS-2): Shadowing def git after the pinned one in state-write changes wrapperBodies

- Expected: shadowing def git after the pinned one in state-write changes wrapperBodies
- Actual: As expected
- Result: pass
- Test: `.sdlc/slices/S-005b/verification/r0/tests/contract-0/push-guard.verify-contract.test.mjs:65`
- Evidence: `.sdlc/slices/S-005b/verification/r0/logs/contract-0-run.txt`

## TC-contract-17 (VS-2): Wrapper name rebound by a lambda in state-write breaks another pin

- Expected: wrapper name rebound by a lambda in state-write breaks another pin
- Actual: As expected
- Result: pass
- Test: `.sdlc/slices/S-005b/verification/r0/tests/contract-0/push-guard.verify-contract.test.mjs:76`
- Evidence: `.sdlc/slices/S-005b/verification/r0/logs/contract-0-run.txt`

## TC-contract-18 (VS-2): Wrapper name bound by an import alias in impact breaks another pin

- Expected: wrapper name bound by an import alias in impact breaks another pin
- Actual: As expected
- Result: pass
- Test: `.sdlc/slices/S-005b/verification/r0/tests/contract-0/push-guard.verify-contract.test.mjs:77`
- Evidence: `.sdlc/slices/S-005b/verification/r0/logs/contract-0-run.txt`

## TC-contract-19 (VS-3): Comment line in each wrapper body keeps every key

- Expected: comment line in each wrapper body keeps every key
- Actual: As expected
- Result: pass
- Test: `.sdlc/slices/S-005b/verification/r0/tests/contract-0/push-guard.verify-contract.test.mjs:89`
- Evidence: `.sdlc/slices/S-005b/verification/r0/logs/contract-0-run.txt`

## TC-contract-20 (VS-3): Blank line and trailing comment in each wrapper body keeps every key

- Expected: blank line and trailing comment in each wrapper body keeps every key
- Actual: As expected
- Result: pass
- Test: `.sdlc/slices/S-005b/verification/r0/tests/contract-0/push-guard.verify-contract.test.mjs:90`
- Evidence: `.sdlc/slices/S-005b/verification/r0/logs/contract-0-run.txt`

## TC-contract-21 (VS-3): Changed existing comment in impact git_lines keeps every key

- Expected: changed existing comment in impact git_lines keeps every key
- Actual: As expected
- Result: pass
- Test: `.sdlc/slices/S-005b/verification/r0/tests/contract-0/push-guard.verify-contract.test.mjs:91`
- Evidence: `.sdlc/slices/S-005b/verification/r0/logs/contract-0-run.txt`

## TC-contract-22 (VS-3): Backslash continuation in next-action run body keeps every key

- Expected: backslash continuation in next-action run body keeps every key
- Actual: As expected
- Result: pass
- Test: `.sdlc/slices/S-005b/verification/r0/tests/contract-0/push-guard.verify-contract.test.mjs:92`
- Evidence: `.sdlc/slices/S-005b/verification/r0/logs/contract-0-run.txt`

## TC-contract-23 (VS-3): CRLF line ends in all four wrapper files keeps every key

- Expected: CRLF line ends in all four wrapper files keeps every key
- Actual: As expected
- Result: pass
- Test: `.sdlc/slices/S-005b/verification/r0/tests/contract-0/push-guard.verify-contract.test.mjs:93`
- Evidence: `.sdlc/slices/S-005b/verification/r0/logs/contract-0-run.txt`

## TC-contract-24 (VS-3): Tab indent in impact run body keeps every key

- Expected: tab indent in impact run body keeps every key
- Actual: As expected
- Result: pass
- Test: `.sdlc/slices/S-005b/verification/r0/tests/contract-0/push-guard.verify-contract.test.mjs:94`
- Evidence: `.sdlc/slices/S-005b/verification/r0/logs/contract-0-run.txt`

## TC-contract-25 (VS-3): Comment between decorators keeps the body text

- Expected: comment between decorators keeps the body text
- Actual: As expected
- Result: pass
- Test: `.sdlc/slices/S-005b/verification/r0/tests/contract-0/push-guard.verify-contract.test.mjs:111`
- Evidence: `.sdlc/slices/S-005b/verification/r0/logs/contract-0-run.txt`

## TC-contract-26 (VS-3): Clean output is equal on every local python

- Expected: clean output is equal on every local python
- Actual: As expected
- Result: pass
- Test: `.sdlc/slices/S-005b/verification/r0/tests/contract-0/push-guard.verify-contract.test.mjs:120`
- Evidence: `.sdlc/slices/S-005b/verification/r0/logs/contract-0-run.txt`

## TC-contract-27 (VS-3): Re-quoted string changes the body text

- Expected: re-quoted string changes the body text
- Actual: As expected
- Result: pass
- Test: `.sdlc/slices/S-005b/verification/r0/tests/contract-0/push-guard.verify-contract.test.mjs:125`
- Evidence: `.sdlc/slices/S-005b/verification/r0/logs/contract-0-run.txt`

## TC-contract-28 (VS-3): Body_text property over 1000 neutral and code edits on every local python

- Expected: body_text property over 1000 neutral and code edits on every local python
- Actual: As expected
- Result: pass
- Test: `.sdlc/slices/S-005b/verification/r0/tests/contract-0/push-guard.verify-contract.test.mjs:130`
- Evidence: `.sdlc/slices/S-005b/verification/r0/logs/contract-0-run.txt`

## TC-contract-29 (VS-13): Two clean scans are byte-equal

- Expected: two clean scans are byte-equal
- Actual: As expected
- Result: pass
- Test: `.sdlc/slices/S-005b/verification/r0/tests/contract-0/push-guard.verify-contract.test.mjs:140`
- Evidence: `.sdlc/slices/S-005b/verification/r0/logs/contract-0-run.txt`

## TC-contract-30 (VS-13): Scan from another cwd and through a symlinked root equals the clean output

- Expected: scan from another cwd and through a symlinked root equals the clean output
- Actual: As expected
- Result: pass
- Test: `.sdlc/slices/S-005b/verification/r0/tests/contract-0/push-guard.verify-contract.test.mjs:147`
- Evidence: `.sdlc/slices/S-005b/verification/r0/logs/contract-0-run.txt`

## TC-contract-31 (VS-13): Clean output has empty opaque, forgeViolations, dynamic and five wrapperBodies

- Expected: clean output has empty opaque, forgeViolations, dynamic and five wrapperBodies
- Actual: As expected
- Result: pass
- Test: `.sdlc/slices/S-005b/verification/r0/tests/contract-0/push-guard.verify-contract.test.mjs:159`
- Evidence: `.sdlc/slices/S-005b/verification/r0/logs/contract-0-run.txt`

## TC-contract-32 (VS-13): All T-R-119e rows (95 attempt 1 rows, 2 tree mutants, 26 S-005b r2 rows) change a pin

- Expected: Every mutant changes a pin
- Actual: 7 pass, 0 fail
- Result: pass
- Test: `skills/sdlc/test/push-guard.test.mjs`
- Evidence: `.sdlc/slices/S-005b/verification/r0/logs/contract-0-repo-pushguard.txt`

## Seeds

- Python 3.11 not available locally: The f-string source-slice rule was run on 3.9, 3.12 and 3.14 only. 3.11 and 3.13 were not run. CI uses 3.x.
- Body pin is sensitive to string re-quoting: Changing a quote style in a wrapper body changes wrapperBodies (TC-contract-27). This is safe but asks a reviewer to update the pin for a style change.
