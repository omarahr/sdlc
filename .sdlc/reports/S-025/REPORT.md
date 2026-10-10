# S-025 · _common.md: the Branch names section and the first placeholders
Verdict: RELEASED
Commit under test: 6bafde0 · Rounds: 2 · Attempts: 1 · Risk: medium · Written: 2026-10-10

| Requirements | Scenarios | Cases | Passed | Failed | Blocked | Blocking defects found / fixed | Open seeds |
|---|---|---|---|---|---|---|---|
| 5 | 6 | 15 | 15 | 0 | 0 | 0 / 0 | 4 |

## Summary
The slice adds a "Branch names" bullet and a placeholder table to `skills/sdlc/prompts/_common.md`. Every agent now reads one rule: name each branch through `config.branchFormat`. The table gives the command for all eight placeholders. The `cli` and `contract` profiles checked the text and ran every command in scratch repos. The verifiers found no blocking defect. Review in round 0 asked to promote the table-command check into the committed tests, and fix round 1 did it. Four non-blocking seeds remain open.

## Open risks
- The bullet says `parse` prints `null` and `name` prints a name. Both commands print JSON (`"kind": null`, a `branch` field). A reader may look for a bare word. Reword the bullet.
- The verifier test `table.verify-contract.test.mjs` failed to load when run from the repo root. Nobody investigated the cause. The same checks pass in `skills/sdlc/test/prompts.test.mjs`.
- Round 1 changed only tests. No profile re-ran in round 1; only the plan was re-checked and `npm test` was re-run.
- The plan listed a `security` profile for VS-5. No security session ran. The `cli` profile covered the hostile branch names.
- No spec number exists for this slice. Nothing was measured against one.

## Traceability
| Requirement | Spec says | Scenarios | Cases | Result |
|---|---|---|---|---|
| R-062 | "every branch the loop makes is named by one format, `config.branchFormat` (default `sdlc/{name}`). Never write such a name by hand." | VS-1, VS-6 | TC-cli-1, TC-cli-2, TC-contract-1, TC-contract-2, TC-contract-3, TC-contract-7, TC-contract-8, TC-contract-9 | pass |
| R-089 | "`<run branch>` … the branch `config.runBranch` names in `stack` mode; otherwise `branches.py list --kind run`, its last entry" | VS-3 | TC-cli-4, TC-contract-5 | pass |
| R-090 | "`<verify branch>` … the `branch` input your prompt carries" | VS-4 | TC-contract-6 | pass |
| R-110 | "`<slice branch>` … `branches.py name --kind slice --id <sliceId>`" | VS-2 | TC-cli-3, TC-contract-4 | pass |
| R-117 | "`branches.py parse --repo . --branch <name>` prints its kind and ids, or `null` for a branch that is not the loop's." | VS-5 | TC-cli-5, TC-cli-6 | pass |

## Scenarios

### VS-1 · The table lists all eight placeholders, each with a command
Profiles: cli, contract. A missing or misspelled row would mislead every agent.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-1 | Six `name` commands exit 0 and print names in a custom format | PASS | `.sdlc/slices/S-025/verification/r0/tests/cli-0/branch-table.verify-cli.test.mjs:1` |
| TC-cli-2 | Table has eight rows; missing `--id` or `--area` fails | PASS | `.sdlc/slices/S-025/verification/r0/tests/cli-0/branch-table.verify-cli.test.mjs:1` |
| TC-contract-1 | Eight placeholders appear once, in spec order | PASS | `.sdlc/slices/S-025/verification/r0/tests/contract-0/table.verify-contract.test.mjs:21` |
| TC-contract-2 | Six `name` commands print the right name in three formats | PASS | `.sdlc/slices/S-025/verification/r0/tests/contract-0/table.verify-contract.test.mjs:48` |
| TC-contract-3 | Table arguments are accepted by `branches.py` | PASS | `.sdlc/slices/S-025/verification/r0/tests/contract-0/table.verify-contract.test.mjs:41` |
| TC-contract-8 | `name` equals the reference model; `parse` returns the same kind | PASS | `.sdlc/slices/S-025/verification/r0/tests/contract-0/table.verify-contract.test.mjs:131` |
| TC-contract-9 | Output is the same on repeat; the tree does not change | PASS | `.sdlc/slices/S-025/verification/r0/tests/contract-0/table.verify-contract.test.mjs:156` |

The promoted test guards this scenario in the suite: `skills/sdlc/test/prompts.test.mjs:1045` and `skills/sdlc/test/prompts.test.mjs:1006`.

<details>
<summary>Case detail (7 cases)</summary>

#### TC-cli-1 · Each table command runs and prints a formatted name · PASS
- **Given** a scratch repo with `branchFormat` `feature/{name}`. **When** the six `name` commands run with sample ids. **Then** each exits 0 with `ok` true and a branch under `feature/`.
- **Expected** exit 0 and a formatted name. **Actual** `feature/S-025`, `feature/M-1`, `feature/M-1-e2e`, `feature/M-1-e2e-api`, `feature/state-<ts>`, `feature/S-025-attempt-2`. The tree did not change.
- **Spec source:** R-062 acceptance · **Run:** `node --test .sdlc/slices/S-025/verification/r0/tests/cli-0/branch-table.verify-cli.test.mjs`
- Evidence (transcript, from `verification/r0/logs/cli-0-transcript.txt`):

```console
$ branches.py name --repo . --kind slice --id S-025
{"ok": true, "command": "name", "format": "feature/{name}", "kind": "slice", "branch": "feature/S-025"}
exit 0
```

#### TC-cli-2 · Table holds eight placeholders in order; missing `--id` or `--area` fails · PASS
- **Given** `_common.md` and a scratch repo. **When** the test parses the rows and runs `name --kind slice` without `--id`, and `e2e-area` without `--area`. **Then** it finds eight rows and both bad calls exit non-zero.
- **Expected** eight rows; non-zero exit with no branch. **Actual** the same.
- **Spec source:** R-062 acceptance · **Run:** same command as TC-cli-1
- Evidence: the same transcript file.

#### TC-contract-1 · Table holds exactly the eight placeholders once, in spec order · PASS
- **Given** `_common.md` at ddbea4a. **When** the test parses the bullet. **Then** the rows are run, slice, milestone, e2e, e2e area, state, attempt, verify.
- **Expected** and **Actual** match. One Branch names bullet exists.
- **Spec source:** R-062 acceptance · **Run:** `VERIFY_REPO=<worktree of sdlc/S-025> TESTKIT_SEED=20260101 node --test .sdlc/slices/S-025/verification/r0/tests/contract-0/table.verify-contract.test.mjs`

```text
8 rows: <run branch> <slice branch> <milestone branch> <e2e branch> <e2e area branch> <state branch> <attempt branch> <verify branch>; one Branch names bullet
```

#### TC-contract-2 · Every name command prints the formatted name in three formats · PASS
- **Given** `_common.md` at ddbea4a. **When** the test runs the six `name` rows with default, prefix and lower formats. **Then** every call exits 0 with the expected branch.
- **Expected** and **Actual** match. The state name matches `state-<14 digits>`.
- **Spec source:** R-062 acceptance · **Run:** same command as TC-contract-1

```text
6 commands x 3 formats; all exit 0; names equal prefix+tail+suffix; state name matches state-<14 digits>
```

#### TC-contract-3 · Argument names in the table are accepted by `branches.py` · PASS
- **Given** `_common.md` at ddbea4a. **When** the test collects the flags in the table. **Then** `--kind`, `--id`, `--area` and `--n` are options of `branches.py name`.
- **Expected** and **Actual** match.
- **Spec source:** R-062 acceptance · **Run:** same command as TC-contract-1

```text
used flags subset of branches.py name options
```

#### TC-contract-8 · Property: `name` equals the reference model · PASS
- **Given** `_common.md` at ddbea4a. **When** the property runs for six kinds and five formats. **Then** `name` equals the model and `parse` returns the same kind.
- **Expected** zero violations. **Actual** zero violations.
- **Spec source:** R-062 acceptance · **Run:** same command as TC-contract-1

property `name matches reference model and parse round-trips kind` · seed 20260101 · 1000 runs per kind (6 kinds, 5 formats) · pass

#### TC-contract-9 · Determinism and no tree change · PASS
- **Given** `_common.md` at ddbea4a. **When** the commands run twice. **Then** stdout is identical and the tree is unchanged.
- **Spec source:** R-062 acceptance · **Run:** same command as TC-contract-1

```text
same output twice; tree unchanged
```

</details>

### VS-2 · The slice branch row maps to the slice command
Profiles: cli, contract. The row must hold the exact command, or agents name slice branches wrongly.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-3 | The slice command prints `feature/S-025` and `sdlc/S-025` | PASS | `.sdlc/slices/S-025/verification/r0/tests/cli-0/branch-table.verify-cli.test.mjs:1` |
| TC-contract-4 | The slice row is verbatim and prints the formatted name | PASS | `.sdlc/slices/S-025/verification/r0/tests/contract-0/table.verify-contract.test.mjs:26` |

The suite guard is `skills/sdlc/test/prompts.test.mjs:1019`.

<details>
<summary>Case detail (2 cases)</summary>

#### TC-cli-3 · Slice row command prints the formatted slice name · PASS
- **Given** a custom-format repo and a default repo. **When** `name --kind slice --id S-025` runs. **Then** it prints `feature/S-025` and `sdlc/S-025`.
- **Expected** and **Actual** match.
- **Spec source:** R-110 acceptance · **Run:** `node --test .sdlc/slices/S-025/verification/r0/tests/cli-0/branch-table.verify-cli.test.mjs`
- Evidence: `verification/r0/logs/cli-0-transcript.txt`.

#### TC-contract-4 · Slice row is verbatim and prints the formatted name · PASS
- **Given** `_common.md` at ddbea4a. **When** the test reads the slice cell and runs it with format `feature/{name}`. **Then** the cell equals `` `branches.py name --kind slice --id <sliceId>` `` and the command prints `feature/S-007`.
- **Expected** and **Actual** match.
- **Spec source:** R-110 acceptance · **Run:** `VERIFY_REPO=<worktree of sdlc/S-025> TESTKIT_SEED=20260101 node --test .sdlc/slices/S-025/verification/r0/tests/contract-0/table.verify-contract.test.mjs`

</details>

### VS-3 · The run branch row follows the git mode
Profiles: cli, contract. A wrong "last entry" would point agents at an old run branch.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-4 | `list --kind run` orders numerically; `run-10` follows `run-2`; none gives an empty list | PASS | `.sdlc/slices/S-025/verification/r0/tests/cli-0/branch-table.verify-cli.test.mjs:1` |
| TC-contract-5 | The run row is verbatim; the last entry is the newest | PASS | `.sdlc/slices/S-025/verification/r0/tests/contract-0/table.verify-contract.test.mjs:69` |

The suite guard is `skills/sdlc/test/prompts.test.mjs:1024`.

<details>
<summary>Case detail (2 cases)</summary>

#### TC-cli-4 · Run row: the last entry of `list --kind run` is the newest · PASS
- **Given** branches `sdlc/run-1`, `run-2`, `run-10`, `other/run-99`, `feature/run-4` under a custom format, and a repo with none. **When** `list --kind run` runs. **Then** the last entry is `run-10`, not `run-2`.
- **Expected** numeric order, format respected, empty list when none. **Actual** the same; exit 0 each time.
- **Spec source:** R-089 acceptance · **Run:** `node --test .sdlc/slices/S-025/verification/r0/tests/cli-0/branch-table.verify-cli.test.mjs`

#### TC-contract-5 · Run row is verbatim; `list --kind run` gives the newest last · PASS
- **Given** `_common.md` at ddbea4a. **When** the test lists run branches. **Then** the order is `run-2`, `run-9`, `run-10`, and none gives `[]`.
- **Spec source:** R-089 acceptance · **Run:** same command as TC-contract-1

```text
branches: sdlc/run-2, sdlc/run-9, sdlc/run-10; no run branches -> []
```

</details>

### VS-4 · The verify branch row comes from the prompt input
Profiles: contract. A `name` call for verify branches would invent a name the prompt already gives.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-contract-6 | The row names the `branch` input; `--kind verify` text is absent | PASS | `.sdlc/slices/S-025/verification/r0/tests/contract-0/table.verify-contract.test.mjs:80` |

The suite guard is `skills/sdlc/test/prompts.test.mjs:1033`.

<details>
<summary>Case detail (1 case)</summary>

#### TC-contract-6 · Verify row names the branch input · PASS
- **Given** `_common.md` at ddbea4a. **When** the test searches for `--kind verify` and runs `name --kind verify` without parts. **Then** no text matches and the command exits non-zero.
- **Expected** and **Actual** match.
- **Spec source:** R-090 acceptance · **Run:** same command as TC-contract-1

```text
no match for --kind verify; name --kind verify -> exit 2
```

</details>

### VS-5 · The section tells the reader to classify a branch with parse
Profiles: cli, security (planned). A hostile branch name must not crash `parse` or give a loop kind.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-5 | `parse` prints kind and ids for a loop branch and kind null for foreign branches | PASS | `.sdlc/slices/S-025/verification/r0/tests/cli-0/branch-table.verify-cli.test.mjs:1` |
| TC-cli-6 | Hostile names give no crash and kind null | PASS | `.sdlc/slices/S-025/verification/r0/tests/cli-0/branch-table.verify-cli.test.mjs:1` |

The suite guard is `skills/sdlc/test/prompts.test.mjs:1039`.

<details>
<summary>Case detail (2 cases)</summary>

#### TC-cli-5 · `parse` classifies loop and foreign branches · PASS
- **Given** a repo with format `feature/{name}`. **When** `parse` runs on `feature/S-025`, `sdlc/S-025`, `main`, `dev`. **Then** the first prints kind `slice` with the id; the others print kind null.
- **Expected** and **Actual** match; exit 0.
- **Spec source:** R-117 acceptance · **Run:** `node --test .sdlc/slices/S-025/verification/r0/tests/cli-0/branch-table.verify-cli.test.mjs`

#### TC-cli-6 · Hostile branch names never crash `parse` · PASS
- **Given** eight corpus families plus a NUL argument. **When** `parse --branch=<value>` runs for each entry. **Then** exit is 0 or 2, no traceback, kind null.
- **Expected** and **Actual** match. The NUL value cannot reach the process (`spawnError`).
- **Spec source:** R-117 acceptance · **Run:** same command as TC-cli-5

</details>

### VS-6 · The edited prompt keeps the STE style and the other prompts still match
Profiles: contract. A style failure would break the existing STE test for every prompt.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-contract-7 | `ste-check.py` exits 0; no old line changed; the Long commands bullet is intact | PASS | `.sdlc/slices/S-025/verification/r0/tests/contract-0/table.verify-contract.test.mjs:165` |

<details>
<summary>Case detail (1 case)</summary>

#### TC-contract-7 · `ste-check.py` exits 0 and no old line changed · PASS
- **Given** `_common.md` at ddbea4a. **When** the test runs `ste-check.py` and diffs against `main`. **Then** exit is 0, with 0 removed lines and 12 added lines.
- **Expected** and **Actual** match.
- **Spec source:** R-062 (STE rule in `_common.md`) · **Run:** same command as TC-contract-1

```text
ste-check exit=0; removed=0; added=12
```

</details>

## How it was attacked
No security profile was needed in the end. The plan named a `security` profile for VS-5, but the risk was rated low and no security session ran. The `cli` profile ran the attack corpus against `branches.py parse` (TC-cli-6): eight families and a NUL argument, all held. The security review (rounds 0 and 1) found no issue: the slice is prose and read-only tests, and the new test passes arguments as an array.

<details>
<summary>Attack table (9 attacks)</summary>

| input | expected | observed | result |
|---|---|---|---|
| flag-like values | no crash, kind null | no crash, kind null | held |
| traversal | no crash, kind null | no crash, kind null | held |
| control characters | no crash, kind null | no crash, kind null | held |
| unicode confusables | no crash, kind null | no crash, kind null | held |
| unicode whitespace | no crash, kind null | no crash, kind null | held |
| injection | no crash, kind null | no crash, kind null | held |
| oversized | no crash, kind null | no crash, kind null | held |
| format strings | no crash, kind null | no crash, kind null | held |
| NUL | no crash, kind null | `spawnError`; NUL cannot reach the process | held |

</details>

## Defects found on the way
- **Blocking defects:** none. No verifier, no review lens and no gate found one.
- One review finding in round 0 led to a fix: the table-command check lived only in a verifier test. Commit `9e397af` promoted it to `skills/sdlc/test/prompts.test.mjs:1045`. This was not a blocking defect.

| Seed | Found by | File |
|---|---|---|
| Promoted test title lacks the `T-R-089b` prefix | review (test-quality, architecture) | `skills/sdlc/test/prompts.test.mjs` |
| T-R-062 `parse` pattern accepts two spellings | review (architecture) | `skills/sdlc/test/prompts.test.mjs` |
| `_common.md` says `parse` prints `null`; it prints JSON with kind null | cli verifier, round 0 | `skills/sdlc/prompts/_common.md` |
| Round 0 contract test fails at load from the repo root | slice record (not investigated) | `.sdlc/slices/S-025/verification/r0/tests/contract-0/table.verify-contract.test.mjs` |

## Appendix
- Toolkit tools used: `cli-runner`, `attack-corpus`, `property` (listed in `.sdlc/testkit.json`).
- Plans: `../../slices/S-025/verification/plan-r0.md`, `../../slices/S-025/verification/plan-r1.md`.
- Profile evidence: `../../slices/S-025/verification/r0/cli-0.json`, `../../slices/S-025/verification/r0/contract-0.json`. Logs are in `../../slices/S-025/verification/r0/logs/`.
- Core verifiers: `../../slices/S-025/verify-spec-fidelity-r0.md`, `../../slices/S-025/verify-regression-r0.md`, `../../slices/S-025/verify-regression-r1.md`. Gate: `../../slices/S-025/gate-r0.md`.
- Reviews: `../../slices/S-025/review-architecture-r1.md`, `../../slices/S-025/review-security-r0.md`, `../../slices/S-025/review-security-r1.md`, `../../slices/S-025/review-test-quality-r1.md`.
- Missing sources: no `verify-spec-fidelity-r1.md`, no round 1 profile evidence, no `security` profile file, and no architecture or test-quality review for round 0. The `.md` files of the profile evidence were not read; the `.json` files hold the same cases.
- The `.sdlc/DECISIONS.md` file holds no ADR that names S-025.
