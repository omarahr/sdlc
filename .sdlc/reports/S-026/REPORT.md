# S-026 · _common.md completes the placeholder table
Verdict: RELEASED
Commit under test: dae25a1 · Rounds: 1 · Attempts: 1 · Risk: low · Written: 2026-10-10

| Requirements | Scenarios | Cases | Passed | Failed | Blocked | Blocking defects found / fixed | Open seeds |
|---|---|---|---|---|---|---|---|
| 5 | 6 | 12 | 12 | 0 | 0 | 0 / 0 | 3 |

## Summary
The slice proves that five rows of the `_common.md` placeholder table match the spec. The rows cover the milestone, e2e, e2e area, state and attempt branches. Slice S-025 had already written the rows, so this slice changed no product text. It added five tests to `skills/sdlc/test/prompts.test.mjs`. The `cli` and `contract` profiles read each row and ran each name command in scratch repos. A reference model written from the spec agreed with `branches.py` over 2000 generated runs. The verifiers found no blocking defect. Three non-blocking seeds about `branches.py` input checks remain open.

## Open risks
- The five new tests passed on first run, because the rows already matched the spec (characterization tests, see `tests.md`). The reviewers checked the assertions against the spec text.
- Open seeds 1 to 3 in the table under Defects concern `branches.py`, not the table. A reviewer should weigh them before the attempt number or area id comes from untrusted input.
- The plan risk is `low`; `slices.json` rates the slice `medium`. The full `cli` and `contract` battery ran for both.
- Lint, typecheck, build and e2e commands are not configured. The gate ran only `npm test`.
- No timing number was measured against a spec number. The gate shows the suite took 93 s against a baseline of 88 s.

## Traceability
| Requirement | Spec says | Scenarios | Cases | Result |
|---|---|---|---|---|
| R-111 | `| `<milestone branch>` | `branches.py name --kind milestone --id <milestoneId>` |` | VS-1, VS-6 | TC-cli-1, TC-contract-1, TC-cli-6, TC-contract-6 | pass |
| R-112 | `| `<e2e branch>` | `branches.py name --kind e2e --id <milestoneId>` |` | VS-2, VS-6 | TC-cli-2, TC-contract-2, TC-cli-6, TC-contract-6 | pass |
| R-113 | `| `<e2e area branch>` | `branches.py name --kind e2e-area --id <milestoneId> --area <areaId>` |` | VS-3, VS-6 | TC-cli-3, TC-contract-3, TC-cli-6, TC-contract-6 | pass |
| R-114 | `| `<state branch>` | `branches.py name --kind state` (it makes the timestamp) |` | VS-4, VS-6 | TC-cli-4, TC-contract-4, TC-cli-6, TC-contract-6 | pass |
| R-115 | `| `<attempt branch>` | `branches.py name --kind attempt --id <sliceId> --n <n>` |` | VS-5, VS-6 | TC-cli-5, TC-contract-5, TC-cli-6, TC-contract-6 | pass |

## Scenarios

### VS-1 · The milestone branch row gives the milestone name command
Profiles: cli, contract. Risk: The row drifts from the spec, or the command fails when run.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-1 | Milestone row command runs and gives a format-following name | PASS | `.sdlc/slices/S-026/verification/r0/tests/cli-0/branch-table.verify-cli.test.mjs:15` |
| TC-contract-1 | Milestone row equals the spec cell | PASS | `.sdlc/slices/S-026/verification/r0/tests/contract-0/placeholder-table.verify-contract.test.mjs:25` |

<details>
<summary>Case detail (2 cases)</summary>

#### TC-cli-1 · Milestone row command runs and gives a format-following name · PASS
- **Given** A scratch git repo with .sdlc/config.json holding branchFormat sdlc/{name} **When** Read the row in _common.md; run branches.py name --kind milestone --id M-3 with sdlc/{name} and feature/{name} **Then** The row holds the exact command; exit 0; ok true; branch sdlc/M-3 and feature/M-3; file tree unchanged
- **Expected** The row holds the exact command; exit 0; ok true; branch sdlc/M-3 and feature/M-3; file tree unchanged **Actual** As expected
- **Spec source:** R-111 acceptance · **Run:** `node --test .sdlc/slices/S-026/verification/r0/tests/cli-0/branch-table.verify-cli.test.mjs`
```console
$ branches.py name --repo <scratch> --kind milestone --id M-3
→ exit 0 {"ok": true, "kind": "milestone", "branch": "sdlc/M-3"}
feature/{name} → feature/M-3
```

#### TC-contract-1 · Milestone row equals the spec cell · PASS
- **Given** The branch sdlc/S-026 at 48d8ffe **When** The case runs **Then** The row reads exactly the spec cell
- **Expected** The row reads exactly the spec cell **Actual** Equal
- **Spec source:** R-111 acceptance · **Run:** `cd .sdlc/slices/S-026/verification/r0/tests/contract-0 && VERIFY_WT=<worktree of sdlc/S-026> node --test placeholder-table.verify-contract.test.mjs`
- Log: [test log](../../slices/S-026/verification/r0/logs/contract-0.txt)
- Property run: `property-run seed=477210938 runs=2000 violations=0 (reference model written from spec section 8; formats sdlc/{name} and sdlc/{name:lower})`

</details>

### VS-2 · The e2e branch row takes the milestone id and no area
Profiles: cli, contract. Risk: The row gains an --area argument, or mixes up the e2e and e2e-area kinds.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-2 | E2E row has no --area and its name differs from e2e-area | PASS | `.sdlc/slices/S-026/verification/r0/tests/cli-0/branch-table.verify-cli.test.mjs:26` |
| TC-contract-2 | E2E row equals the spec cell and has no --area | PASS | `.sdlc/slices/S-026/verification/r0/tests/contract-0/placeholder-table.verify-contract.test.mjs:25` |

<details>
<summary>Case detail (2 cases)</summary>

#### TC-cli-2 · E2E row has no --area and its name differs from e2e-area · PASS
- **Given** A scratch git repo with .sdlc/config.json holding branchFormat sdlc/{name} **When** Check row text; run --kind e2e --id M-3 and --kind e2e-area --id M-3 --area A-1 **Then** Row holds no --area; names differ
- **Expected** Row holds no --area; names differ **Actual** sdlc/M-3-e2e and sdlc/M-3-e2e-A-1
- **Spec source:** R-112 acceptance · **Run:** `node --test .sdlc/slices/S-026/verification/r0/tests/cli-0/branch-table.verify-cli.test.mjs`
```console
e2e → sdlc/M-3-e2e
e2e-area → sdlc/M-3-e2e-A-1
```

#### TC-contract-2 · E2E row equals the spec cell and has no --area · PASS
- **Given** The branch sdlc/S-026 at 48d8ffe **When** The case runs **Then** The row reads exactly the spec cell
- **Expected** The row reads exactly the spec cell **Actual** Equal; name differs from e2e-area and milestone names
- **Spec source:** R-112 acceptance · **Run:** `cd .sdlc/slices/S-026/verification/r0/tests/contract-0 && VERIFY_WT=<worktree of sdlc/S-026> node --test placeholder-table.verify-contract.test.mjs`
- Log: [test log](../../slices/S-026/verification/r0/logs/contract-0.txt)
- Property run: `property-run seed=477210938 runs=2000 violations=0 (reference model written from spec section 8; formats sdlc/{name} and sdlc/{name:lower})`

</details>

### VS-3 · The e2e area branch row takes a milestone id and an area id
Profiles: cli, contract. Risk: The row loses --area, or an odd area id gives a bad name.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-3 | E2E area row works with plain and hyphenated areas; missing --area is refused | PASS | `.sdlc/slices/S-026/verification/r0/tests/cli-0/branch-table.verify-cli.test.mjs:36` |
| TC-contract-3 | E2E area row equals the spec cell; missing --area is refused | PASS | `.sdlc/slices/S-026/verification/r0/tests/contract-0/placeholder-table.verify-contract.test.mjs:25` |

<details>
<summary>Case detail (2 cases)</summary>

#### TC-cli-3 · E2E area row works with plain and hyphenated areas; missing --area is refused · PASS
- **Given** A scratch git repo with .sdlc/config.json holding branchFormat sdlc/{name} **When** Run e2e-area with area auth, user-profile; without --area; with odd areas **Then** Plain and hyphenated give sdlc/M-1-e2e-<area>; missing area exits 2 with a clear error
- **Expected** Plain and hyphenated give sdlc/M-1-e2e-<area>; missing area exits 2 with a clear error **Actual** auth and user-profile pass; missing area: exit 2, error 'a e2e-area branch name needs a non-empty area'
- **Spec source:** R-113 acceptance · **Run:** `node --test .sdlc/slices/S-026/verification/r0/tests/cli-0/branch-table.verify-cli.test.mjs`
```console
auth → sdlc/M-1-e2e-auth
user-profile → sdlc/M-1-e2e-user-profile
no --area → exit 2 {"ok": false, "error": "a e2e-area branch name needs a non-empty area"}
odd area 'a b' → exit 0 sdlc/M-1-e2e-a b (see seed)
```

#### TC-contract-3 · E2E area row equals the spec cell; missing --area is refused · PASS
- **Given** The branch sdlc/S-026 at 48d8ffe **When** The case runs **Then** Row equals the cell; exit 2 with a clear error without --area
- **Expected** Row equals the cell; exit 2 with a clear error without --area **Actual** Equal; exit 2: a e2e-area branch name needs a non-empty area
- **Spec source:** R-113 acceptance · **Run:** `cd .sdlc/slices/S-026/verification/r0/tests/contract-0 && VERIFY_WT=<worktree of sdlc/S-026> node --test placeholder-table.verify-contract.test.mjs`
- Log: [test log](../../slices/S-026/verification/r0/logs/contract-0.txt)
- Property run: `property-run seed=477210938 runs=2000 violations=0 (reference model written from spec section 8; formats sdlc/{name} and sdlc/{name:lower})`

</details>

### VS-4 · The state branch row takes no id and makes the timestamp
Profiles: cli, contract. Risk: The row asks for --id, or the command needs one.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-4 | State row takes no --id and the command makes the timestamp | PASS | `.sdlc/slices/S-026/verification/r0/tests/cli-0/branch-table.verify-cli.test.mjs:48` |
| TC-contract-4 | State row equals the spec cell; the name holds a 14-digit timestamp | PASS | `.sdlc/slices/S-026/verification/r0/tests/contract-0/placeholder-table.verify-contract.test.mjs:25` |

<details>
<summary>Case detail (2 cases)</summary>

#### TC-cli-4 · State row takes no --id and the command makes the timestamp · PASS
- **Given** A scratch git repo with .sdlc/config.json holding branchFormat sdlc/{name} **When** Run --kind state twice with no --id **Then** Row holds no --id and says it makes the timestamp; both names match sdlc/state-<14 digits>
- **Expected** Row holds no --id and says it makes the timestamp; both names match sdlc/state-<14 digits> **Actual** sdlc/state-20261010063108 twice, exit 0
- **Spec source:** R-114 acceptance · **Run:** `node --test .sdlc/slices/S-026/verification/r0/tests/cli-0/branch-table.verify-cli.test.mjs`
```console
state → sdlc/state-20261010063108
state → sdlc/state-20261010063108
```

#### TC-contract-4 · State row equals the spec cell; the name holds a 14-digit timestamp · PASS
- **Given** The branch sdlc/S-026 at 48d8ffe **When** The case runs **Then** Row equals the cell; name matches state-<14 digits>
- **Expected** Row equals the cell; name matches state-<14 digits> **Actual** Equal; sdlc/state-20261010063120
- **Spec source:** R-114 acceptance · **Run:** `cd .sdlc/slices/S-026/verification/r0/tests/contract-0 && VERIFY_WT=<worktree of sdlc/S-026> node --test placeholder-table.verify-contract.test.mjs`
- Log: [test log](../../slices/S-026/verification/r0/logs/contract-0.txt)
- Property run: `property-run seed=477210938 runs=2000 violations=0 (reference model written from spec section 8; formats sdlc/{name} and sdlc/{name:lower})`

</details>

### VS-5 · The attempt branch row takes a slice id and an attempt number
Profiles: cli, contract. Risk: The row loses --n, or a bad n gives a malformed name.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-5 | Attempt row with n = 2; bad n never gives a malformed name | PASS | `.sdlc/slices/S-026/verification/r0/tests/cli-0/branch-table.verify-cli.test.mjs:56` |
| TC-contract-5 | Attempt row equals the spec cell; n=2 gives S-012-attempt-2; abc refused | PASS | `.sdlc/slices/S-026/verification/r0/tests/contract-0/placeholder-table.verify-contract.test.mjs:25` |

<details>
<summary>Case detail (2 cases)</summary>

#### TC-cli-5 · Attempt row with n = 2; bad n never gives a malformed name · PASS
- **Given** A scratch git repo with .sdlc/config.json holding branchFormat sdlc/{name} **When** Run --kind attempt --id S-026 --n 2; then n = 0, -1, abc, 1.5, empty, huge, unicode digits **Then** n = 2 gives sdlc/S-026-attempt-2; each other value is refused (exit 2, no branch) or gives a branch of safe characters
- **Expected** n = 2 gives sdlc/S-026-attempt-2; each other value is refused (exit 2, no branch) or gives a branch of safe characters **Actual** abc, 1.5, empty, superscript two refused with exit 2; 0, -1, huge, ' 2', Arabic-indic 2 give safe-character names
- **Spec source:** R-115 acceptance · **Run:** `node --test .sdlc/slices/S-026/verification/r0/tests/cli-0/branch-table.verify-cli.test.mjs`
```console
n=2 → sdlc/S-026-attempt-2
0 → sdlc/S-026-attempt-0
-1 → sdlc/S-026-attempt--1
abc → exit 2
99999999999999999999 → sdlc/S-026-attempt-99999999999999999999
' 2' → sdlc/S-026-attempt-2
```

#### TC-contract-5 · Attempt row equals the spec cell; n=2 gives S-012-attempt-2; abc refused · PASS
- **Given** The branch sdlc/S-026 at 48d8ffe **When** The case runs **Then** Row equals the cell; valid names
- **Expected** Row equals the cell; valid names **Actual** Equal; sdlc/S-012-attempt-2; abc exits 2
- **Spec source:** R-115 acceptance · **Run:** `cd .sdlc/slices/S-026/verification/r0/tests/contract-0 && VERIFY_WT=<worktree of sdlc/S-026> node --test placeholder-table.verify-contract.test.mjs`
- Log: [test log](../../slices/S-026/verification/r0/logs/contract-0.txt)
- Property run: `property-run seed=477210938 runs=2000 violations=0 (reference model written from spec section 8; formats sdlc/{name} and sdlc/{name:lower})`

</details>

### VS-6 · Every row of the placeholder table is complete and runs
Profiles: cli, contract. Risk: A row is missing or wrongly split, or a row is never run.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-6 | Table has eight rows and each name command runs | PASS | `.sdlc/slices/S-026/verification/r0/tests/cli-0/branch-table.verify-cli.test.mjs:70` |
| TC-contract-6 | Table lists eight placeholders; name() equals a reference model over 2000 runs | PASS | `.sdlc/slices/S-026/verification/r0/tests/contract-0/placeholder-table.verify-contract.test.mjs:44` |

<details>
<summary>Case detail (2 cases)</summary>

#### TC-cli-6 · Table has eight rows and each name command runs · PASS
- **Given** A scratch git repo with .sdlc/config.json holding branchFormat sdlc/{name} **When** Count rows in _common.md; run name for slice, milestone, e2e, e2e-area, state, attempt; run prompts.test.mjs (STE check) **Then** Eight rows; every command exits 0; prompts.test.mjs 77 of 77 pass
- **Expected** Eight rows; every command exits 0; prompts.test.mjs 77 of 77 pass **Actual** As expected
- **Spec source:** R-111..R-115 acceptance · **Run:** `node --test .sdlc/slices/S-026/verification/r0/tests/cli-0/branch-table.verify-cli.test.mjs`
```console
slice sdlc/S-1
milestone sdlc/M-1
e2e sdlc/M-1-e2e
e2e-area sdlc/M-1-e2e-a
state sdlc/state-20261010063111
attempt sdlc/S-1-attempt-1
prompts.test.mjs: tests 77 pass 77 fail 0
```

#### TC-contract-6 · Table lists eight placeholders; name() equals a reference model over 2000 runs · PASS
- **Given** The branch sdlc/S-026 at 48d8ffe **When** The case runs **Then** Eight rows; zero violations
- **Expected** Eight rows; zero violations **Actual** Eight rows; seed=477210938 runs=2000 violations=0; ste-check.py on _common.md exit 0
- **Spec source:** R-111 R-112 R-113 R-114 R-115 acceptance · **Run:** `cd .sdlc/slices/S-026/verification/r0/tests/contract-0 && VERIFY_WT=<worktree of sdlc/S-026> node --test placeholder-table.verify-contract.test.mjs`
- Log: [test log](../../slices/S-026/verification/r0/logs/contract-0.txt)
- Property run: `property-run seed=477210938 runs=2000 violations=0 (reference model written from spec section 8; formats sdlc/{name} and sdlc/{name:lower})`

</details>

Guard tests in the committed suite: `skills/sdlc/test/prompts.test.mjs:1033` (T-R-111), `skills/sdlc/test/prompts.test.mjs:1038` (T-R-112), `skills/sdlc/test/prompts.test.mjs:1045` (T-R-113), `skills/sdlc/test/prompts.test.mjs:1050` (T-R-114), `skills/sdlc/test/prompts.test.mjs:1058` (T-R-115). The existing test `every name command in the _common.md branch table runs against branches.py` also runs every command.

## How it was attacked
No security profile was needed. The slice adds string-match tests and no input path. The security review found no trust boundary touched. The cli and contract cases still tried bad area ids (`a b`, empty) and bad attempt numbers (0, -1, `abc`, 1.5, empty, huge, unicode digits). The command refused each non-numeric or empty value with exit 2.

## Defects found on the way
- **Blocking defects:** none found by any round, any profile, the core verifiers or the review.
- **Seeds:**

| Seed | Found by | File |
|---|---|---|
| `branches.py name` accepts ids that make an invalid git ref (`--area 'a b'` gives `sdlc/M-1-e2e-a b`) | cli profile | `skills/sdlc/branches.py` |
| `branches.py name` accepts n = 0, negative n and very large n | cli profile | `skills/sdlc/branches.py` |
| attempt `--n` accepts 0 and negative numbers (`attempt--1` may break parse) | contract profile | `skills/sdlc/branches.py` |

## Appendix
- Toolkit: `cli-runner` (`skills/sdlc/test/testkit/cli-runner.mjs`) and `property` (`skills/sdlc/test/testkit/property.mjs`).
- Plan: [plan-r0.json](../../slices/S-026/verification/plan-r0.json), [plan-r0.md](../../slices/S-026/verification/plan-r0.md).
- Profile evidence: [cli-0.json](../../slices/S-026/verification/r0/cli-0.json), [cli-0.md](../../slices/S-026/verification/r0/cli-0.md), [contract-0.json](../../slices/S-026/verification/r0/contract-0.json), [contract-0.md](../../slices/S-026/verification/r0/contract-0.md).
- Core verifiers: [verify-spec-fidelity-r0.md](../../slices/S-026/verify-spec-fidelity-r0.md), [verify-regression-r0.md](../../slices/S-026/verify-regression-r0.md).
- Reviews: [architecture](../../slices/S-026/review-architecture-r0.md), [security](../../slices/S-026/review-security-r0.md), [test-quality](../../slices/S-026/review-test-quality-r0.md). Gate: [gate-r0.md](../../slices/S-026/gate-r0.md).
- Missing sources: `failures.md` does not exist, because the slice never failed.
