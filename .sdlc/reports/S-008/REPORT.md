# S-008 · parse precedence: run, milestone, e2e, e2e-area rows
Verdict: RELEASED
Commit under test: 35c73b3 · Rounds: 2 · Attempts: 1 · Risk: medium · Written: 2026-10-10

| Requirements | Scenarios | Cases | Passed | Failed | Blocked | Blocking defects found / fixed | Open seeds |
|---|---|---|---|---|---|---|---|
| 5 | 7 | 22 | 22 | 0 | 0 | 1 / 1 | 5 |

## Summary
The slice pins the first four rows of the `parse` table in `skills/sdlc/branches.py`: run, milestone, e2e and e2e-area. The loop uses these rows to tell branch kinds apart. S-007 built the rows, so the slice adds tests and one fix. Three profiles checked it: contract (property runs), cli (the real command in a scratch repo) and security (hostile tails). Round 0 found one blocking defect: a run number of more than 4300 digits made `parse` raise `ValueError`, and the CLI printed a traceback. Round 1 fixed it and re-ran the cli cases with no failure. The gate ran 531 tests with 0 failures. Five seeds stay open.

## Open risks
- The fix calls `sys.set_int_max_str_digits(0)` at import. Any caller that imports `branches.py` also loses the limit. A 100000 digit run number parsed in 137 ms.
- The test-quality review (`review-test-quality-r1.md`) lists six blocking items. Four name duplicate tests (T-R-069a, T-R-070a, T-R-105c, T-R-023b). Two ask for promotion records in `tests.md`. No later commit changes the tests, and the gate still held. A reviewer must weigh this.
- Rows 1 to 4 end with `$`. A tail with one final newline classifies like a clean tail. The spec gives the regexes with `$`. Git refuses a newline in a branch name, so impact is low.
- `\d` accepts non-ASCII digits. `sdlc/run-٣` gives `n` 3 and `sdlc/M-٢` gives a milestone. The plan keeps this behavior. No test pins it.
- Row 4 accepts a slash in the area, so `sdlc/M-2-e2e-a/b` gives area `a/b`. The spec says areas never contain `/`. ADR-20261009-173303-decision-judge-S-008-a88a keeps this behavior. No test pins it.
- The module API still lacks `list_kind`, `read_rules`, `evaluate` and `derive`. The spec lists them. This slice does not own them.
- The unit tests cover R-102 to R-105 and R-070. No requirement of this slice is `done` in `requirements.json`.

## Traceability
| Requirement | Spec says | Scenarios | Cases | Result |
|---|---|---|---|---|
| R-102 | \| 1 \| `run` \| `^run-(\d+)$` \| `n` \| | VS-1, VS-5, VS-7 | `contract-0:TC-contract-1`, `contract-0:TC-contract-5`, `contract-0:TC-contract-7`, `security-0:TC-security-1`, `cli-0:TC-cli-1`, `cli-0:TC-cli-5`, `cli-0:TC-cli-6`, `cli-0:TC-cli-7`, `cli-0:TC-cli-8`, `cli-0:TC-cli-9`, `cli-0:TC-cli-10`, `cli-0:TC-cli-11`, `cli-0:TC-cli-12`, `cli-0:TC-cli-13`, `cli-0:TC-cli-14`; unit: T-R-102a, T-R-102b, T-R-105c | pass |
| R-103 | \| 2 \| `milestone` \| `^(M-\d+)$` \| `id` \| | VS-2, VS-5, VS-7 | `contract-0:TC-contract-2`, `contract-0:TC-contract-5`, `security-0:TC-security-1`, `cli-0:TC-cli-2`, `cli-0:TC-cli-5`, `cli-0:TC-cli-6`, `cli-0:TC-cli-10`, `cli-0:TC-cli-13`; unit: T-R-103a, T-R-105c | pass |
| R-104 | \| 3 \| `e2e` \| `^(M-\d+)-e2e$` \| `id` \| | VS-3, VS-5, VS-7 | `contract-0:TC-contract-3`, `contract-0:TC-contract-5`, `security-0:TC-security-1`, `cli-0:TC-cli-3`, `cli-0:TC-cli-5`, `cli-0:TC-cli-6`, `cli-0:TC-cli-10`; unit: T-R-104a, T-R-105c | pass |
| R-105 | \| 4 \| `e2e-area` \| `^(M-\d+)-e2e-(.+)$` \| `id`, `area` \| | VS-4, VS-5, VS-7 | `contract-0:TC-contract-4`, `contract-0:TC-contract-5`, `security-0:TC-security-1`, `cli-0:TC-cli-4`, `cli-0:TC-cli-5`, `cli-0:TC-cli-6`, `cli-0:TC-cli-7`, `cli-0:TC-cli-10`; unit: T-R-105a, T-R-105b, T-R-105c | pass |
| R-070 | `parse keeps the table's precedence`: `S-fix-M-1-2` is a slice, `M-1-e2e-api` is an e2e area, `S-001-v0-http-api-0` is a verify branch with profile `http-api`. | VS-6 | `contract-0:TC-contract-6`; unit: T-R-070a | pass |

## Scenarios

### VS-1 · A run branch is classified as run with an integer n
Profiles: contract, cli. A wrong run row would misfile run branches.

| Case | What it proves | Result | Test |
|---|---|---|---|
| contract-0:TC-contract-1 | run row: integer n, null for run-x, run-, run-3-x, run--1 | PASS | `r0/tests/contract-0/parse.verify-contract.test.mjs:92` |
| contract-0:TC-contract-7 | Determinism and ids lookup | PASS | `r0/tests/contract-0/parse.verify-contract.test.mjs:85` |
| cli-0:TC-cli-1 | run-N gives kind run with an integer n | PASS | `r1/tests/cli-0/parse-precedence.verify-cli.test.mjs:22` |

<details>
<summary>Case detail (3 cases)</summary>

#### contract-0:TC-contract-1 · run row: integer n, null for run-x, run-, run-3-x, run--1 · PASS
- **Given** `parse imported from skills/sdlc/branches.py by path through pycall.py (python3 -I)`
- **When** `parse is called with the listed format and branch`
- **Then** `run-3 -> run n=3 int, no id; run-0, run-12, run-007 -> 0, 12, 7; the four bad tails -> null`
- **Expected** `run-3 -> run n=3 int, no id; run-0, run-12, run-007 -> 0, 12, 7; the four bad tails -> null`
- **Actual** `as expected`
- **Spec source:** R-102 acceptance · **Run:** `node --test .sdlc/slices/S-008/verification/r0/tests/contract-0/parse.verify-contract.test.mjs`
- Round: r0
- Evidence (property-run): examples. `run-3 -> {kind:run, tail:run-3, n:3, known:null}`
- Evidence (property-run): parse vs spec-table model. `property parse-vs-model seed=1368808590 runs=3000 violations=0 (kinds: run 207, milestone 227, e2e 234, e2e-area 447, state 27, verify 135, attempt 221, slice 345, null 1157)`

#### contract-0:TC-contract-7 · Determinism and ids lookup · PASS
- **Given** `ids list passed`
- **When** `parse called twice`
- **Then** `equal results`
- **Expected** `equal, known true`
- **Actual** `equal, known true`
- **Spec source:** R-103 acceptance · **Run:** `node --test .sdlc/slices/S-008/verification/r0/tests/contract-0/parse.verify-contract.test.mjs`
- Round: r0
- Evidence (property-run): determinism. `two calls deep-equal`

#### cli-0:TC-cli-1 · run-N gives kind run with an integer n · PASS
- **Given** `A scratch git repo with an empty .sdlc/config.json, and the built branches.py of the slice commit`
- **When** `branches.py parse runs as a developer runs it, with --branch and --format`
- **Then** `kind run, integer n, exit 0, tree unchanged`
- **Expected** `kind run, integer n, exit 0, tree unchanged`
- **Actual** `as expected for run-3, run-0, run-12, run-007 and null for run-x, run-, run-3-x, run--1`
- **Spec source:** R-102 acceptance; R-103; R-104; R-105 · **Run:** `VERIFY_WORKTREE=<worktree> VERIFY_OUT=<dir> node --test .sdlc/slices/S-008/verification/r1/tests/cli-0/*.test.mjs`
- Round: r1
- Evidence (transcript): parse transcripts, file `r1/logs/cli-0-transcripts.txt`

</details>

### VS-2 · A milestone branch is classified as milestone and never swallows e2e tails
Profiles: contract, cli. A milestone row that takes e2e tails would misfile e2e branches.

| Case | What it proves | Result | Test |
|---|---|---|---|
| contract-0:TC-contract-2 | milestone row never takes e2e tails | PASS | `r0/tests/contract-0/parse.verify-contract.test.mjs:92` |
| cli-0:TC-cli-2 | M-N gives milestone and never swallows e2e tails | PASS | `r1/tests/cli-0/parse-precedence.verify-cli.test.mjs:39` |

<details>
<summary>Case detail (2 cases)</summary>

#### contract-0:TC-contract-2 · milestone row never takes e2e tails · PASS
- **Given** `parse imported from skills/sdlc/branches.py by path through pycall.py (python3 -I)`
- **When** `parse is called with the listed format and branch`
- **Then** `M-2 milestone; M-, M-x null; M-2-e2e is e2e; m-2 null by default, milestone under {name:lower}`
- **Expected** `M-2 milestone; M-, M-x null; M-2-e2e is e2e; m-2 null by default, milestone under {name:lower}`
- **Actual** `as expected`
- **Spec source:** R-103 acceptance · **Run:** `node --test .sdlc/slices/S-008/verification/r0/tests/contract-0/parse.verify-contract.test.mjs`
- Round: r0
- Evidence (property-run): parse vs spec-table model. `property parse-vs-model seed=1368808590 runs=3000 violations=0 (kinds: run 207, milestone 227, e2e 234, e2e-area 447, state 27, verify 135, attempt 221, slice 345, null 1157)`

#### cli-0:TC-cli-2 · M-N gives milestone and never swallows e2e tails · PASS
- **Given** `A scratch git repo with an empty .sdlc/config.json, and the built branches.py of the slice commit`
- **When** `branches.py parse runs as a developer runs it, with --branch and --format`
- **Then** `milestone for M-2, null for M-, M-x, m-2; e2e tails are not milestone; m-2 is milestone under name:lower`
- **Expected** `milestone for M-2, null for M-, M-x, m-2; e2e tails are not milestone; m-2 is milestone under name:lower`
- **Actual** `as expected`
- **Spec source:** R-102 acceptance; R-103; R-104; R-105 · **Run:** `VERIFY_WORKTREE=<worktree> VERIFY_OUT=<dir> node --test .sdlc/slices/S-008/verification/r1/tests/cli-0/*.test.mjs`
- Round: r1
- Evidence (transcript): parse transcripts, file `r1/logs/cli-0-transcripts.txt`

</details>

### VS-3 · An e2e branch is classified as e2e and an e2e-area tail is not
Profiles: contract, cli. A loose end anchor would treat an area tail as a plain e2e branch.

| Case | What it proves | Result | Test |
|---|---|---|---|
| contract-0:TC-contract-3 | e2e row ends at e2e | PASS | `r0/tests/contract-0/parse.verify-contract.test.mjs:92` |
| cli-0:TC-cli-3 | M-N-e2e gives kind e2e and an area tail does not | PASS | `r1/tests/cli-0/parse-precedence.verify-cli.test.mjs:49` |

<details>
<summary>Case detail (2 cases)</summary>

#### contract-0:TC-contract-3 · e2e row ends at e2e · PASS
- **Given** `parse imported from skills/sdlc/branches.py by path through pycall.py (python3 -I)`
- **When** `parse is called with the listed format and branch`
- **Then** `M-2-e2e -> e2e id M-2; M-2-e2e-api -> e2e-area; M-2-e2e- -> null`
- **Expected** `M-2-e2e -> e2e id M-2; M-2-e2e-api -> e2e-area; M-2-e2e- -> null`
- **Actual** `as expected`
- **Spec source:** R-104 acceptance · **Run:** `node --test .sdlc/slices/S-008/verification/r0/tests/contract-0/parse.verify-contract.test.mjs`
- Round: r0
- Evidence (property-run): parse vs spec-table model. `property parse-vs-model seed=1368808590 runs=3000 violations=0 (kinds: run 207, milestone 227, e2e 234, e2e-area 447, state 27, verify 135, attempt 221, slice 345, null 1157)`

#### cli-0:TC-cli-3 · M-N-e2e gives kind e2e and an area tail does not · PASS
- **Given** `A scratch git repo with an empty .sdlc/config.json, and the built branches.py of the slice commit`
- **When** `branches.py parse runs as a developer runs it, with --branch and --format`
- **Then** `e2e with id M-2; M-2-e2e-api is not e2e; M-2-e2e- is null`
- **Expected** `e2e with id M-2; M-2-e2e-api is not e2e; M-2-e2e- is null`
- **Actual** `as expected`
- **Spec source:** R-102 acceptance; R-103; R-104; R-105 · **Run:** `VERIFY_WORKTREE=<worktree> VERIFY_OUT=<dir> node --test .sdlc/slices/S-008/verification/r1/tests/cli-0/*.test.mjs`
- Round: r1
- Evidence (transcript): parse transcripts, file `r1/logs/cli-0-transcripts.txt`

</details>

### VS-4 · An e2e-area branch keeps a dashed area whole
Profiles: contract, cli. A split area would lose the text after the first dash.

| Case | What it proves | Result | Test |
|---|---|---|---|
| contract-0:TC-contract-4 | e2e-area keeps dashed area whole | PASS | `r0/tests/contract-0/parse.verify-contract.test.mjs:92` |
| cli-0:TC-cli-4 | e2e-area keeps a dashed area whole | PASS | `r1/tests/cli-0/parse-precedence.verify-cli.test.mjs:58` |

<details>
<summary>Case detail (2 cases)</summary>

#### contract-0:TC-contract-4 · e2e-area keeps dashed area whole · PASS
- **Given** `parse imported from skills/sdlc/branches.py by path through pycall.py (python3 -I)`
- **When** `parse is called with the listed format and branch`
- **Then** `api-v2, a, 0, e2e, v2-api-3 kept whole`
- **Expected** `api-v2, a, 0, e2e, v2-api-3 kept whole`
- **Actual** `as expected`
- **Spec source:** R-105 acceptance · **Run:** `node --test .sdlc/slices/S-008/verification/r0/tests/contract-0/parse.verify-contract.test.mjs`
- Round: r0
- Evidence (property-run): parse vs spec-table model. `property parse-vs-model seed=1368808590 runs=3000 violations=0 (kinds: run 207, milestone 227, e2e 234, e2e-area 447, state 27, verify 135, attempt 221, slice 345, null 1157)`

#### cli-0:TC-cli-4 · e2e-area keeps a dashed area whole · PASS
- **Given** `A scratch git repo with an empty .sdlc/config.json, and the built branches.py of the slice commit`
- **When** `branches.py parse runs as a developer runs it, with --branch and --format`
- **Then** `area api-v2, a, 0, e2e, v2-api-3 and a 500 character area stay whole`
- **Expected** `area api-v2, a, 0, e2e, v2-api-3 and a 500 character area stay whole`
- **Actual** `as expected`
- **Spec source:** R-102 acceptance; R-103; R-104; R-105 · **Run:** `VERIFY_WORKTREE=<worktree> VERIFY_OUT=<dir> node --test .sdlc/slices/S-008/verification/r1/tests/cli-0/*.test.mjs`
- Round: r1
- Evidence (transcript): parse transcripts, file `r1/logs/cli-0-transcripts.txt`

</details>

### VS-5 · First-match order holds under prefixed and suffixed formats
Profiles: contract, cli. A changed row order would misclassify branches under a prefix or suffix.

| Case | What it proves | Result | Test |
|---|---|---|---|
| contract-0:TC-contract-5 | first-match order under prefixed, suffixed and lower formats | PASS | `r0/tests/contract-0/parse.verify-contract.test.mjs:117` |
| cli-0:TC-cli-5 | First-match order under prefixed and suffixed formats | PASS | `r1/tests/cli-0/parse-precedence.verify-cli.test.mjs:65` |
| cli-0:TC-cli-11 | Huge run-N under prefixed, suffixed and name:lower formats | PASS | `r1/tests/cli-0/parse-fix.verify-cli.test.mjs:57` |

<details>
<summary>Case detail (3 cases)</summary>

#### contract-0:TC-contract-5 · first-match order under prefixed, suffixed and lower formats · PASS
- **Given** `parse imported from skills/sdlc/branches.py by path through pycall.py (python3 -I)`
- **When** `parse is called with the listed format and branch`
- **Then** `rows 1-4 classify identically under feature/PROJ-1-{name}, {name}-wip, feature/PROJ-1-{name:lower}; tail M-2-e2e-api-wip with suffix -wip gives area api`
- **Expected** `rows 1-4 classify identically under feature/PROJ-1-{name}, {name}-wip, feature/PROJ-1-{name:lower}; tail M-2-e2e-api-wip with suffix -wip gives area api`
- **Actual** `as expected`
- **Spec source:** R-102 acceptance · **Run:** `node --test .sdlc/slices/S-008/verification/r0/tests/contract-0/parse.verify-contract.test.mjs`
- Round: r0
- Evidence (property-run): parse vs spec-table model. `property parse-vs-model seed=1368808590 runs=3000 violations=0 (kinds: run 207, milestone 227, e2e 234, e2e-area 447, state 27, verify 135, attempt 221, slice 345, null 1157)`
- Evidence (type-check): mutation check. `Row 3 end anchor removed in a scratch copy: property run 554 violations of 3000, examples and VS-5 tests fail. Copy deleted.`

#### cli-0:TC-cli-5 · First-match order under prefixed and suffixed formats · PASS
- **Given** `A scratch git repo with an empty .sdlc/config.json, and the built branches.py of the slice commit`
- **When** `branches.py parse runs as a developer runs it, with --branch and --format`
- **Then** `rows 1 to 4 hold under feature/PROJ-1-{name} and {name}-wip`
- **Expected** `rows 1 to 4 hold under feature/PROJ-1-{name} and {name}-wip`
- **Actual** `as expected`
- **Spec source:** R-102 acceptance; R-103; R-104; R-105 · **Run:** `VERIFY_WORKTREE=<worktree> VERIFY_OUT=<dir> node --test .sdlc/slices/S-008/verification/r1/tests/cli-0/*.test.mjs`
- Round: r1
- Evidence (transcript): parse transcripts, file `r1/logs/cli-0-transcripts.txt`

#### cli-0:TC-cli-11 · Huge run-N under prefixed, suffixed and name:lower formats · PASS
- **Given** `A scratch git repo with an empty .sdlc/config.json, and the built branches.py of the slice commit`
- **When** `branches.py parse runs as a developer runs it, with --branch and --format`
- **Then** `kind run and no traceback in each format`
- **Expected** `kind run and no traceback in each format`
- **Actual** `as expected`
- **Spec source:** R-102 acceptance; R-103; R-104; R-105 · **Run:** `VERIFY_WORKTREE=<worktree> VERIFY_OUT=<dir> node --test .sdlc/slices/S-008/verification/r1/tests/cli-0/*.test.mjs`
- Round: r1
- Evidence (transcript): fix transcripts (digit lengths shortened in the log), file `r1/logs/cli-0-fix-transcripts.txt`

</details>

### VS-6 · Slice, e2e-area and verify branches keep the table's precedence in one call
Profiles: contract. A wrong table order would misclassify slice, e2e-area and verify branches.

| Case | What it proves | Result | Test |
|---|---|---|---|
| contract-0:TC-contract-6 | slice, e2e-area and verify precedence in one call | PASS | `r0/tests/contract-0/parse.verify-contract.test.mjs:92` |

<details>
<summary>Case detail (1 cases)</summary>

#### contract-0:TC-contract-6 · slice, e2e-area and verify precedence in one call · PASS
- **Given** `parse imported from skills/sdlc/branches.py by path through pycall.py (python3 -I)`
- **When** `parse is called with the listed format and branch`
- **Then** `S-fix-M-1-2 slice; M-1-e2e-api e2e-area; S-001-v0-http-api-0 verify profile http-api round 0 part 0`
- **Expected** `S-fix-M-1-2 slice; M-1-e2e-api e2e-area; S-001-v0-http-api-0 verify profile http-api round 0 part 0`
- **Actual** `as expected`
- **Spec source:** R-070 acceptance · **Run:** `node --test .sdlc/slices/S-008/verification/r0/tests/contract-0/parse.verify-contract.test.mjs`
- Round: r0
- Evidence (property-run): one call. `slice id S-fix-M-1-2; e2e-area; verify {profile:http-api, round:0, part:0, id:S-001}`

</details>

### VS-7 · Hostile branch tails are refused or classified without crashes
Profiles: security, cli. A crash or an extra kind on a hostile tail would break the loop.

| Case | What it proves | Result | Test |
|---|---|---|---|
| security-0:TC-security-1 | Hostile branch tails are refused or classified without crashes in scope | PASS | `r0/tests/security-0/parse-hostile.verify-security.test.mjs:8` |
| cli-0:TC-cli-6 | Hostile tails never crash and never gain a kind | PASS | `r1/tests/cli-0/parse-precedence.verify-cli.test.mjs:79` |
| cli-0:TC-cli-7 | run-N with 5000 digits gives one JSON object, not a traceback (re-run of the failed round 0 case) | PASS | `r1/tests/cli-0/parse-precedence.verify-cli.test.mjs:107` |
| cli-0:TC-cli-8 | run-N at the int string limit boundary and far beyond it | PASS | `r1/tests/cli-0/parse-fix.verify-cli.test.mjs:23` |
| cli-0:TC-cli-9 | The 5000 digit n is printed exactly | PASS | `r1/tests/cli-0/parse-fix.verify-cli.test.mjs:34` |
| cli-0:TC-cli-10 | Huge integers in verify round, verify part, attempt n, milestone id, e2e and e2e-area rows | PASS | `r1/tests/cli-0/parse-fix.verify-cli.test.mjs:41` |
| cli-0:TC-cli-12 | Huge unicode digit run-N | PASS | `r1/tests/cli-0/parse-fix.verify-cli.test.mjs:66` |
| cli-0:TC-cli-13 | The huge-integers attack corpus through run-, M- and attempt- tails | PASS | `r1/tests/cli-0/parse-fix.verify-cli.test.mjs:72` |
| cli-0:TC-cli-14 | Run the huge case twice (idempotency) | PASS | `r1/tests/cli-0/parse-fix.verify-cli.test.mjs:86` |

<details>
<summary>Case detail (9 cases)</summary>

#### security-0:TC-security-1 · Hostile branch tails are refused or classified without crashes in scope · PASS
- **Given** `Branch format sdlc/{name} and two other formats; slice commit 3ce4bff`
- **When** `The attack corpus, newline tails, unicode digits and flag-like values go to parse and to the CLI`
- **Then** `No tail gains a kind the spec rows forbid; the CLI writes nothing`
- **Expected** `Spec rows 1 to 4 hold as written; no state change`
- **Actual** `Rows behave as the spec regexes say. Only a 4301-digit tail raises; no requirement covers it.`
- **Spec source:** R-102 to R-105 acceptance · **Run:** `BRANCHES_PY=<repo>/skills/sdlc/branches.py node --test .sdlc/slices/S-008/verification/r0/tests/security-0/parse-hostile.verify-security.test.mjs`
- Round: r0
- Evidence (attack): run log, file `r0/logs/security-0-run.txt`
- Evidence (file-tree): no tree change after 12 CLI attacks. `treeUnchanged true for every call (cli-runner tree diff)`

#### cli-0:TC-cli-6 · Hostile tails never crash and never gain a kind · PASS
- **Given** `A scratch git repo with an empty .sdlc/config.json, and the built branches.py of the slice commit`
- **When** `branches.py parse runs as a developer runs it, with --branch and --format`
- **Then** `every hostile tail gives one JSON object, no traceback, tree unchanged; NUL gives a spawn error; unknown flag exits non-zero`
- **Expected** `every hostile tail gives one JSON object, no traceback, tree unchanged; NUL gives a spawn error; unknown flag exits non-zero`
- **Actual** `as expected; the matrix is in logs/cli-0-vs7-matrix.json`
- **Spec source:** R-102 acceptance; R-103; R-104; R-105 · **Run:** `VERIFY_WORKTREE=<worktree> VERIFY_OUT=<dir> node --test .sdlc/slices/S-008/verification/r1/tests/cli-0/*.test.mjs`
- Round: r1
- Evidence (transcript): parse transcripts, file `r1/logs/cli-0-transcripts.txt`
- Evidence (log): hostile matrix, file `r1/logs/cli-0-vs7-matrix.json`

#### cli-0:TC-cli-7 · run-N with 5000 digits gives one JSON object, not a traceback (re-run of the failed round 0 case) · PASS
- **Given** `A scratch git repo with an empty .sdlc/config.json, and the built branches.py of the slice commit`
- **When** `branches.py parse runs as a developer runs it, with --branch and --format`
- **Then** `exit 0, one JSON object, no traceback`
- **Expected** `exit 0, one JSON object, no traceback`
- **Actual** `exit 0, kind run, the n field holds all 5000 digits. The fix 35c73b3 holds.`
- **Spec source:** R-102 acceptance; R-103; R-104; R-105 · **Run:** `VERIFY_WORKTREE=<worktree> VERIFY_OUT=<dir> node --test .sdlc/slices/S-008/verification/r1/tests/cli-0/*.test.mjs`
- Round: r1
- Evidence (transcript): fix transcripts (digit lengths shortened in the log), file `r1/logs/cli-0-fix-transcripts.txt`

#### cli-0:TC-cli-8 · run-N at the int string limit boundary and far beyond it · PASS
- **Given** `A scratch git repo with an empty .sdlc/config.json, and the built branches.py of the slice commit`
- **When** `branches.py parse runs as a developer runs it, with --branch and --format`
- **Then** `lengths 1, 4299, 4300, 4301, 5000, 20000, 100000 digits all give kind run, the full tail, exit 0, under 20 s`
- **Expected** `lengths 1, 4299, 4300, 4301, 5000, 20000, 100000 digits all give kind run, the full tail, exit 0, under 20 s`
- **Actual** `all pass; the 100000 digit case takes 137 ms`
- **Spec source:** R-102 acceptance; R-103; R-104; R-105 · **Run:** `VERIFY_WORKTREE=<worktree> VERIFY_OUT=<dir> node --test .sdlc/slices/S-008/verification/r1/tests/cli-0/*.test.mjs`
- Round: r1
- Evidence (transcript): fix transcripts (digit lengths shortened in the log), file `r1/logs/cli-0-fix-transcripts.txt`

#### cli-0:TC-cli-9 · The 5000 digit n is printed exactly · PASS
- **Given** `A scratch git repo with an empty .sdlc/config.json, and the built branches.py of the slice commit`
- **When** `branches.py parse runs as a developer runs it, with --branch and --format`
- **Then** `stdout holds the exact digit string`
- **Expected** `stdout holds the exact digit string`
- **Actual** `as expected`
- **Spec source:** R-102 acceptance; R-103; R-104; R-105 · **Run:** `VERIFY_WORKTREE=<worktree> VERIFY_OUT=<dir> node --test .sdlc/slices/S-008/verification/r1/tests/cli-0/*.test.mjs`
- Round: r1
- Evidence (transcript): fix transcripts (digit lengths shortened in the log), file `r1/logs/cli-0-fix-transcripts.txt`

#### cli-0:TC-cli-10 · Huge integers in verify round, verify part, attempt n, milestone id, e2e and e2e-area rows · PASS
- **Given** `A scratch git repo with an empty .sdlc/config.json, and the built branches.py of the slice commit`
- **When** `branches.py parse runs as a developer runs it, with --branch and --format`
- **Then** `6000 digit values give the right kind and one JSON object each`
- **Expected** `6000 digit values give the right kind and one JSON object each`
- **Actual** `as expected`
- **Spec source:** R-102 acceptance; R-103; R-104; R-105 · **Run:** `VERIFY_WORKTREE=<worktree> VERIFY_OUT=<dir> node --test .sdlc/slices/S-008/verification/r1/tests/cli-0/*.test.mjs`
- Round: r1
- Evidence (transcript): fix transcripts (digit lengths shortened in the log), file `r1/logs/cli-0-fix-transcripts.txt`

#### cli-0:TC-cli-12 · Huge unicode digit run-N · PASS
- **Given** `A scratch git repo with an empty .sdlc/config.json, and the built branches.py of the slice commit`
- **When** `branches.py parse runs as a developer runs it, with --branch and --format`
- **Then** `5000 Arabic-indic digits give kind run, no traceback`
- **Expected** `5000 Arabic-indic digits give kind run, no traceback`
- **Actual** `as expected (the plan keeps unicode digits as digits)`
- **Spec source:** R-102 acceptance; R-103; R-104; R-105 · **Run:** `VERIFY_WORKTREE=<worktree> VERIFY_OUT=<dir> node --test .sdlc/slices/S-008/verification/r1/tests/cli-0/*.test.mjs`
- Round: r1
- Evidence (transcript): fix transcripts (digit lengths shortened in the log), file `r1/logs/cli-0-fix-transcripts.txt`

#### cli-0:TC-cli-13 · The huge-integers attack corpus through run-, M- and attempt- tails · PASS
- **Given** `A scratch git repo with an empty .sdlc/config.json, and the built branches.py of the slice commit`
- **When** `branches.py parse runs as a developer runs it, with --branch and --format`
- **Then** `no traceback and one JSON object for every entry`
- **Expected** `no traceback and one JSON object for every entry`
- **Actual** `as expected`
- **Spec source:** R-102 acceptance; R-103; R-104; R-105 · **Run:** `VERIFY_WORKTREE=<worktree> VERIFY_OUT=<dir> node --test .sdlc/slices/S-008/verification/r1/tests/cli-0/*.test.mjs`
- Round: r1
- Evidence (transcript): fix transcripts (digit lengths shortened in the log), file `r1/logs/cli-0-fix-transcripts.txt`

#### cli-0:TC-cli-14 · Run the huge case twice (idempotency) · PASS
- **Given** `A scratch git repo with an empty .sdlc/config.json, and the built branches.py of the slice commit`
- **When** `branches.py parse runs as a developer runs it, with --branch and --format`
- **Then** `identical stdout both times`
- **Expected** `identical stdout both times`
- **Actual** `as expected`
- **Spec source:** R-102 acceptance; R-103; R-104; R-105 · **Run:** `VERIFY_WORKTREE=<worktree> VERIFY_OUT=<dir> node --test .sdlc/slices/S-008/verification/r1/tests/cli-0/*.test.mjs`
- Round: r1
- Evidence (transcript): fix transcripts (digit lengths shortened in the log), file `r1/logs/cli-0-fix-transcripts.txt`

</details>

## How it was attacked
One security session ran at round 0 on commit 3ce4bff. The charter: explore `parse` rows 1 to 4 with hostile tails to find a tail that gains a kind a clean tail would not get. The threat model treats branch names from the local repo and from forge pull request heads as untrusted text. The session tried 8 attacks. Three held (A-3, A-6, A-8) and none broke a clean-tail guarantee. Five were out of scope: newline tails, unicode digits, huge integers (two attacks) and a slash in an area. The huge integer attack led to the blocking defect that round 1 fixed.

<details>
<summary>Attack table (8 attacks)</summary>

| Attack | Input | Expected | Observed | Result |
|---|---|---|---|---|
| A-1 | `sdlc/run-3\n, sdlc/M-2\n, sdlc/M-2-e2e\n` | null, or the same kind as the clean tail only if the spec regex allows it | kind run n 3, milestone M-2, e2e M-2. Python $ matches before a final newline; tail keeps the newline. sdlc/M-2-e2e\n\n gives null. The regex text is the spec's own, so the guarantee is met as written. A git branch cannot hold a newline (check-ref-format). | out-of-scope |
| A-2 | `sdlc/run-٣, sdlc/run-３, sdlc/M-２, sdlc/M-٢-e2e` | no spec statement; the plan says no test pins them | Python \d matches them: run n 3; milestone id M-２ keeps its spelling. Seed. | out-of-scope |
| A-3 | `sdlc/run-3\r, sdlc/run-\u0000, sdlc/run-3 + U+200B, sdlc/M-2-e2e-a\nb` | null, no raise | All null, no raise. | held |
| A-4 | `2814 calls: run-, M-, M-2-e2e-, run-3, M-2, M-2e2e plus each corpus value` | never raises (plan note for VS-7) | 21 calls raise ValueError: Exceeds the limit (4300 digits) for integer string conversion, for run-<more than 4300 digits>. All other 2793 return or null. | out-of-scope |
| A-5 | `branches.py parse --branch sdlc/run-<4400 nines>` | one JSON object | Python traceback ValueError on stderr, no JSON, exit 1. git check-ref-format accepts the name; a ref this long cannot be a loose ref file on common file systems. | out-of-scope |
| A-6 | `--help, -x, $(touch pwn), 'touch pwn', ;touch pwn, 'sdlc/run-3 --format x', also --branch=<value>` | exit 0 or 2 with JSON, tree unchanged | --help and -x as separate argv give exit 2 JSON 'expected one argument'; the --branch= form parses them. The rest gives kind null. No file written, no ref change (treeUnchanged true). | held |
| A-7 | `sdlc/M-2-e2e-a/b` | ADR-20261009-173303-decision-judge-S-008-a88a: S-007 behavior stays | kind e2e-area, id M-2, area a/b. Noted, not failed, per the ADR. | out-of-scope |
| A-8 | `--branch 'sdlc/run-3\n'` | same kind as the function | CLI gives kind run n 3, the same as the function. | held |

</details>

## Defects found on the way
- **Blocking defects**
  - A run number of more than 4300 digits made `parse` raise `ValueError`. Found by the cli verifier (TC-cli-7) and the security verifier (A-4, A-5) in round 0. Spec source: R-102 acceptance and the rule that every command prints one JSON object. Reproduce: `branches.py parse --branch sdlc/run-<5000 digits>`. Fixed in commit `35c73b3`. Guarded by T-R-102b (`skills/sdlc/test/branches.test.mjs:1132`) and by TC-cli-7 to TC-cli-14 in round 1.
- **Seeds**

| Seed | Found by | File |
|---|---|---|
| `parse` accepts a trailing newline in rows 1 to 4 | cli, contract and security verifiers | `skills/sdlc/branches.py` |
| `parse` treats unicode digits as digits | cli and security verifiers | `skills/sdlc/branches.py` |
| A slash in an e2e-area tail is accepted (note only, per ADR) | cli and security verifiers | `skills/sdlc/branches.py` |
| The fix lifts the int string limit for the whole process | cli verifier, round 1 | `skills/sdlc/branches.py` |
| Module API lacks `list_kind`, `read_rules`, `evaluate`, `derive` | contract verifier | `skills/sdlc/branches.py` |

## Appendix
- Toolkit tools used: `property` (`skills/sdlc/test/testkit/property.mjs`), `cli-runner` (`skills/sdlc/test/testkit/cli-runner.mjs`), `attack-corpus` (`skills/sdlc/test/testkit/attack-corpus.mjs`).
- Plan: `../../slices/S-008/verification/plan-r0.json` and `plan-r0.md` in the same folder.
- Round 0 evidence: `../../slices/S-008/verification/r0/contract-0.md`, `cli-0.md`, `security-0.md`.
- Round 1 evidence: `../../slices/S-008/verification/r1/cli-0.md`.
- Core verifiers: `../../slices/S-008/verify-spec-fidelity-r0.md`, `verify-spec-fidelity-r1.md`, `verify-regression-r0.md`, `verify-regression-r1.md`.
- Reviews: `../../slices/S-008/review-security-r1.md`, `review-test-quality-r1.md`. Gate: `../../slices/S-008/gate-r0.md`.
- Missing sources: none. The round 1 gate report is the file `gate-r0.md`, which names commit 64b268e.
