# Verify contract: S-012, round 0

- Slice: S-012
- Profile: contract, part 0
- Round: 0
- Commit: 789c21e
- Verdict: refuted (1 failing case)

Environment: Python 3.14.7, Node test runner, git on PATH, testkit property.mjs and attack-corpus.mjs; seed 12012.

Run: `VERIFY_WT=<worktree of sdlc/S-012> VERIFY_MAIN_MODULE=<main branches.py> TESTKIT_SEED=12012 node --test .sdlc/slices/S-012/verification/r0/tests/contract-0/judge.verify-contract.test.mjs`

Log: `.sdlc/slices/S-012/verification/r0/logs/contract-0.txt`

## TC-contract-1 (VS-1): Surface: judge(rules, sample), ref_format_error(ref), regex_error(pattern), evaluate(rule, sample), validate_format(fmt)

- Given: judge and ref_format_error loaded by path in python3 -I
- When: the function is called with the inputs named in the title
- Then: Functions exist with these signatures
- Expected: Functions exist with these signatures
- Actual: as expected
- Result: pass
- Spec source: R-035/R-036/R-037 quote
- Test: `.sdlc/slices/S-012/verification/r0/tests/contract-0/judge.verify-contract.test.mjs:28`

surface:
```
judge (rules, sample)
ref_format_error (ref)
regex_error (pattern)
evaluate (rule, sample)
validate_format (fmt)
```

## TC-contract-2 (VS-1): Uncompilable patterns give unevaluated with note equal to regex_error, negate true, false and absent

- Given: judge and ref_format_error loaded by path in python3 -I
- When: the function is called with the inputs named in the title
- Then: unevaluated, rule null, notes ['cannot evaluate push rule: <re.error>']
- Expected: unevaluated, rule null, notes ['cannot evaluate push rule: <re.error>']
- Actual: as expected for (, [a-, *, a{2,1}, (?P<, (?P<n>, backslash, (?<=a*)b, (?i, +, ?, a**, \1, (?P=x)
- Result: pass
- Spec source: R-035 acceptance
- Test: `.sdlc/slices/S-012/verification/r0/tests/contract-0/judge.verify-contract.test.mjs:40`

bad patterns:
```
14 patterns x 3 negate values; Python 3.14.7
```

## TC-contract-3 (VS-1): Bad pattern beside a passing rule is unevaluated; unknown kind note

- Given: judge and ref_format_error loaded by path in python3 -I
- When: the function is called with the inputs named in the title
- Then: unevaluated; 'cannot evaluate g1: unknown kind glob'
- Expected: unevaluated; 'cannot evaluate g1: unknown kind glob'
- Actual: as expected
- Result: pass
- Spec source: R-035 acceptance; plan approach (ADR 8da6)
- Test: `.sdlc/slices/S-012/verification/r0/tests/contract-0/judge.verify-contract.test.mjs:52`

missing kind:
```
cannot evaluate g2: unknown kind None
```

## TC-contract-4 (VS-1): Catastrophic pattern (a+)+$ on 22 chars finishes

- Given: judge and ref_format_error loaded by path in python3 -I
- When: the function is called with the inputs named in the title
- Then: judge returns
- Expected: judge returns
- Actual: returned fail in 194 ms
- Result: pass
- Spec source: plan risk (spec accepts)
- Test: `.sdlc/slices/S-012/verification/r0/tests/contract-0/judge.verify-contract.test.mjs:61`

time:
```
catastrophic ms 194
```

## TC-contract-5 (VS-1): A deeply nested pattern that re.compile rejects never raises out of judge

- Given: judge and ref_format_error loaded by path in python3 -I
- When: the function is called with the inputs named in the title
- Then: judge returns a dict with result unevaluated and a note, as for any pattern re.compile rejects
- Expected: judge returns a dict with result unevaluated and a note, as for any pattern re.compile rejects
- Actual: judge raised RecursionError: maximum recursion depth exceeded, for '('*2000 and for '('*1000+'a'+')'*1000. re.compile raises RecursionError, which evaluate and regex_error do not catch. 300 levels return normally.
- Result: fail
- Spec source: R-035 quote: a pattern re.compile rejects gives None; it never blocks
- Test: `.sdlc/slices/S-012/verification/r0/tests/contract-0/judge.verify-contract.test.mjs:254`

nested pattern output:
```
re.compile on nested 2000 RecursionError 1000 RecursionError 300 ok  python Python 3.14.7
deep open2000 exception RecursionError "maximum recursion depth exceeded"
deep balanced1000 exception RecursionError "maximum recursion depth exceeded"
deep balanced300 return  {"result":"fail","rule":"deep","notes":[]}
```

## TC-contract-6 (VS-2): Combination examples: one False fails with first label; all True passes; empty passes; True+None unevaluated; None+False fails; negate; return keys

- Given: judge and ref_format_error loaded by path in python3 -I
- When: the function is called with the inputs named in the title
- Then: per notes
- Expected: per notes
- Actual: as expected; keys are exactly result, rule, notes; duplicate labels give the label
- Result: pass
- Spec source: R-036 acceptance
- Test: `.sdlc/slices/S-012/verification/r0/tests/contract-0/judge.verify-contract.test.mjs:68`

missing label:
```
missing-label first failing rule then labelled one -> {"result":"fail","rule":"b","notes":[]}
```

## TC-contract-7 (VS-2): Property: judge equals a reference model written from the spec (1500 runs, 0-5 rules, negate, bad regex, invalid refs, git as oracle)

- Given: judge and ref_format_error loaded by path in python3 -I
- When: the function is called with the inputs named in the title
- Then: 0 violations
- Expected: 0 violations
- Actual: 0 violations
- Result: pass
- Spec source: R-036 quote; R-037 quote
- Test: `.sdlc/slices/S-012/verification/r0/tests/contract-0/judge.verify-contract.test.mjs:111`

judge vs model:
```
property-run judge seed=12012 runs=1500 violations=0
```

## TC-contract-8 (VS-2): judge does not mutate rules and is deterministic

- Given: judge and ref_format_error loaded by path in python3 -I
- When: the function is called with the inputs named in the title
- Then: same output, rules unchanged
- Expected: same output, rules unchanged
- Actual: as expected
- Result: pass
- Spec source: R-036 quote
- Test: `.sdlc/slices/S-012/verification/r0/tests/contract-0/judge.verify-contract.test.mjs:129`

## TC-contract-9 (VS-3): Invalid refs fail with git check-ref-format; valid refs pass; ref_format_error gives text or None

- Given: judge and ref_format_error loaded by path in python3 -I
- When: the function is called with the inputs named in the title
- Then: fail/git check-ref-format for 23 invalid refs; pass for 5 valid
- Expected: fail/git check-ref-format for 23 invalid refs; pass for 5 valid
- Actual: as expected
- Result: pass
- Spec source: R-037 acceptance
- Test: `.sdlc/slices/S-012/verification/r0/tests/contract-0/judge.verify-contract.test.mjs:139`

## TC-contract-10 (VS-3): @{-1}, NUL, lone surrogate and non-string samples

- Given: judge and ref_format_error loaded by path in python3 -I
- When: the function is called with the inputs named in the title
- Then: no traceback
- Expected: no traceback
- Actual: @{-1} gives fail. NUL and lone surrogate raise Fail. Non-string samples raise TypeError (seed, not blocking)
- Result: pass
- Spec source: plan VS-3 notes
- Test: `.sdlc/slices/S-012/verification/r0/tests/contract-0/judge.verify-contract.test.mjs:153`

odd inputs:
```
odd "\u0000" judge Fail 'embedded null byte'
odd null judge exception TypeError
odd 5 judge exception TypeError
```

## TC-contract-11 (VS-3): Flag-like samples (--, -h, --help, -1, --format=x, --stdin) are not read as git options

- Given: judge and ref_format_error loaded by path in python3 -I
- When: the function is called with the inputs named in the title
- Then: fail with git check-ref-format
- Expected: fail with git check-ref-format
- Actual: as expected
- Result: pass
- Spec source: R-037 quote
- Test: `.sdlc/slices/S-012/verification/r0/tests/contract-0/judge.verify-contract.test.mjs:165`

## TC-contract-12 (VS-3): Attack corpus (95 strings) never raises and agrees with git

- Given: judge and ref_format_error loaded by path in python3 -I
- When: the function is called with the inputs named in the title
- Then: 0 non-return, 0 disagreements
- Expected: 0 non-return, 0 disagreements
- Actual: 0 and 0
- Result: pass
- Spec source: R-037 quote
- Test: `.sdlc/slices/S-012/verification/r0/tests/contract-0/judge.verify-contract.test.mjs:172`

corpus:
```
corpus samples=95 non-return=0; judge disagrees with git oracle on 0
```

## TC-contract-13 (VS-3): Property: ref_format_error equals git (1000 runs)

- Given: judge and ref_format_error loaded by path in python3 -I
- When: the function is called with the inputs named in the title
- Then: 0 violations
- Expected: 0 violations
- Actual: 0 violations
- Result: pass
- Spec source: R-037 quote
- Test: `.sdlc/slices/S-012/verification/r0/tests/contract-0/judge.verify-contract.test.mjs:183`

ref_format_error:
```
property-run ref_format_error seed=12012 runs=1000 violations=0
```

## TC-contract-14 (VS-3): No dependence on cwd or repo (cwd /, /var/empty, TMPDIR)

- Given: judge and ref_format_error loaded by path in python3 -I
- When: the function is called with the inputs named in the title
- Then: same verdicts
- Expected: same verdicts
- Actual: as expected
- Result: pass
- Spec source: plan approach
- Test: `.sdlc/slices/S-012/verification/r0/tests/contract-0/judge.verify-contract.test.mjs:196`

## TC-contract-15 (VS-4): Forge label wins over git ref check; bad regex plus invalid ref gives git rule; no rules still checks

- Given: judge and ref_format_error loaded by path in python3 -I
- When: the function is called with the inputs named in the title
- Then: per notes
- Expected: per notes
- Actual: as expected
- Result: pass
- Spec source: ADR f284; R-037 quote
- Test: `.sdlc/slices/S-012/verification/r0/tests/contract-0/judge.verify-contract.test.mjs:204`

## TC-contract-16 (VS-5): validate_format messages equal main for 18 formats

- Given: judge and ref_format_error loaded by path in python3 -I
- When: the function is called with the inputs named in the title
- Then: equal
- Expected: equal
- Actual: equal
- Result: pass
- Spec source: plan: existing messages stay
- Test: `.sdlc/slices/S-012/verification/r0/tests/contract-0/judge.verify-contract.test.mjs:212`

## TC-contract-17 (VS-5): Property: validate_format has no exception outcome and equals main (1000 runs)

- Given: judge and ref_format_error loaded by path in python3 -I
- When: the function is called with the inputs named in the title
- Then: 0 violations, 0 diffs
- Expected: 0 violations, 0 diffs
- Actual: 0 and 0
- Result: pass
- Spec source: plan: existing messages stay
- Test: `.sdlc/slices/S-012/verification/r0/tests/contract-0/judge.verify-contract.test.mjs:218`

validate_format:
```
property validate_format: seed=12012 runs=1000 violations=0
property-run validate_format vs main seed=12012 runs=1000 diffs=0
```

## TC-contract-18 (VS-5): git missing from PATH: validate_format message equals main

- Given: judge and ref_format_error loaded by path in python3 -I
- When: the function is called with the inputs named in the title
- Then: Fail 'cannot check the branch format ...: [Errno 2] ... git'
- Expected: Fail 'cannot check the branch format ...: [Errno 2] ... git'
- Actual: equal to main
- Result: pass
- Spec source: plan: existing messages stay
- Test: `.sdlc/slices/S-012/verification/r0/tests/contract-0/judge.verify-contract.test.mjs:227`

no git:
```
Fail: cannot check the branch format 'sdlc/{name}' with git check-ref-format: [Errno 2] No such file or directory: 'git'
```

## TC-contract-19 (VS-5): Imports unchanged against main

- Given: judge and ref_format_error loaded by path in python3 -I
- When: the function is called with the inputs named in the title
- Then: same import list
- Expected: same import list
- Actual: argparse,json,os,re,subprocess,sys,datetime
- Result: pass
- Spec source: plan
- Test: `.sdlc/slices/S-012/verification/r0/tests/contract-0/judge.verify-contract.test.mjs:245`

## Attacks

None.

## Seeds

- judge: first failing rule without a label is overwritten by the next failing rule. judge uses 'failed is None' to detect the first failure. A failing rule with no label stores None, so a later failing rule replaces it. A forge rule always has a label, so this is low risk. (`skills/sdlc/branches.py`)
- judge and ref_format_error raise Fail or TypeError for NUL, lone surrogate and non-string samples. NUL and lone surrogate raise Fail ('embedded null byte', a utf-8 encode error). None, int, list, dict, bool and float raise TypeError. Callers pass strings built from a validated format, so this is low risk. A NUL sample could give a fail verdict instead. (`skills/sdlc/branches.py`)
- judge: a rule with a missing kind gets the note 'unknown kind None'. The note is accurate but unhelpful. Low risk. (`skills/sdlc/branches.py`)
