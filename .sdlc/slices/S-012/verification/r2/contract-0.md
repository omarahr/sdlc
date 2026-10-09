# Verify contract, S-012, round 2

Slice: S-012. Profile: contract. Round: 2. Commit: 4ed0399. Verdict: pass (not refuted).

Environment: Python 3.14.7, Node test runner, git on PATH, testkit property.mjs; seed 12012; worktree of sdlc/S-012 at 4ed0399

Scenario VS-1 only. Round 1 failed cases 8 and 9 (OverflowError). Commit 4ed0399 fixes both. All 9 earlier cases now pass. One new property case ran 1509 patterns with no exception.

## TC-contract-1: Surface: judge, ref_format_error, regex_error, evaluate

- Given: Branch sdlc/S-012 at commit 4ed0399.
- When: List the module functions.
- Then: The expected functions exist; no extra import.
- Expected: The expected functions exist; no extra import.
- Actual: The expected functions exist; no extra import.
- Result: pass
- Test: `.sdlc/slices/S-012/verification/r2/tests/contract-0/judge.verify-contract.test.mjs:28`
- Spec source: R-035 acceptance

Evidence (log, node --test output, 23 tests, 0 failures):

```
.sdlc/slices/S-012/verification/r2/logs/contract-0.txt
```

## TC-contract-2: Uncompilable patterns give unevaluated; note equals regex_error

- Given: Branch sdlc/S-012 at commit 4ed0399.
- When: Judge ( , [a-, *, a{2,1} with negate true, false and absent.
- Then: Result unevaluated, rule null, note equal to regex_error.
- Expected: Result unevaluated, rule null, note equal to regex_error.
- Actual: Result unevaluated, rule null, note equal to regex_error.
- Result: pass
- Test: `.sdlc/slices/S-012/verification/r2/tests/contract-0/judge.verify-contract.test.mjs:40`
- Spec source: R-035 acceptance

Evidence (log, node --test output, 23 tests, 0 failures):

```
.sdlc/slices/S-012/verification/r2/logs/contract-0.txt
```

## TC-contract-3: Bad pattern beside a passing rule is unevaluated; unknown kind note

- Given: Branch sdlc/S-012 at commit 4ed0399.
- When: Judge a bad regex with a passing rule, and an unknown kind.
- Then: Result unevaluated; note reads cannot evaluate <label>: unknown kind <kind>.
- Expected: Result unevaluated; note reads cannot evaluate <label>: unknown kind <kind>.
- Actual: Result unevaluated; note reads cannot evaluate <label>: unknown kind <kind>.
- Result: pass
- Test: `.sdlc/slices/S-012/verification/r2/tests/contract-0/judge.verify-contract.test.mjs:52`
- Spec source: R-035 acceptance

Evidence (log, node --test output, 23 tests, 0 failures):

```
.sdlc/slices/S-012/verification/r2/logs/contract-0.txt
```

## TC-contract-4: Catastrophic pattern finishes

- Given: Branch sdlc/S-012 at commit 4ed0399.
- When: Judge (a+)+$ on 22 characters.
- Then: The call returns.
- Expected: The call returns.
- Actual: The call returns.
- Result: pass
- Test: `.sdlc/slices/S-012/verification/r2/tests/contract-0/judge.verify-contract.test.mjs:61`
- Spec source: R-035 acceptance

Evidence (log, node --test output, 23 tests, 0 failures):

```
.sdlc/slices/S-012/verification/r2/logs/contract-0.txt
```

## TC-contract-5: Deeply nested pattern never raises out of judge

- Given: Branch sdlc/S-012 at commit 4ed0399.
- When: Judge 2000 and 1000 nested open parentheses.
- Then: judge returns a dict.
- Expected: judge returns a dict.
- Actual: judge returns a dict.
- Result: pass
- Test: `.sdlc/slices/S-012/verification/r2/tests/contract-0/judge.verify-contract.test.mjs:254`
- Spec source: R-035 acceptance

Evidence (log, node --test output, 23 tests, 0 failures):

```
.sdlc/slices/S-012/verification/r2/logs/contract-0.txt
```

## TC-contract-6: Nested pattern gives a note equal to regex_error

- Given: Branch sdlc/S-012 at commit 4ed0399.
- When: Judge 500 to 5000 open parentheses, negate true and false.
- Then: Note equals regex_error text.
- Expected: Note equals regex_error text.
- Actual: Note equals regex_error text.
- Result: pass
- Test: `.sdlc/slices/S-012/verification/r2/tests/contract-0/judge.verify-contract.test.mjs:263`
- Spec source: R-035 acceptance

Evidence (log, node --test output, 23 tests, 0 failures):

```
.sdlc/slices/S-012/verification/r2/logs/contract-0.txt
```

## TC-contract-7: Nested pattern beside passing and failing rules

- Given: Branch sdlc/S-012 at commit 4ed0399.
- When: Judge nested pattern with a passing rule, then a failing rule.
- Then: unevaluated, then fail with the failing label.
- Expected: unevaluated, then fail with the failing label.
- Actual: unevaluated, then fail with the failing label.
- Result: pass
- Test: `.sdlc/slices/S-012/verification/r2/tests/contract-0/judge.verify-contract.test.mjs:274`
- Spec source: R-035 acceptance

Evidence (log, node --test output, 23 tests, 0 failures):

```
.sdlc/slices/S-012/verification/r2/logs/contract-0.txt
```

## TC-contract-8: Repeat count too large for re.compile never raises (r1 failure, re-run)

- Given: Branch sdlc/S-012 at commit 4ed0399.
- When: Judge a{4294967296}, a{99999999999999999999}, a{1,99999999999999999999}, a{99999999999999999999,}.
- Then: Each gives unevaluated with note starting cannot evaluate big: .
- Expected: Each gives unevaluated with note starting cannot evaluate big: .
- Actual: Each gives unevaluated with note starting cannot evaluate big: .
- Result: pass
- Test: `.sdlc/slices/S-012/verification/r2/tests/contract-0/judge.verify-contract.test.mjs:281`
- Spec source: R-035 acceptance

Evidence (log, node --test output, 23 tests, 0 failures):

```
.sdlc/slices/S-012/verification/r2/logs/contract-0.txt
```

Evidence (transcript, fix):

```
4ed0399 catches OverflowError in regex_error and _raw_result
```

## TC-contract-9: regex_error returns text for every pattern re.compile rejects (r1 failure, re-run)

- Given: Branch sdlc/S-012 at commit 4ed0399.
- When: Call regex_error on a{4294967296}, 2000 open parentheses, (, [a-.
- Then: Each call returns text.
- Expected: Each call returns text.
- Actual: Each call returns text.
- Result: pass
- Test: `.sdlc/slices/S-012/verification/r2/tests/contract-0/judge.verify-contract.test.mjs:291`
- Spec source: R-035 acceptance

Evidence (log, node --test output, 23 tests, 0 failures):

```
.sdlc/slices/S-012/verification/r2/logs/contract-0.txt
```

## TC-contract-10: Property: 1509 random regex-like patterns never raise out of judge or regex_error

- Given: A seeded generator of atoms: brackets, braces, huge counts, groups, escapes, unicode, NUL; plus 200000-character and 3000-deep patterns.
- When: Call judge and regex_error on each pattern.
- Then: No exception outcome; every unevaluated note equals cannot evaluate p: <regex_error text>.
- Expected: 0 exceptions
- Actual: 0 exceptions; 1365 of 1509 unevaluated
- Result: pass
- Test: `.sdlc/slices/S-012/verification/r2/tests/contract-0/judge.verify-contract-r2.test.mjs:9`
- Spec source: R-035 acceptance

Evidence (property-run, property run):

```
property: no exception outcome; seed 12012; runs 1509; result pass; no counterexample
```

## Attacks

None.

## Seeds

None new. The r1 seed (one handler for all re.compile exceptions) is closed for the known types.
