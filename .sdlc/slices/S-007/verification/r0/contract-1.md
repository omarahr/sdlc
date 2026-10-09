# S-007 contract-1, round 0

Slice: S-007. Profile: contract. Round: 0. Commit: ca640fc. Verdict: pass (6 of 6 cases).

Environment: Python 3.14.7, node test runner, branch sdlc/S-007 in a scratch worktree, python3 -I.

Surface: parse(fmt, branch, ids=None) is the only new export. PARSE_ROWS and INTEGER_PARTS are module constants.

## TC-contract-1 (VS-7): parse equals a spec reference model on random formats, branches and ledgers

- Given: Formats from 5 prefixes, 4 suffixes and both placeholders; tails built from the 8 rows, their case variants, newlines, NUL, non-ASCII digits and junk; ids as list, tuple, iterator or absent.
- When: parse runs 5000 times per seed for seeds 20261010, 7 and 99, and a model written from the section 2 table runs on the same input.
- Then: Both give the same result, or both give None.
- Expected: 0 differences
- Actual: 0 differences in 15000 runs; every kind and null occurred (null 2678, verify 409, attempt 355, e2e 338, milestone 377, run 305, e2e-area 291, slice 202, state 45 for seed 20261010)
- Result: pass
- Spec source: R-021, R-022, R-023 acceptance
- Test: .sdlc/slices/S-007/verification/r0/tests/contract-1/parse-hostile.verify-contract.test.mjs:18
- Command: VERIFY_BRANCHES=<worktree>/skills/sdlc/branches.py node --test .sdlc/slices/S-007/verification/r0/tests/contract-1/parse-hostile.verify-contract.test.mjs

Evidence (property-run): reference-model property
```
property=parse equals model; seeds=20261010,7,99; runs=5000 each; result=pass; shrunk counterexample=none (no shrinking)
```

Evidence (log): run log
```
see .sdlc/slices/S-007/verification/r0/logs/contract-1-run.txt
```

## TC-contract-2 (VS-7): A non-string branch, NUL, a lone surrogate, an empty or short branch and a prefix and suffix overlap give None and do not raise

- Given: Branch values None, 5, 5.5, bytes, list, dict, True, a class, NUL in the tail and in the prefix, a lone surrogate, '', 'sdl', 'sdlc/', and format ab{name}ba with aba and abba.
- When: parse runs on each.
- Then: None, no exception.
- Expected: None for all
- Actual: None for all 21 inputs
- Result: pass
- Spec source: R-021 quote
- Test: .sdlc/slices/S-007/verification/r0/tests/contract-1/parse-hostile.verify-contract.test.mjs:38
- Command: VERIFY_BRANCHES=<worktree>/skills/sdlc/branches.py node --test .sdlc/slices/S-007/verification/r0/tests/contract-1/parse-hostile.verify-contract.test.mjs

Evidence (log): run log
```
see .sdlc/slices/S-007/verification/r0/logs/contract-1-run.txt
```

## TC-contract-3 (VS-7): A trailing newline follows the spec regex text

- Given: sdlc/run-2, sdlc/S-001, sdlc/M-1 and sdlc/S-001-v0-cli-0, each with one final newline; a final newline after a literal suffix; two final newlines.
- When: parse runs under the default format and under sdlc/{name}-wip.
- Then: The row regex uses re.search and $, which matches before a final newline. The spec gives the regex text, so the branch classifies and tail keeps the newline. A newline after the suffix gives None. Two newlines give None.
- Expected: as the spec regex text
- Actual: run n=2, slice S-001, milestone M-1 and verify classified with tail ending in a newline; newline after suffix None; double newline None
- Result: pass
- Spec source: R-022 quote (regex text), R-021
- Test: .sdlc/slices/S-007/verification/r0/tests/contract-1/parse-hostile.verify-contract.test.mjs:47
- Command: VERIFY_BRANCHES=<worktree>/skills/sdlc/branches.py node --test .sdlc/slices/S-007/verification/r0/tests/contract-1/parse-hostile.verify-contract.test.mjs

Evidence (transcript): parse of sdlc/run-2\n
```
parse('sdlc/{name}','sdlc/run-2\n') -> {'kind':'run','tail':'run-2\n','n':2,'known':None}
```

## TC-contract-4 (VS-7): Non-ASCII digits match the digit groups, with no ASCII flag

- Given: sdlc/run-<ARABIC-INDIC 3>, sdlc/run-<FULLWIDTH 2>, a verify tail with Arabic-Indic round and part, a state tail with 14 Arabic-Indic digits.
- When: parse runs.
- Then: The regexes use \d without re.ASCII, as the spec text gives, so each classifies; int() converts n, round and part.
- Expected: classified as the spec regex text
- Actual: run n=3, run n=2, verify round 0 part 1, state ts kept as text
- Result: pass
- Spec source: R-022 quote (regex text)
- Test: .sdlc/slices/S-007/verification/r0/tests/contract-1/parse-hostile.verify-contract.test.mjs:54
- Command: VERIFY_BRANCHES=<worktree>/skills/sdlc/branches.py node --test .sdlc/slices/S-007/verification/r0/tests/contract-1/parse-hostile.verify-contract.test.mjs

Evidence (transcript): non-ASCII digits
```
parse('sdlc/{name}','sdlc/run-\u0663') -> {'kind':'run','tail':'run-\u0663','n':3,'known':None}
```

## TC-contract-5 (VS-7): Unicode case folding under {name:lower} does not raise

- Given: Kelvin sign, long s (U+017F), dotted capital I in the prefix and in the branch, sharp capital S, upper-case prefix.
- When: parse runs under sdlc/{name:lower}.
- Then: No exception.
- Expected: no exception
- Actual: no exception; U+017F matches S under re.IGNORECASE, so sdlc/<U+017F>-001 is a slice (spec says IGNORECASE; seed)
- Result: pass
- Spec source: R-022 acceptance
- Test: .sdlc/slices/S-007/verification/r0/tests/contract-1/parse-hostile.verify-contract.test.mjs:62
- Command: VERIFY_BRANCHES=<worktree>/skills/sdlc/branches.py node --test .sdlc/slices/S-007/verification/r0/tests/contract-1/parse-hostile.verify-contract.test.mjs

Evidence (log): run log
```
see .sdlc/slices/S-007/verification/r0/logs/contract-1-run.txt
```

## TC-contract-6 (VS-7): Long tails of 40000 characters finish in bounded time

- Given: 14 tails of 40000 characters aimed at rows 4 to 8.
- When: parse runs and the time is recorded.
- Then: Each call ends in under 5 seconds. The spec states no limit.
- Expected: under 5 s
- Actual: slowest 1979 ms (quadratic growth on row 6: 2000 chars 2.9 ms, 4000 chars 11.4 ms, 8000 chars 45.5 ms)
- Result: pass
- Spec source: none (spec states no limit; seed)
- Test: .sdlc/slices/S-007/verification/r0/tests/contract-1/parse-hostile.verify-contract.test.mjs:69
- Command: VERIFY_BRANCHES=<worktree>/skills/sdlc/branches.py node --test .sdlc/slices/S-007/verification/r0/tests/contract-1/parse-hostile.verify-contract.test.mjs

Evidence (measurement): row 6 backtracking
```
tail a-v1- repeated, then '!':
2000 chars 2.9 ms
4000 chars 11.4 ms
8000 chars 54.9 ms
40000 chars about 1100 ms (lower: 1979 ms)
```

## Attacks

None. The security profile covers attacks.

## Seeds

- parse raises ValueError for a run number of more than 4300 digits: sdlc/run-<5000 digits> matches row 1; int() then raises ValueError (Python digit limit). The parse command would end with a traceback. The spec states no limit on n. A loop branch never holds such a number. (skills/sdlc/branches.py)
- parse raises AttributeError for non-string ledger ids under {name:lower}: ids=[5,'S-001'] or [None] under a lower format raises AttributeError on candidate.lower(). Under a plain format a non-string compares unequal and does not raise. A bare string as ids iterates characters and gives known false. ids=5 raises TypeError. The spec says ids holds ledger ids, so these inputs are out of contract. (skills/sdlc/branches.py)
- row 6 regex backtracks quadratically on long tails: A tail of the form a-v1-a-v1-... followed by '!' costs about 45 ms at 8000 characters and about 1.1 s at 40000. A git branch name is far shorter in practice. No limit in the spec. (skills/sdlc/branches.py)
- non-ASCII digits and a trailing newline classify: sdlc/run-<ARABIC-INDIC 3> gives run n=3. sdlc/run-2<LF> gives run n=2 with tail run-2<LF>. Both follow the spec regex text (no re.ASCII, re.search with $), but a stricter reader may want them rejected. A decision for the spec owner. (skills/sdlc/branches.py)
- U+017F and the Kelvin sign fold under re.IGNORECASE: Under {name:lower}, sdlc/<U+017F>-001 classifies as slice with id <U+017F>-001, since IGNORECASE matches U+017F to s. The prefix and suffix compare uses str.lower(), which folds differently from the regex. Follows the spec text. (skills/sdlc/branches.py)
