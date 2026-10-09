# S-011 · evaluate applies one rule to a sample
Verdict: RELEASED
Commit under test: fd13f4a · Rounds: 1 · Attempts: 2 (escalation step 1) · Risk: medium · Written: 2026-10-10

| Requirements | Scenarios | Cases | Passed | Failed | Blocked | Blocking defects found / fixed | Open seeds |
|---|---|---|---|---|---|---|---|
| 4 | 5 | 19 | 19 | 0 | 0 | 0 / 0 | 15 |

## Summary
The slice adds `evaluate(rule, sample)` and `regex_error(pattern)` to `skills/sdlc/branches.py`. `evaluate` applies one branch rule to one sample and returns `True`, `False` or `None`. The four operators are case-sensitive. `negate` flips a boolean and keeps `None`. A regex that does not compile gives `None`. The contract and security profiles ran 19 cases at the Python function boundary, and all passed in round 0. The spec-fidelity, regression and gate checks held, and no verifier or review found a blocking defect. The plan needed three revisions and one escalation, because R-026 sat in the wrong slice and moved to S-014. Fifteen non-blocking seeds stay open. Most of them are about inputs the spec does not define.

## Open risks
- `evaluate` and `regex_error` raise `OverflowError` or `RecursionError` for some patterns, for example `x{99999999999999999999}`. The spec catches only `re.error`. S-012 and S-013 must catch these errors, or the pre-flight can crash.
- `evaluate` raises `TypeError` or `AttributeError` for a non-string pattern or sample, a missing pattern, or a non-dict rule (12 of 14 and 38 of 40 probed calls). S-013 and S-014 must give it string patterns, or wrap the call.
- A regex with nested quantifiers has no time limit. `(a+)+$` on 27 `a` characters then `!` took 4.8 s, and the time doubles per character. A 40 character sample did not finish in 8 s. The plan accepts this risk, because patterns come from the forge.
- Python `re` and the forge RE2 differ for rare patterns. A pattern Python compiles but the forge rejects can give a wrong verdict. The spec accepts this.
- `evaluate` returns `None` for an unknown kind and does not write the "cannot evaluate" note. S-012 owns the note (ADR-20261009-191800-decision-judge-S-011-b582).
- R-026 is not in this slice. It moved to S-014.
- One 120 s timeout in the first run of a hostile-input verifier test did not reproduce. The cause is unknown.

## Traceability
| Requirement | Spec says | Scenarios | Cases | Result |
|---|---|---|---|---|
| R-033 | "`starts_with`: `sample.startswith(pattern)`; `ends_with`: `sample.endswith(pattern)`; `contains`: `pattern in sample`; all case-sensitive, as git refs are. … `regex`: `re.search(pattern, sample) is not None`." | VS-1, VS-2 | TC-contract-1, TC-contract-2, TC-contract-3, TC-security-2 | pass |
| R-095 | "`starts_with`: `sample.startswith(pattern)`; `ends_with`: `sample.endswith(pattern)`; `contains`: `pattern in sample`; all case-sensitive, as git refs are. …" | VS-1 | TC-contract-1, TC-contract-2 | pass |
| R-034 | "`negate` flips `True` and `False`; `None` stays `None`." | VS-3 | TC-contract-6, TC-contract-7 | pass |
| R-072 | "`evaluate follows each operator, negate flips, and a bad regex gives null`." | VS-2, VS-5 | TC-contract-4, TC-contract-12, TC-contract-13, TC-security-1 | pass |

The committed tests in `skills/sdlc/test/branches.test.mjs` (tests.md):
- T-R-033a `each operator follows its definition` (R-033): `skills/sdlc/test/branches.test.mjs:1423`
- T-R-033b `starts_with is case-sensitive` (R-033): `skills/sdlc/test/branches.test.mjs:1435`
- T-R-033c `regex uses search, not match` (R-033): `skills/sdlc/test/branches.test.mjs:1439`
- T-R-095a `ends_with is case-sensitive` (R-095): `skills/sdlc/test/branches.test.mjs:1448`
- T-R-095b `contains is case-sensitive` (R-095): `skills/sdlc/test/branches.test.mjs:1456`
- T-R-034a `negate flips a boolean` (R-034): `skills/sdlc/test/branches.test.mjs:1464`
- T-R-034b `negate keeps None` (R-034): `skills/sdlc/test/branches.test.mjs:1472`
- T-U-001 `an unknown kind gives None and does not raise` (ADR-6e23): `skills/sdlc/test/branches.test.mjs:1480`
- T-U-002 `regex_error gives the compile error` (ADR-b582): `skills/sdlc/test/branches.test.mjs:1488`
- T-R-072a `evaluate follows each operator, negate flips, and a bad regex gives null` (R-072): `skills/sdlc/test/branches.test.mjs:1496`

The spec-fidelity verifier ran `node --test skills/sdlc/test/branches.test.mjs`: 84 pass, 0 fail. The gate ran `npm test` at fd13f4a: 560 passed, 0 failed, 1 skipped.

## Scenarios
Round 0 ran all 19 cases at commit fd13f4a. No fix round followed, so each result is the round 0 result. Test paths under `.sdlc/slices/S-011/verification/` are the verifier tests. The retention prune can remove them after merge.

### VS-1 · Each text operator follows its definition and is case-sensitive
Profiles: contract. Risk: a wrong operator or a case fold launches names that a rule rejects.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-contract-1 | The three text operators match a reference model over 1500 generated inputs | PASS | `.sdlc/slices/S-011/verification/r0/tests/contract-0/evaluate.verify-contract.test.mjs:23` |
| TC-contract-2 | Spec and plan examples are case-sensitive and handle empty strings | PASS | `.sdlc/slices/S-011/verification/r0/tests/contract-0/evaluate.verify-contract.test.mjs:40` |

<details>
<summary>Case detail (2 cases)</summary>

#### TC-contract-1 · starts_with, ends_with and contains match a reference model · PASS
- **Given** 1500 generated (kind, pattern, sample, negate) inputs with case pairs, dotless i, sharp s, combining marks and emoji. **When** `evaluate(rule, sample)` runs. **Then** the result equals the JS `startsWith`, `endsWith` or `includes` result, flipped by `negate`.
- **Expected** equal to the reference. **Actual** 1500 runs, 0 violations.
- **Spec source:** R-033 acceptance, R-095 acceptance · **Run:** `node --test .sdlc/slices/S-011/verification/r0/tests/contract-0/evaluate.verify-contract.test.mjs`
```text
property text-operators: seed=3741308202 runs=1500 violations=0
```

#### TC-contract-2 · Spec and plan examples are case-sensitive and handle empty strings · PASS
- **Given** the plan examples, an empty pattern, an empty sample, a pattern equal to the sample, and the pairs ı and I, ß and SS. **When** `evaluate` runs on each. **Then** `Feature/` on `feature/x` is `False`, `-E2E` on `e2e` is `False`, `Feature` in `feature/x` is `False`, an empty pattern is `True`, and ı and ß never fold.
- **Expected** as stated. **Actual** 30 fixed cases as expected.
- **Spec source:** R-095 acceptance, R-033 acceptance · **Run:** same command as TC-contract-1
```text
verify contract: fixed examples from the spec and the plan: pass (30 cases)
```

</details>

### VS-2 · A regex rule uses search and an uncompilable pattern gives None
Profiles: contract, security. Risk: `match` in place of `search`, or a raised `re.error`, gives a wrong verdict or a crash.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-contract-3 | Regex uses search, not match | PASS | `.sdlc/slices/S-011/verification/r0/tests/contract-0/evaluate.verify-contract.test.mjs:99` |
| TC-contract-4 | Uncompilable patterns give None | PASS | `.sdlc/slices/S-011/verification/r0/tests/contract-0/evaluate.verify-contract.test.mjs:119` |
| TC-contract-5 | A huge repeat count raises OverflowError, not None (observation) | PASS | `.sdlc/slices/S-011/verification/r0/tests/contract-0/evaluate.verify-contract.test.mjs:135` |
| TC-contract-11 | Nested quantifiers on a 28 character sample finish (observation) | PASS | `.sdlc/slices/S-011/verification/r0/tests/contract-0/evaluate.verify-contract.test.mjs:214` |
| TC-security-1 | Uncompilable patterns give None, with no output | PASS | `.sdlc/slices/S-011/verification/r0/tests/security-0/evaluate.verify-security.test.mjs:10` |
| TC-security-2 | Regex uses search | PASS | `.sdlc/slices/S-011/verification/r0/tests/security-0/evaluate.verify-security.test.mjs:15` |
| TC-security-3 | NUL in pattern or sample, huge repeat, deep nesting raise no unrecorded exception | PASS | `.sdlc/slices/S-011/verification/r0/tests/security-0/evaluate.verify-security.test.mjs:20` |
| TC-security-4 | Attack-corpus strings as patterns never raise | PASS | `.sdlc/slices/S-011/verification/r0/tests/security-0/evaluate.verify-security.test.mjs:27` |

<details>
<summary>Case detail (8 cases)</summary>

#### TC-contract-3 · regex rule uses search, not match · PASS
- **Given** regex rules `^sdlc/`, `S-001` and `^S-001` on `sdlc/S-001`, and 1500 generated escaped literals with `^`, `$` or no anchor. **When** `evaluate` runs. **Then** the results are `True`, `True`, `False`, and the generated results equal the reference.
- **Expected** as stated. **Actual** examples pass; 1500 runs, 0 violations.
- **Spec source:** R-033 acceptance · **Run:** `node --test .sdlc/slices/S-011/verification/r0/tests/contract-0/evaluate.verify-contract.test.mjs`
```text
property regex-search: seed=3741308204 runs=1500 violations=0
```

#### TC-contract-4 · Uncompilable patterns give None · PASS
- **Given** the patterns `(`, `[a-`, a lone backslash and 20 other bad patterns, with `negate` true and false. **When** `evaluate` runs. **Then** it returns `None` and does not raise.
- **Expected** `None`. **Actual** examples and 400 generated runs all gave `None`.
- **Spec source:** R-072 acceptance · **Run:** same command as TC-contract-3
```text
property bad-regex: seed=3741308205 runs=400 violations=0
```

#### TC-contract-5 · A huge repeat count raises OverflowError, not None · PASS
- **Given** the pattern `x{99999999999999999999}`. **When** `evaluate` runs. **Then** the spec text suggests `None`, but the plan and spec catch only `re.error`.
- **Expected** observation only. **Actual** `OverflowError`; 100000 nested groups raise `RecursionError`. The case records an observation and a seed. It is not a failure.
- **Spec source:** R-072 acceptance (out of scope per plan) · **Run:** same command as TC-contract-3
- Evidence: `.sdlc/slices/S-011/verification/r0/logs/contract-0-hostile.txt`

#### TC-contract-11 · Nested quantifiers on a 28 character sample finish · PASS
- **Given** the pattern `(a+)+$` on `a` repeated 27 times then `!`, in a fresh `python3 -I`. **When** `evaluate` runs. **Then** it returns.
- **Expected** it returns. **Actual** `False` after 4.8 s. The time doubles per extra character.
- **Spec source:** observation, no spec number · **Run:** same command as TC-contract-3
```text
backtracking (a+)+$ on a*27+! : status=0 stdout=False ms=4786
```

#### TC-security-1 · Uncompilable patterns give None · PASS
- **Given** `evaluate` called through `pycall.py` with `python3 -I`. **When** the patterns `(`, `[a-`, a lone backslash, `*a` and a duplicate group name run. **Then** each gives `None` with no stdout and no stderr, and `negate` keeps `None`.
- **Expected** `None`. **Actual** `None` for all.
- **Spec source:** R-072 acceptance · **Run:** `node --test .sdlc/slices/S-011/verification/r0/tests/security-0/evaluate.verify-security.test.mjs`
```text
evaluate({regex,'('},s) -> None; stdout='' stderr=''
```

#### TC-security-2 · Regex uses search · PASS
- **Given** `evaluate` through `pycall.py`. **When** `^sdlc/`, `S-001` and `^S-001` run on `sdlc/S-001`. **Then** the results are `True`, `True`, `False`.
- **Expected** as stated. **Actual** as stated.
- **Spec source:** R-033 acceptance · **Run:** same command as TC-security-1

#### TC-security-3 · NUL in pattern or sample, huge repeat, deep nesting · PASS
- **Given** `evaluate` through `pycall.py`. **When** NUL inputs, `a{99999999999}` and 1000 nested groups run. **Then** no unrecorded exception occurs.
- **Expected** no exception. **Actual** NUL cases gave `True`; the huge repeat and deep nesting returned or raised only as the log records.
- **Spec source:** R-072 acceptance · **Run:** same command as TC-security-1

#### TC-security-4 · Attack-corpus strings as regex patterns never raise · PASS
- **Given** the attack corpus families injection, control-chars, format-strings, unicode-confusables, traversal, flag-like-values, oversized and nul. **When** each string runs as a pattern. **Then** the result is `True`, `False` or `None`.
- **Expected** no raise. **Actual** 0 raises.
- **Spec source:** R-072 acceptance · **Run:** same command as TC-security-1
```text
0 raises
```

</details>

### VS-3 · Negate flips True and False and keeps None
Profiles: contract. Risk: `negate` turns `None` into `True`, and a wrong `True` launches names that a rule rejects.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-contract-6 | Negate flips booleans for all four kinds and keeps None | PASS | `.sdlc/slices/S-011/verification/r0/tests/contract-0/evaluate.verify-contract.test.mjs:77` |
| TC-contract-7 | Non-boolean negate values follow truthiness and never raise | PASS | `.sdlc/slices/S-011/verification/r0/tests/contract-0/evaluate.verify-contract.test.mjs:150` |

<details>
<summary>Case detail (2 cases)</summary>

#### TC-contract-6 · Negate flips booleans for all four kinds and keeps None · PASS
- **Given** 1500 generated matching and non-matching rules of all four kinds, and a negated uncompilable regex. **When** `evaluate` runs with `negate` true and false. **Then** the negated value is the boolean opposite and `None` stays `None`.
- **Expected** as stated. **Actual** 1500 runs, 0 violations; negated `(` gives `None`.
- **Spec source:** R-034 acceptance · **Run:** `node --test .sdlc/slices/S-011/verification/r0/tests/contract-0/evaluate.verify-contract.test.mjs`
```text
property negate: seed=3741308203 runs=1500 violations=0
```

#### TC-contract-7 · Non-boolean negate values follow truthiness and never raise · PASS
- **Given** `negate` values 0, 1, null, "x", "", [], [1], {}, -1 and absent. **When** `evaluate` runs on a match, a non-match and a bad regex. **Then** the result flips by Python truthiness, and a bad regex stays `None`.
- **Expected** as stated. **Actual** as stated.
- **Spec source:** R-034 acceptance · **Run:** same command as TC-contract-6
```text
verify contract: negate with non-boolean values follows truthiness and never raises: pass
```

</details>

### VS-4 · An unknown or malformed rule never raises and gives None
Profiles: contract, security. Risk: a GitHub operator outside the four kinds crashes the pre-flight (ADR-6e23).

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-contract-8 | Unknown or malformed kind gives None and prints nothing | PASS | `.sdlc/slices/S-011/verification/r0/tests/contract-0/evaluate.verify-contract.test.mjs:141` |
| TC-contract-9 | evaluate is deterministic, writes nothing and does not change the rule | PASS | `.sdlc/slices/S-011/verification/r0/tests/contract-0/evaluate.verify-contract.test.mjs:165` |
| TC-contract-10 | Non-string pattern, sample or rule raises (observation) | PASS | `.sdlc/slices/S-011/verification/r0/tests/contract-0/evaluate.verify-contract.test.mjs:180` |
| TC-security-5 | Unknown or malformed kind gives None for 18 kind and negate pairs | PASS | `.sdlc/slices/S-011/verification/r0/tests/security-0/evaluate.verify-security.test.mjs:44` |
| TC-security-6 | evaluate writes nothing and prints nothing | PASS | `.sdlc/slices/S-011/verification/r0/tests/security-0/evaluate.verify-security.test.mjs:72` |

<details>
<summary>Case detail (5 cases)</summary>

#### TC-contract-8 · Unknown or malformed kind gives None, prints nothing · PASS
- **Given** the kinds `equals`, empty, `Starts_With`, `STARTS_WITH`, `regexp`, padded names, null, 5, a list and absent, with `negate` true and false. **When** `evaluate` runs. **Then** the result is `None`, with empty stdout and stderr.
- **Expected** `None`. **Actual** 23 calls, all `None`, no output.
- **Spec source:** ADR-6e23 · **Run:** `node --test .sdlc/slices/S-011/verification/r0/tests/contract-0/evaluate.verify-contract.test.mjs`
```text
verify contract: unknown or malformed kind gives None and never raises: pass
```

#### TC-contract-9 · evaluate is deterministic, writes nothing and does not change the rule · PASS
- **Given** 50 repeated calls in a clean scratch directory, and a rule dict compared before and after. **When** `evaluate` runs twice. **Then** the output is the same, the directory is empty and the rule is unchanged.
- **Expected** as stated. **Actual** as stated.
- **Spec source:** ADR-6e23 (no side effects) · **Run:** same command as TC-contract-8
```text
verify contract: evaluate is deterministic, pure and writes nothing: pass
```

#### TC-contract-10 · Non-string pattern, sample or rule raises (observation) · PASS
- **Given** a pattern or sample of `None`, 5 or a list, a rule of `None` or a string, and an absent pattern. **When** `evaluate` runs. **Then** the slice promises `None` for an unknown kind only, so the case records the outcome.
- **Expected** observation only. **Actual** `TypeError` or `AttributeError` in 12 of 14 cases; `contains` with a list sample returns `True`; NUL, emoji and lone surrogate inputs work.
- **Spec source:** observation, out of scope · **Run:** same command as TC-contract-8
- Evidence: `.sdlc/slices/S-011/verification/r0/logs/contract-0-hostile.txt`

#### TC-security-5 · Unknown or malformed kind gives None · PASS
- **Given** `evaluate` through `pycall.py`. **When** the kinds `equals`, empty, `Starts_With`, `REGEX`, padded, NUL, null, a number and a list run, plus an absent kind and an empty rule, with `negate` true and false. **Then** each gives `None`.
- **Expected** `None`. **Actual** all 18 kind and negate pairs and the two extra calls gave `None`, with no output.
- **Spec source:** ADR-6e23 · **Run:** `node --test .sdlc/slices/S-011/verification/r0/tests/security-0/evaluate.verify-security.test.mjs`
```text
kind=Starts_With negate=true -> None
```

#### TC-security-6 · evaluate writes nothing and prints nothing · PASS
- **Given** `evaluate` through `pycall.py`. **When** an unknown kind, a bad regex and a good regex run. **Then** stdout and stderr are empty.
- **Expected** empty. **Actual** empty.
- **Spec source:** ADR-6e23 · **Run:** same command as TC-security-5
```text
stdout='' stderr=''
```

</details>

### VS-5 · regex_error reports the compile error text or None
Profiles: contract. Risk: S-012 needs the error text for its note (ADR-b582).

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-contract-12 | regex_error returns the re.error text or None | PASS | `.sdlc/slices/S-011/verification/r0/tests/contract-0/evaluate.verify-contract.test.mjs:222` |
| TC-contract-13 | regex_error is None exactly when evaluate gives a boolean | PASS | `.sdlc/slices/S-011/verification/r0/tests/contract-0/evaluate.verify-contract.test.mjs:235` |

<details>
<summary>Case detail (2 cases)</summary>

#### TC-contract-12 · regex_error returns the re.error text or None · PASS
- **Given** the bad patterns `(`, `[a-`, `\`, `)`, `*`, `a{2,1}`, `(?P<n` and `[z-a]`, and the good patterns `^a`, empty, `a|b`, `\d+`, `.*` and `(?i)x`. **When** `regex_error(p)` runs. **Then** a bad pattern gives a non-empty string equal to `str(re.error)`, and a good pattern gives `None`.
- **Expected** as stated. **Actual** all equal to the `str` of the `re.error` from `python3 -I`.
- **Spec source:** R-072 acceptance, ADR-b582 · **Run:** `node --test .sdlc/slices/S-011/verification/r0/tests/contract-0/evaluate.verify-contract.test.mjs`
```text
verify contract: regex_error text equals the re.error text evaluate hides, None for good patterns: pass
```

#### TC-contract-13 · regex_error is None exactly when evaluate gives a boolean · PASS
- **Given** 1500 generated pattern strings from regex metacharacters, NUL and é. **When** `regex_error` and `evaluate` run on each. **Then** `regex_error` is `None` if and only if `evaluate` is not `None`, and neither raises.
- **Expected** as stated. **Actual** 1500 runs, 0 violations.
- **Spec source:** R-072 acceptance · **Run:** same command as TC-contract-12
```text
property regex-error: seed=3741308206 runs=1500 violations=0
```

</details>

## How it was attacked
One security session ran in round 0. Its charter: find a wrong verdict, a hang, a raise or a side effect in `evaluate`. The threat-model boundary: rule patterns come from the forge and are short, and the spec promises `None` only for an unknown kind or an uncompilable regex. The session tried 5 attacks. Two held (unknown kinds, and corpus strings with invalid patterns). Three were out of scope and became seeds (a nested-quantifier hang, non-string input, and a non-dict rule).

<details>
<summary>Attack table (5 attacks)</summary>

| Input | Expected | Observed | Result |
|---|---|---|---|
| AT-1 `(a+)+$` on `a` x 40 then `b` | A verdict without a time limit in the spec | Did not finish in 8 s | out-of-scope |
| AT-2 `None`, 5, list, dict, true as pattern or sample, four kinds | The slice defines no result | 38 of 40 calls raise `TypeError` | out-of-scope |
| AT-3 `None`, `'regex'`, `[]` as rule; `{kind: regex}` without pattern | The slice defines no result | `AttributeError` for non-dict rules; `TypeError` for an absent pattern | out-of-scope |
| AT-4 kinds `equals`, empty, `Starts_With`, `REGEX`, null, 5, list, with `negate` true and false | `None` (ADR-6e23) | `None` | held |
| AT-5 eight corpus families, `(`, `[a-`, backslash, `*a`, duplicate group | `None`, no raise (R-072) | `None`, no raise, no output | held |

</details>

## Defects found on the way
- **Blocking defects:** none. No verifier and no review found one.
- The planner found no blocking defect either, but the plan was refuted 3 times at escalation step 0. Revision 1 added `make_rule` and rule constants to reach R-026, and the spec-fidelity critique called them extra behavior. Revision 2 cut them, which left R-026 untested. The escalation at step 1 moved R-026 to S-014, and revision 3 passed (failures.md).
- **Seeds**, open only:

| Seed | Found by | File |
|---|---|---|
| Non-string pattern or odd regex raises instead of None | plan review | `skills/sdlc/branches.py` |
| Regex backtracking can hang evaluate | plan review | `skills/sdlc/branches.py` |
| Rule helpers sit in the name section | review (architecture) | `skills/sdlc/branches.py` |
| Pattern compiles twice | review (architecture) | `skills/sdlc/branches.py` |
| Non-string pattern raises TypeError | review (security) | `skills/sdlc/branches.py` |
| T-R-072a overlaps T-R-033a and T-R-034a | test review | `skills/sdlc/test/branches.test.mjs` |
| No gap for exotic regex errors | test review | `skills/sdlc/test/branches.test.mjs` |
| evaluate raises on a rule with a missing or non-string pattern | spec-fidelity or regression verifier | `skills/sdlc/branches.py` |
| evaluate raises OverflowError and RecursionError for some regex patterns | verify-contract, round 0 | `skills/sdlc/branches.py` |
| evaluate raises on non-string pattern, sample or rule | verify-contract, round 0 | `skills/sdlc/branches.py` |
| regex rules have no time limit | verify-contract, round 0 | `skills/sdlc/branches.py` |
| One 120 s timeout in the first run of the hostile-input test did not reproduce | verify-contract, round 0 | `.sdlc/slices/S-011/verification/r0/tests/contract-0/evaluate.verify-contract.test.mjs` |
| evaluate can hang on a nested-quantifier regex | verify-security, round 0 | `skills/sdlc/branches.py` |
| evaluate raises on non-string input or a non-dict rule | verify-security, round 0 | `skills/sdlc/branches.py` |

## Appendix
- Toolkit tools used: `property` (seeded generator and batch caller through `pycall.py`) and `attack-corpus` (hostile strings), both listed in `.sdlc/testkit.json`.
- Plan and evidence: `../../slices/S-011/verification/plan-r0.json`, `../../slices/S-011/verification/r0/contract-0.md`, `../../slices/S-011/verification/r0/security-0.md`.
- Core verifier summaries: `../../slices/S-011/verify-spec-fidelity-r0.md`, `../../slices/S-011/verify-regression-r0.md`. Reviews: `../../slices/S-011/review-architecture-r0.md`, `../../slices/S-011/review-security-r0.md`. Gate: `../../slices/S-011/gate-r0.md`.
- Missing source: none. The seed table has no per-seed finder in `slices.json`, so the "Found by" column follows the order and content of the review and verifier files.
