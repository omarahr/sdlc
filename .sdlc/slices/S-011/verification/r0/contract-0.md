# verify-contract: S-011 round 0 part 0

- Slice: S-011
- Profile: contract
- Round: 0
- Commit: fd13f4a
- Verdict: all 13 cases pass; 4 seeds

## Environment
Python 3.14.7 (python3 -I), Node test runner, macOS; seeded property toolkit; no network

## Surface
`evaluate(rule, sample)` and `regex_error(pattern)` exist as the spec defines. Other exports belong to earlier slices. Full listing: `.sdlc/slices/S-011/verification/r0/logs/contract-0-surface.txt`.

## TC-contract-1 (VS-1): starts_with, ends_with and contains match a reference model
- Given: 1500 generated (kind, pattern, sample, negate) with case pairs, dotless i, sharp s, combining marks and emoji
- When: evaluate(rule, sample)
- Then: equals the JS startsWith/endsWith/includes result, flipped by negate
- Actual: 1500 runs, 0 violations
- Result: pass
- Spec source: R-033 acceptance; R-095 acceptance
- Test: `.sdlc/slices/S-011/verification/r0/tests/contract-0/evaluate.verify-contract.test.mjs:23`

```text
property text-operators: seed=3741308202 runs=1500 violations=0 (log: .sdlc/slices/S-011/verification/r0/logs/contract-0-run.txt)
```

## TC-contract-2 (VS-1): Spec and plan examples are case-sensitive and handle empty strings
- Given: the plan examples plus empty pattern, empty sample, pattern equal to sample, ı vs I, ß vs SS
- When: evaluate each
- Then: Feature/ vs feature/x False; -E2E vs e2e False; Feature in feature/x False; empty pattern True; ı and ß never fold
- Actual: 30 fixed cases all as expected
- Result: pass
- Spec source: R-095 acceptance; R-033 acceptance
- Test: `.sdlc/slices/S-011/verification/r0/tests/contract-0/evaluate.verify-contract.test.mjs:40`

```text
verify contract: fixed examples from the spec and the plan: pass (30 cases)
```

## TC-contract-3 (VS-2): regex rule uses search, not match
- Given: regex rules ^sdlc/, S-001, ^S-001 on sdlc/S-001; 1500 generated escaped literals with ^, $ or no anchor
- When: evaluate
- Then: True, True, False; generated results equal startswith/endswith/includes
- Actual: examples pass; 1500 runs, 0 violations
- Result: pass
- Spec source: R-033 acceptance
- Test: `.sdlc/slices/S-011/verification/r0/tests/contract-0/evaluate.verify-contract.test.mjs:99`

```text
property regex-search: seed=3741308204 runs=1500 violations=0
```

## TC-contract-4 (VS-2): Uncompilable patterns give None
- Given: patterns (, [a-, a lone backslash and 20 other bad patterns, negate true and false
- When: evaluate
- Then: return None, no raise
- Actual: examples and 400 generated runs: all None
- Result: pass
- Spec source: R-072 acceptance
- Test: `.sdlc/slices/S-011/verification/r0/tests/contract-0/evaluate.verify-contract.test.mjs:119`

```text
property bad-regex: seed=3741308205 runs=400 violations=0
```

## TC-contract-5 (VS-2): A huge repeat count raises OverflowError, not None
- Given: pattern x{99999999999999999999}
- When: evaluate(regex rule, x)
- Then: None, because re.compile rejects the pattern (R-072: a bad regex gives null)
- Actual: raises OverflowError: the repetition number is too large. RecursionError also escapes for 100000 nested groups. The plan and the spec say only re.error is caught, so this is recorded as an observation and a seed, not a failure.
- Result: pass
- Spec source: R-072 acceptance (not in scope per plan: evaluate catches only re.error)
- Test: `.sdlc/slices/S-011/verification/r0/tests/contract-0/evaluate.verify-contract.test.mjs:135`

```text
see .sdlc/slices/S-011/verification/r0/logs/contract-0-hostile.txt
```

## TC-contract-6 (VS-3): Negate flips booleans for all four kinds and keeps None
- Given: 1500 generated matching and non-matching rules of all four kinds; negated uncompilable regex
- When: evaluate with negate true and false
- Then: negated value is the boolean opposite; None stays None
- Actual: 1500 runs, 0 violations; negated ( gives None
- Result: pass
- Spec source: R-034 acceptance
- Test: `.sdlc/slices/S-011/verification/r0/tests/contract-0/evaluate.verify-contract.test.mjs:77`

```text
property negate: seed=3741308203 runs=1500 violations=0
```

## TC-contract-7 (VS-3): Non-boolean negate values follow truthiness and never raise
- Given: negate in 0, 1, null, "x", "", [], [1], {}, -1 and absent
- When: evaluate on match, non-match and bad regex
- Then: flip by Python truthiness; bad regex stays None
- Actual: all as expected
- Result: pass
- Spec source: R-034 acceptance
- Test: `.sdlc/slices/S-011/verification/r0/tests/contract-0/evaluate.verify-contract.test.mjs:150`

```text
verify contract: negate with non-boolean values follows truthiness and never raises: pass
```

## TC-contract-8 (VS-4): Unknown or malformed kind gives None, prints nothing
- Given: kinds equals, empty, Starts_With, STARTS_WITH, regexp, padded names, null, 5, list, absent, with negate true and false
- When: evaluate
- Then: None, empty stdout and stderr, no exception
- Actual: 23 calls all None, no output
- Result: pass
- Spec source: ADR-6e23
- Test: `.sdlc/slices/S-011/verification/r0/tests/contract-0/evaluate.verify-contract.test.mjs:141`

```text
verify contract: unknown or malformed kind gives None and never raises: pass
```

## TC-contract-9 (VS-4): evaluate is deterministic, writes nothing and does not mutate the rule
- Given: 50 repeated calls in a clean scratch cwd; a rule dict compared before and after
- When: evaluate twice
- Then: same output; scratch directory empty; rule unchanged
- Actual: identical; no files; unchanged
- Result: pass
- Spec source: ADR-6e23 (no side effects)
- Test: `.sdlc/slices/S-011/verification/r0/tests/contract-0/evaluate.verify-contract.test.mjs:165`

```text
verify contract: evaluate is deterministic, pure and writes nothing: pass
```

## TC-contract-10 (VS-4): Non-string pattern, sample or rule raises (observation)
- Given: pattern or sample None, 5 or list; rule None or a string; absent pattern
- When: evaluate
- Then: observation only: the slice promises None for an unknown kind only
- Actual: raises TypeError or AttributeError in 12 of 14 cases; contains with a list sample returns True; NUL, emoji and lone surrogate inputs work
- Result: pass
- Spec source: observation, not in scope
- Test: `.sdlc/slices/S-011/verification/r0/tests/contract-0/evaluate.verify-contract.test.mjs:180`

```text
see .sdlc/slices/S-011/verification/r0/logs/contract-0-hostile.txt
```

## TC-contract-11 (VS-2): Nested quantifiers on a 28 character sample finish
- Given: pattern (a+)+$ on a*27 + !
- When: evaluate in a fresh python3 -I
- Then: returns
- Actual: returns False in 4.8 s; time doubles per extra character, so 33 characters would take minutes (plan adds no timeout)
- Result: pass
- Spec source: observation, not in scope
- Test: `.sdlc/slices/S-011/verification/r0/tests/contract-0/evaluate.verify-contract.test.mjs:214`

```text
backtracking (a+)+$ on a*27+! : status=0 stdout=False ms=4786
```

## TC-contract-12 (VS-5): regex_error returns the re.error text or None
- Given: bad: ( [a- \ ) * a{2,1} (?P<n [z-a]; good: ^a, empty, a|b, \d+, .*, (?i)x
- When: regex_error(p)
- Then: non-empty string equal to str(re.error) for bad; None for good; evaluate gives None for the same bad patterns
- Actual: all equal to the str of the re.error from python3 -I
- Result: pass
- Spec source: R-072 acceptance; ADR-b582
- Test: `.sdlc/slices/S-011/verification/r0/tests/contract-0/evaluate.verify-contract.test.mjs:222`

```text
verify contract: regex_error text equals the re.error text evaluate hides, None for good patterns: pass
```

## TC-contract-13 (VS-5): regex_error None exactly when evaluate gives a boolean
- Given: 1500 generated pattern strings from regex metacharacters, NUL and é
- When: regex_error and evaluate on each
- Then: regex_error is None iff evaluate is not None; neither raises
- Actual: 1500 runs, 0 violations
- Result: pass
- Spec source: R-072 acceptance
- Test: `.sdlc/slices/S-011/verification/r0/tests/contract-0/evaluate.verify-contract.test.mjs:235`

```text
property regex-error: seed=3741308206 runs=1500 violations=0
```

## Attacks
None.

## Seeds
- evaluate raises OverflowError and RecursionError for some regex patterns: x{99999999999999999999} raises OverflowError and 100000 nested groups raise RecursionError out of evaluate and regex_error on Python 3.14. The plan accepts this (only re.error is caught). S-012 and S-013 must catch them or the pre-flight crashes. A forge RE2 ruleset never holds such a pattern, so the risk is low. A bare except Exception around compile would give None. (`skills/sdlc/branches.py`)
- evaluate raises on non-string pattern, sample or rule: None or number patterns and samples raise TypeError or AttributeError; contains with a list sample returns True. The slice promises None for an unknown kind only. read_rules (S-014) must make rules with string patterns. (`skills/sdlc/branches.py`)
- regex rules have no time limit: (a+)+$ on 27 a characters then ! takes 4.8 s and doubles per character. Branch samples are short and rule patterns come from the forge, so the risk is low. (`skills/sdlc/branches.py`)
- one 120 s timeout in the first run of the hostile-input test did not reproduce: The first run of the non-string test hit the 120 s pycall limit. Two later runs of the same payload finished in 40 ms each, alone and in the full file. The cause is unknown and probably host load. No claim is made about it. (`.sdlc/slices/S-011/verification/r0/tests/contract-0/evaluate.verify-contract.test.mjs`)
