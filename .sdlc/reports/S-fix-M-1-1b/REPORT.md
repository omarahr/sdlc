# S-fix-M-1-1b · branches.py: name refuses ids that do not round-trip
Verdict: RELEASED
Commit under test: e979556 (code verified at e979556, gate at 3566ff2) · Rounds: 2 · Attempts: 1 · Risk: medium · Written: 2026-10-10

| Requirements | Scenarios | Cases | Passed | Failed | Blocked | Blocking defects found / fixed | Open seeds |
|---|---|---|---|---|---|---|---|
| 2 | 9 | 35 | 35 | 0 | 0 | 1 / 1 | 7 |

## Summary
The slice makes `name` in `skills/sdlc/branches.py` parse its own output. `name` now raises `Fail` when the branch reads back as another kind or part. Ids such as `S-001-attempt-2` and `S-001-v0-cli-0` can no longer become a slice branch that the loop reads as an attempt or verify branch. `name` and `next-action.py` now lower ids with one ASCII rule. Four verifiers used the contract, cli, security and i18n profiles in round 0. They found one blocking defect: `name` accepted a state timestamp with a trailing line feed. The fix passed a second contract round, and the full suites passed at the gate. Seven non-blocking seeds stay open.

## Open risks
- `name` accepts a padded or signed `--n` (` 2`, `+2`) and fullwidth digits for integer parts. The printed name is ASCII and parses back to the same value, so no spec text demands a refusal.
- `name` accepts an e2e-area text that git refuses, such as `../../x`. The spec states no area rule.
- `next-action.py` calls the private helper `branches._ascii_lower`. A rename would break it.
- `INTEGER_PARTS` sits after the helpers that use it. This works at run time.
- The `withIdPrefix` self-test in the i18n kit builds the text `S-00S-00K`. The check passes but reads as a mistake.
- ADR-20261011-000000-implementer-S-fix-M-1-1b-a1c0: SC-M-1-048 now accepts exit 2 from `name` for tails that do not parse back. The JS literal check stays.
- The verifier tests are not committed to the suite. Only the promoted tests in `branches.test.mjs` and `next-action.test.mjs` guard the behavior.

## Traceability
| Requirement | Spec says | Scenarios | Cases | Result |
|---|---|---|---|---|
| R-019 | "`name(fmt, kind, **parts)`: the format with the placeholder replaced by the tail, lowercased for `{name:lower}`." Acceptance: every name output parses back to the same kind and parts. | VS-1 to VS-7, VS-9 | TC-contract-1 to 10; TC-cli-1 to 5; TC-i18n-1 to 5; TC-security-1 to 6 | pass |
| R-053 | "keep those `parse` classifies as `slice`, and use the parsed `id` as `sid`." Acceptance: a foreign branch never reads as active. | VS-8 | TC-cli-6; TC-i18n-6 to 9; TC-security-7 to 10 | pass |

## Scenarios

### VS-1 · name refuses ids that parse as another kind
Profiles: contract, cli, security. A kind-confusing id could make the loop treat a slice branch as an attempt or verify branch.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-1 | name refuses slice and milestone ids that parse as another kind | PASS | `.sdlc/slices/S-fix-M-1-1b/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:23` |
| TC-contract-1 | name refuses ids that parse as another kind | PASS | `.sdlc/slices/S-fix-M-1-1b/verification/r0/tests/contract-0/branches-name.verify-contract.test.mjs:60` |
| TC-security-1 | name refuses ids that parse as attempt or verify under slice and milestone kinds | PASS | `.sdlc/slices/S-fix-M-1-1b/verification/r0/tests/security-0/branches.verify-security.test.mjs:15` |
| TC-security-4 | shell, newline, traversal and flag-like ids are refused with no side effect | PASS | `.sdlc/slices/S-fix-M-1-1b/verification/r0/tests/security-0/branches.verify-security.test.mjs:50` |
| TC-security-5 | valid names still succeed | PASS | `.sdlc/slices/S-fix-M-1-1b/verification/r0/tests/security-0/branches.verify-security.test.mjs:57` |
| TC-security-6 | parse still reads kind-confusing strings as attempt and verify | PASS | `.sdlc/slices/S-fix-M-1-1b/verification/r0/tests/security-0/branches.verify-security.test.mjs:63` |

<details>
<summary>Case detail (6 cases)</summary>

#### TC-cli-1 · name refuses slice and milestone ids that parse as another kind · PASS
- **Given** scratch git repo, format sdlc/{name} **When** branches.py name --kind slice|milestone --id S-001-attempt-2 | S-001-v0-cli-0 | S-001-attempt-0 | S-001-v10-a-b-3 **Then** exit 2, ok false, no branch key, tree unchanged, parse still reads these as attempt or verify
- **Expected** exit 2, ok false, no branch key, tree unchanged, parse still reads these as attempt or verify **Actual** all 8 runs exit 2 with ok false and an error naming the kind; tree unchanged; parse did not read a slice
- **Spec source:** R-019 acceptance · **Run:** `VERIFY_ROOT=$PWD node --test .sdlc/slices/S-fix-M-1-1b/verification/r0/tests/cli-0/branches.verify-cli.test.mjs` · **Round:** 0
- Evidence (transcript, full run log): `.sdlc/slices/S-fix-M-1-1b/verification/r0/logs/cli-0-run.txt`
- Evidence (transcript, sample):

```text
exit: 2
{"ok": false, "error": "the slice branch name 'sdlc/S-001-attempt-2' does not parse back as a slice branch: parse reads kind attempt"}
exit: 2
{"ok": false, "error": "the slice branch name 'sdlc/S-001-v0-cli-0' does not parse back as a slice branch: parse reads kind verify"}
```

#### TC-contract-1 · name refuses ids that parse as another kind · PASS
- **Given** format sdlc/{name} and sdlc/{name:lower}; kinds slice and milestone; ids S-001-attempt-2, S-001-v0-cli-0, S-001-attempt-0, S-001-v10-a-b-3 **When** call name **Then** every call raises Fail that names the kind and the branch; parse still reads the ids as attempt and verify
- **Expected** every call raises Fail that names the kind and the branch; parse still reads the ids as attempt and verify **Actual** 16 of 16 calls raised Fail, for example: the slice branch name 'sdlc/S-001-attempt-2' does not parse back as a slice branch: parse reads kind attempt. parse reads attempt and verify as before.
- **Spec source:** R-019 acceptance · **Run:** `VERIFY_WORKTREE=<worktree of sdlc/S-fix-M-1-1b> VERIFY_LOG=<log> node --test .sdlc/slices/S-fix-M-1-1b/verification/r0/tests/contract-0/branches-name.verify-contract.test.mjs` · **Round:** 0
- Evidence (property-run, run): property-run: 16 example calls, 0 violations Log: `.sdlc/slices/S-fix-M-1-1b/verification/r0/logs/contract-0-cases.jsonl`.

#### TC-security-1 · name refuses ids that parse as attempt or verify under slice and milestone kinds · PASS
- **Given** Formats {name}, {name:lower}, feature/{name}; ids S-001-attempt-2, S-001-v0-cli-0, S-001-attempt-0, S-001-v10-a-b-3 **When** branches.py name --kind slice|milestone --id <id> **Then** exit 2, ok false, no branch printed, no traceback, tree unchanged
- **Expected** Fail for all 24 combinations **Actual** All 24 refused with exit 2; parse still reads the same strings as attempt and verify (TC-security-6)
- **Spec source:** R-019 acceptance: every name output parses back to the same kind and parts · **Run:** `SKILL_DIR=<worktree>/skills/sdlc KIT_DIR=<worktree>/skills/sdlc/test/testkit node --test .sdlc/slices/S-fix-M-1-1b/verification/r0/tests/security-0/branches.verify-security.test.mjs` · **Round:** 0
- Evidence (attack, name refusal):

```text
S-001-attempt-2 -> exit 2 {ok:false}: the slice branch name 'S-001-attempt-2' does not parse back as a slice branch: parse reads kind attempt
```
- Evidence (log, test run): `.sdlc/slices/S-fix-M-1-1b/verification/r0/logs/security-0-run.txt`

#### TC-security-4 · shell, newline, traversal and flag-like ids are refused with no side effect · PASS
- **Given** ids 'S-001; touch pwned', 'S-001$(touch pwned)', 'S-001\nS-002', 'S-001/../../etc', '-S-001', 'S-001..x', 'S-001.lock' **When** name --kind slice **Then** exit 2, tree unchanged (no pwned file, no new ref)
- **Expected** Fail **Actual** All refused; tree diff empty
- **Spec source:** R-019 acceptance · **Run:** `SKILL_DIR=<worktree>/skills/sdlc KIT_DIR=<worktree>/skills/sdlc/test/testkit node --test .sdlc/slices/S-fix-M-1-1b/verification/r0/tests/security-0/branches.verify-security.test.mjs` · **Round:** 0
- Evidence (attack, tree):

```text
tree unchanged for all 7
```
- Evidence (log, test run): `.sdlc/slices/S-fix-M-1-1b/verification/r0/logs/security-0-run.txt`

#### TC-security-5 · valid names still succeed · PASS
- **Given** S-fix-M-1-2 under sdlc/{name:lower}; attempt n=02 **When** name **Then** sdlc/s-fix-m-1-2 and sdlc/S-001-attempt-2
- **Expected** success **Actual** as expected
- **Spec source:** R-019 acceptance · **Run:** `SKILL_DIR=<worktree>/skills/sdlc KIT_DIR=<worktree>/skills/sdlc/test/testkit node --test .sdlc/slices/S-fix-M-1-1b/verification/r0/tests/security-0/branches.verify-security.test.mjs` · **Round:** 0
- Evidence (attack, valid):

```text
exit 0
```
- Evidence (log, test run): `.sdlc/slices/S-fix-M-1-1b/verification/r0/logs/security-0-run.txt`

#### TC-security-6 · parse still reads kind-confusing strings as attempt and verify · PASS
- **Given** sdlc/S-001-attempt-2, sdlc/S-001-v0-cli-0 **When** branches.py parse **Then** kinds attempt and verify
- **Expected** unchanged parse **Actual** as expected
- **Spec source:** R-019 acceptance · **Run:** `SKILL_DIR=<worktree>/skills/sdlc KIT_DIR=<worktree>/skills/sdlc/test/testkit node --test .sdlc/slices/S-fix-M-1-1b/verification/r0/tests/security-0/branches.verify-security.test.mjs` · **Round:** 0
- Evidence (attack, parse):

```text
kind attempt / kind verify
```
- Evidence (log, test run): `.sdlc/slices/S-fix-M-1-1b/verification/r0/logs/security-0-run.txt`

</details>

### VS-2 · Valid parts of every kind keep their names and parse back
Profiles: contract, cli. The new check could refuse a name that was valid before.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-2 | valid parts of every kind keep names and parse back | PASS | `.sdlc/slices/S-fix-M-1-1b/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:37` |
| TC-contract-2 | valid parts of every kind keep their names and parse back | PASS | `.sdlc/slices/S-fix-M-1-1b/verification/r0/tests/contract-0/branches-name.verify-contract.test.mjs:76` |
| TC-contract-10 | property: name is deterministic | PASS | `.sdlc/slices/S-fix-M-1-1b/verification/r0/tests/contract-0/branches-name.verify-contract.test.mjs:283` |

<details>
<summary>Case detail (3 cases)</summary>

#### TC-cli-2 · valid parts of every kind keep names and parse back · PASS
- **Given** scratch repo, 4 formats (sdlc/{name}, feature/PROJ-{name:lower}-x, {name}, a/{name:lower}) **When** name for run, slice (S-fix-M-1-2, S-001-e2e), milestone, e2e, e2e-area, state, verify, attempt, then parse the output **Then** exit 0, expected tail, parse returns the same kind and parts
- **Expected** exit 0, expected tail, parse returns the same kind and parts **Actual** 36 name runs and 36 parse runs matched kind and parts
- **Spec source:** R-019 acceptance · **Run:** `VERIFY_ROOT=$PWD node --test .sdlc/slices/S-fix-M-1-1b/verification/r0/tests/cli-0/branches.verify-cli.test.mjs` · **Round:** 0
- Evidence (transcript, full run log): `.sdlc/slices/S-fix-M-1-1b/verification/r0/logs/cli-0-run.txt`
- Evidence (transcript, sample):

```text
name --kind slice --id S-fix-M-1-2 -> sdlc/S-fix-M-1-2 (exit 0); parse -> kind slice
```

#### TC-contract-2 · valid parts of every kind keep their names and parse back · PASS
- **Given** 4 formats x 11 valid kind and part sets, including S-fix-M-1-2, S-001-e2e and n='07' **When** call name, then parse **Then** name equals the reference name built from the spec; parse returns the same kind and parts
- **Expected** name equals the reference name built from the spec; parse returns the same kind and parts **Actual** 44 of 44 names equal the reference and parse back; name('sdlc/{name}','slice',id='S-001') is sdlc/S-001
- **Spec source:** R-019 acceptance · **Run:** `VERIFY_WORKTREE=<worktree of sdlc/S-fix-M-1-1b> VERIFY_LOG=<log> node --test .sdlc/slices/S-fix-M-1-1b/verification/r0/tests/contract-0/branches-name.verify-contract.test.mjs` · **Round:** 0
- Evidence (property-run, run): property-run: 44 example calls, 0 violations Log: `.sdlc/slices/S-fix-M-1-1b/verification/r0/logs/contract-0-cases.jsonl`.

#### TC-contract-10 · property: name is deterministic · PASS
- **Given** seed 20261013; 500 valid calls **When** call name twice per input **Then** both batches are equal
- **Expected** both batches are equal **Actual** 500 of 500 equal
- **Spec source:** R-019 acceptance · **Run:** `VERIFY_WORKTREE=<worktree of sdlc/S-fix-M-1-1b> VERIFY_LOG=<log> node --test .sdlc/slices/S-fix-M-1-1b/verification/r0/tests/contract-0/branches-name.verify-contract.test.mjs` · **Round:** 0
- Evidence (property-run, run): property-run: property=determinism seed=20261013 runs=500 result=0 violations Log: `.sdlc/slices/S-fix-M-1-1b/verification/r0/logs/contract-0-cases.jsonl`.

</details>

### VS-3 · Non-ASCII ids and parts are refused where parse refuses them
Profiles: contract, i18n, security. A look-alike letter could alias an ASCII id.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-contract-3 | non-ASCII ids and parts are refused | PASS | `.sdlc/slices/S-fix-M-1-1b/verification/r0/tests/contract-0/branches-name.verify-contract.test.mjs:94` |
| TC-i18n-1 | Non-ASCII slice ids are refused under {name} and {name:lower} | PASS | `.sdlc/slices/S-fix-M-1-1b/verification/r0/tests/i18n-0/names.verify-i18n.test.mjs:11` |
| TC-i18n-2 | Non-ASCII milestone and e2e ids refused; fullwidth and Arabic-Indic n give ASCII name | PASS | `.sdlc/slices/S-fix-M-1-1b/verification/r0/tests/i18n-0/names.verify-i18n.test.mjs:24` |
| TC-i18n-3 | parse refuses the same non-ASCII ids | PASS | `.sdlc/slices/S-fix-M-1-1b/verification/r0/tests/i18n-0/names.verify-i18n.test.mjs:37` |
| TC-security-2 | non-ASCII slice ids refused under {name} and {name:lower} | PASS | `.sdlc/slices/S-fix-M-1-1b/verification/r0/tests/security-0/branches.verify-security.test.mjs:27` |
| TC-security-3 | integer parts that are not decimal integers are refused; unicode digits cannot reach the branch | PASS | `.sdlc/slices/S-fix-M-1-1b/verification/r0/tests/security-0/branches.verify-security.test.mjs:37` |

<details>
<summary>Case detail (6 cases)</summary>

#### TC-contract-3 · non-ASCII ids and parts are refused · PASS
- **Given** ids with U+212A, U+017F, U+00E9, fullwidth digits, U+0130; integer parts with fullwidth and Arabic-indic digits; formats {name} and {name:lower}; kinds slice, milestone, e2e, attempt, verify, e2e-area, run **When** call name **Then** every call raises Fail
- **Expected** every call raises Fail **Actual** all calls raised Fail; fullwidth digits never pass as integers
- **Spec source:** R-019 acceptance · **Run:** `VERIFY_WORKTREE=<worktree of sdlc/S-fix-M-1-1b> VERIFY_LOG=<log> node --test .sdlc/slices/S-fix-M-1-1b/verification/r0/tests/contract-0/branches-name.verify-contract.test.mjs` · **Round:** 0
- Evidence (property-run, run): property-run: about 150 example calls, 0 violations Log: `.sdlc/slices/S-fix-M-1-1b/verification/r0/logs/contract-0-cases.jsonl`.

#### TC-i18n-1 · Non-ASCII slice ids are refused under {name} and {name:lower} · PASS
- **Given** format p/{name} and p/{name:lower}; ids with Kelvin, long s, dotted I, sharp s, e-acute, fullwidth digits **When** branches.py name --kind slice --id <id> **Then** exit 2, ok false, no branch key, repo tree unchanged
- **Expected** exit 2, ok false, no branch key, repo tree unchanged **Actual** exit 2, ok false, no branch key, repo tree unchanged
- **Spec source:** R-019 acceptance: every name output parses back · **Run:** `node --test .sdlc/slices/S-fix-M-1-1b/verification/r0/tests/i18n-0/names.verify-i18n.test.mjs` · **Round:** 0
- Evidence (log, test run): `.sdlc/slices/S-fix-M-1-1b/verification/r0/logs/i18n-0-run.txt`

#### TC-i18n-2 · Non-ASCII milestone and e2e ids refused; fullwidth and Arabic-Indic n give ASCII name · PASS
- **Given** kind milestone/e2e with id M-e-acute; kind run with n fullwidth 2 or Arabic-Indic 2 **When** branches.py name **Then** milestone/e2e exit 2; run gives p/run-2 and parse reads n 2
- **Expected** milestone/e2e exit 2; run gives p/run-2 and parse reads n 2 **Actual** milestone/e2e exit 2; run gives p/run-2 and parse reads n 2
- **Spec source:** R-019 acceptance · **Run:** `node --test .sdlc/slices/S-fix-M-1-1b/verification/r0/tests/i18n-0/names.verify-i18n.test.mjs` · **Round:** 0
- Evidence (log, test run): `.sdlc/slices/S-fix-M-1-1b/verification/r0/logs/i18n-0-run.txt`

#### TC-i18n-3 · parse refuses the same non-ASCII ids · PASS
- **Given** branch p/S-00<U+212A> and p/S-00<e-acute> **When** branches.py parse **Then** kind is not slice
- **Expected** kind is not slice **Actual** kind is not slice
- **Spec source:** R-019 acceptance · **Run:** `node --test .sdlc/slices/S-fix-M-1-1b/verification/r0/tests/i18n-0/names.verify-i18n.test.mjs` · **Round:** 0
- Evidence (log, test run): `.sdlc/slices/S-fix-M-1-1b/verification/r0/logs/i18n-0-run.txt`

#### TC-security-2 · non-ASCII slice ids refused under {name} and {name:lower} · PASS
- **Given** Ids with U+212A, U+017F, e, fullwidth digit, zero width space, Cyrillic a **When** branches.py name --kind slice --id <id> **Then** exit 2, ok false, no branch
- **Expected** Fail for all 12 combinations **Actual** All refused
- **Spec source:** R-019 acceptance · **Run:** `SKILL_DIR=<worktree>/skills/sdlc KIT_DIR=<worktree>/skills/sdlc/test/testkit node --test .sdlc/slices/S-fix-M-1-1b/verification/r0/tests/security-0/branches.verify-security.test.mjs` · **Round:** 0
- Evidence (attack, Kelvin id):

```text
S-00K (U+212A) -> exit 2, parse reads no kind
```
- Evidence (log, test run): `.sdlc/slices/S-fix-M-1-1b/verification/r0/logs/security-0-run.txt`

#### TC-security-3 · integer parts that are not decimal integers are refused; unicode digits cannot reach the branch · PASS
- **Given** --n values -1, 0x2, 2.0, 1e2, 2;x; fullwidth 2, Arabic-indic 2, '2\n', ' 2', '+2' **When** branches.py name --kind attempt **Then** invalid forms exit 2; accepted forms yield ASCII S-001-attempt-2
- **Expected** No non-ASCII digit in any output **Actual** argparse int() normalizes unicode digits to 2 and the output stays ASCII; invalid forms refused
- **Spec source:** R-019 acceptance · **Run:** `SKILL_DIR=<worktree>/skills/sdlc KIT_DIR=<worktree>/skills/sdlc/test/testkit node --test .sdlc/slices/S-fix-M-1-1b/verification/r0/tests/security-0/branches.verify-security.test.mjs` · **Round:** 0
- Evidence (attack, fullwidth n):

```text
--n '２' -> branch S-001-attempt-2
```
- Evidence (log, test run): `.sdlc/slices/S-fix-M-1-1b/verification/r0/logs/security-0-run.txt`

</details>

### VS-4 · Integer parts compare by value
Profiles: contract, cli. A part type mismatch could cause a false refusal.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-3 | integer parts compare by value | PASS | `.sdlc/slices/S-fix-M-1-1b/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:73` |
| TC-contract-4 | integer parts compare by value | PASS | `.sdlc/slices/S-fix-M-1-1b/verification/r0/tests/contract-0/branches-name.verify-contract.test.mjs:114` |

<details>
<summary>Case detail (2 cases)</summary>

#### TC-cli-3 · integer parts compare by value · PASS
- **Given** scratch repo **When** name --n 02; verify --round 007 --part 00; bad ints 2.0, ' 2', '+2', '0x2', True, abc, '', fullwidth digits, -1, 5000-digit string **Then** valid ones succeed and parse back by value; bad ones give JSON ok false, no traceback
- **Expected** valid ones succeed and parse back by value; bad ones give JSON ok false, no traceback **Actual** --n 02 gives sdlc/run-2 (n parses as 2); 007/00 give S-1-v7-cli-0; 2.0, 0x2, True, abc and empty give 'invalid int value' with exit 2; no traceback in any run
- **Spec source:** R-019 acceptance · **Run:** `VERIFY_ROOT=$PWD node --test .sdlc/slices/S-fix-M-1-1b/verification/r0/tests/cli-0/branches.verify-cli.test.mjs` · **Round:** 0
- Evidence (transcript, full run log): `.sdlc/slices/S-fix-M-1-1b/verification/r0/logs/cli-0-run.txt`
- Evidence (transcript, sample):

```text
--n 02 -> {"ok": true, ... "branch": "sdlc/run-2"}
--n 2.0 -> exit 2 {"ok": false, "error": "argument --n: invalid int value: '2.0'"}
```

#### TC-contract-4 · integer parts compare by value · PASS
- **Given** n in 2, '02', '2', 0, '000', a 401-digit string and integer; bad values ' 2', '+2', '-1', '0x2', '2.0', '2e0', '2_0', '', 'two', 2.0, True, False, '2 ', U+0662, NUL **When** call name with kinds run and attempt **Then** valid values succeed and parse back by value; bad values raise Fail with no exception trace
- **Expected** valid values succeed and parse back by value; bad values raise Fail with no exception trace **Actual** valid values passed and parsed back by value; every bad value raised Fail; no exception outcome
- **Spec source:** R-019 acceptance · **Run:** `VERIFY_WORKTREE=<worktree of sdlc/S-fix-M-1-1b> VERIFY_LOG=<log> node --test .sdlc/slices/S-fix-M-1-1b/verification/r0/tests/contract-0/branches-name.verify-contract.test.mjs` · **Round:** 0
- Evidence (property-run, run): property-run: 40 example calls, 0 violations Log: `.sdlc/slices/S-fix-M-1-1b/verification/r0/logs/contract-0-cases.jsonl`.

</details>

### VS-5 · Lowering touches only the tail and follows one ASCII rule
Profiles: i18n, contract. Two lowering rules could let name and parse disagree.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-contract-5 | lowering touches only the tail and follows one ASCII rule | PASS | `.sdlc/slices/S-fix-M-1-1b/verification/r0/tests/contract-0/branches-name.verify-contract.test.mjs:144` |
| TC-i18n-4 | Lowering touches only the tail and parses back for e2e-area areas | PASS | `.sdlc/slices/S-fix-M-1-1b/verification/r0/tests/i18n-0/names.verify-i18n.test.mjs:43` |
| TC-i18n-5 | Milestone id lowers by ASCII rule | PASS | `.sdlc/slices/S-fix-M-1-1b/verification/r0/tests/i18n-0/names.verify-i18n.test.mjs:64` |

<details>
<summary>Case detail (3 cases)</summary>

#### TC-contract-5 · lowering touches only the tail and follows one ASCII rule · PASS
- **Given** formats Feat/PROJ-{name:lower}-X and sdlc/{name:lower}; areas with U+00C9, U+0130, U+00DF, U+1E9E, U+017F, K **When** call name for e2e-area, then parse **Then** name equals the reference name with ASCII lowering of the tail only; prefix and suffix keep their case; parse returns the same area
- **Expected** name equals the reference name with ASCII lowering of the tail only; prefix and suffix keep their case; parse returns the same area **Actual** Feat/PROJ-{name:lower}-X with S-001 gives Feat/PROJ-s-001-X; all 16 area cases equal the reference and parse back; profile CLI lowers to cli
- **Spec source:** R-019 acceptance · **Run:** `VERIFY_WORKTREE=<worktree of sdlc/S-fix-M-1-1b> VERIFY_LOG=<log> node --test .sdlc/slices/S-fix-M-1-1b/verification/r0/tests/contract-0/branches-name.verify-contract.test.mjs` · **Round:** 0
- Evidence (property-run, run): property-run: 18 example calls, 0 violations Log: `.sdlc/slices/S-fix-M-1-1b/verification/r0/logs/contract-0-cases.jsonl`.

#### TC-i18n-4 · Lowering touches only the tail and parses back for e2e-area areas · PASS
- **Given** format Feat/PROJ-{name:lower}-X; areas E-acute, dotted I, sharp s, capital sharp s, long s, Kelvin **When** name then parse **Then** prefix and suffix keep case; only A-Z lower; area parses back
- **Expected** prefix and suffix keep case; only A-Z lower; area parses back **Actual** prefix and suffix keep case; only A-Z lower; area parses back
- **Spec source:** R-019 acceptance: only the tail lowers · **Run:** `node --test .sdlc/slices/S-fix-M-1-1b/verification/r0/tests/i18n-0/names.verify-i18n.test.mjs` · **Round:** 0
- Evidence (log, test run): `.sdlc/slices/S-fix-M-1-1b/verification/r0/logs/i18n-0-run.txt`

#### TC-i18n-5 · Milestone id lowers by ASCII rule · PASS
- **Given** same format, milestone M-1 **When** name then parse **Then** Feat/PROJ-m-1-X, id m-1
- **Expected** Feat/PROJ-m-1-X, id m-1 **Actual** Feat/PROJ-m-1-X, id m-1
- **Spec source:** R-019 acceptance · **Run:** `node --test .sdlc/slices/S-fix-M-1-1b/verification/r0/tests/i18n-0/names.verify-i18n.test.mjs` · **Round:** 0
- Evidence (log, test run): `.sdlc/slices/S-fix-M-1-1b/verification/r0/logs/i18n-0-run.txt`

</details>

### VS-6 · Formats whose prefix or suffix joins the tail into another kind
Profiles: contract, cli. A format could join a tail into another kind and give a silent mismatch.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-4 | formats whose prefix or suffix join the tail into another kind | PASS | `.sdlc/slices/S-fix-M-1-1b/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:110` |
| TC-contract-6 | joined prefix or suffix never gives a silent mismatch | PASS | `.sdlc/slices/S-fix-M-1-1b/verification/r0/tests/contract-0/branches-name.verify-contract.test.mjs:161` |

<details>
<summary>Case detail (2 cases)</summary>

#### TC-cli-4 · formats whose prefix or suffix join the tail into another kind · PASS
- **Given** formats {name}-e2e, {name}-attempt-1, {name}-v1-a-1, {name}-3, run-{name}, {name}-e2e-x **When** name slice and milestone ids under each format **Then** Fail, or a faithful round trip; never a silent mismatch
- **Expected** Fail, or a faithful round trip; never a silent mismatch **Actual** each run either exited 2 with ok false or parsed back to the requested kind and id; run-{name} with run kind gives run-run-1
- **Spec source:** R-019 acceptance · **Run:** `VERIFY_ROOT=$PWD node --test .sdlc/slices/S-fix-M-1-1b/verification/r0/tests/cli-0/branches.verify-cli.test.mjs` · **Round:** 0
- Evidence (transcript, full run log): `.sdlc/slices/S-fix-M-1-1b/verification/r0/logs/cli-0-run.txt`
- Evidence (transcript, sample):

```text
see log
```

#### TC-contract-6 · joined prefix or suffix never gives a silent mismatch · PASS
- **Given** 7 formats with suffix -e2e, -attempt-1, -v1-a-1, -1, -attempt-2 or prefix run-; 5 kinds; 7 ids **When** call name; when it returns, call parse **Then** each call raises Fail or parses back to the same kind and parts
- **Expected** each call raises Fail or parses back to the same kind and parts **Actual** 245 calls: 126 raised Fail, 119 returned and all parse back to the same kind and parts; 0 exceptions
- **Spec source:** R-019 acceptance · **Run:** `VERIFY_WORKTREE=<worktree of sdlc/S-fix-M-1-1b> VERIFY_LOG=<log> node --test .sdlc/slices/S-fix-M-1-1b/verification/r0/tests/contract-0/branches-name.verify-contract.test.mjs` · **Round:** 0
- Evidence (property-run, run): property-run: 245 example calls, fails 126, oks 119, 0 violations Log: `.sdlc/slices/S-fix-M-1-1b/verification/r0/logs/contract-0-cases.jsonl`.

</details>

### VS-7 · State names keep the given ts and build one when absent
Profiles: contract. A state timestamp with a trailing line feed could pass the check.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-contract-7 | State names keep the given ts and build one when absent | PASS | `.sdlc/slices/S-fix-M-1-1b/verification/r1/tests/contract-0/branches-name.verify-contract.test.mjs:177` |
| TC-contract-8 | Property: any name output parses back to the same kind and parts | PASS | `.sdlc/slices/S-fix-M-1-1b/verification/r1/tests/contract-0/branches-name.verify-contract.test.mjs:216` |
| TC-contract-9 | Property: valid parts give the reference name and round-trip | PASS | `.sdlc/slices/S-fix-M-1-1b/verification/r1/tests/contract-0/branches-name.verify-contract.test.mjs:267` |

<details>
<summary>Case detail (3 cases)</summary>

#### TC-contract-7 · State names keep the given ts and build one when absent · PASS
- **Given** Formats sdlc/{name}, Feat/{name:lower}, x/{name}-y; state kind with no ts, empty ts, valid ts and bad ts values **When** Call name for each ts, including ts values that end in a line feed or carriage return **Then** No ts or empty ts builds a 14-digit UTC stamp near now; a given 14-digit ts is used as given; every bad ts raises Fail
- **Expected** Bad ts raises Fail; a missing ts still succeeds **Actual** Passed. Short, long, letters, fullwidth and Arabic-indic digits, leading or trailing space, LF, CR, CRLF, NUL and U+2028 raised Fail. The built stamp was within 2 minutes of now. Integer ts 20261011101010 returned sdlc/state-20261011101010
- **Spec source:** R-019 acceptance: every name output parses back to the same parts · **Run:** `VERIFY_WORKTREE=<worktree> node --test .sdlc/slices/S-fix-M-1-1b/verification/r1/tests/contract-0/branches-name.verify-contract.test.mjs` · **Round:** 1 (round 0 failed; the fix round re-ran it)
- Evidence (property-run, bad ts outcomes): `.sdlc/slices/S-fix-M-1-1b/verification/r1/logs/contract-0-cases.jsonl`

#### TC-contract-8 · Property: any name output parses back to the same kind and parts · PASS
- **Given** Seed 20261011; 3000 random calls over 13 formats, 8 kinds, adversarial ids, integers, areas, profiles and ts values **When** Call name, then parse the result, compare with a reference model written from the spec **Then** Outcome is return or Fail, never an exception; every returned branch parses back to the same kind and parts
- **Expected** 0 violations **Actual** 641 returned, 2359 raised Fail, 0 exceptions, 0 violations. The r0 line feed counterexample no longer returns
- **Spec source:** R-019 acceptance: every name output parses back to the same parts · **Run:** `TESTKIT_SEED=20261011 node --test .sdlc/slices/S-fix-M-1-1b/verification/r1/tests/contract-0/branches-name.verify-contract.test.mjs` · **Round:** 1 (round 0 failed; the fix round re-ran it)
- Evidence (property-run, any-name round trip): property=any-name-roundtrip seed=20261011 runs=3000 result=0 violations

#### TC-contract-9 · Property: valid parts give the reference name and round-trip · PASS
- **Given** Seed 20261012; 2000 random valid kind and part sets over 5 formats **When** Call name and parse **Then** name equals the reference name; parse returns the same parts
- **Expected** 0 violations **Actual** 0 violations in 2000 runs
- **Spec source:** R-019 acceptance · **Run:** `node --test .sdlc/slices/S-fix-M-1-1b/verification/r1/tests/contract-0/branches-name.verify-contract.test.mjs` · **Round:** 1 (round 0 failed; the fix round re-ran it)
- Evidence (property-run, valid names): property=valid-names seed=20261012 runs=2000 result=0 violations

</details>

### VS-8 · active_branch matches slice ids by ASCII lowering
Profiles: cli, security, i18n. A look-alike branch could read as the active branch.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-6 | next-action active_branch matches slice ids by ASCII lowering | PASS | `.sdlc/slices/S-fix-M-1-1b/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:160` |
| TC-i18n-6 | ASCII branch is active for a matching id | PASS | `.sdlc/slices/S-fix-M-1-1b/verification/r0/tests/i18n-0/names.verify-i18n.test.mjs:80` |
| TC-i18n-7 | Kelvin look-alike branch is not active | PASS | `.sdlc/slices/S-fix-M-1-1b/verification/r0/tests/i18n-0/names.verify-i18n.test.mjs:89` |
| TC-i18n-8 | Kelvin id in slices.json does not match the ASCII branch | PASS | `.sdlc/slices/S-fix-M-1-1b/verification/r0/tests/i18n-0/names.verify-i18n.test.mjs:96` |
| TC-i18n-9 | Foreign branch is never active; uppercase id kept | PASS | `.sdlc/slices/S-fix-M-1-1b/verification/r0/tests/i18n-0/names.verify-i18n.test.mjs:102` |
| TC-security-7 | ASCII lowered branch with in-progress slice is active | PASS | `.sdlc/slices/S-fix-M-1-1b/verification/r0/tests/security-0/branches.verify-security.test.mjs:95` |
| TC-security-8 | Kelvin look-alike branch never reads as active | PASS | `.sdlc/slices/S-fix-M-1-1b/verification/r0/tests/security-0/branches.verify-security.test.mjs:98` |
| TC-security-9 | Kelvin id in the ledger does not match the ASCII branch | PASS | `.sdlc/slices/S-fix-M-1-1b/verification/r0/tests/security-0/branches.verify-security.test.mjs:102` |
| TC-security-10 | long s id, foreign prefix, case mismatch under {name}, attempt branch never active | PASS | `.sdlc/slices/S-fix-M-1-1b/verification/r0/tests/security-0/branches.verify-security.test.mjs:106` |

<details>
<summary>Case detail (9 cases)</summary>

#### TC-cli-6 · next-action active_branch matches slice ids by ASCII lowering · PASS
- **Given** scratch repos, format feature/p-1-{name:lower}, S-001 in_progress committed on the branch **When** next-action.py --repo for branch feature/p-1-s-001; look-alike feature/p-1-s-00(U+212A); slices.json id S-00(U+212A); foreign other/s-001 and sdlc/S-001; branch feature/p-1-S-001 **Then** checkout is the ASCII branch; look-alikes and foreign branches give checkout null
- **Expected** checkout is the ASCII branch; look-alikes and foreign branches give checkout null **Actual** checkout was feature/p-1-s-001 and feature/p-1-S-001 for the ASCII cases, and null for Kelvin branch, Kelvin id and foreign branches; tree unchanged
- **Spec source:** R-053 acceptance · **Run:** `VERIFY_ROOT=$PWD node --test .sdlc/slices/S-fix-M-1-1b/verification/r0/tests/cli-0/branches.verify-cli.test.mjs` · **Round:** 0
- Evidence (transcript, full run log): `.sdlc/slices/S-fix-M-1-1b/verification/r0/logs/cli-0-run.txt`
- Evidence (transcript, sample):

```text
"checkout": "feature/p-1-s-001"
```

#### TC-i18n-6 · ASCII branch is active for a matching id · PASS
- **Given** scratch repo, format feature/p-1-{name:lower}, S-001 in progress **When** next-action.py **Then** checkout feature/p-1-s-001
- **Expected** checkout feature/p-1-s-001 **Actual** checkout feature/p-1-s-001
- **Spec source:** R-053 acceptance · **Run:** `node --test .sdlc/slices/S-fix-M-1-1b/verification/r0/tests/i18n-0/names.verify-i18n.test.mjs` · **Round:** 0
- Evidence (log, test run): `.sdlc/slices/S-fix-M-1-1b/verification/r0/logs/i18n-0-run.txt`

#### TC-i18n-7 · Kelvin look-alike branch is not active · PASS
- **Given** branch feature/p-1-s-00<U+212A> with S-001 or S-00<U+212A> **When** next-action.py **Then** checkout null
- **Expected** checkout null **Actual** checkout null
- **Spec source:** R-053 acceptance · **Run:** `node --test .sdlc/slices/S-fix-M-1-1b/verification/r0/tests/i18n-0/names.verify-i18n.test.mjs` · **Round:** 0
- Evidence (log, test run): `.sdlc/slices/S-fix-M-1-1b/verification/r0/logs/i18n-0-run.txt`

#### TC-i18n-8 · Kelvin id in slices.json does not match the ASCII branch · PASS
- **Given** branch s-001 or s-00k with id S-00<U+212A> **When** next-action.py **Then** checkout null
- **Expected** checkout null **Actual** checkout null
- **Spec source:** R-053 acceptance · **Run:** `node --test .sdlc/slices/S-fix-M-1-1b/verification/r0/tests/i18n-0/names.verify-i18n.test.mjs` · **Round:** 0
- Evidence (log, test run): `.sdlc/slices/S-fix-M-1-1b/verification/r0/logs/i18n-0-run.txt`

#### TC-i18n-9 · Foreign branch is never active; uppercase id kept · PASS
- **Given** branch other/s-001; branch feature/p-1-S-001; format without :lower **When** next-action.py **Then** null; feature/p-1-S-001; null
- **Expected** null; feature/p-1-S-001; null **Actual** null; feature/p-1-S-001; null
- **Spec source:** R-053 acceptance: a foreign branch never reads as active · **Run:** `node --test .sdlc/slices/S-fix-M-1-1b/verification/r0/tests/i18n-0/names.verify-i18n.test.mjs` · **Round:** 0
- Evidence (log, test run): `.sdlc/slices/S-fix-M-1-1b/verification/r0/logs/i18n-0-run.txt`

#### TC-security-7 · ASCII lowered branch with in-progress slice is active · PASS
- **Given** format feature/p-1-{name:lower}, branch feature/p-1-s-001, S-001 in_progress on it **When** next-action.py --repo **Then** checkout feature/p-1-s-001
- **Expected** active **Actual** active
- **Spec source:** R-053 acceptance · **Run:** `SKILL_DIR=<worktree>/skills/sdlc KIT_DIR=<worktree>/skills/sdlc/test/testkit node --test .sdlc/slices/S-fix-M-1-1b/verification/r0/tests/security-0/branches.verify-security.test.mjs` · **Round:** 0
- Evidence (attack, checkout):

```text
checkout=feature/p-1-s-001
```
- Evidence (log, test run): `.sdlc/slices/S-fix-M-1-1b/verification/r0/logs/security-0-run.txt`

#### TC-security-8 · Kelvin look-alike branch never reads as active · PASS
- **Given** branch feature/p-1-s-00K (U+212A) with S-001 or S-00K in_progress **When** next-action.py **Then** checkout null
- **Expected** not active **Actual** not active
- **Spec source:** R-053 acceptance: a foreign branch never reads as active · **Run:** `SKILL_DIR=<worktree>/skills/sdlc KIT_DIR=<worktree>/skills/sdlc/test/testkit node --test .sdlc/slices/S-fix-M-1-1b/verification/r0/tests/security-0/branches.verify-security.test.mjs` · **Round:** 0
- Evidence (attack, checkout):

```text
checkout=null
```
- Evidence (log, test run): `.sdlc/slices/S-fix-M-1-1b/verification/r0/logs/security-0-run.txt`

#### TC-security-9 · Kelvin id in the ledger does not match the ASCII branch · PASS
- **Given** branch feature/p-1-s-001, slices.json id S-00K in_progress, and S-001 todo **When** next-action.py **Then** checkout null
- **Expected** not active **Actual** not active
- **Spec source:** R-053 acceptance · **Run:** `SKILL_DIR=<worktree>/skills/sdlc KIT_DIR=<worktree>/skills/sdlc/test/testkit node --test .sdlc/slices/S-fix-M-1-1b/verification/r0/tests/security-0/branches.verify-security.test.mjs` · **Round:** 0
- Evidence (attack, checkout):

```text
checkout=null
```
- Evidence (log, test run): `.sdlc/slices/S-fix-M-1-1b/verification/r0/logs/security-0-run.txt`

#### TC-security-10 · long s id, foreign prefix, case mismatch under {name}, attempt branch never active · PASS
- **Given** branches feature/p-1-s-U+017F, other/s-001, feature/p-1-s-001 under {name}, feature/p-1-S-001-attempt-1 **When** next-action.py **Then** checkout null each time
- **Expected** not active **Actual** not active; git refs unchanged
- **Spec source:** R-053 acceptance · **Run:** `SKILL_DIR=<worktree>/skills/sdlc KIT_DIR=<worktree>/skills/sdlc/test/testkit node --test .sdlc/slices/S-fix-M-1-1b/verification/r0/tests/security-0/branches.verify-security.test.mjs` · **Round:** 0
- Evidence (attack, checkout):

```text
checkout=null x4
```
- Evidence (log, test run): `.sdlc/slices/S-fix-M-1-1b/verification/r0/logs/security-0-run.txt`

</details>

### VS-9 · The name command reports refusal without side effects
Profiles: cli. A refusal could leave a side effect or a traceback.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-5 | name reports refusal without side effects | PASS | `.sdlc/slices/S-fix-M-1-1b/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:133` |

<details>
<summary>Case detail (1 cases)</summary>

#### TC-cli-5 · name reports refusal without side effects · PASS
- **Given** scratch repo **When** name with missing --id, empty id, unknown kind, formats with no placeholder, two placeholders, whitespace, kind-confusing id, missing n, missing round, missing --kind, bad --repo, no subcommand **Then** exit 2, one JSON line with ok false and an error, empty name, tree unchanged
- **Expected** exit 2, one JSON line with ok false and an error, empty name, tree unchanged **Actual** all 12 runs exited 2 with one-line JSON ok false and tree unchanged
- **Spec source:** R-019 acceptance · **Run:** `VERIFY_ROOT=$PWD node --test .sdlc/slices/S-fix-M-1-1b/verification/r0/tests/cli-0/branches.verify-cli.test.mjs` · **Round:** 0
- Evidence (transcript, full run log): `.sdlc/slices/S-fix-M-1-1b/verification/r0/logs/cli-0-run.txt`
- Evidence (transcript, sample):

```text
{"ok": false, "error": "--kind 'bogus' is not one of run, slice, ..."}
{"ok": false, "error": "the branch format '{name}{name}' must hold exactly one {name} or {name:lower}, found 2"}
```

</details>

## How it was attacked
One security session ran in round 0. The charter: find a `name` output that `parse` reads as another kind, a look-alike id, a shell, newline or traversal id, or a look-alike branch that reads as active. The threat-model boundary is the `name` command and `active_branch`. The session tried 6 attacks. 4 held. 2 were out of scope: a state `ts` with a trailing newline (Python API only, later fixed in round 1) and an e2e-area such as `../../x` (the spec states no area rule).

<details>
<summary>Attack table</summary>

| input | expected | observed | result |
|---|---|---|---|
| `S-001-attempt-2` and other kind-confusing ids | Fail | Fail | held |
| U+212A, U+017F, fullwidth 1 | Fail | Fail | held |
| shell metacharacters, newline, traversal | Fail, no side effect | Fail, tree unchanged | held |
| Kelvin look-alike branch and ledger id | not active | not active | held |
| state `ts='20260101000000\n'` | Fail | returned `state-20260101000000\n` | out-of-scope |
| e2e-area `../../x` | spec states no area rule | returned `sdlc/M-1-e2e-../../x`; git refuses `..` | out-of-scope |

</details>

## Defects found on the way
- **Blocking defects:**
  - `name` accepts a state `ts` that ends in a line feed. Found by verify-contract round 0 (TC-contract-7, TC-contract-8: 106 violations in 3000 calls, seed 20261011). Spec source: R-019 acceptance. Reproduce: `name("sdlc/{name}", "state", ts="20261011101010\n")`. Cause: the `parse` patterns ended in `$`, which matches before a final line feed, and `name` never compared a given `ts`. Fixed in `e979556`: the patterns end in `\Z` and `name` compares a given state `ts`. Guarded by `skills/sdlc/test/branches.test.mjs:3067` (T-R-019-trailing-newline), `:3077` (T-R-019-parse-newline) and `:3085` (T-R-019-state-ts). Round 1 re-ran the contract cases and all passed.
- **Seeds** (open only):

| Seed | Found by | File |
|---|---|---|
| `next-action.py` calls private `branches._ascii_lower` | architecture review | `skills/sdlc/next-action.py` |
| `INTEGER_PARTS` defined after its users | architecture review | `skills/sdlc/branches.py` |
| `withIdPrefix` self-test builds a doubled prefix | test-quality review | `skills/sdlc/test/testkit/i18n-kit.test.mjs` |
| CLI `--n` accepts non-ASCII digits and normalizes them | verify-i18n | `skills/sdlc/branches.py` |
| `name` accepts fullwidth digits for integer parts | verify-cli | `skills/sdlc/branches.py` |
| `name` accepts ` 2` and `+2` for `--n` | verify-cli | `skills/sdlc/branches.py` |
| `name` accepts e2e-area areas that git refuses | verify-security | `skills/sdlc/branches.py` |

## Appendix
- Tools: cli-runner (scratch repo runs of `branches.py` and `next-action.py`); property (contract profile, `kwcall.py` driver, seed 20261011); attack-corpus (security); i18n-kit (i18n, listed as missing at plan time and present in `skills/sdlc/test/testkit/i18n-kit.test.mjs`).
- Plan: `../../slices/S-fix-M-1-1b/verification/plan-r0.md`. Round 0 evidence: `../../slices/S-fix-M-1-1b/verification/r0/cli-0.md`, `contract-0.md`, `i18n-0.md`, `security-0.md`. Round 1 evidence: `../../slices/S-fix-M-1-1b/verification/r1/contract-0.md`.
- Core verifiers: `../../slices/S-fix-M-1-1b/verify-spec-fidelity-r0.md`, `verify-spec-fidelity-r1.md`, `verify-regression-r0.md`, `verify-regression-r1.md`. Gate: `../../slices/S-fix-M-1-1b/gate-r0.md`.
- Reviews: `../../slices/S-fix-M-1-1b/review-architecture-r1.md`, `review-security-r1.md`, `review-test-quality-r1.md`.
- Committed tests: `skills/sdlc/test/branches.test.mjs:3006` to `:3085`; `skills/sdlc/test/next-action.test.mjs:657`; `e2e/tests/names.test.mjs:357` (SC-M-1-076).
- Missing sources: none. Round 1 has no `.md` for the cli, security and i18n profiles, because only the contract cases re-ran.
