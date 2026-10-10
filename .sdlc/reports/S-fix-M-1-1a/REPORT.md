# S-fix-M-1-1a · branches.py: parse is ASCII only
Verdict: RELEASED
Commit under test: e26303a (code verified at 798e216, gate at 343b145) · Rounds: 1 · Attempts: 1 · Risk: low · Written: 2026-10-10

| Requirements | Scenarios | Cases | Passed | Failed | Blocked | Blocking defects found / fixed | Open seeds |
|---|---|---|---|---|---|---|---|
| 2 | 4 | 13 | 13 | 0 | 0 | 0 / 0 | 4 |

## Summary
The slice makes `parse` in `skills/sdlc/branches.py` read ASCII only. The K sign, the long s and Arabic-Indic digits no longer make a look-alike branch a loop branch. The janitor can no longer delete such a branch. Two verifiers used the contract and cli profiles in one round. They ran 13 cases, and all passed. The contract property run compared 3000 calls to a spec model, with two seeds, and found no mismatch. The full suites passed at the gate. The verifiers found no blocking defect. Four non-blocking seeds stay open.

## Open risks
- `$` in the `parse` patterns accepts a trailing newline, so `run-1` plus a newline parses as a run branch. Git refuses newlines in branch names. The result is the same on `main`.
- `name` still lowers with `str.lower()`. Slice S-fix-M-1-1b owns that change.
- `next-action.py:207` compares ids with `str.lower()`. Parsed ids are ASCII now, so the risk is low.
- The committed unit tests cover look-alike tails for the slice, verify, attempt and run rows only. Verifier tests cover the other rows, and the verifier tests are not committed.
- The CLI has no flag for ledger ids. Only the contract profile reaches the `known` result.
- The ADR for `re.ASCII` in non-lower mode records a new choice that the spec does not state.

## Traceability
| Requirement | Spec says | Scenarios | Cases | Result |
|---|---|---|---|---|
| R-022 | "otherwise the tail between them is classified by the first regex that matches, in this order, compiled with `re.IGNORECASE` when `lower` is set:" | VS-1, VS-3, VS-4 | TC-contract-1, 2, 4, 5, 6, 7, 8; TC-cli-1, 4, 5 | pass |
| R-024 | "When `ids` (an iterable of ledger ids) is given, `id` is replaced by the ledger's spelling that matches it, case-insensitively under `lower`, and `known` says whether one matched; without `ids`, `known` is `None`." | VS-1, VS-2 | TC-contract-1, 2, 3, 6, 7, 8; TC-cli-1, 2, 3 | pass |

## Scenarios

### VS-1 · Look-alike unicode tails are no loop branch
Profiles: contract, cli. A K sign, long s or Arabic-Indic digit read as ASCII would make a look-alike branch a loop branch.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-contract-1 | Look-alike tails give None in both name modes | PASS | `.sdlc/slices/S-fix-M-1-1a/verification/r0/tests/contract-0/parse.verify-contract.test.mjs:67` |
| TC-contract-2 | Named look-alike tails give None | PASS | `.sdlc/slices/S-fix-M-1-1a/verification/r0/tests/contract-0/parse.verify-contract.test.mjs:79` |
| TC-contract-6 | `parse` equals an ASCII reference model on 3000 calls | PASS | `.sdlc/slices/S-fix-M-1-1a/verification/r0/tests/contract-0/parse.verify-contract.test.mjs:142` |
| TC-contract-7 | Same call three times gives the same result | PASS | `.sdlc/slices/S-fix-M-1-1a/verification/r0/tests/contract-0/parse.verify-contract.test.mjs:169` |
| TC-contract-8 | CLI `parse` matches `parse()` | PASS | `.sdlc/slices/S-fix-M-1-1a/verification/r0/tests/contract-0/parse.verify-contract.test.mjs:176` |
| TC-cli-1 | CLI gives kind null, exit 0, for look-alike tails in 7 row kinds and both modes | PASS | `.sdlc/slices/S-fix-M-1-1a/verification/r0/tests/cli-0/parse.verify-cli.test.mjs:11` |
| TC-cli-5 | Unknown flag exits non-zero with a JSON error; tree unchanged | PASS | `.sdlc/slices/S-fix-M-1-1a/verification/r0/tests/cli-0/parse.verify-cli.test.mjs` |

<details>
<summary>Case detail (7 cases)</summary>

#### TC-contract-1 · Look-alike tails give None in both name modes · PASS
- **Given** formats `feature/p-1-{name}` and `{name:lower}`, tails with U+212A, U+017F, U+0661, U+0663 in 7 row kinds **When** `parse` runs on each branch **Then** None for every tail.
- **Expected** None, equal to the reference model **Actual** as expected.
- **Spec source:** R-022, R-024 acceptance · **Run:** `VERIFY_REPO=$PWD node --test .sdlc/slices/S-fix-M-1-1a/verification/r0/tests/contract-0/parse.verify-contract.test.mjs`
- Property run: 60 calls (15 tails x 4 formats), 0 non-null results.

#### TC-contract-2 · Named tails · PASS
- **Given** `S-00K`, `s-00K-v0-cli-0`, `s-00K-attempt-1`, `S-001-v0663-cli-0`, `run-0663` and a long s tail **When** `parse` runs **Then** None.
- **Expected** None **Actual** as expected.
- **Spec source:** R-022, R-024 acceptance · **Run:** same command as TC-contract-1.
- Log: `logs/contract-0-run.txt`.

#### TC-contract-6 · Property: `parse` equals the ASCII reference model · PASS
- **Given** generated tails from an alphabet with look-alikes, ASCII, accents and emoji; 4 formats; optional ids **When** 3000 `parse` calls run **Then** no mismatch with a model written from the spec text.
- **Expected** 0 mismatches **Actual** 0 mismatches.
- **Spec source:** R-022, R-024 acceptance · **Run:** same command as TC-contract-1.
- Property run: property `parse equals reference model`, seed 20261010, 3000 runs (886 non-null), 0 mismatches. Second run: seed 7, 3000 runs, 0 mismatches.

#### TC-contract-7 · Determinism and no input mutation · PASS
- **Given** the same call three times with an ids list **When** `parse` runs three times **Then** the results are identical.
- **Expected** identical **Actual** identical.
- **Spec source:** R-022, R-024 acceptance · **Run:** same command as TC-contract-1.
- Log: `logs/contract-0-run.txt`.

#### TC-contract-8 · Consumer view: CLI `parse` matches `parse()` · PASS
- **Given** a scratch repo with `branchFormat` `feature/p-1-{name:lower}` **When** `branches.py parse` runs on look-alike and valid branches **Then** look-alikes give exit 0 and kind null; valid branches give the kind `parse()` gives.
- **Expected** as stated **Actual** as stated.
- **Spec source:** R-022, R-024 acceptance · **Run:** same command as TC-contract-1.

```console
s-00K -> exit 0 kind null
s-001 long s -> exit 0 kind null
run-0663 -> exit 0 kind null
m-1-e2e-é -> exit 0 kind e2e-area
s-fix-m-1-2 -> exit 0 kind slice
```

#### TC-cli-1 · Look-alike tails give kind null through the CLI (26 cases) · PASS
- **Given** a scratch git repo and the shipped `branches.py` **When** `parse` runs on K sign, long s and Arabic-Indic tails in slice, verify, attempt, run, milestone, e2e and state rows, both modes **Then** exit 0 and kind null.
- **Expected** exit 0, kind null **Actual** as expected.
- **Spec source:** R-022, R-024 acceptance · **Run:** `node --test .sdlc/slices/S-fix-M-1-1a/verification/r0/tests/cli-0/parse.verify-cli.test.mjs`

```console
51 tests, 51 pass, 0 fail
against branches.py from before the fix (26208ff^): 25 of 51 fail
```

#### TC-cli-5 · Unknown flag and repeat run · PASS
- **Given** a scratch repo **When** `parse` runs with an unknown flag, twice **Then** a non-zero exit, a JSON error, the same reply each time, and no change in the tree.
- **Expected** as stated **Actual** as stated.
- **Spec source:** R-022 acceptance · **Run:** same command as TC-cli-1.

</details>

### VS-2 · Lower mode ignores look-alike prefix, suffix and ids
Profiles: contract, cli. Lowering maps the K sign to `k`, so a look-alike affix or ledger id could match.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-contract-3 | Look-alike affix gives None; look-alike id gives `known` false; real id gives `known` true | PASS | `.sdlc/slices/S-fix-M-1-1a/verification/r0/tests/contract-0/parse.verify-contract.test.mjs:90` |
| TC-cli-2 | Look-alike prefix and suffix give null; ASCII case folding of the affix still matches | PASS | `.sdlc/slices/S-fix-M-1-1a/verification/r0/tests/cli-0/parse.verify-cli.test.mjs:73` |
| TC-cli-3 | `list` skips look-alike branches and keeps valid ones | PASS | `.sdlc/slices/S-fix-M-1-1a/verification/r0/tests/cli-0/parse.verify-cli.test.mjs:84` |

<details>
<summary>Case detail (3 cases)</summary>

#### TC-contract-3 · Lower mode ignores look-alike prefix, suffix and ledger ids · PASS
- **Given** a format with a K sign prefix, a format with a long s suffix, and ids with a K sign or long s **When** `parse` runs with and without ids **Then** a look-alike affix gives None, a look-alike id gives `known` false, and a real id gives `known` true with the ledger casing.
- **Expected** as stated **Actual** as stated.
- **Spec source:** R-024 acceptance · **Run:** `VERIFY_REPO=$PWD node --test .sdlc/slices/S-fix-M-1-1a/verification/r0/tests/contract-0/parse.verify-contract.test.mjs`

#### TC-cli-2 · Lower mode affixes · PASS
- **Given** a scratch repo **When** `parse` runs on K sign prefix, K sign suffix and long s suffix branches **Then** kind null; ASCII case folding of prefix and suffix still matches.
- **Expected** as stated **Actual** as stated.
- **Spec source:** R-024 acceptance · **Run:** `node --test .sdlc/slices/S-fix-M-1-1a/verification/r0/tests/cli-0/parse.verify-cli.test.mjs`

#### TC-cli-3 · `list` skips look-alikes · PASS
- **Given** a scratch repo with valid and look-alike branches **When** `list --kind slice` and `list --kind run` run in lower mode **Then** only valid branches appear.
- **Expected** as stated **Actual** as stated.
- **Spec source:** R-024 acceptance · **Run:** same command as TC-cli-2.
- Log: `verification/r0/logs/cli-0-test.log`.

</details>

### VS-3 · Valid ASCII tails keep their row order and kind
Profiles: contract, cli. The fix must not change the result for valid tails.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-contract-4 | Valid tails keep kind and fields; mixed case matches in lower mode | PASS | `.sdlc/slices/S-fix-M-1-1a/verification/r0/tests/contract-0/parse.verify-contract.test.mjs:109` |
| TC-cli-4 | Valid tails keep kind and id in both modes (20 cases) | PASS | `.sdlc/slices/S-fix-M-1-1a/verification/r0/tests/cli-0/parse.verify-cli.test.mjs:27` |

<details>
<summary>Case detail (2 cases)</summary>

#### TC-contract-4 · Valid ASCII tails keep kind and fields · PASS
- **Given** `S-fix-M-1-2`, `M-1-e2e-api`, `M-1-e2e-a-b`, `S-001-v0-http-api-0` and the attempt, run, milestone, e2e and state tails **When** `parse` runs in both modes **Then** kinds and fields equal the old results.
- **Expected** as stated **Actual** as stated.
- **Spec source:** R-022 acceptance · **Run:** `VERIFY_REPO=$PWD node --test .sdlc/slices/S-fix-M-1-1a/verification/r0/tests/contract-0/parse.verify-contract.test.mjs`

#### TC-cli-4 · Valid tails through the CLI · PASS
- **Given** a scratch repo **When** `parse` runs on valid tails **Then** kind and id are as before; mixed case matches in lower mode only; `M-1-e2e-é` stays e2e-area.
- **Expected** as stated **Actual** as stated.
- **Spec source:** R-022 acceptance · **Run:** `node --test .sdlc/slices/S-fix-M-1-1a/verification/r0/tests/cli-0/parse.verify-cli.test.mjs`

</details>

### VS-4 · A non-ASCII area stays an e2e-area
Profile: contract. Only the captured id must be ASCII, so the area part keeps its old behavior.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-contract-5 | `M-1-e2e-é` and `M-1-e2e-日本-😀` give e2e-area with the full area | PASS | `.sdlc/slices/S-fix-M-1-1a/verification/r0/tests/contract-0/parse.verify-contract.test.mjs:130` |

<details>
<summary>Case detail (1 case)</summary>

#### TC-contract-5 · Non-ASCII area stays e2e-area · PASS
- **Given** `M-1-e2e-é` and `M-1-e2e-日本-😀` **When** `parse` runs in both modes **Then** kind e2e-area, area `é` (or the full area), id `M-1`.
- **Expected** as stated **Actual** as stated.
- **Spec source:** R-022 acceptance · **Run:** `VERIFY_REPO=$PWD node --test .sdlc/slices/S-fix-M-1-1a/verification/r0/tests/contract-0/parse.verify-contract.test.mjs`

</details>

## How it was attacked
No security profile was needed. The security reviewer read the diff and found no blocking finding. The review confirmed ASCII-only matching and the `isascii` check on the id. It noted the trailing-newline seed.

## Defects found on the way
- **Blocking defects:** none, from any round, profile, core verifier or review.
- **Seeds:**

| Seed | Found by | File |
|---|---|---|
| `parse` accepts a trailing newline because `$` matches before it | security review, verify-contract | `skills/sdlc/branches.py` |
| `ASCII_LOWER_TABLE` has a public-looking name; rename to `_ASCII_LOWER_TABLE` | architecture review, test-quality review, verify-contract | `skills/sdlc/branches.py` |
| `name` and `next-action.py:207` still use `str.lower()` | architecture review | `skills/sdlc/branches.py` |
| Unit tests skip look-alike tails for milestone, e2e and state rows | test-quality review | `skills/sdlc/test/branches.test.mjs` |

## Appendix
- Tools: cli-runner (scratch repo run of `branches.py`); property via `pycall.py` (testkit, `.sdlc/testkit.json`).
- Plan: `../../slices/S-fix-M-1-1a/verification/plan-r0.md`. Profile evidence: `../../slices/S-fix-M-1-1a/verification/r0/cli-0.md`, `../../slices/S-fix-M-1-1a/verification/r0/contract-0.md`.
- Core verifiers: `../../slices/S-fix-M-1-1a/verify-spec-fidelity-r0.md`, `../../slices/S-fix-M-1-1a/verify-regression-r0.md`. Gate: `../../slices/S-fix-M-1-1a/gate-r0.md`.
- Reviews: `../../slices/S-fix-M-1-1a/review-architecture-r0.md`, `review-security-r0.md`, `review-test-quality-r0.md` in the same folder.
- Committed tests: `skills/sdlc/test/branches.test.mjs:2923`, `:2940`, `:2952`, `:2963`, `:2978`; `e2e/tests/parse-list.test.mjs:333` (SC-M-1-080).
- Missing sources: no failures.md exists, because the slice never failed.
