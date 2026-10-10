# S-020 · sdlc-loop.js names branches through the format
Verdict: RELEASED
Commit under test: 549359a · Rounds: 3 · Attempts: 1 · Risk: medium · Written: 2026-10-10

| Requirements | Scenarios | Cases | Passed | Failed | Blocked | Blocking defects found / fixed | Open seeds |
|---|---|---|---|---|---|---|---|
| 5 | 5 | 14 | 14 | 0 | 0 | 1 / 1 | 5 |

## Summary
The loop script now reads the branch format from `args.branchFormat`. It falls back to `sdlc/{name}`. Every verifier branch comes from `branchName`, so no `sdlc/` literal stays in the script. The env-detector receives `branchFormat`. The contract, cli and security profiles checked the slice. The verifiers ran the loop function against `branches.py` for 360 combinations of three formats, ids, rounds, profiles and parts. All pairs matched. Round 0 found one blocking defect: `String.replace` rewrote tails with `$` patterns. A replacer function fixed it in round 1, and round 2 changed tests only. The gate ran the full suite: 677 passed, 0 failed, 1 skipped. Five non-blocking seeds remain open.

## Open risks
- A format with both `{name}` and `{name:lower}` leaves `{name}` unreplaced. The spec does not define this format. Format validation must reject it.
- The `{name}` and `{name:lower}` rule exists in JS and in Python. T-R-075a pins both, so drift fails a test.
- The janitor test in `scripts.test.mjs` uses the shared temp directory. Another agent can reap its directory and fail the test. It failed once in a regression run and passed on rerun.
- No contract or cli case ran again after round 0. Later regression rounds re-ran their tests, and all passed.
- Case TC-contract-5 is recorded as pass, but its actual text lists the round 0 mismatch. The security round 1 case TC-security-1 and T-R-051c confirm the fix.

## Traceability
| Requirement | Spec says | Scenarios | Cases | Result |
|---|---|---|---|---|
| R-050 | `const BRANCH_FORMAT = A.branchFormat \|\| 'sdlc/{name}'` and `branchName(tail)` with `{name:lower}` handling | VS-1, VS-2, VS-3 | TC-contract-1 to 5, TC-cli-3, TC-security-1, TC-security-2 | pass |
| R-051 | `verifyPhase`'s `const branch = g => …` becomes `branchName(…)` | VS-2, VS-3, VS-4 | TC-contract-2, 6, 7, 8, TC-cli-1, TC-security-1 | pass |
| R-052 | "The env-detector call gains `branchFormat: A.branchFormat \|\| null`." | VS-5 | TC-contract-9 | pass |
| R-075 | "`rt.I.branchName(tail)` equals `branches.py name` for the three formats and the verify tail" | VS-3 | TC-contract-6, TC-cli-1, TC-cli-2 | pass |
| R-116 | "`INTERNALS` exports `branchName` and `BRANCH_FORMAT`." | VS-1 | TC-contract-1 | pass |

## Scenarios
### VS-1 · The loop script reads the branch format from its arguments or falls back to sdlc/{name}
Profiles: contract. A wrong fallback names every verifier branch wrongly.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-contract-1 | Absent, null and empty formats fall back; INTERNALS exports both names | PASS | `.sdlc/slices/S-020/verification/r0/tests/contract-0/loop-branch.verify-contract.test.mjs` |

<details>
<summary>Case detail (1 case)</summary>

#### TC-contract-1 · BRANCH_FORMAT fallback and exports · PASS
- **Given** the loop script with four argument shapes **When** the exported values are read **Then** `BRANCH_FORMAT` is the default or the given format, and `branchName` is a function.
- **Expected** as stated **Actual** as expected for 4 argument shapes.
- **Spec source:** R-050, R-116 · **Run:** `node --test .sdlc/slices/S-020/verification/r0/tests/contract-0/loop-branch.verify-contract.test.mjs`
- `VS-1 test passed; see .sdlc/slices/S-020/verification/r0/logs/contract-0-run.txt`

</details>

### VS-2 · branchName substitutes the placeholder and lowercases the tail for {name:lower}
Profiles: contract, security. A hostile tail must not change the branch name.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-contract-2 | 10 examples (plain, prefixed, lower, empty tail, no placeholder, unicode) are exact | PASS | `.sdlc/slices/S-020/verification/r0/tests/contract-0/loop-branch.verify-contract.test.mjs` |
| TC-contract-3 | 1500 random runs equal a split/join model | PASS | same file |
| TC-contract-4 | A format with both placeholders is observed, not specified | PASS | same file |
| TC-contract-5 | Dollar tails stay literal (round 0 mismatch, fixed in round 1) | PASS | same file, `:hostile` |
| TC-security-1 | Tails `$&`, `$$`, `` $` ``, `$'`, `$0`, `$1`, `$10`, `$<n>` stay literal | PASS | `.sdlc/slices/S-020/verification/r1/tests/security-0/branch-name.verify-security.test.mjs:21` |
| TC-security-2 | Other hostile tails and odd formats stay literal and do not throw | PASS | `.sdlc/slices/S-020/verification/r1/tests/security-0/branch-name.verify-security.test.mjs:22` |
| T-R-050b, T-R-051c | Unit tests for the format, the lower modifier and literal tails | PASS | `skills/sdlc/test/branches.test.mjs:2699`, `:2709` |

<details>
<summary>Case detail (6 cases)</summary>

#### TC-contract-2 · branchName examples · PASS
- **Given** the loop script **When** `branchName` runs on 10 examples **Then** each equals the substituted string.
- **Expected** equal **Actual** 10 examples equal.
- **Spec source:** R-050 · **Run:** `node --test .sdlc/slices/S-020/verification/r0/tests/contract-0/loop-branch.verify-contract.test.mjs`
- `property-run`: examples test passed.

#### TC-contract-3 · Random tails against a reference model · PASS
- **Given** 7 formats and random tails **When** `branchName` runs **Then** the result equals the reference model and stays deterministic.
- **Expected** equal **Actual** 1500 runs, no counterexample.
- **Spec source:** R-050 · **Run:** same command
- `property seed=20261010 runs=1500 result=pass`

#### TC-contract-4 · Format with both placeholders (observed) · PASS
- **Given** the format `a-{name}-{name:lower}` and the tail `AB` **When** `branchName` runs **Then** the spec gives no rule.
- **Expected** none **Actual** `a-{name}-ab`. This is an open seed.
- **Spec source:** none (observation) · **Run:** same command

#### TC-contract-5 · Dollar tails stay literal · PASS
- **Given** the tails `$&`, `$$`, `` $` ``, `$'` and `a$&b` **When** `branchName` runs **Then** the tail stays literal.
- **Expected** literal **Actual** round 0: 10 mismatches, for example `sdlc/{name}` for the tail `$&`. The case file records pass although the text lists the mismatch. Fix e6e0dd5 removes the mismatch.
- **Spec source:** R-050 · **Run:** same command
- Guard: TC-security-1 in round 1 and T-R-051c.

#### TC-security-1 · Dollar patterns stay literal · PASS
- **Given** the three formats **When** `branchName` gets `$&`, `$$`, `` $` ``, `$'`, `$0`, `$1`, `$10`, `$<n>` **Then** the result holds the tail unchanged, lowercased for the lower format.
- **Expected** `sdlc/$&` for the tail `$&` **Actual** all tails literal.
- **Spec source:** R-051 · **Run:** `SDLC_WORKTREE=<worktree> node --test .sdlc/slices/S-020/verification/r1/tests/security-0/branch-name.verify-security.test.mjs`
- Log `.sdlc/slices/S-020/verification/r1/logs/security-0-run.txt`: 49 pass, 0 fail.

#### TC-security-2 · Other hostile tails and odd formats · PASS
- **Given** uppercase, slash, traversal, unicode, bidi, empty and placeholder-text tails; formats with none or two placeholders; an empty format **When** `branchName` runs twice in a row **Then** the output is literal, nothing throws and no state leaks.
- **Expected** literal substitution **Actual** all checks held.
- **Spec source:** R-050 · **Run:** same command as TC-security-1

</details>

### VS-3 · The loop script and branches.py name the verifier branch the same way
Profiles: cli, contract. A mismatch breaks the verification plumbing.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-contract-6 | 360 combinations equal `branches.py name --kind verify` | PASS | `.sdlc/slices/S-020/verification/r0/tests/contract-0/loop-branch.verify-contract.test.mjs` |
| TC-cli-1 | The same 360 pairs through a scratch git repo, exit 0, tree unchanged | PASS | `.sdlc/slices/S-020/verification/r0/tests/cli-0/branch-names.verify-cli.test.mjs:12` |
| TC-cli-2 | `branches.py` reads the format from config and matches the loop | PASS | same file, `:30` |
| TC-cli-3 | An empty format gives `sdlc/S-020-v1-cli-0` in both | PASS | same file, `:41` |
| T-R-075a | Unit test of the same equality for three formats | PASS | `skills/sdlc/test/branches.test.mjs:2736` |

<details>
<summary>Case detail (4 cases)</summary>

#### TC-contract-6 · Loop and branches.py agree · PASS
- **Given** 3 formats, 4 ids, 3 rounds, 5 profiles (including `Http-API`), 2 parts **When** both name the branch **Then** the names are equal.
- **Expected** equal **Actual** 360 combinations equal.
- **Spec source:** R-075, R-051 · **Run:** `node --test .sdlc/slices/S-020/verification/r0/tests/contract-0/loop-branch.verify-contract.test.mjs`
- `compared 360`

#### TC-cli-1 · Three formats against a scratch repo · PASS
- **Given** a scratch git repo **When** `branches.py name --kind verify` runs for the same 360 combinations **Then** all pairs are equal, all exit codes are 0, and the tree does not change.
- **Expected and actual** 360 equal pairs.
- **Spec source:** R-075, R-051 · **Run:** `node --test .sdlc/slices/S-020/verification/r0/tests/cli-0/branch-names.verify-cli.test.mjs`
```console
sdlc/{name} | S-001-v0-http-api-0 | exit=0 | py=sdlc/S-001-v0-http-api-0 | js=sdlc/S-001-v0-http-api-0
feature/PROJ-1-{name} | S-001-v0-Http-API-0 | exit=0 | py=feature/PROJ-1-S-001-v0-Http-API-0 | js=feature/PROJ-1-S-001-v0-Http-API-0
```
- All pairs: [cli-0-names.txt](../../slices/S-020/verification/r0/logs/cli-0-names.txt)

#### TC-cli-2 · Format from the config file · PASS
- **Given** a config with `feature/PROJ-1-{name:lower}` **When** `branches.py name` runs with no `--format` **Then** it gives `feature/PROJ-1-s-020-v0-http-api-0`, equal to `branchName`.
- **Spec source:** R-075 · **Run:** same file, `:30`

#### TC-cli-3 · Empty format falls back · PASS
- **Given** an empty format and a repo with no config **When** both name S-020 round 1, profile cli, part 0 **Then** both give `sdlc/S-020-v1-cli-0`.
- **Spec source:** R-050 · **Run:** same file, `:41`
- `py=sdlc/S-020-v1-cli-0 js=sdlc/S-020-v1-cli-0`

</details>

### VS-4 · verifyPhase builds the profile-agent and collector branches through the format
Profiles: contract. A literal prefix would ignore the user's format.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-contract-7 | Agents and collector get format-built branches; the default stays `sdlc/S-1-v2-ui-0` | PASS | `.sdlc/slices/S-020/verification/r0/tests/contract-0/loop-branch.verify-contract.test.mjs` |
| TC-contract-8 | The script source holds no `sdlc/` template literal with a substitution | PASS | same file |
| T-R-051a, T-R-051b | Unit tests of the same two facts | PASS | `skills/sdlc/test/verify.test.mjs:405`, `skills/sdlc/test/branches.test.mjs:2728` |

<details>
<summary>Case detail (2 cases)</summary>

#### TC-contract-7 · verifyPhase branches · PASS
- **Given** 3 formats **When** `verifyPhase` runs **Then** the branch values follow the format, and the collector list equals the agent branches.
- **Expected and actual** as stated.
- **Spec source:** R-051 · **Run:** `node --test .sdlc/slices/S-020/verification/r0/tests/contract-0/loop-branch.verify-contract.test.mjs`

#### TC-contract-8 · No sdlc/ literal · PASS
- **Given** the script source **When** a search looks for `sdlc/` followed by a substitution **Then** it finds no hit.
- **Expected and actual** `hits []`.
- **Spec source:** R-051 · **Run:** same command

</details>

### VS-5 · The env-detector receives branchFormat
Profiles: contract. A missing key hides the format from the detector.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-contract-9 | Five keys; null for absent, null and empty; the string unchanged otherwise | PASS | `.sdlc/slices/S-020/verification/r0/tests/contract-0/loop-branch.verify-contract.test.mjs` |
| T-R-052a | Unit test of the same input shape | PASS | `skills/sdlc/test/bootstrap.test.mjs:117` |

<details>
<summary>Case detail (1 case)</summary>

#### TC-contract-9 · env-detector inputs · PASS
- **Given** 5 argument shapes **When** the env-detector is called **Then** the input has five keys, and `branchFormat` is null or the unchanged string.
- **Expected and actual** as stated.
- **Spec source:** R-052 · **Run:** `node --test .sdlc/slices/S-020/verification/r0/tests/contract-0/loop-branch.verify-contract.test.mjs`

</details>

## How it was attacked
One security session ran in round 0 and again in round 1. The charter: find a tail or a format that changes the branch name. The boundary: the tail comes from the slice id and a fixed profile list, so reach is low. Five attacks ran in each round. In round 0, four held and one broke: dollar patterns. In round 1, all five held.

<details>
<summary>Attack table, round 1</summary>

| input | expected | observed | result |
|---|---|---|---|
| `$&`, `$$`, `` $` ``, `$'` | literal tail | literal; the round 0 break is fixed | held |
| `$0`, `$1`, `$10`, `$<n>` | literal | literal | held |
| `../../x`, `a/b`, unicode, bidi, empty | literal substitution | literal | held |
| `x{name}y`, `{name}-{name:lower}` | no throw, no re-expansion | held | held |
| `''` as `branchFormat` | fallback `sdlc/{name}` | held | held |

</details>

## Defects found on the way
- **Blocking defect: `branchName` rewrote tails with `$` patterns.** Found by verify-security in round 0 (TC-security-1), spec source R-051. Reproduce: call `branchName('$&')` with `sdlc/{name}`; the result is `sdlc/{name}`. Fixed in commit e6e0dd5 with a replacer function. Guards: T-R-051c (`skills/sdlc/test/branches.test.mjs:2709`) and TC-security-1 in round 1.
- Review round 1 found a duplicate test, T-R-101. Commit a2b64a5 deleted it and promoted the empty `branchFormat` case into T-R-050a.

| Seed | Found by | File |
|---|---|---|
| T-R-051b repeats the default case of T-R-075a | review-architecture | `skills/sdlc/test/branches.test.mjs` |
| `branchName` repeats the `branches.py` format rule | review-architecture | `skills/sdlc/sdlc-loop.js` |
| T-R-116a repeats coverage of T-R-050a and T-R-050b | review-architecture | `skills/sdlc/test/branches.test.mjs` |
| A format with both placeholders leaves `{name}` unreplaced | verify-contract, round 0 | `skills/sdlc/sdlc-loop.js` |
| The janitor test depends on the shared real temp directory | verify-regression, round 2 | `skills/sdlc/test/scripts.test.mjs` |

## Appendix
- Toolkit: `property` and `attack-corpus` (contract and security tests under `.sdlc/slices/S-020/verification/r*/tests/`), `cli-runner` (scratch git repos in `.sdlc/slices/S-020/verification/r0/tests/cli-0/`).
- Plans: [plan-r0](../../slices/S-020/verification/plan-r0.json), [plan-r2](../../slices/S-020/verification/plan-r2.json).
- Evidence: [contract r0](../../slices/S-020/verification/r0/contract-0.md), [cli r0](../../slices/S-020/verification/r0/cli-0.md), [security r0](../../slices/S-020/verification/r0/security-0.md), [security r1](../../slices/S-020/verification/r1/security-0.md).
- Core verifiers: [spec-fidelity r0](../../slices/S-020/verify-spec-fidelity-r0.md), [r1](../../slices/S-020/verify-spec-fidelity-r1.md), [r2](../../slices/S-020/verify-spec-fidelity-r2.md); [regression r0](../../slices/S-020/verify-regression-r0.md), [r1](../../slices/S-020/verify-regression-r1.md), [r2](../../slices/S-020/verify-regression-r2.md); [gate r0](../../slices/S-020/gate-r0.md).
- Reviews: architecture and security, rounds 1 and 2, in `.sdlc/slices/S-020/`.
- Missing: no contract or cli evidence files exist for rounds 1 and 2. Plan round 1 is missing; plan r2 equals plan r0.
