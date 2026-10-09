# S-012 verify-security r1

Slice: S-012. Profile: security. Round: 1. Commit: 6ad4424. Verdict: refuted (1 failing case).

Environment: Python 3.14.7 with -I, git, Node, scratch cwd; branches.py at 6ad4424.
Log: `.sdlc/slices/S-012/verification/r1/logs/security-0-run.txt`.

## TC-security-1 (VS-1): Uncompilable patterns give unevaluated with the note, negate or not

- Expected: unevaluated with note 'cannot evaluate ruleset 7: <re.error>'
- Actual: held for (, [a-, *, a{2,1}, (?P<, backslash; bad pattern beside a passing rule is unevaluated
- Result: pass
- Spec source: R-035 acceptance
- Test: `.sdlc/slices/S-012/verification/r1/tests/security-0/branches.verify-security.test.mjs:14`

## TC-security-2 (VS-1): Pattern nested 900, 5000 and 100000 deep leaves the sample unevaluated (fix of r0)

- Expected: judge returns unevaluated with a cannot evaluate note
- Actual: unevaluated with note 'cannot evaluate deep: the pattern is nested too deeply' for balanced, open and (?: forms, negate true and false
- Result: pass
- Spec source: R-035 quote: it never blocks
- Test: `.sdlc/slices/S-012/verification/r1/tests/security-0/branches.verify-security.test.mjs:119`

## TC-security-3 (VS-3): Invalid refs fail with git check-ref-format; valid refs pass

- Expected: fail with rule git check-ref-format for 19 invalid samples; pass for 2 valid
- Actual: as expected
- Result: pass
- Spec source: R-037 acceptance
- Test: `.sdlc/slices/S-012/verification/r1/tests/security-0/branches.verify-security.test.mjs:41`

## TC-security-4 (VS-3): NUL, surrogate, flag-like, corpus samples and git off PATH give Fail or a verdict; nothing written

- Expected: no traceback, no option read, no file written
- Actual: as expected; git off PATH gives Fail; scratch cwd stays empty
- Result: pass
- Spec source: R-037 acceptance
- Test: `.sdlc/slices/S-012/verification/r1/tests/security-0/branches.verify-security.test.mjs:51`

## TC-security-5 (VS-1): A repetition count too large for re leaves the sample unevaluated

- Expected: judge returns unevaluated for a{4294967296}, a{99999999999999999999}, a{0,4294967296}, (ab){4294967296}
- Actual: judge raises OverflowError: the repetition number is too large (re.compile rejects the pattern with OverflowError, not re.error); regex_error and evaluate raise too
- Result: fail
- Spec source: R-035 quote: it never blocks
- Test: `.sdlc/slices/S-012/verification/r1/tests/security-0/branches.verify-security.test.mjs:101`

## TC-security-6 (VS-1): A rule without a label keeps rule null when it fails before the git check

- Expected: fail with rule null
- Actual: as expected
- Result: pass
- Spec source: R-036 acceptance (fix of r0)
- Test: `.sdlc/slices/S-012/verification/r1/tests/security-0/branches.verify-security.test.mjs:130`

## Attacks

- AT-1 Explore regex rules with malformed patterns to find an exception out of judge: tried ( [a- * a{2,1} (?P< \ with negate true and false; expected unevaluated, note equals re.error text; observed as expected; held.
- AT-2 Explore regex rules with deep nesting to find a RecursionError: tried 900 and 100000 balanced pairs, 5000 open parentheses, 3000 (?: groups; expected unevaluated, no exception; observed unevaluated with nested-too-deeply note; the r0 break is fixed; held.
- AT-3 Explore regex rules with huge repetition counts to find an exception other than re.error: tried a{4294967296}, a{99999999999999999999}, a{0,4294967296}, (ab){4294967296}; expected unevaluated; observed OverflowError out of judge, regex_error and evaluate; broke.
- AT-4 Explore other pattern forms for exceptions: tried 1e6 char class, 200000 alternatives, NUL, lone surrogate, bad backref, bad conditional, undefined \N name, bad flag, bad range, look-behind of variable width, nested repeat; expected verdict, no exception; observed all gave a verdict; held.
- AT-5 Explore samples with flag-like and control values to find a git option read or a traceback: tried --help -h --version -x - NUL surrogate corpus families; expected fail verdict or Fail; observed as expected; held.
- AT-6 Explore the environment with git off PATH: tried PATH=/nonexistent; expected Fail, no write; observed Fail, scratch cwd empty; held.
- AT-7 Explore ref aliases: tried @{-1} and @; expected fail; observed pass: git expands them; out-of-scope.
- AT-8 Explore a catastrophic pattern: tried (a+)+$ against 28 a then !; expected spec accepts a long run; observed 9.9 seconds in r0; not re-run; out-of-scope.

## Seeds

- @{-1} and @ pass the ref check: git check-ref-format --branch expands @{-1} inside a repo and accepts @. Two seed tests fail. Reject a sample that is @ or starts with @{, or run git check-ref-format without --branch.
- catastrophic regex blocks judge: (a+)+$ against a 28 character sample ran 9.9 seconds in r0. The spec accepts this. Send to verify-limits.
- non-string sample or pattern raises TypeError: judge with a null pattern or a non-string sample raises TypeError. Rules come from the forge reader and samples are strings by contract, so this is outside the threat model.
