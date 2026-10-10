# Verification r0: security part 0 (S-fix-M-1-1b)

- Slice: S-fix-M-1-1b
- Profile: security
- Round: 0
- Commit: 61c3949
- Verdict: pass (10 cases, 53 test runs, 0 failures)

Environment: Python 3, Node test runner, cli-runner scratch repos with a scratch HOME and git identity, no network

## TC-security-1 (VS-1): name refuses ids that parse as attempt or verify under slice and milestone kinds

- Given: Formats {name}, {name:lower}, feature/{name}; ids S-001-attempt-2, S-001-v0-cli-0, S-001-attempt-0, S-001-v10-a-b-3
- When: branches.py name --kind slice|milestone --id <id>
- Then: exit 2, ok false, no branch printed, no traceback, tree unchanged
- Expected: Fail for all 24 combinations
- Actual: All 24 refused with exit 2; parse still reads the same strings as attempt and verify (TC-security-6)
- Result: pass
- Spec source: R-019 acceptance: every name output parses back to the same kind and parts
- Test: .sdlc/slices/S-fix-M-1-1b/verification/r0/tests/security-0/branches.verify-security.test.mjs:15

```
S-001-attempt-2 -> exit 2 {ok:false}: the slice branch name 'S-001-attempt-2' does not parse back as a slice branch: parse reads kind attempt
```
Log: .sdlc/slices/S-fix-M-1-1b/verification/r0/logs/security-0-run.txt

## TC-security-2 (VS-3): non-ASCII slice ids refused under {name} and {name:lower}

- Given: Ids with U+212A, U+017F, e, fullwidth digit, zero width space, Cyrillic a
- When: branches.py name --kind slice --id <id>
- Then: exit 2, ok false, no branch
- Expected: Fail for all 12 combinations
- Actual: All refused
- Result: pass
- Spec source: R-019 acceptance
- Test: .sdlc/slices/S-fix-M-1-1b/verification/r0/tests/security-0/branches.verify-security.test.mjs:27

```
S-00K (U+212A) -> exit 2, parse reads no kind
```
Log: .sdlc/slices/S-fix-M-1-1b/verification/r0/logs/security-0-run.txt

## TC-security-3 (VS-3): integer parts that are not decimal integers are refused; unicode digits cannot reach the branch

- Given: --n values -1, 0x2, 2.0, 1e2, 2;x; fullwidth 2, Arabic-indic 2, '2\n', ' 2', '+2'
- When: branches.py name --kind attempt
- Then: invalid forms exit 2; accepted forms yield ASCII S-001-attempt-2
- Expected: No non-ASCII digit in any output
- Actual: argparse int() normalizes unicode digits to 2 and the output stays ASCII; invalid forms refused
- Result: pass
- Spec source: R-019 acceptance
- Test: .sdlc/slices/S-fix-M-1-1b/verification/r0/tests/security-0/branches.verify-security.test.mjs:37

```
--n '２' -> branch S-001-attempt-2
```
Log: .sdlc/slices/S-fix-M-1-1b/verification/r0/logs/security-0-run.txt

## TC-security-4 (VS-1): shell, newline, traversal and flag-like ids are refused with no side effect

- Given: ids 'S-001; touch pwned', 'S-001$(touch pwned)', 'S-001\nS-002', 'S-001/../../etc', '-S-001', 'S-001..x', 'S-001.lock'
- When: name --kind slice
- Then: exit 2, tree unchanged (no pwned file, no new ref)
- Expected: Fail
- Actual: All refused; tree diff empty
- Result: pass
- Spec source: R-019 acceptance
- Test: .sdlc/slices/S-fix-M-1-1b/verification/r0/tests/security-0/branches.verify-security.test.mjs:50

```
tree unchanged for all 7
```
Log: .sdlc/slices/S-fix-M-1-1b/verification/r0/logs/security-0-run.txt

## TC-security-5 (VS-1): valid names still succeed

- Given: S-fix-M-1-2 under sdlc/{name:lower}; attempt n=02
- When: name
- Then: sdlc/s-fix-m-1-2 and sdlc/S-001-attempt-2
- Expected: success
- Actual: as expected
- Result: pass
- Spec source: R-019 acceptance
- Test: .sdlc/slices/S-fix-M-1-1b/verification/r0/tests/security-0/branches.verify-security.test.mjs:57

```
exit 0
```
Log: .sdlc/slices/S-fix-M-1-1b/verification/r0/logs/security-0-run.txt

## TC-security-6 (VS-1): parse still reads kind-confusing strings as attempt and verify

- Given: sdlc/S-001-attempt-2, sdlc/S-001-v0-cli-0
- When: branches.py parse
- Then: kinds attempt and verify
- Expected: unchanged parse
- Actual: as expected
- Result: pass
- Spec source: R-019 acceptance
- Test: .sdlc/slices/S-fix-M-1-1b/verification/r0/tests/security-0/branches.verify-security.test.mjs:63

```
kind attempt / kind verify
```
Log: .sdlc/slices/S-fix-M-1-1b/verification/r0/logs/security-0-run.txt

## TC-security-7 (VS-8): ASCII lowered branch with in-progress slice is active

- Given: format feature/p-1-{name:lower}, branch feature/p-1-s-001, S-001 in_progress on it
- When: next-action.py --repo
- Then: checkout feature/p-1-s-001
- Expected: active
- Actual: active
- Result: pass
- Spec source: R-053 acceptance
- Test: .sdlc/slices/S-fix-M-1-1b/verification/r0/tests/security-0/branches.verify-security.test.mjs:95

```
checkout=feature/p-1-s-001
```
Log: .sdlc/slices/S-fix-M-1-1b/verification/r0/logs/security-0-run.txt

## TC-security-8 (VS-8): Kelvin look-alike branch never reads as active

- Given: branch feature/p-1-s-00K (U+212A) with S-001 or S-00K in_progress
- When: next-action.py
- Then: checkout null
- Expected: not active
- Actual: not active
- Result: pass
- Spec source: R-053 acceptance: a foreign branch never reads as active
- Test: .sdlc/slices/S-fix-M-1-1b/verification/r0/tests/security-0/branches.verify-security.test.mjs:98

```
checkout=null
```
Log: .sdlc/slices/S-fix-M-1-1b/verification/r0/logs/security-0-run.txt

## TC-security-9 (VS-8): Kelvin id in the ledger does not match the ASCII branch

- Given: branch feature/p-1-s-001, slices.json id S-00K in_progress, and S-001 todo
- When: next-action.py
- Then: checkout null
- Expected: not active
- Actual: not active
- Result: pass
- Spec source: R-053 acceptance
- Test: .sdlc/slices/S-fix-M-1-1b/verification/r0/tests/security-0/branches.verify-security.test.mjs:102

```
checkout=null
```
Log: .sdlc/slices/S-fix-M-1-1b/verification/r0/logs/security-0-run.txt

## TC-security-10 (VS-8): long s id, foreign prefix, case mismatch under {name}, attempt branch never active

- Given: branches feature/p-1-s-U+017F, other/s-001, feature/p-1-s-001 under {name}, feature/p-1-S-001-attempt-1
- When: next-action.py
- Then: checkout null each time
- Expected: not active
- Actual: not active; git refs unchanged
- Result: pass
- Spec source: R-053 acceptance
- Test: .sdlc/slices/S-fix-M-1-1b/verification/r0/tests/security-0/branches.verify-security.test.mjs:106

```
checkout=null x4
```
Log: .sdlc/slices/S-fix-M-1-1b/verification/r0/logs/security-0-run.txt

## Attacks

- A-1 [held] Explore name with kind-confusing ids to find an output that parse reads as another kind (R-019 acceptance). Input: S-001-attempt-2 etc.. Observed: Fail
- A-2 [held] Explore name with unicode confusables and fullwidth digits. Input: U+212A, U+017F, fullwidth 1. Observed: Fail
- A-3 [held] Explore name with shell metacharacters, newline, traversal. Input: see TC-security-4. Observed: Fail, tree unchanged
- A-4 [held] Explore next-action active_branch with Kelvin look-alike branch and ledger ids. Input: U+212A. Observed: not active
- A-5 [out-of-scope] Explore name state kind with a trailing newline ts (Python API only; the CLI has no --ts flag). Input: ts='20260101000000\n'. Observed: returned 'state-20260101000000\n' (regex $ matches before a newline; state has no required parts so ts is not compared)
- A-6 [out-of-scope] Explore name e2e-area with a traversal area. Input: area='../../x'. Observed: returned 'sdlc/M-1-e2e-../../x'; git check-ref-format refuses '..'

## Seeds

- name accepts a state ts with a trailing newline (skills/sdlc/branches.py): branches.name('{name}','state',ts='20260101000000\n') returns 'state-20260101000000\n'. The round-trip check compares no ts, and the parse regex '$' matches before a final newline. Python API only: the CLI has no --ts flag. Verify-contract owns VS-7. Compare ts too, or anchor the state pattern with \Z.
- name accepts e2e-area areas that git refuses (skills/sdlc/branches.py): area '../../x' gives 'sdlc/M-1-e2e-../../x', which git check-ref-format rejects. The spec states no area rule, so this is a seed.
