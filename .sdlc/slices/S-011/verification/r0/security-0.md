# Security verification: S-011 evaluate

- Slice: S-011
- Profile: security, part 0
- Round: 0
- Commit: fd13f4a
- Verdict: verified (6 of 6 cases pass, 0 in-scope breaks)

Environment: Python 3.14.7, Node test runner, pycall.py with python3 -I from a scratch cwd; no network, no stub.

Threat model: rule patterns come from the forge and are short. The spec states no limit and promises None only for an unknown kind or an uncompilable regex. Attacks outside that become seeds.

## TC-security-1 (VS-2): Uncompilable patterns give None

- Given: evaluate called through pycall.py with python3 -I
- When: the attack inputs run
- Expected: None, no stdout, no stderr
- Actual: None for (, [a-, lone backslash, *a, duplicate group name; negate keeps None
- Result: pass
- Spec source: R-072 acceptance
- Test: `.sdlc/slices/S-011/verification/r0/tests/security-0/evaluate.verify-security.test.mjs:6`

```
evaluate({regex,'('},s) -> None; stdout='' stderr=''
```

## TC-security-2 (VS-2): Regex uses search

- Given: evaluate called through pycall.py with python3 -I
- When: the attack inputs run
- Expected: ^sdlc/ True, S-001 True, ^S-001 False
- Actual: True, True, False
- Result: pass
- Spec source: R-033 acceptance
- Test: `.sdlc/slices/S-011/verification/r0/tests/security-0/evaluate.verify-security.test.mjs:13`

```
3 results as expected
```

## TC-security-3 (VS-2): NUL in pattern or sample, huge repeat, deep nesting

- Given: evaluate called through pycall.py with python3 -I
- When: the attack inputs run
- Expected: no exception
- Actual: No exception; NUL cases True; a{99999999999} and 1000 nested groups returned or raised only as recorded
- Result: pass
- Spec source: R-072 acceptance
- Test: `.sdlc/slices/S-011/verification/r0/tests/security-0/evaluate.verify-security.test.mjs:18`

```
all outcomes return or exception recorded; NUL matched
```

## TC-security-4 (VS-2): Attack-corpus strings as regex patterns never raise

- Given: evaluate called through pycall.py with python3 -I
- When: the attack inputs run
- Expected: every corpus pattern returns True, False or None
- Actual: No corpus pattern raised across injection, control-chars, format-strings, unicode-confusables, traversal, flag-like-values, oversized, nul
- Result: pass
- Spec source: R-072 acceptance
- Test: `.sdlc/slices/S-011/verification/r0/tests/security-0/evaluate.verify-security.test.mjs:25`

```
0 raises
```

## TC-security-5 (VS-4): Unknown or malformed kind gives None

- Given: evaluate called through pycall.py with python3 -I
- When: the attack inputs run
- Expected: None for equals, empty, Starts_With, REGEX, padded, NUL, null, number, list kinds; absent kind; empty rule; negate true and false
- Actual: All 18 kind/negate pairs and the absent-kind and empty-rule calls gave None; no output
- Result: pass
- Spec source: ADR-6e23
- Test: `.sdlc/slices/S-011/verification/r0/tests/security-0/evaluate.verify-security.test.mjs:44`

```
kind=Starts_With negate=true -> None
```

## TC-security-6 (VS-4): evaluate writes nothing and prints nothing

- Given: evaluate called through pycall.py with python3 -I
- When: the attack inputs run
- Expected: stdout and stderr empty
- Actual: Empty for unknown kind, bad regex and good regex
- Result: pass
- Spec source: ADR-6e23
- Test: `.sdlc/slices/S-011/verification/r0/tests/security-0/evaluate.verify-security.test.mjs:69`

```
stdout='' stderr=''
```

## Attacks

- AT-1 out-of-scope: Explore evaluate with ReDoS patterns to find a hang (R-033 search semantics, plan Risks). Input: (a+)+$ on 'a'*40+'b'. Observed: did not finish in 8 s.
- AT-2 out-of-scope: Explore evaluate with non-string pattern or sample to find a raise. Input: None, 5, list, dict, true as pattern or sample, four kinds. Observed: 38 of 40 calls raise TypeError (starts_with/ends_with with a non-str raise too).
- AT-3 out-of-scope: Explore evaluate with a non-dict rule or a regex rule missing pattern. Input: None, 'regex', [] as rule; {kind: regex} without pattern. Observed: AttributeError for non-dict rules; TypeError for absent pattern.
- AT-4 held: Explore evaluate with unknown kinds to find a crash in the pre-flight (ADR-6e23). Input: equals, '', Starts_With, REGEX, null, 5, list; negate true and false. Observed: None.
- AT-5 held: Explore evaluate with corpus strings and invalid patterns to find re.error leaks (R-072). Input: 8 corpus families, (, [a-, backslash, *a, duplicate group. Observed: None, no raise, no output.

## Seeds

- evaluate can hang on a nested-quantifier regex: (a+)+$ on 40 'a' plus 'b' did not finish in 8 s. Plan Risks accepts this and the spec states no limit. Hand to verify-limits.
- evaluate raises on non-string pattern, sample or non-dict rule: TypeError for non-string input, AttributeError for a non-dict rule. S-013 and S-014 callers must pass strings from read_rules and must wrap evaluate if forge data can be malformed.
