# Security verification, S-012, round 2

Slice: S-012. Profile: security. Round: 2. Commit: 4ed0399. Verdict: HELD (no in-scope failure).

Environment: Python 3.14.7 with -I, git, Node, scratch cwd; branches.py at 4ed0399

Threat model: rules come from the forge reader. Samples are strings. A bad pattern must never block the run (R-035).

## TC-security-1 Uncompilable patterns give unevaluated with the note, negate or not

- Given: branches.py at 6ad4424
- When: judge is called with the input
- Then: unevaluated with note 'cannot evaluate ruleset 7: <re.error>'
- Expected: unevaluated with note 'cannot evaluate ruleset 7: <re.error>'
- Actual: held for (, [a-, *, a{2,1}, (?P<, backslash; bad pattern beside a passing rule is unevaluated
- Result: pass
- Spec source: R-035 acceptance
- Test: `.sdlc/slices/S-012/verification/r2/tests/security-0/branches.verify-security.test.mjs:14`

```
log: .sdlc/slices/S-012/verification/r2/logs/security-0-run.txt
```

## TC-security-2 Pattern nested 900, 5000 and 100000 deep leaves the sample unevaluated (fix of r0)

- Given: branches.py at 6ad4424
- When: judge is called with the input
- Then: judge returns unevaluated with a cannot evaluate note
- Expected: judge returns unevaluated with a cannot evaluate note
- Actual: unevaluated with note 'cannot evaluate deep: the pattern is nested too deeply' for balanced, open and (?: forms, negate true and false
- Result: pass
- Spec source: R-035 quote: it never blocks
- Test: `.sdlc/slices/S-012/verification/r2/tests/security-0/branches.verify-security.test.mjs:119`

```
log: .sdlc/slices/S-012/verification/r2/logs/security-0-run.txt
```

## TC-security-3 Invalid refs fail with git check-ref-format; valid refs pass

- Given: branches.py at 6ad4424
- When: judge is called with the input
- Then: fail with rule git check-ref-format for 19 invalid samples; pass for 2 valid
- Expected: fail with rule git check-ref-format for 19 invalid samples; pass for 2 valid
- Actual: as expected
- Result: pass
- Spec source: R-037 acceptance
- Test: `.sdlc/slices/S-012/verification/r2/tests/security-0/branches.verify-security.test.mjs:41`

```
log: .sdlc/slices/S-012/verification/r2/logs/security-0-run.txt
```

## TC-security-4 NUL, surrogate, flag-like, corpus samples and git off PATH give Fail or a verdict; nothing written

- Given: branches.py at 6ad4424
- When: judge is called with the input
- Then: no traceback, no option read, no file written
- Expected: no traceback, no option read, no file written
- Actual: as expected; git off PATH gives Fail; scratch cwd stays empty
- Result: pass
- Spec source: R-037 acceptance
- Test: `.sdlc/slices/S-012/verification/r2/tests/security-0/branches.verify-security.test.mjs:51`

```
log: .sdlc/slices/S-012/verification/r2/logs/security-0-run.txt
```

## TC-security-5 A repetition count too large for re leaves the sample unevaluated

- Given: branches.py at 6ad4424
- When: judge is called with the input
- Then: judge returns unevaluated for a{4294967296}, a{99999999999999999999}, a{0,4294967296}, (ab){4294967296}
- Expected: judge returns unevaluated for a{4294967296}, a{99999999999999999999}, a{0,4294967296}, (ab){4294967296}
- Actual: unevaluated with note "cannot evaluate big: ..." for all four patterns, negate true and false. The r1 OverflowError is fixed.
- Result: pass
- Spec source: R-035 quote: it never blocks
- Test: `.sdlc/slices/S-012/verification/r2/tests/security-0/branches.verify-security.test.mjs:101`

```
log: .sdlc/slices/S-012/verification/r2/logs/security-0-run.txt
```

## TC-security-6 A rule without a label keeps rule null when it fails before the git check

- Given: branches.py at 6ad4424
- When: judge is called with the input
- Then: fail with rule null
- Expected: fail with rule null
- Actual: as expected
- Result: pass
- Spec source: R-036 acceptance (fix of r0)
- Test: `.sdlc/slices/S-012/verification/r2/tests/security-0/branches.verify-security.test.mjs:130`

```
log: .sdlc/slices/S-012/verification/r2/logs/security-0-run.txt
```

## TC-security-7 36 further hostile patterns never make judge, regex_error or evaluate raise

- Given: branches.py at 4ed0399
- When: judge is called with each pattern, negate true and false
- Then: a verdict, never an exception
- Expected: a verdict, never an exception
- Actual: as expected for all 36 patterns, including huge repeats in groups, lazy and possessive forms, bad back-references, bad conditionals, huge look-behind, bad flags, NUL, surrogate, 5 MB literal, 70000 groups and 200000 alternatives
- Result: pass
- Spec source: R-035 quote: it never blocks
- Test: `.sdlc/slices/S-012/verification/r2/tests/security-0/branches-r2.verify-security.test.mjs:34`

```
log: .sdlc/slices/S-012/verification/r2/logs/security-0-run.txt
```

## Attacks

- AT-1 (held): Explore regex rules with malformed patterns to find an exception out of judge. Input: ( [a- * a{2,1} (?P< \ with negate true and false. Observed: as expected.
- AT-2 (held): Explore regex rules with deep nesting to find a RecursionError. Input: 900 and 100000 balanced pairs, 5000 open parentheses, 3000 (?: groups. Observed: unevaluated with nested-too-deeply note; the r0 break is fixed.
- AT-3 (held): Explore regex rules with huge repetition counts to find an exception other than re.error. Input: a{4294967296}, a{99999999999999999999}, a{0,4294967296}, (ab){4294967296}. Observed: unevaluated; the r1 OverflowError is fixed.
- AT-4 (held): Explore other pattern forms for exceptions. Input: 1e6 char class, 200000 alternatives, NUL, lone surrogate, bad backref, bad conditional, undefined \N name, bad flag, bad range, look-behind of variable width, nested repeat. Observed: all gave a verdict.
- AT-5 (held): Explore samples with flag-like and control values to find a git option read or a traceback. Input: --help -h --version -x - NUL surrogate corpus families. Observed: as expected.
- AT-6 (held): Explore the environment with git off PATH. Input: PATH=/nonexistent. Observed: Fail, scratch cwd empty.
- AT-7 (out-of-scope): Explore ref aliases. Input: @{-1} and @. Observed: pass: git expands them.
- AT-8 (out-of-scope): Explore a catastrophic pattern. Input: (a+)+$ against 28 a then !. Observed: 9.9 seconds in r0; not re-run.
- AT-8 (held): Explore regex rules with 36 more pattern forms to find any exception other than re.error, RecursionError or OverflowError. Input: huge repeats inside groups, lazy and possessive huge repeats, huge back-reference, bad conditional, huge look-behind, bad flags, NUL, surrogate, 5 MB literal, 70000 groups, 200000 alternatives, unicode name errors. Observed: a verdict for each.

## Seeds

- @{-1} and @ pass the ref check: git check-ref-format --branch expands @{-1} inside a repo and accepts @. Two seed tests fail. Reject a sample that is @ or starts with @{, or run git check-ref-format without --branch. (skills/sdlc/branches.py)
- catastrophic regex blocks judge: (a+)+$ against a 28 character sample ran 9.9 seconds in r0. The spec accepts this. Send to verify-limits. (skills/sdlc/branches.py)
- non-string sample or pattern raises TypeError: judge with a null pattern or a non-string sample raises TypeError. Rules come from the forge reader and samples are strings by contract, so this is outside the threat model. (skills/sdlc/branches.py)
