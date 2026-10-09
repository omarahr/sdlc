# Verify contract: S-012, round 1

- Slice: S-012
- Profile: contract, part 0
- Round: 1 (plan round 0)
- Commit: 6ad4424
- Verdict: refuted (2 failing cases)

Environment: Python 3.14.7, Node test runner, git on PATH, testkit property.mjs; seed 12012; worktree of sdlc/S-012 at 6ad4424

Run: `VERIFY_WT=<worktree of sdlc/S-012> VERIFY_MAIN_MODULE=<main branches.py> TESTKIT_SEED=12012 node --test --test-name-pattern='VS-1|surface' .sdlc/slices/S-012/verification/r1/tests/contract-0/judge.verify-contract.test.mjs`

Log: `.sdlc/slices/S-012/verification/r1/logs/contract-0-run.txt`

Scope: VS-1 only. Cases 1 to 5 re-run the round 0 cases with the same ids. Cases 6 to 9 are new.

## TC-contract-1 (VS-1): Surface: judge(rules, sample), ref_format_error(ref), regex_error(pattern), evaluate(rule, sample)

- Given: judge, regex_error and ref_format_error loaded by path in python3 -I, from commit 6ad4424
- When: the function is called with the inputs named in the title
- Then: Functions exist with these signatures
- Expected: Functions exist with these signatures
- Actual: as expected; signatures unchanged
- Result: pass
- Spec source: R-035 quote
- Test: `.sdlc/slices/S-012/verification/r1/tests/contract-0/judge.verify-contract.test.mjs:28`

surface:
```
judge (rules, sample)
ref_format_error (ref)
regex_error (pattern)
evaluate (rule, sample)
```

## TC-contract-2 (VS-1): Uncompilable patterns give unevaluated, note equal to regex_error, negate true, false and absent

- Given: judge, regex_error and ref_format_error loaded by path in python3 -I, from commit 6ad4424
- When: the function is called with the inputs named in the title
- Then: unevaluated, rule null, notes ['cannot evaluate push rule: <re.error>']
- Expected: unevaluated, rule null, notes ['cannot evaluate push rule: <re.error>']
- Actual: as expected for 14 patterns x 3 negate values
- Result: pass
- Spec source: R-035 acceptance
- Test: `.sdlc/slices/S-012/verification/r1/tests/contract-0/judge.verify-contract.test.mjs:40`

result:
```
ok: VS-1 bad patterns never raise and note equals regex_error
```

## TC-contract-3 (VS-1): Bad pattern beside a passing rule is unevaluated; unknown kind note

- Given: judge, regex_error and ref_format_error loaded by path in python3 -I, from commit 6ad4424
- When: the function is called with the inputs named in the title
- Then: unevaluated; note names the unknown kind
- Expected: unevaluated; note names the unknown kind
- Actual: as expected
- Result: pass
- Spec source: R-035 acceptance; plan approach (ADR 8da6)
- Test: `.sdlc/slices/S-012/verification/r1/tests/contract-0/judge.verify-contract.test.mjs:52`

result:
```
ok: unevaluated; 'cannot evaluate g1: unknown kind glob'
```

## TC-contract-4 (VS-1): Catastrophic pattern (a+)+$ on 22 chars finishes

- Given: judge, regex_error and ref_format_error loaded by path in python3 -I, from commit 6ad4424
- When: the function is called with the inputs named in the title
- Then: judge returns
- Expected: judge returns
- Actual: returned fail in 197 ms
- Result: pass
- Spec source: plan risk (spec accepts)
- Test: `.sdlc/slices/S-012/verification/r1/tests/contract-0/judge.verify-contract.test.mjs:61`

time:
```
catastrophic ms 197
```

## TC-contract-5 (VS-1): A deeply nested pattern that re.compile rejects never raises out of judge (r0 failure, re-run)

- Given: judge, regex_error and ref_format_error loaded by path in python3 -I, from commit 6ad4424
- When: the function is called with the inputs named in the title
- Then: judge returns a dict with result unevaluated and a note
- Expected: judge returns a dict with result unevaluated and a note
- Actual: open2000 and balanced1000 return unevaluated with note 'cannot evaluate deep: the pattern is nested too deeply'. 300 levels return fail, as before.
- Result: pass
- Spec source: R-035 quote: a pattern re.compile rejects gives None; it never blocks
- Test: `.sdlc/slices/S-012/verification/r1/tests/contract-0/judge.verify-contract.test.mjs:254`

nested pattern output:
```
re.compile on nested 2000 RecursionError 1000 RecursionError 300 ok
deep open2000 return {"result":"unevaluated","rule":null,"notes":["cannot evaluate deep: the pattern is nested too deeply"]}
deep balanced1000 return {"result":"unevaluated",...}
deep balanced300 return {"result":"fail","rule":"deep","notes":[]}
```

## TC-contract-6 (VS-1): Nested pattern (500, 1000, 2000, 5000 open parentheses) gives a note equal to regex_error, negate true and false

- Given: judge, regex_error and ref_format_error loaded by path in python3 -I, from commit 6ad4424
- When: the function is called with the inputs named in the title
- Then: unevaluated with the note equal to regex_error
- Expected: unevaluated with the note equal to regex_error
- Actual: all 8 combinations return unevaluated, rule null, one note equal to 'cannot evaluate deep: ' + regex_error(pattern)
- Result: pass
- Spec source: R-035 quote: a pattern re.compile rejects gives None; it never blocks
- Test: `.sdlc/slices/S-012/verification/r1/tests/contract-0/judge.verify-contract.test.mjs:263`

result:
```
ok: round 1 nested pattern gives a note equal to regex_error
```

## TC-contract-7 (VS-1): Nested pattern beside a passing rule is unevaluated; beside a failing rule the sample fails with that label

- Given: judge, regex_error and ref_format_error loaded by path in python3 -I, from commit 6ad4424
- When: the function is called with the inputs named in the title
- Then: unevaluated beside passing rule; fail with label 'bad' beside failing rule
- Expected: unevaluated beside passing rule; fail with label 'bad' beside failing rule
- Actual: as expected
- Result: pass
- Spec source: R-035 quote; R-036 acceptance
- Test: `.sdlc/slices/S-012/verification/r1/tests/contract-0/judge.verify-contract.test.mjs:274`

result:
```
ok
```

## TC-contract-8 (VS-1): A repeat count too large for re.compile (a{4294967296}, a{99999999999999999999}, a{1,99999999999999999999}, a{99999999999999999999,}) never raises out of judge

- Given: judge, regex_error and ref_format_error loaded by path in python3 -I, from commit 6ad4424
- When: the function is called with the inputs named in the title
- Then: judge returns a dict with result unevaluated and a note starting 'cannot evaluate big: '
- Expected: judge returns a dict with result unevaluated and a note starting 'cannot evaluate big: '
- Actual: judge raised OverflowError 'the repetition number is too large' for all four patterns, with negate true and false. re.compile rejects each with OverflowError, not re.error. The fix catches re.error and RecursionError only.
- Result: fail
- Spec source: R-035 quote: a pattern re.compile rejects gives None; it never blocks
- Test: `.sdlc/slices/S-012/verification/r1/tests/contract-0/judge.verify-contract.test.mjs:281`

judge output:
```
re.compile on large repeat counts
a{4294967296} OverflowError
a{99999999999999999999} OverflowError
a{1,99999999999999999999} OverflowError
a{99999999999999999999,} OverflowError
judge a{4294967296} exception OverflowError "the repetition number is too large"
judge a{99999999999999999999} exception OverflowError ...
judge a{1,99999999999999999999} exception OverflowError ...
judge a{99999999999999999999,} exception OverflowError ...
```

full run:
```
see .sdlc/slices/S-012/verification/r1/logs/contract-0-run.txt
```

## TC-contract-9 (VS-1): regex_error returns text for every pattern re.compile rejects, including a{4294967296}

- Given: judge, regex_error and ref_format_error loaded by path in python3 -I, from commit 6ad4424
- When: the function is called with the inputs named in the title
- Then: regex_error returns a non-empty text and does not raise
- Expected: regex_error returns a non-empty text and does not raise
- Actual: regex_error raised OverflowError for a{4294967296}. The pattern is nested-deep and ordinary patterns return text.
- Result: fail
- Spec source: R-035 quote: a pattern re.compile rejects gives None; it never blocks
- Test: `.sdlc/slices/S-012/verification/r1/tests/contract-0/judge.verify-contract.test.mjs:291`

result:
```
see .sdlc/slices/S-012/verification/r1/logs/contract-0-run.txt
```

## Attacks

None.

## Seeds

- regex_error and _raw_result catch exception types one by one: The r0 fix added RecursionError. re.compile also raises OverflowError for a repeat count above the C limit. One handler for the exceptions re.compile raises on bad input would close the class. MemoryError is not reproduced. (`skills/sdlc/branches.py`)
