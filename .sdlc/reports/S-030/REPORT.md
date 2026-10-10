# S-030 · derive maps one simple rule to a format
Verdict: RELEASED
Commit under test: af4aea3 · Rounds: 3 · Attempts: 1 · Risk: medium · Written: 2026-10-10

| Requirements | Scenarios | Cases | Passed | Failed | Blocked | Blocking defects found / fixed | Open seeds |
|---|---|---|---|---|---|---|---|
| 5 | 5 | 16 | 16 | 0 | 0 | 3 / 2 | 8 |

## Summary
The slice pins the branch-format derivation for one simple branch-name rule. A `starts_with`, `ends_with` or `contains` rule now gives a fixed format, and pre-flight reports it as derived.
The slice changes no product code. Slice S-016 built `derive`, so the new tests are characterization tests.
Two profiles checked it in round 0: `cli` (pre-flight and `name` in scratch repos with a `gh` shim) and `contract` (`derive` called directly, with 3000 generated rule lists).
Reviewers found two duplicate tests. Fix rounds 1 and 2 deleted them. Rounds 1 and 2 held, and the full suite passes.
Review also named a third duplicate, T-R-141a. It stays in the slice as an accepted overlap, because it pins the literals of R-141.

## Open risks
- Review round 2 marked T-R-141a as a duplicate and blocking. The slice kept the test. The overlap costs run time only.
- Pre-flight can suggest a format that `validate_format` rejects. A `starts_with` rule with prefix `my team/` gives `derived` false and a suggestion with a space.
- A prefix with no trailing slash derives `featuresdlc/{name}`. The format is valid, but the user probably wants a slash.
- The spec does not say what an empty pattern gives. The code returns no format.
- The verifier cases for `my team/` and for an unknown rule kind exist only in the verification tests. No committed test holds them.
- Rounds 1 and 2 re-ran no verifier profile. Their results come from the core verifiers and the full suite.

## Traceability
| Requirement | Spec says | Scenarios | Cases | Result |
|---|---|---|---|---|
| R-123 | `starts_with P` gives `P` + `sdlc/{name}` | VS-1 | TC-cli-1, TC-cli-2, TC-contract-1, TC-contract-5, TC-contract-6 | pass |
| R-124 | `ends_with S` gives `sdlc/{name}` + `S` | VS-2 | TC-cli-3, TC-cli-4, TC-contract-2, TC-contract-5, TC-contract-6 | pass |
| R-125 | `contains C` gives `sdlc/` + `C` + `/{name}` | VS-3 | TC-cli-5, TC-contract-3, TC-contract-5, TC-contract-6 | pass |
| R-126 | derive `fmt2` from the table below, evaluate the samples again under it, and when they all pass, `ok` is `true` with `fmt2` and `derived` `true`. | VS-4, VS-5 | TC-cli-6, TC-cli-7, TC-cli-8, TC-contract-4 | pass |
| R-141 | `evaluate(rule, sample)` and `derive(rules)`: sections 3 and 4. | VS-1, VS-2, VS-3, VS-5 | TC-cli-1, TC-cli-3, TC-cli-5, TC-cli-7, TC-contract-1 to TC-contract-8 | pass |

## Scenarios
Committed tests guard each requirement: T-R-123a, T-R-124a, T-R-125a, T-R-141a, T-R-141b, and T-R-042a and T-R-042c for R-126, all in `skills/sdlc/test/branches.test.mjs`.

### VS-1 · A starts_with rule gives a prefixed format
Profiles: cli, contract. Risk: a wrong prefix would make pre-flight accept or reject real branch names.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-1 | `feature/` gives `feature/sdlc/{name}`, prefixed samples, `name` prints `feature/sdlc/S-001` | PASS | `.sdlc/slices/S-030/verification/r0/tests/cli-0/derive.verify-cli.test.mjs:20` |
| TC-cli-2 | Prefix with regex characters is spliced verbatim; a space is not derivable | PASS | `.sdlc/slices/S-030/verification/r0/tests/cli-0/derive.verify-cli.test.mjs:29` |
| TC-contract-1 | `derive` returns `feature/sdlc/{name}` | PASS | `.sdlc/slices/S-030/verification/r0/tests/contract-0/derive.verify-contract.test.mjs:20` |
| TC-contract-5 | Odd patterns (100000 characters, unicode, braces) are spliced verbatim | PASS | `.sdlc/slices/S-030/verification/r0/tests/contract-0/derive.verify-contract.test.mjs:38` |
| TC-contract-6 | `derive` equals a reference model for 3000 generated rule lists | PASS | `.sdlc/slices/S-030/verification/r0/tests/contract-0/derive.verify-contract.test.mjs:44` |
| TC-contract-8 | `derive(rules)` is the single entry point | PASS | `.sdlc/slices/S-030/verification/r0/tests/contract-0/derive.verify-contract.test.mjs:77` |

<details>
<summary>Case detail (6 cases)</summary>

#### TC-cli-1 · starts_with feature/ gives feature/sdlc/{name} · PASS
- **Given** a scratch git repo, `gitMode` pr, a `gh` shim that returns the rule **When** `branches.py preflight --mode pr` runs **Then** exit 0, `ok`, `derived`, the format.
- **Expected** slice and e2e samples exact, state sample prefix plus 14 digits **Actual** as expected. `name --format` prints `feature/sdlc/S-001`.
- **Spec source:** R-123 acceptance · **Run:** `VERIFY_LOG=$PWD/.sdlc/slices/S-030/verification/r0/logs/cli-0 node --test .sdlc/slices/S-030/verification/r0/tests/cli-0/derive.verify-cli.test.mjs`
- Evidence: transcript, [cli-0.transcripts.txt](../../slices/S-030/verification/r0/logs/cli-0.transcripts.txt)

#### TC-cli-2 · Prefix corners · PASS
- **Given** prefixes `f.+(a)/`, `feature`, `my team/` **When** pre-flight runs **Then** the prefix is spliced as written; a space is not derivable.
- **Expected** literal concatenation **Actual** `f.+(a)/sdlc/{name}` derived; `featuresdlc/{name}` derived; `my team/` gives `derived` false, exit 1.
- **Spec source:** R-123 acceptance
- Evidence: transcript, [cli-0.transcripts.txt](../../slices/S-030/verification/r0/logs/cli-0.transcripts.txt)

#### TC-contract-1 · starts_with feature/ derives feature/sdlc/{name} · PASS
- **Given** the rule list `[starts_with feature/]` **When** `derive` runs through `pycall.py` **Then** it returns `feature/sdlc/{name}`.
- **Spec source:** R-123, R-141 · **Run:** `node --test .sdlc/slices/S-030/verification/r0/tests/contract-0/derive.verify-contract.test.mjs`
- Evidence: log, [contract-0.log](../../slices/S-030/verification/r0/logs/contract-0.log)

#### TC-contract-5 · Odd patterns are spliced verbatim · PASS
- **Given** patterns of 100000 characters, unicode, braces and spaces **When** `derive` runs **Then** the output equals the reference model.
- **Spec source:** R-123, R-124, R-125

#### TC-contract-6 · Property run · PASS
- Property: `derive` equals the model written from the R-141 text. 3000 generated lists (0 to 3 rules, six kinds, negate, unicode). Inputs stay unchanged and a second call gives an equal value. Result: pass.

#### TC-contract-8 · Consumer view · PASS
- **Given** the module loaded by path **When** its names are listed **Then** only `DERIVE_FORMATS` and `derive` start with `derive`, and `derive` takes `(rules)`.

</details>

### VS-2 · An ends_with rule gives a suffixed format
Profiles: cli, contract. Risk: a wrong suffix would reject valid branch names.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-3 | `-dev` gives `sdlc/{name}-dev`, exit 0, slice sample `sdlc/S-001-dev` | PASS | `.sdlc/slices/S-030/verification/r0/tests/cli-0/derive.verify-cli.test.mjs:52` |
| TC-cli-4 | Suffixes `.x`, `-` and `_dev` give the literal suffix | PASS | `.sdlc/slices/S-030/verification/r0/tests/cli-0/derive.verify-cli.test.mjs:58` |
| TC-contract-2 | `derive` returns `sdlc/{name}-dev` | PASS | `.sdlc/slices/S-030/verification/r0/tests/contract-0/derive.verify-contract.test.mjs:23` |

<details>
<summary>Case detail (3 cases)</summary>

#### TC-cli-3 · ends_with -dev · PASS
- **Given** a `gh` shim with the rule `ends_with -dev`, no format flag **When** pre-flight runs **Then** `ok` true, `derived` true, format `sdlc/{name}-dev`, exit 0.
- **Expected** as stated **Actual** as expected. **Spec source:** R-124 acceptance
- Evidence: transcript, [cli-0.transcripts.txt](../../slices/S-030/verification/r0/logs/cli-0.transcripts.txt)

#### TC-cli-4 · Suffix corners · PASS
- **Given** suffixes `.x`, `-`, `_dev` **When** pre-flight runs **Then** the format ends with the literal suffix. Actual: as expected.

#### TC-contract-2 · derive for ends_with -dev · PASS
- `derive` returns `sdlc/{name}-dev`.

</details>

### VS-3 · A contains rule gives an infix format
Profiles: cli, contract. Risk: a wrong infix would place the team segment in the wrong position.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-5 | `team-a` gives `sdlc/team-a/{name}`, exit 0 | PASS | `.sdlc/slices/S-030/verification/r0/tests/cli-0/derive.verify-cli.test.mjs:71` |
| TC-contract-3 | `derive` returns `sdlc/team-a/{name}` | PASS | `.sdlc/slices/S-030/verification/r0/tests/contract-0/derive.verify-contract.test.mjs:26` |

<details>
<summary>Case detail (2 cases)</summary>

#### TC-cli-5 · contains team-a · PASS
- **Given** a `gh` shim with the rule `contains team-a`, no format flag **When** pre-flight runs **Then** `ok` true, `derived` true, format `sdlc/team-a/{name}`, exit 0. Actual: as expected.
- **Spec source:** R-125 acceptance
- Evidence: transcript, [cli-0.transcripts.txt](../../slices/S-030/verification/r0/logs/cli-0.transcripts.txt)

#### TC-contract-3 · derive for contains team-a · PASS
- `derive` returns `sdlc/team-a/{name}`.

</details>

### VS-4 · A derived format that passes every sample is reported clean
Profiles: cli. Risk: pre-flight could report a failing sample under a format it claims is derived.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-6 | Every sample has result `pass` and `rule` null. No sample fails. The repo tree stays unchanged. | PASS | `.sdlc/slices/S-030/verification/r0/tests/cli-0/derive.verify-cli.test.mjs:80` |

<details>
<summary>Case detail (1 case)</summary>

#### TC-cli-6 · Derived format passes every sample · PASS
- **Given** the rule `starts_with feature/` **When** pre-flight runs **Then** format `feature/sdlc/{name}`, `derived` true, all samples `pass`, `rule` null.
- **Expected** no `fail` sample **Actual** as expected. **Spec source:** R-126 acceptance
- Evidence: transcript, [cli-0.transcripts.txt](../../slices/S-030/verification/r0/logs/cli-0.transcripts.txt)

</details>

### VS-5 · Derivation does not apply, so no format is derived
Profiles: cli, contract. Risk: a wrong derivation would replace a format the user chose or guess for an unclear rule.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-7 | Flag, config, two rules, regex rule and three negated rules keep `derived` false, `ok` false, exit 1 | PASS | `.sdlc/slices/S-030/verification/r0/tests/cli-0/derive.verify-cli.test.mjs:104` |
| TC-cli-8 | An empty rule list passes; an unknown operator leaves samples unevaluated | PASS | `.sdlc/slices/S-030/verification/r0/tests/cli-0/derive.verify-cli.test.mjs:114` |
| TC-contract-4 | `derive` returns no format for regex, negated, two-rule, empty and unknown-kind input | PASS | `.sdlc/slices/S-030/verification/r0/tests/contract-0/derive.verify-contract.test.mjs:29` |
| TC-contract-7 | `derive` does not change its input and gives equal output on a second call | PASS | `.sdlc/slices/S-030/verification/r0/tests/contract-0/derive.verify-contract.test.mjs:65` |

<details>
<summary>Case detail (4 cases)</summary>

#### TC-cli-7 · No derivation · PASS
- **Given** seven setups: format by flag, format by config, two rules, negated `starts_with`, regex, negated `ends_with`, negated `contains` **When** pre-flight runs **Then** `derived` false, `ok` false, exit 1 in all seven.
- **Expected** the given format for flag and config, `sdlc/{name}` for the others **Actual** as expected in all 7 cases. **Spec source:** R-126 acceptance

#### TC-cli-8 · Empty list and unknown operator · PASS
- **Actual** empty list: exit 0, `ok`. Unknown operator `frobnicate`: exit 0, samples unevaluated, note `cannot evaluate r: unknown kind frobnicate`, `derived` false.

#### TC-contract-4 · No format for non-derivable input · PASS
- Actual: `None` for every input.

#### TC-contract-7 · No mutation, deterministic · PASS
- Actual: equal values and equal rules after the call.

</details>

## How it was attacked
No security profile was needed. The slice adds tests only and no input path. Security review rounds 0, 1 and 2 found nothing and left `needsVerify` false.

## Defects found on the way
- **Blocking defects**
  - T-R-126b duplicated T-R-042c (five identical cases). Found by review, round 0. Spec source: R-126. Fixed in `6774c81`, which deletes T-R-126b. T-R-042c guards R-126.
  - T-R-126a duplicated T-R-042a (same preflight, same rule). Found by review, round 1. Spec source: R-126. Fixed in `24e36d6`, which deletes T-R-126a and adds the `rule` null assertion to T-R-042a (`skills/sdlc/test/branches.test.mjs:2290`).
  - T-R-141a duplicates the derive assertions of T-R-123a to T-R-125a. Found by the test-quality review, round 2. Spec source: R-141. Not fixed. The slice accepted it as an overlap that pins the acceptance literals (see Open risks). Reproduce: compare `skills/sdlc/test/branches.test.mjs:2431` to `:2476`.
- **Seeds**

| Seed | Found by | File |
|---|---|---|
| Formatting slips around the new tests (blank lines) | review | `skills/sdlc/test/branches.test.mjs` |
| T-R-141a and T-R-123a to T-R-125a overlap T-R-042a, T-R-042b and T-R-042f | review | `skills/sdlc/test/branches.test.mjs` |
| T-R-141b mostly repeats T-R-042c and T-R-042f | review | `skills/sdlc/test/branches.test.mjs` |
| T-R-124a and T-R-125a repeat T-R-042b with other literals | review | `skills/sdlc/test/branches.test.mjs` |
| Blank-line formatting in the diff | review | `skills/sdlc/test/branches.test.mjs` |
| Verifier corner `my team/` is not promoted to a committed test | review | `.sdlc/slices/S-030/verification/r0/tests/cli-0/derive.verify-cli.test.mjs` |
| Pre-flight suggests a format that `validate_format` rejects | review | `skills/sdlc/branches.py` |
| `derive` returns no format for an empty pattern; the spec is silent | review | `skills/sdlc/branches.py` |

## Appendix
- Toolkit tools: cli-runner, stub-server (`gh` shim), property (`pycall.py`), from `.sdlc/testkit.json`.
- Round 0 plan: [plan-r0.md](../../slices/S-030/verification/plan-r0.md). Profile evidence: [cli-0.md](../../slices/S-030/verification/r0/cli-0.md), [contract-0.md](../../slices/S-030/verification/r0/contract-0.md).
- Other plans: [plan-r1.md](../../slices/S-030/verification/plan-r1.md), [plan-r2.md](../../slices/S-030/verification/plan-r2.md).
- Core verifiers: [spec-fidelity r0](../../slices/S-030/verify-spec-fidelity-r0.md), [r1](../../slices/S-030/verify-spec-fidelity-r1.md), [r2](../../slices/S-030/verify-spec-fidelity-r2.md); [regression r0](../../slices/S-030/verify-regression-r0.md), [r1](../../slices/S-030/verify-regression-r1.md), [r2](../../slices/S-030/verify-regression-r2.md).
- Gate: [gate-r0.md](../../slices/S-030/gate-r0.md), 755 passed, 0 failed, 1 skipped.
- Missing sources: the test-quality reviews for rounds 0 and 1, and the fix-round verifier profile files (rounds 1 and 2 ran no profile).
