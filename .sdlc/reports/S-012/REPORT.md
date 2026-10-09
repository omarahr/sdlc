# S-012 · sample verdicts, bad patterns and check-ref-format
Verdict: RELEASED
Commit under test: 9b19870 · Rounds: 3 · Attempts: 1 · Risk: medium · Written: 2026-10-09

| Requirements | Scenarios | Cases | Passed | Failed | Blocked | Blocking defects found / fixed | Open seeds |
|---|---|---|---|---|---|---|---|
| 3 | 5 | 31 | 31 | 0 | 0 | 2 / 2 | 7 |

## Summary
The slice adds `judge(rules, sample)` and `ref_format_error(ref)` to `skills/sdlc/branches.py`. `judge` gives each sample one verdict: `fail`, `pass` or `unevaluated`. A pattern that Python cannot compile never blocks a sample. The sample ends `unevaluated` with a note that starts `cannot evaluate`. Every sample also passes `git check-ref-format --branch`, and a refusal is reported as the rule `git check-ref-format`. The contract and security profiles checked the slice in three rounds. The verifiers found two blocking defects: a nested pattern raised `RecursionError`, and a repeat count that was too large raised `OverflowError`. Both are fixed and guarded by tests. Seven non-blocking seeds remain open.

## Open risks
- The samples `@` and `@{-1}` pass the ref check. The flag `--branch` expands them. R-037 intends a refusal. A later slice must reject them or drop `--branch`.
- A pattern such as `(a+)+$` can run long. The sample `aaaaaaaaaaaaaaaaaaaaaaaaaaaa!` took 9.9 s in round 0. The spec accepts this. Send it to verify-limits.
- The preflight half of R-035 (`ok: true`) belongs to S-015 (ADR 8681). R-035 stays `todo` until the S-015 test passes. S-015 must also remove duplicate notes across samples.
- A forge rule label wins over `git check-ref-format` when both fail (ADR f284). A reader of the verdict sees only the first failing rule.
- `judge` raises `Fail` for a sample with a null character or a lone surrogate. It raises `TypeError` for a non-string sample or pattern. Callers pass strings, so the risk is low.
- Two helpers each compile the pattern and list the exceptions by hand. A new exception type needs a change in two places.
- Python `re` and the forge RE2 differ for rare patterns. The spec accepts this. No measurement here has a spec number.
- The 11 and 5 old failures in stale S-005 verification tests also occur before this slice. They are not part of this slice.

## Traceability
| Requirement | Spec says | Scenarios | Cases | Result |
|---|---|---|---|---|
| R-035 | "A pattern `re.compile` rejects gives `None`, and the sample is `unevaluated` with the note `cannot evaluate <label>: <re.error>`; it never blocks." | VS-1 | TC-contract-1, TC-contract-2, TC-contract-3, TC-contract-4, TC-contract-5, TC-security-1, TC-security-2, TC-contract-r1-6, TC-contract-r1-7, TC-contract-r1-8, TC-contract-r1-9, TC-security-5, TC-security-6, TC-contract-r2-10, TC-security-7 | pass |
| R-036 | "A sample `fails` when any rule evaluates to `False` for it; it `passes` when every rule evaluates to `True`; it is `unevaluated` when no rule failed and at least one was `None`." | VS-2, VS-4 | TC-contract-6, TC-contract-7, TC-contract-8, TC-contract-15 | pass |
| R-037 | "Besides the forge's rules, every sample must pass `git check-ref-format --branch <sample>`, which catches a literal part that makes an invalid ref (`..`, `~`, `^`, `:`, `?`, `*`, `[`, `\`, a leading `/`, a trailing `.lock`). That failure is reported as the rule `git check-ref-format`." | VS-2, VS-3, VS-4, VS-5 | TC-contract-7, TC-contract-9, TC-contract-10, TC-contract-11, TC-contract-12, TC-contract-13, TC-contract-14, TC-contract-15, TC-contract-16, TC-contract-17, TC-contract-18, TC-contract-19, TC-security-3, TC-security-4 | pass |

R-035 is `pass` for the judge. Its preflight half belongs to S-015.

The committed tests in `skills/sdlc/test/branches.test.mjs` (tests.md):
- T-R-035a `a pattern Python cannot compile gives an unevaluated sample` (R-035): `skills/sdlc/test/branches.test.mjs:1537`
- T-R-035b `the note carries the rule label` (R-035): `skills/sdlc/test/branches.test.mjs:1544`
- T-R-035c `a bad pattern never blocks` (R-035): `skills/sdlc/test/branches.test.mjs:1550`
- T-R-035d `judge does not raise on a bad pattern` (R-035): `skills/sdlc/test/branches.test.mjs:1559`
- T-R-036a `one False fails the sample` (R-036): `skills/sdlc/test/branches.test.mjs:1570`
- T-R-036b `all True passes` (R-036): `skills/sdlc/test/branches.test.mjs:1581`
- T-R-036c `no failure plus one None is unevaluated` (R-036): `skills/sdlc/test/branches.test.mjs:1593`
- T-R-036d `a failure beats a None` (R-036): `skills/sdlc/test/branches.test.mjs:1598`
- T-R-036e `negate counts` (R-036): `skills/sdlc/test/branches.test.mjs:1604`
- T-R-037a `an invalid ref fails with the git rule` (R-037): `skills/sdlc/test/branches.test.mjs:1614`
- T-R-037b `a valid sample passes the ref check` (R-037): `skills/sdlc/test/branches.test.mjs:1623`
- T-R-037c `a forge rule keeps the first label` (R-037): `skills/sdlc/test/branches.test.mjs:1636`
- T-R-035e `a deeply nested pattern never blocks and never raises` (R-035): `skills/sdlc/test/branches.test.mjs:1647`
- T-R-035g `a pattern with a repeat count too large never blocks and never raises` (R-035): `skills/sdlc/test/branches.test.mjs:1657`
- T-R-035f `a first failing rule without a label is not replaced by a later one` (R-035): `skills/sdlc/test/branches.test.mjs:1667`

## Scenarios
### VS-1 · A pattern Python cannot compile leaves the sample unevaluated and never blocks
Profiles: contract, security. Risk: a compile error leaks as an exception or a bad pattern fails the sample.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-contract-1 | Surface: judge, ref_format_error, regex_error, evaluate | PASS | `.sdlc/slices/S-012/verification/r2/tests/contract-0/judge.verify-contract.test.mjs:28` |
| TC-contract-2 | Uncompilable patterns give unevaluated; note equals regex_error | PASS | `.sdlc/slices/S-012/verification/r2/tests/contract-0/judge.verify-contract.test.mjs:40` |
| TC-contract-3 | Bad pattern beside a passing rule is unevaluated; unknown kind note | PASS | `.sdlc/slices/S-012/verification/r2/tests/contract-0/judge.verify-contract.test.mjs:52` |
| TC-contract-4 | Catastrophic pattern finishes | PASS | `.sdlc/slices/S-012/verification/r2/tests/contract-0/judge.verify-contract.test.mjs:61` |
| TC-contract-5 | Deeply nested pattern never raises out of judge | PASS (failed in r0, passes in r2) | `.sdlc/slices/S-012/verification/r2/tests/contract-0/judge.verify-contract.test.mjs:254` |
| TC-security-1 | Uncompilable patterns give unevaluated with the note, negate or not | PASS | `.sdlc/slices/S-012/verification/r2/tests/security-0/branches.verify-security.test.mjs:14` |
| TC-security-2 | Pattern nested 900, 5000 and 100000 deep leaves the sample unevaluated (fix of r0) | PASS (failed in r0, passes in r2) | `.sdlc/slices/S-012/verification/r2/tests/security-0/branches.verify-security.test.mjs:119` |
| TC-contract-r1-6 | Nested pattern gives a note equal to regex_error | PASS | `.sdlc/slices/S-012/verification/r2/tests/contract-0/judge.verify-contract.test.mjs:263` |
| TC-contract-r1-7 | Nested pattern beside passing and failing rules | PASS | `.sdlc/slices/S-012/verification/r2/tests/contract-0/judge.verify-contract.test.mjs:274` |
| TC-contract-r1-8 | Repeat count too large for re.compile never raises (r1 failure, re-run) | PASS (failed in r1, passes in r2) | `.sdlc/slices/S-012/verification/r2/tests/contract-0/judge.verify-contract.test.mjs:281` |
| TC-contract-r1-9 | regex_error returns text for every pattern re.compile rejects (r1 failure, re-run) | PASS (failed in r1, passes in r2) | `.sdlc/slices/S-012/verification/r2/tests/contract-0/judge.verify-contract.test.mjs:291` |
| TC-security-5 | A repetition count too large for re leaves the sample unevaluated | PASS (failed in r1, passes in r2) | `.sdlc/slices/S-012/verification/r2/tests/security-0/branches.verify-security.test.mjs:101` |
| TC-security-6 | A rule without a label keeps rule null when it fails before the git check | PASS | `.sdlc/slices/S-012/verification/r2/tests/security-0/branches.verify-security.test.mjs:130` |
| TC-contract-r2-10 | Property: 1509 random regex-like patterns never raise out of judge or regex_error | PASS | `.sdlc/slices/S-012/verification/r2/tests/contract-0/judge.verify-contract-r2.test.mjs:9` |
| TC-security-7 | 36 further hostile patterns never make judge, regex_error or evaluate raise | PASS | `.sdlc/slices/S-012/verification/r2/tests/security-0/branches-r2.verify-security.test.mjs:34` |

<details>
<summary>Case detail (15 cases)</summary>

#### TC-contract-1 · Surface: judge, ref_format_error, regex_error, evaluate · PASS
- **Given:** `Branch sdlc/S-012 at commit 4ed0399.`
- **When:** `List the module functions.`
- **Then:** `The expected functions exist; no extra import.`
- **Expected:** `The expected functions exist; no extra import.`
- **Actual:** `The expected functions exist; no extra import.`
- **Spec source:** R-035 acceptance · **Run:** `VERIFY_WT=<worktree of sdlc/S-012> VERIFY_MAIN_MODULE=<main branches.py> TESTKIT_SEED=12012 node --test .sdlc/slices/S-012/verification/r2/tests/contract-0/judge.verify-contract.test.mjs` · Latest run: round 2, commit 4ed0399
- node --test output, 23 tests, 0 failures. Full file: [contract-0.txt](../../slices/S-012/verification/r2/logs/contract-0.txt).

#### TC-contract-2 · Uncompilable patterns give unevaluated; note equals regex_error · PASS
- **Given:** `Branch sdlc/S-012 at commit 4ed0399.`
- **When:** `Judge ( , [a-, *, a{2,1} with negate true, false and absent.`
- **Then:** `Result unevaluated, rule null, note equal to regex_error.`
- **Expected:** `Result unevaluated, rule null, note equal to regex_error.`
- **Actual:** `Result unevaluated, rule null, note equal to regex_error.`
- **Spec source:** R-035 acceptance · **Run:** `VERIFY_WT=<worktree of sdlc/S-012> VERIFY_MAIN_MODULE=<main branches.py> TESTKIT_SEED=12012 node --test .sdlc/slices/S-012/verification/r2/tests/contract-0/judge.verify-contract.test.mjs` · Latest run: round 2, commit 4ed0399
- node --test output, 23 tests, 0 failures. Full file: [contract-0.txt](../../slices/S-012/verification/r2/logs/contract-0.txt).

#### TC-contract-3 · Bad pattern beside a passing rule is unevaluated; unknown kind note · PASS
- **Given:** `Branch sdlc/S-012 at commit 4ed0399.`
- **When:** `Judge a bad regex with a passing rule, and an unknown kind.`
- **Then:** `Result unevaluated; note reads cannot evaluate <label>: unknown kind <kind>.`
- **Expected:** `Result unevaluated; note reads cannot evaluate <label>: unknown kind <kind>.`
- **Actual:** `Result unevaluated; note reads cannot evaluate <label>: unknown kind <kind>.`
- **Spec source:** R-035 acceptance · **Run:** `VERIFY_WT=<worktree of sdlc/S-012> VERIFY_MAIN_MODULE=<main branches.py> TESTKIT_SEED=12012 node --test .sdlc/slices/S-012/verification/r2/tests/contract-0/judge.verify-contract.test.mjs` · Latest run: round 2, commit 4ed0399
- node --test output, 23 tests, 0 failures. Full file: [contract-0.txt](../../slices/S-012/verification/r2/logs/contract-0.txt).

#### TC-contract-4 · Catastrophic pattern finishes · PASS
- **Given:** `Branch sdlc/S-012 at commit 4ed0399.`
- **When:** `Judge (a+)+$ on 22 characters.`
- **Then:** `The call returns.`
- **Expected:** `The call returns.`
- **Actual:** `The call returns.`
- **Spec source:** R-035 acceptance · **Run:** `VERIFY_WT=<worktree of sdlc/S-012> VERIFY_MAIN_MODULE=<main branches.py> TESTKIT_SEED=12012 node --test .sdlc/slices/S-012/verification/r2/tests/contract-0/judge.verify-contract.test.mjs` · Latest run: round 2, commit 4ed0399
- node --test output, 23 tests, 0 failures. Full file: [contract-0.txt](../../slices/S-012/verification/r2/logs/contract-0.txt).

#### TC-contract-5 · Deeply nested pattern never raises out of judge · PASS
- **Given:** `Branch sdlc/S-012 at commit 4ed0399.`
- **When:** `Judge 2000 and 1000 nested open parentheses.`
- **Then:** `judge returns a dict.`
- **Expected:** `judge returns a dict.`
- **Actual:** `judge returns a dict.`
- **Spec source:** R-035 acceptance · **Run:** `VERIFY_WT=<worktree of sdlc/S-012> VERIFY_MAIN_MODULE=<main branches.py> TESTKIT_SEED=12012 node --test .sdlc/slices/S-012/verification/r2/tests/contract-0/judge.verify-contract.test.mjs` · Latest run: round 2, commit 4ed0399
- node --test output, 23 tests, 0 failures. Full file: [contract-0.txt](../../slices/S-012/verification/r2/logs/contract-0.txt).

#### TC-security-1 · Uncompilable patterns give unevaluated with the note, negate or not · PASS
- **Given:** `branches.py at 6ad4424`
- **When:** `judge is called with the input`
- **Then:** `unevaluated with note 'cannot evaluate ruleset 7: <re.error>'`
- **Expected:** `unevaluated with note 'cannot evaluate ruleset 7: <re.error>'`
- **Actual:** `held for (, [a-, *, a{2,1}, (?P<, backslash; bad pattern beside a passing rule is unevaluated`
- **Spec source:** R-035 acceptance · **Run:** `node --test .sdlc/slices/S-012/verification/r2/tests/security-0/branches.verify-security.test.mjs` · Latest run: round 2, commit 4ed0399
- Attack, run log: 

#### TC-security-2 · Pattern nested 900, 5000 and 100000 deep leaves the sample unevaluated (fix of r0) · PASS
- **Given:** `branches.py at 6ad4424`
- **When:** `judge is called with the input`
- **Then:** `judge returns unevaluated with a cannot evaluate note`
- **Expected:** `judge returns unevaluated with a cannot evaluate note`
- **Actual:** `unevaluated with note 'cannot evaluate deep: the pattern is nested too deeply' for balanced, open and (?: forms, negate true and false`
- **Spec source:** R-035 quote: it never blocks · **Run:** `node --test .sdlc/slices/S-012/verification/r2/tests/security-0/branches.verify-security.test.mjs` · Latest run: round 2, commit 4ed0399
- Attack, run log: 

#### TC-contract-r1-6 · Nested pattern gives a note equal to regex_error · PASS
- **Given:** `Branch sdlc/S-012 at commit 4ed0399.`
- **When:** `Judge 500 to 5000 open parentheses, negate true and false.`
- **Then:** `Note equals regex_error text.`
- **Expected:** `Note equals regex_error text.`
- **Actual:** `Note equals regex_error text.`
- **Spec source:** R-035 acceptance · **Run:** `VERIFY_WT=<worktree of sdlc/S-012> VERIFY_MAIN_MODULE=<main branches.py> TESTKIT_SEED=12012 node --test .sdlc/slices/S-012/verification/r2/tests/contract-0/judge.verify-contract.test.mjs` · Latest run: round 2, commit 4ed0399
- node --test output, 23 tests, 0 failures. Full file: [contract-0.txt](../../slices/S-012/verification/r2/logs/contract-0.txt).

#### TC-contract-r1-7 · Nested pattern beside passing and failing rules · PASS
- **Given:** `Branch sdlc/S-012 at commit 4ed0399.`
- **When:** `Judge nested pattern with a passing rule, then a failing rule.`
- **Then:** `unevaluated, then fail with the failing label.`
- **Expected:** `unevaluated, then fail with the failing label.`
- **Actual:** `unevaluated, then fail with the failing label.`
- **Spec source:** R-035 acceptance · **Run:** `VERIFY_WT=<worktree of sdlc/S-012> VERIFY_MAIN_MODULE=<main branches.py> TESTKIT_SEED=12012 node --test .sdlc/slices/S-012/verification/r2/tests/contract-0/judge.verify-contract.test.mjs` · Latest run: round 2, commit 4ed0399
- node --test output, 23 tests, 0 failures. Full file: [contract-0.txt](../../slices/S-012/verification/r2/logs/contract-0.txt).

#### TC-contract-r1-8 · Repeat count too large for re.compile never raises (r1 failure, re-run) · PASS
- **Given:** `Branch sdlc/S-012 at commit 4ed0399.`
- **When:** `Judge a{4294967296}, a{99999999999999999999}, a{1,99999999999999999999}, a{99999999999999999999,}.`
- **Then:** `Each gives unevaluated with note starting cannot evaluate big: .`
- **Expected:** `Each gives unevaluated with note starting cannot evaluate big: .`
- **Actual:** `Each gives unevaluated with note starting cannot evaluate big: .`
- **Spec source:** R-035 acceptance · **Run:** `VERIFY_WT=<worktree of sdlc/S-012> VERIFY_MAIN_MODULE=<main branches.py> TESTKIT_SEED=12012 node --test .sdlc/slices/S-012/verification/r2/tests/contract-0/judge.verify-contract.test.mjs` · Latest run: round 2, commit 4ed0399
- node --test output, 23 tests, 0 failures. Full file: [contract-0.txt](../../slices/S-012/verification/r2/logs/contract-0.txt).
- fix:

  ```console
  4ed0399 catches OverflowError in regex_error and _raw_result
  ```

#### TC-contract-r1-9 · regex_error returns text for every pattern re.compile rejects (r1 failure, re-run) · PASS
- **Given:** `Branch sdlc/S-012 at commit 4ed0399.`
- **When:** `Call regex_error on a{4294967296}, 2000 open parentheses, (, [a-.`
- **Then:** `Each call returns text.`
- **Expected:** `Each call returns text.`
- **Actual:** `Each call returns text.`
- **Spec source:** R-035 acceptance · **Run:** `VERIFY_WT=<worktree of sdlc/S-012> VERIFY_MAIN_MODULE=<main branches.py> TESTKIT_SEED=12012 node --test .sdlc/slices/S-012/verification/r2/tests/contract-0/judge.verify-contract.test.mjs` · Latest run: round 2, commit 4ed0399
- node --test output, 23 tests, 0 failures. Full file: [contract-0.txt](../../slices/S-012/verification/r2/logs/contract-0.txt).

#### TC-security-5 · A repetition count too large for re leaves the sample unevaluated · PASS
- **Given:** `branches.py at 6ad4424`
- **When:** `judge is called with the input`
- **Then:** `judge returns unevaluated for a{4294967296}, a{99999999999999999999}, a{0,4294967296}, (ab){4294967296}`
- **Expected:** `judge returns unevaluated for a{4294967296}, a{99999999999999999999}, a{0,4294967296}, (ab){4294967296}`
- **Actual:** `unevaluated with note "cannot evaluate big: ..." for all four patterns, negate true and false. The r1 OverflowError is fixed.`
- **Spec source:** R-035 quote: it never blocks · **Run:** `node --test .sdlc/slices/S-012/verification/r2/tests/security-0/branches.verify-security.test.mjs` · Latest run: round 2, commit 4ed0399
- Attack, run log: 

#### TC-security-6 · A rule without a label keeps rule null when it fails before the git check · PASS
- **Given:** `branches.py at 6ad4424`
- **When:** `judge is called with the input`
- **Then:** `fail with rule null`
- **Expected:** `fail with rule null`
- **Actual:** `as expected`
- **Spec source:** R-036 acceptance (fix of r0) · **Run:** `node --test .sdlc/slices/S-012/verification/r2/tests/security-0/branches.verify-security.test.mjs` · Latest run: round 2, commit 4ed0399
- Attack, run log: 

#### TC-contract-r2-10 · Property: 1509 random regex-like patterns never raise out of judge or regex_error · PASS
- **Given:** `A seeded generator of atoms: brackets, braces, huge counts, groups, escapes, unicode, NUL; plus 200000-character and 3000-deep patterns.`
- **When:** `Call judge and regex_error on each pattern.`
- **Then:** `No exception outcome; every unevaluated note equals cannot evaluate p: <regex_error text>.`
- **Expected:** `0 exceptions`
- **Actual:** `0 exceptions; 1365 of 1509 unevaluated`
- **Spec source:** R-035 acceptance · **Run:** `VERIFY_WT=<worktree of sdlc/S-012> TESTKIT_SEED=12012 node --test .sdlc/slices/S-012/verification/r2/tests/contract-0/judge.verify-contract-r2.test.mjs` · Latest run: round 2, commit 4ed0399
- Property run: property: no exception outcome; seed 12012; runs 1509; result pass; no counterexample. Full file: [contract-0-property.txt](../../slices/S-012/verification/r2/logs/contract-0-property.txt).

#### TC-security-7 · 36 further hostile patterns never make judge, regex_error or evaluate raise · PASS
- **Given:** `branches.py at 4ed0399`
- **When:** `judge is called with each pattern, negate true and false`
- **Then:** `a verdict, never an exception`
- **Expected:** `a verdict, never an exception`
- **Actual:** `as expected for all 36 patterns, including huge repeats in groups, lazy and possessive forms, bad back-references, bad conditionals, huge look-behind, bad flags, NUL, surrogate, 5 MB literal, 70000 groups and 200000 alternatives`
- **Spec source:** R-035 quote: it never blocks · **Run:** `node --test .sdlc/slices/S-012/verification/r2/tests/security-0/*.mjs` · Latest run: round 2, commit 4ed0399
- Attack, run log: 

</details>

### VS-2 · Rule results combine into fail, pass or unevaluated
Profiles: contract. Risk: a wrong aggregation passes a sample that a rule rejects.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-contract-6 | Combination examples: one False fails with first label; all True passes; empty passes; True+None unevaluated; None+False fails; negate; return keys | PASS | `.sdlc/slices/S-012/verification/r0/tests/contract-0/judge.verify-contract.test.mjs:68` |
| TC-contract-7 | Property: judge equals a reference model written from the spec (1500 runs, 0-5 rules, negate, bad regex, invalid refs, git as oracle) | PASS | `.sdlc/slices/S-012/verification/r0/tests/contract-0/judge.verify-contract.test.mjs:111` |
| TC-contract-8 | judge does not mutate rules and is deterministic | PASS | `.sdlc/slices/S-012/verification/r0/tests/contract-0/judge.verify-contract.test.mjs:129` |

<details>
<summary>Case detail (3 cases)</summary>

#### TC-contract-6 · Combination examples: one False fails with first label; all True passes; empty passes; True+None unevaluated; None+False fails; negate; return keys · PASS
- **Given:** `judge and ref_format_error loaded by path in python3 -I`
- **When:** `the function is called with the inputs named in the title`
- **Then:** `per notes`
- **Expected:** `per notes`
- **Actual:** `as expected; keys are exactly result, rule, notes; duplicate labels give the label`
- **Spec source:** R-036 acceptance · **Run:** `VERIFY_WT=<worktree of sdlc/S-012> VERIFY_MAIN_MODULE=<main branches.py> TESTKIT_SEED=12012 node --test .sdlc/slices/S-012/verification/r0/tests/contract-0/judge.verify-contract.test.mjs` · Latest run: round 0, commit 789c21e
- missing label:

  ```text
  missing-label first failing rule then labelled one -> {"result":"fail","rule":"b","notes":[]}
  ```

#### TC-contract-7 · Property: judge equals a reference model written from the spec (1500 runs, 0-5 rules, negate, bad regex, invalid refs, git as oracle) · PASS
- **Given:** `judge and ref_format_error loaded by path in python3 -I`
- **When:** `the function is called with the inputs named in the title`
- **Then:** `0 violations`
- **Expected:** `0 violations`
- **Actual:** `0 violations`
- **Spec source:** R-036 quote; R-037 quote · **Run:** `VERIFY_WT=<worktree of sdlc/S-012> VERIFY_MAIN_MODULE=<main branches.py> TESTKIT_SEED=12012 node --test .sdlc/slices/S-012/verification/r0/tests/contract-0/judge.verify-contract.test.mjs` · Latest run: round 0, commit 789c21e
- Property run: property-run judge seed=12012 runs=1500 violations=0.

#### TC-contract-8 · judge does not mutate rules and is deterministic · PASS
- **Given:** `judge and ref_format_error loaded by path in python3 -I`
- **When:** `the function is called with the inputs named in the title`
- **Then:** `same output, rules unchanged`
- **Expected:** `same output, rules unchanged`
- **Actual:** `as expected`
- **Spec source:** R-036 quote · **Run:** `VERIFY_WT=<worktree of sdlc/S-012> VERIFY_MAIN_MODULE=<main branches.py> TESTKIT_SEED=12012 node --test .sdlc/slices/S-012/verification/r0/tests/contract-0/judge.verify-contract.test.mjs` · Latest run: round 0, commit 789c21e

</details>

### VS-3 · A sample with an invalid ref name fails with the rule git check-ref-format
Profiles: contract, security. Risk: an invalid ref name passes, or a sample is read as a git option.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-contract-9 | Invalid refs fail with git check-ref-format; valid refs pass; ref_format_error gives text or None | PASS | `.sdlc/slices/S-012/verification/r0/tests/contract-0/judge.verify-contract.test.mjs:139` |
| TC-contract-10 | @{-1}, NUL, lone surrogate and non-string samples | PASS | `.sdlc/slices/S-012/verification/r0/tests/contract-0/judge.verify-contract.test.mjs:153` |
| TC-contract-11 | Flag-like samples (--, -h, --help, -1, --format=x, --stdin) are not read as git options | PASS | `.sdlc/slices/S-012/verification/r0/tests/contract-0/judge.verify-contract.test.mjs:165` |
| TC-contract-12 | Attack corpus (95 strings) never raises and agrees with git | PASS | `.sdlc/slices/S-012/verification/r0/tests/contract-0/judge.verify-contract.test.mjs:172` |
| TC-contract-13 | Property: ref_format_error equals git (1000 runs) | PASS | `.sdlc/slices/S-012/verification/r0/tests/contract-0/judge.verify-contract.test.mjs:183` |
| TC-contract-14 | No dependence on cwd or repo (cwd /, /var/empty, TMPDIR) | PASS | `.sdlc/slices/S-012/verification/r0/tests/contract-0/judge.verify-contract.test.mjs:196` |
| TC-security-3 | Invalid refs fail with git check-ref-format; valid refs pass | PASS | `.sdlc/slices/S-012/verification/r2/tests/security-0/branches.verify-security.test.mjs:41` |
| TC-security-4 | NUL, surrogate, flag-like, corpus samples and git off PATH give Fail or a verdict; nothing written | PASS | `.sdlc/slices/S-012/verification/r2/tests/security-0/branches.verify-security.test.mjs:51` |

<details>
<summary>Case detail (8 cases)</summary>

#### TC-contract-9 · Invalid refs fail with git check-ref-format; valid refs pass; ref_format_error gives text or None · PASS
- **Given:** `judge and ref_format_error loaded by path in python3 -I`
- **When:** `the function is called with the inputs named in the title`
- **Then:** `fail/git check-ref-format for 23 invalid refs; pass for 5 valid`
- **Expected:** `fail/git check-ref-format for 23 invalid refs; pass for 5 valid`
- **Actual:** `as expected`
- **Spec source:** R-037 acceptance · **Run:** `VERIFY_WT=<worktree of sdlc/S-012> VERIFY_MAIN_MODULE=<main branches.py> TESTKIT_SEED=12012 node --test .sdlc/slices/S-012/verification/r0/tests/contract-0/judge.verify-contract.test.mjs` · Latest run: round 0, commit 789c21e

#### TC-contract-10 · @{-1}, NUL, lone surrogate and non-string samples · PASS
- **Given:** `judge and ref_format_error loaded by path in python3 -I`
- **When:** `the function is called with the inputs named in the title`
- **Then:** `no traceback`
- **Expected:** `no traceback`
- **Actual:** `@{-1} gives fail. NUL and lone surrogate raise Fail. Non-string samples raise TypeError (seed, not blocking)`
- **Spec source:** plan VS-3 notes · **Run:** `VERIFY_WT=<worktree of sdlc/S-012> VERIFY_MAIN_MODULE=<main branches.py> TESTKIT_SEED=12012 node --test .sdlc/slices/S-012/verification/r0/tests/contract-0/judge.verify-contract.test.mjs` · Latest run: round 0, commit 789c21e
- odd inputs:

  ```text
  odd "\u0000" judge Fail 'embedded null byte'
  odd null judge exception TypeError
  odd 5 judge exception TypeError
  ```

#### TC-contract-11 · Flag-like samples (--, -h, --help, -1, --format=x, --stdin) are not read as git options · PASS
- **Given:** `judge and ref_format_error loaded by path in python3 -I`
- **When:** `the function is called with the inputs named in the title`
- **Then:** `fail with git check-ref-format`
- **Expected:** `fail with git check-ref-format`
- **Actual:** `as expected`
- **Spec source:** R-037 quote · **Run:** `VERIFY_WT=<worktree of sdlc/S-012> VERIFY_MAIN_MODULE=<main branches.py> TESTKIT_SEED=12012 node --test .sdlc/slices/S-012/verification/r0/tests/contract-0/judge.verify-contract.test.mjs` · Latest run: round 0, commit 789c21e

#### TC-contract-12 · Attack corpus (95 strings) never raises and agrees with git · PASS
- **Given:** `judge and ref_format_error loaded by path in python3 -I`
- **When:** `the function is called with the inputs named in the title`
- **Then:** `0 non-return, 0 disagreements`
- **Expected:** `0 non-return, 0 disagreements`
- **Actual:** `0 and 0`
- **Spec source:** R-037 quote · **Run:** `VERIFY_WT=<worktree of sdlc/S-012> VERIFY_MAIN_MODULE=<main branches.py> TESTKIT_SEED=12012 node --test .sdlc/slices/S-012/verification/r0/tests/contract-0/judge.verify-contract.test.mjs` · Latest run: round 0, commit 789c21e
- Property run: corpus samples=95 non-return=0; judge disagrees with git oracle on 0.

#### TC-contract-13 · Property: ref_format_error equals git (1000 runs) · PASS
- **Given:** `judge and ref_format_error loaded by path in python3 -I`
- **When:** `the function is called with the inputs named in the title`
- **Then:** `0 violations`
- **Expected:** `0 violations`
- **Actual:** `0 violations`
- **Spec source:** R-037 quote · **Run:** `VERIFY_WT=<worktree of sdlc/S-012> VERIFY_MAIN_MODULE=<main branches.py> TESTKIT_SEED=12012 node --test .sdlc/slices/S-012/verification/r0/tests/contract-0/judge.verify-contract.test.mjs` · Latest run: round 0, commit 789c21e
- Property run: property-run ref_format_error seed=12012 runs=1000 violations=0.

#### TC-contract-14 · No dependence on cwd or repo (cwd /, /var/empty, TMPDIR) · PASS
- **Given:** `judge and ref_format_error loaded by path in python3 -I`
- **When:** `the function is called with the inputs named in the title`
- **Then:** `same verdicts`
- **Expected:** `same verdicts`
- **Actual:** `as expected`
- **Spec source:** plan approach · **Run:** `VERIFY_WT=<worktree of sdlc/S-012> VERIFY_MAIN_MODULE=<main branches.py> TESTKIT_SEED=12012 node --test .sdlc/slices/S-012/verification/r0/tests/contract-0/judge.verify-contract.test.mjs` · Latest run: round 0, commit 789c21e

#### TC-security-3 · Invalid refs fail with git check-ref-format; valid refs pass · PASS
- **Given:** `branches.py at 6ad4424`
- **When:** `judge is called with the input`
- **Then:** `fail with rule git check-ref-format for 19 invalid samples; pass for 2 valid`
- **Expected:** `fail with rule git check-ref-format for 19 invalid samples; pass for 2 valid`
- **Actual:** `as expected`
- **Spec source:** R-037 acceptance · **Run:** `node --test .sdlc/slices/S-012/verification/r2/tests/security-0/branches.verify-security.test.mjs` · Latest run: round 2, commit 4ed0399
- Attack, run log: 

#### TC-security-4 · NUL, surrogate, flag-like, corpus samples and git off PATH give Fail or a verdict; nothing written · PASS
- **Given:** `branches.py at 6ad4424`
- **When:** `judge is called with the input`
- **Then:** `no traceback, no option read, no file written`
- **Expected:** `no traceback, no option read, no file written`
- **Actual:** `as expected; git off PATH gives Fail; scratch cwd stays empty`
- **Spec source:** R-037 acceptance · **Run:** `node --test .sdlc/slices/S-012/verification/r2/tests/security-0/branches.verify-security.test.mjs` · Latest run: round 2, commit 4ed0399
- Attack, run log: 

</details>

### VS-4 · Forge rule label wins over the git ref check
Profiles: contract. Risk: the wrong rule label reaches the caller.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-contract-15 | Forge label wins over git ref check; bad regex plus invalid ref gives git rule; no rules still checks | PASS | `.sdlc/slices/S-012/verification/r0/tests/contract-0/judge.verify-contract.test.mjs:204` |

<details>
<summary>Case detail (1 cases)</summary>

#### TC-contract-15 · Forge label wins over git ref check; bad regex plus invalid ref gives git rule; no rules still checks · PASS
- **Given:** `judge and ref_format_error loaded by path in python3 -I`
- **When:** `the function is called with the inputs named in the title`
- **Then:** `per notes`
- **Expected:** `per notes`
- **Actual:** `as expected`
- **Spec source:** ADR f284; R-037 quote · **Run:** `VERIFY_WT=<worktree of sdlc/S-012> VERIFY_MAIN_MODULE=<main branches.py> TESTKIT_SEED=12012 node --test .sdlc/slices/S-012/verification/r0/tests/contract-0/judge.verify-contract.test.mjs` · Latest run: round 0, commit 789c21e

</details>

### VS-5 · validate_format keeps its behavior after the refactor to ref_format_error
Profiles: contract. Risk: the refactor changes the messages of `validate_format`.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-contract-16 | validate_format messages equal main for 18 formats | PASS | `.sdlc/slices/S-012/verification/r0/tests/contract-0/judge.verify-contract.test.mjs:212` |
| TC-contract-17 | Property: validate_format has no exception outcome and equals main (1000 runs) | PASS | `.sdlc/slices/S-012/verification/r0/tests/contract-0/judge.verify-contract.test.mjs:218` |
| TC-contract-18 | git missing from PATH: validate_format message equals main | PASS | `.sdlc/slices/S-012/verification/r0/tests/contract-0/judge.verify-contract.test.mjs:227` |
| TC-contract-19 | Imports unchanged against main | PASS | `.sdlc/slices/S-012/verification/r0/tests/contract-0/judge.verify-contract.test.mjs:245` |

<details>
<summary>Case detail (4 cases)</summary>

#### TC-contract-16 · validate_format messages equal main for 18 formats · PASS
- **Given:** `judge and ref_format_error loaded by path in python3 -I`
- **When:** `the function is called with the inputs named in the title`
- **Then:** `equal`
- **Expected:** `equal`
- **Actual:** `equal`
- **Spec source:** plan: existing messages stay · **Run:** `VERIFY_WT=<worktree of sdlc/S-012> VERIFY_MAIN_MODULE=<main branches.py> TESTKIT_SEED=12012 node --test .sdlc/slices/S-012/verification/r0/tests/contract-0/judge.verify-contract.test.mjs` · Latest run: round 0, commit 789c21e

#### TC-contract-17 · Property: validate_format has no exception outcome and equals main (1000 runs) · PASS
- **Given:** `judge and ref_format_error loaded by path in python3 -I`
- **When:** `the function is called with the inputs named in the title`
- **Then:** `0 violations, 0 diffs`
- **Expected:** `0 violations, 0 diffs`
- **Actual:** `0 and 0`
- **Spec source:** plan: existing messages stay · **Run:** `VERIFY_WT=<worktree of sdlc/S-012> VERIFY_MAIN_MODULE=<main branches.py> TESTKIT_SEED=12012 node --test .sdlc/slices/S-012/verification/r0/tests/contract-0/judge.verify-contract.test.mjs` · Latest run: round 0, commit 789c21e
- Property run: property validate_format: seed=12012 runs=1000 violations=0; property-run validate_format vs main seed=12012 runs=1000 diffs=0.

#### TC-contract-18 · git missing from PATH: validate_format message equals main · PASS
- **Given:** `judge and ref_format_error loaded by path in python3 -I`
- **When:** `the function is called with the inputs named in the title`
- **Then:** `Fail 'cannot check the branch format ...: [Errno 2] ... git'`
- **Expected:** `Fail 'cannot check the branch format ...: [Errno 2] ... git'`
- **Actual:** `equal to main`
- **Spec source:** plan: existing messages stay · **Run:** `VERIFY_WT=<worktree of sdlc/S-012> VERIFY_MAIN_MODULE=<main branches.py> TESTKIT_SEED=12012 node --test .sdlc/slices/S-012/verification/r0/tests/contract-0/judge.verify-contract.test.mjs` · Latest run: round 0, commit 789c21e
- no git:

  ```console
  Fail: cannot check the branch format 'sdlc/{name}' with git check-ref-format: [Errno 2] No such file or directory: 'git'
  ```

#### TC-contract-19 · Imports unchanged against main · PASS
- **Given:** `judge and ref_format_error loaded by path in python3 -I`
- **When:** `the function is called with the inputs named in the title`
- **Then:** `same import list`
- **Expected:** `same import list`
- **Actual:** `argparse,json,os,re,subprocess,sys,datetime`
- **Spec source:** plan · **Run:** `VERIFY_WT=<worktree of sdlc/S-012> VERIFY_MAIN_MODULE=<main branches.py> TESTKIT_SEED=12012 node --test .sdlc/slices/S-012/verification/r0/tests/contract-0/judge.verify-contract.test.mjs` · Latest run: round 0, commit 789c21e

</details>

## How it was attacked
The security charter was to find an exception that leaves `judge` when a rule has a malformed pattern. It also fed hostile samples to the git ref check. The threat-model boundary is a pattern or sample that reaches `judge` from the forge reader. It is not a network boundary. Round 0 tried 8 attack families: 5 held, 1 broke and 2 were out of scope. The break was the nested pattern. Round 1 tried 8 families: 5 held, 1 broke and 2 were out of scope. The break was the repeat count. Round 2 tried 9 families: 7 held, 0 broke and 2 were out of scope. The two out of scope items every round were `@` and `@{-1}`, and the catastrophic pattern.

<details>
<summary>Attack table, round 0 (8 attacks)</summary>

| input | expected | observed | result |
|---|---|---|---|
| regex ( [a-  * a{2,1} (?P< \ with negate true and false | unevaluated, note equals re.error text | as expected | held |
| regex of 900 balanced pairs, and 5000 open parentheses | unevaluated, no exception | RecursionError raised out of judge | broke |
| samples --help -h --version -x - passed to git check-ref-format --branch | refused as ref names | refused | held |
| sample with NUL, lone surrogate | Fail or fail verdict | Fail | held |
| PATH=/nonexistent | Fail, no write | Fail, scratch cwd empty | held |
| (a+)+$ against 28 a then ! | spec accepts long run | 9.9 seconds, returned fail | out-of-scope |
| sample @{-1} inside a repo with a previous branch | fail as outside a repo | pass: git expands @{-1} to a branch name | out-of-scope |
| sample @ | fail: @ is not a valid ref | pass: git accepts @ as an alias for HEAD | out-of-scope |

</details>

<details>
<summary>Attack table, round 1 (8 attacks)</summary>

| input | expected | observed | result |
|---|---|---|---|
| ( [a- * a{2,1} (?P< \ with negate true and false | unevaluated, note equals re.error text | as expected | held |
| 900 and 100000 balanced pairs, 5000 open parentheses, 3000 (?: groups | unevaluated, no exception | unevaluated with nested-too-deeply note; the r0 break is fixed | held |
| a{4294967296}, a{99999999999999999999}, a{0,4294967296}, (ab){4294967296} | unevaluated | OverflowError out of judge, regex_error and evaluate | broke |
| 1e6 char class, 200000 alternatives, NUL, lone surrogate, bad backref, bad conditional, undefined \N name, bad flag, bad range, look-behind of variable width, nested repeat | verdict, no exception | all gave a verdict | held |
| --help -h --version -x - NUL surrogate corpus families | fail verdict or Fail | as expected | held |
| PATH=/nonexistent | Fail, no write | Fail, scratch cwd empty | held |
| @{-1} and @ | fail | pass: git expands them | out-of-scope |
| (a+)+$ against 28 a then ! | spec accepts a long run | 9.9 seconds in r0; not re-run | out-of-scope |

</details>

<details>
<summary>Attack table, round 2 (9 attacks)</summary>

| input | expected | observed | result |
|---|---|---|---|
| ( [a- * a{2,1} (?P< \ with negate true and false | unevaluated, note equals re.error text | as expected | held |
| 900 and 100000 balanced pairs, 5000 open parentheses, 3000 (?: groups | unevaluated, no exception | unevaluated with nested-too-deeply note; the r0 break is fixed | held |
| a{4294967296}, a{99999999999999999999}, a{0,4294967296}, (ab){4294967296} | unevaluated | unevaluated; the r1 OverflowError is fixed | held |
| 1e6 char class, 200000 alternatives, NUL, lone surrogate, bad backref, bad conditional, undefined \N name, bad flag, bad range, look-behind of variable width, nested repeat | verdict, no exception | all gave a verdict | held |
| --help -h --version -x - NUL surrogate corpus families | fail verdict or Fail | as expected | held |
| PATH=/nonexistent | Fail, no write | Fail, scratch cwd empty | held |
| @{-1} and @ | fail | pass: git expands them | out-of-scope |
| (a+)+$ against 28 a then ! | spec accepts a long run | 9.9 seconds in r0; not re-run | out-of-scope |
| huge repeats inside groups, lazy and possessive huge repeats, huge back-reference, bad conditional, huge look-behind, bad flags, NUL, surrogate, 5 MB literal, 70000 groups, 200000 alternatives, unicode name errors | a verdict for each | a verdict for each | held |

</details>

## Defects found on the way
- **Blocking defect: a deeply nested pattern raised `RecursionError`.** Found by the contract verifier (TC-contract-5) and the security verifier (TC-security-2) in round 0. Spec source: R-035, "it never blocks". Reproduce: `judge([regex "(" * 900 + ")" * 900], "sdlc/S-001")`. Fixed in commit 6ad4424, which catches `RecursionError`. Guard: T-R-035e, `skills/sdlc/test/branches.test.mjs:1647`.
- **Blocking defect: a repeat count that is too large raised `OverflowError`.** Found by the contract verifier (TC-contract-8, TC-contract-9) and the security verifier (TC-security-5) in round 1. Spec source: R-035. Reproduce: `judge([regex "a{4294967296}"], "sdlc/S-001")`. Fixed in commit 4ed0399, which catches `OverflowError`. Guard: T-R-035g, `skills/sdlc/test/branches.test.mjs:1657`.
- Fixed non-blocking seed: a failing rule without a label lost its place to a later failing rule. Found by the contract verifier in round 0. Fixed in 6ad4424 with a `has_failed` flag. Guard: T-R-035f, `skills/sdlc/test/branches.test.mjs:1667`.

| Seed | Found by | File |
|---|---|---|
| Samples `@` and `@{-1}` pass the ref check | verify-security r0 to r2; review-security r2 | `skills/sdlc/branches.py` |
| Catastrophic regex such as `(a+)+$` can run long | verify-security r0 to r2; review-security r2 | `skills/sdlc/branches.py` |
| Regex compile errors are caught in two places, with the exceptions listed by hand | verify-contract r1 (finder of the helper seed is not recorded) | `skills/sdlc/branches.py` |
| `judge` compiles a second time to read the reason text | not recorded in `slices.json` | `skills/sdlc/branches.py` |
| `judge` raises `Fail` for a null-character or lone surrogate sample | verify-contract r0 | `skills/sdlc/branches.py` |
| `judge` raises `TypeError` for a non-string sample or pattern | verify-contract r0; verify-security r0 to r2 | `skills/sdlc/branches.py` |
| A rule with a missing kind gets the note `unknown kind None` | verify-contract r0 | `skills/sdlc/branches.py` |

## Appendix
- Toolkit tools used: `property` (seeded generator and batch caller), `attack-corpus` (hostile strings) and `cli-runner` (scratch cwd and controlled PATH), all listed in `.sdlc/testkit.json`.
- Plans: `../../slices/S-012/verification/plan-r0.json`. Profile evidence: `../../slices/S-012/verification/r0/contract-0.md`, `../../slices/S-012/verification/r0/security-0.md`, `../../slices/S-012/verification/r1/contract-0.md`, `../../slices/S-012/verification/r1/security-0.md`, `../../slices/S-012/verification/r2/contract-0.md`, `../../slices/S-012/verification/r2/security-0.md`.
- Core verifier summaries: `../../slices/S-012/verify-spec-fidelity-r0.md`, `../../slices/S-012/verify-spec-fidelity-r1.md`, `../../slices/S-012/verify-spec-fidelity-r2.md`, `../../slices/S-012/verify-regression-r0.md`, `../../slices/S-012/verify-regression-r1.md`, `../../slices/S-012/verify-regression-r2.md`. Reviews: `../../slices/S-012/review-security-r2.md`, `../../slices/S-012/review-test-quality-r2.md`. Gate: `../../slices/S-012/gate-r0.md`.
- Missing sources: none for the verifiers. Reviews exist for round 2 only. The seed table has no finder field in `slices.json`, so the "Found by" column follows the verifier files. Case ids repeat across rounds; ids with an `r<n>` part mark a later case that reused an earlier number.
