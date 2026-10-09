# S-012 verify-security r0

Slice: S-012. Profile: security. Round: 0. Commit: 789c21e. Verdict: refuted (1 failing case).

Environment: Python 3 with -I, git, Node 24, scratch cwd, branches.py at 789c21e.
Log: `.sdlc/slices/S-012/verification/r0/logs/security-0-run.txt`.

## TC-security-1 (VS-1): Uncompilable patterns give unevaluated with the note, negate or not

- Expected: unevaluated with note 'cannot evaluate ruleset 7: <re.error>', no exception
- Actual: held for (, [a-, *, a{2,1}, (?P<, backslash; bad pattern beside a passing rule is unevaluated
- Result: pass
- Spec source: R-035 acceptance
- Test: `.sdlc/slices/S-012/verification/r0/tests/security-0/branches.verify-security.test.mjs:14`

```
judge([regex '('],'sdlc/S-001') -> {'result':'unevaluated','rule':None,'notes':['cannot evaluate x: missing ), unterminated subpattern at position 0']}
```

## TC-security-2 (VS-1): Pattern nested 900 deep leaves the sample unevaluated and does not raise

- Expected: judge returns a dict
- Actual: judge raises RecursionError (maximum recursion depth exceeded); also for 5000 open parentheses
- Result: fail
- Spec source: R-035 quote: it never blocks
- Test: `.sdlc/slices/S-012/verification/r0/tests/security-0/branches.verify-security.test.mjs:30`

```
judge([regex '('*900+')'*900],'sdlc/S-001') -> RecursionError. regex_error and _raw_result catch only re.error. At depth 400 judge returns pass.
```

## TC-security-3 (VS-3): Invalid ref names fail with git check-ref-format; valid refs pass

- Expected: fail, rule git check-ref-format, for 19 invalid samples; pass for 2 valid
- Actual: all as expected, including a leading dash, empty string, space and control character
- Result: pass
- Spec source: R-037 acceptance
- Test: `.sdlc/slices/S-012/verification/r0/tests/security-0/branches.verify-security.test.mjs:41`

```
'bad..name' -> fatal: 'bad..name' is not a valid branch name; 'sdlc/S-001' -> None
```

## TC-security-4 (VS-3): NUL, surrogate, flag-like and corpus samples give Fail or a verdict; git missing gives Fail; nothing is written

- Expected: no traceback; no option read; no file written
- Actual: NUL and lone surrogate give Fail; --help, -h, --version, -x are refused as names; PATH without git gives Fail; scratch cwd stays empty
- Result: pass
- Spec source: R-037 acceptance
- Test: `.sdlc/slices/S-012/verification/r0/tests/security-0/branches.verify-security.test.mjs:51`

```
a\x00b -> Fail: embedded null byte; PATH=/nonexistent -> Fail: [Errno 2] No such file or directory: 'git'
```

## Attacks

- AT-1 (: tried regex ( [a-  * a{2,1} (?P< \ with negate true and false; expected unevaluated, note equals re.error text; observed as expected; held.
- AT-2 deep nesting: tried regex of 900 balanced pairs, and 5000 open parentheses; expected unevaluated, no exception; observed RecursionError raised out of judge; broke.
- AT-3 flag injection: tried samples --help -h --version -x - passed to git check-ref-format --branch; expected refused as ref names; observed refused; held.
- AT-4 NUL and surrogate: tried sample with NUL, lone surrogate; expected Fail or fail verdict; observed Fail; held.
- AT-5 git off PATH: tried PATH=/nonexistent; expected Fail, no write; observed Fail, scratch cwd empty; held.
- AT-6 catastrophic regex: tried (a+)+$ against 28 a then !; expected spec accepts long run; observed 9.9 seconds, returned fail; out-of-scope.
- AT-7 repo state: tried sample @{-1} inside a repo with a previous branch; expected fail as outside a repo; observed pass: git expands @{-1} to a branch name; out-of-scope.
- AT-8 ref alias: tried sample @; expected fail: @ is not a valid ref; observed pass: git accepts @ as an alias for HEAD; out-of-scope.

## Seeds

- @{-1} and @ pass the ref check: git check-ref-format --branch expands @{-1} to the previous branch inside a repo, and accepts @. A working sample named @ or @{-1} passes where R-037 intends a refusal. The plan lists this risk. Fix: reject a sample that starts with @ or equals @, or run git check-ref-format without --branch.
- catastrophic regex blocks judge: (a+)+$ against a 28 character sample ran 9.9 seconds in re. The spec accepts this. A preflight over many samples could stall. Send to verify-limits.
- judge raises TypeError for a non-string sample: ref_format_error(None) and (5) raise TypeError from subprocess. Samples are strings by contract, so this is outside the threat model.
