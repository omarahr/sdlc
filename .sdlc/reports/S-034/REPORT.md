# S-034 · SKILL.md orders the format sources and the preflight command
Verdict: RELEASED
Commit under test: d08bf73 · Rounds: 2 · Attempts: 2 · Risk: low · Written: 2026-10-10

| Requirements | Scenarios | Cases | Passed | Failed | Blocked | Blocking defects found / fixed | Open seeds |
|---|---|---|---|---|---|---|---|
| 4 | 6 | 9 | 9 | 0 | 0 | 0 / 0 | 2 |

## Summary
The Branch format bullet in `skills/sdlc/SKILL.md` now orders the format sources: flag, then `config.json`, else none. It tells the driver to give preflight no `--format` argument when no format exists. It limits `--branch "$BASE_BRANCH"` to `mr` mode. It scopes the rename ask to a first run and skips the `parse` check on a resume. The contract profile checked the text and the documented command lines in scratch repos. Both rounds passed 9 of 9 cases. The gate failed once on test time, because it compared against a stale local main. A fix round recorded this and changed no code. The test-quality review asked twice to delete test T-R-002d. The test still exists.

## Open risks
- The test-quality review (rounds 0 and 1) calls T-R-002d a duplicate of T-R-064a and T-R-002c. The test still exists in `skills/sdlc/test/prompts.test.mjs:1448`. The duplicate does no harm.
- On a resume, a failed `working` sample still sets `ok` false, so the driver ends and prints the samples. ADR-20261010-113004-decision-judge-S-034-be85 records this. The bullet does not say it.
- ADR-20261010-112624-decision-judge-S-034-c5f8 keeps the resume sentence for `branchFormat`. Section 5 of the spec does not state the sentence.
- The gate timed the slice against local main (f5a207e), which is behind the branch point. Same-branch timing showed about 5 s of added test time, below the limit.
- Seed: the last sentence repeats the one before it. Merge them in a later edit.
- Seed: "With none, give preflight no `--format` argument" repeats "with `--format` when you have one".

## Traceability
| Requirement | Spec says | Scenarios | Cases | Result |
|---|---|---|---|---|
| R-128 | Take the format from `--branch-format` when given, else from `$REPO/.sdlc/config.json` `branchFormat` when that file exists (a finished run leaves it on the default branch), else none. | VS-1 | TC-contract-1, TC-contract-2 | pass |
| R-129 | Run `python3 "$SKILL_DIR/branches.py" preflight --repo "$REPO" --mode <gitMode>` with `--format "<format>"` when you have one, and with `--branch "$BASE_BRANCH"` in `mr` mode. | VS-2, VS-3 | TC-contract-3, TC-contract-4, TC-contract-5 | pass |
| R-130 | This check is first run only: on a resume the current branch is normally the run branch. | VS-4, VS-5 | TC-contract-6, TC-contract-7, TC-contract-8 | pass |
| R-002 | The default is `sdlc/{name}`. | VS-6 | TC-contract-9 | pass |

## Scenarios

### VS-1 · The driver orders the format sources: flag, then config.json, else none
Profiles: contract. Risk: the order text drifts or a source is missing.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-contract-1 | The sources are ordered flag, `config.json` when the file exists, else none; with none preflight gets no `--format` | PASS | `.sdlc/slices/S-034/verification/r1/tests/contract-0/skill-branch-format.verify-contract.test.mjs:17` |
| TC-contract-2 | Preflight without `--format` and without config uses `sdlc/{name}`; with config it uses the config `branchFormat` | PASS | `.sdlc/slices/S-034/verification/r1/tests/contract-0/skill-branch-format.verify-contract.test.mjs:52` |

<details>
<summary>Case detail (2 cases)</summary>

#### TC-contract-1 · Source order · PASS
- **Given** SKILL.md on sdlc/S-034 **When** the test reads the Branch format bullet **Then** the index order holds and "With none, give preflight no `--format` argument." follows "else none."
- **Expected** order flag, config, none **Actual** order holds
- **Spec source:** R-128 acceptance · **Run:** `VERIFY_REPO=<worktree> TESTKIT_SEED=134 node --test .sdlc/slices/S-034/verification/r1/tests/contract-0/skill-branch-format.verify-contract.test.mjs`
- Evidence: log [contract-0.txt](../../slices/S-034/verification/r1/logs/contract-0.txt)

#### TC-contract-2 · Preflight format default and config value · PASS
- **Given** scratch repos with and without `config.json` **When** `branches.py preflight` runs **Then** the format is `sdlc/{name}`, then `feature/{name}`
- **Expected** `sdlc/{name}` then `feature/{name}` **Actual** the same
- **Spec source:** R-128 acceptance · **Run:** same command
- Evidence: log [contract-0.txt](../../slices/S-034/verification/r1/logs/contract-0.txt)

</details>

### VS-2 · The preflight command passes --format only with a known format
Profiles: contract. Risk: the bullet makes `--format` unconditional.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-contract-3 | `--format` ties to "when you have one" and appears once; a CLI `--format` overrides config | PASS | `.sdlc/slices/S-034/verification/r1/tests/contract-0/skill-branch-format.verify-contract.test.mjs:25` |

<details>
<summary>Case detail (1 case)</summary>

#### TC-contract-3 · Conditional --format · PASS
- **Given** SKILL.md **When** the test reads the bullet **Then** one conditional `--format` clause exists
- **Expected** one conditional clause **Actual** one conditional clause
- **Spec source:** R-129 acceptance · **Run:** same command as TC-contract-1
- Evidence: log [contract-0.txt](../../slices/S-034/verification/r1/logs/contract-0.txt)

</details>

### VS-3 · Only mr mode passes --branch "$BASE_BRANCH" to preflight
Profiles: contract. Risk: another mode receives `--branch`.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-contract-4 | The bullet says "in `mr` mode only. No other mode gets `--branch`." | PASS | `.sdlc/slices/S-034/verification/r1/tests/contract-0/skill-branch-format.verify-contract.test.mjs:29` |
| TC-contract-5 | With `--branch`, `mr` mode checks a working sample; direct mode has none | PASS | `.sdlc/slices/S-034/verification/r1/tests/contract-0/skill-branch-format.verify-contract.test.mjs:67` |

<details>
<summary>Case detail (2 cases)</summary>

#### TC-contract-4 · Phrase for mr mode only · PASS
- **Given** SKILL.md **When** the test reads the bullet **Then** the phrase is present
- **Expected** phrase present **Actual** phrase present
- **Spec source:** R-129 acceptance · **Run:** same command as TC-contract-1
- Evidence: log [contract-0.txt](../../slices/S-034/verification/r1/logs/contract-0.txt)

#### TC-contract-5 · Working sample only in mr mode · PASS
- **Given** scratch repos **When** preflight runs with and without `--branch` **Then** the working sample appears only in `mr` mode
- **Expected** working sample only in `mr` **Actual** the same
- **Spec source:** R-129 acceptance · **Run:** same command
- Evidence: log [contract-0.txt](../../slices/S-034/verification/r1/logs/contract-0.txt)

</details>

### VS-4 · A first run asks for a rename of a failed working sample
Profiles: contract. Risk: the rename ask applies on every run.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-contract-6 | The rename ask applies on a first run only; the first-run-only sentence stays | PASS | `.sdlc/slices/S-034/verification/r1/tests/contract-0/skill-branch-format.verify-contract.test.mjs:34` |
| TC-contract-7 | `parse` prints a kind for a loop branch and none for a user branch | PASS | `.sdlc/slices/S-034/verification/r1/tests/contract-0/skill-branch-format.verify-contract.test.mjs:76` |

<details>
<summary>Case detail (2 cases)</summary>

#### TC-contract-6 · First-run scope · PASS
- **Given** SKILL.md **When** the test reads the bullet **Then** the phrases are present
- **Expected** phrases present **Actual** phrases present
- **Spec source:** R-130 acceptance · **Run:** same command as TC-contract-1
- Evidence: log [contract-0.txt](../../slices/S-034/verification/r1/logs/contract-0.txt)

#### TC-contract-7 · parse kinds · PASS
- **Given** a loop branch and a user branch **When** `branches.py parse` runs **Then** the kind is `slice` for the loop branch and none for the user branch
- **Expected** kind slice vs none **Actual** the same
- **Spec source:** R-130 acceptance · **Run:** same command
- Evidence: log [contract-0.txt](../../slices/S-034/verification/r1/logs/contract-0.txt)

</details>

### VS-5 · A resume runs no parse check and asks for no rename
Profiles: contract. Risk: the resume sentence conflicts with the first-run-only sentence or the line-68 pin.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-contract-8 | The bullet ends with the resume sentence; every new sentence has at most 20 words | PASS | `.sdlc/slices/S-034/verification/r1/tests/contract-0/skill-branch-format.verify-contract.test.mjs:38` |

<details>
<summary>Case detail (1 case)</summary>

#### TC-contract-8 · Resume sentence · PASS
- **Given** SKILL.md **When** the test reads the bullet **Then** it ends with "On a resume, run no `parse` check and ask for no rename."
- **Expected** that ending **Actual** that ending
- **Spec source:** R-130 acceptance · **Run:** same command as TC-contract-1
- Evidence: log [contract-0.txt](../../slices/S-034/verification/r1/logs/contract-0.txt)

</details>

### VS-6 · The default format sdlc/{name} still closes for a run without branchFormat
Profiles: contract. Risk: the SKILL.md edit breaks the default.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-contract-9 | `load_format` returns `sdlc/{name}` when `branchFormat` is absent | PASS | `.sdlc/slices/S-034/verification/r1/tests/contract-0/skill-branch-format.verify-contract.test.mjs:85` |

<details>
<summary>Case detail (1 case)</summary>

#### TC-contract-9 · Default format · PASS
- **Given** config shapes without `branchFormat` **When** the property runs 1000 random shapes and `branches.py name` runs on one **Then** the default holds
- **Expected** `sdlc/{name}` **Actual** `sdlc/S-001` from `name`; 0 violations in 1000 runs
- **Spec source:** R-002 acceptance · **Run:** same command as TC-contract-1
- Evidence: `property load_format: seed=134 runs=1000 violations=0`

</details>

## How it was attacked
No security profile was needed. The security review (rounds 0 and 1) found no code path, input parse, secret or network call in the diff.

## Defects found on the way
- **Blocking defects:** none. The verifiers and reviews found no blocking defect. The gate failed once on test time (207 s against 113 s). The cause was a stale local main as the baseline. The fix round changed no code and recorded the same-branch timing in failures.md. The gate then passed at commit 83ae96f (103 s, 774 tests, 773 passed, 1 skipped).
- The plan was refuted three times before the first test. Escalation step 1 (replan) produced the plan that shipped.
- The test-quality review (rounds 0 and 1) asked to delete T-R-002d as a duplicate. No fix removed it.

| Seed | Found by | File |
|---|---|---|
| Last sentence repeats the one before it | review-architecture | `skills/sdlc/SKILL.md` |
| Redundant none-case sentence | review-architecture | `skills/sdlc/SKILL.md` |

## Appendix
- Tools used: `property` (load_format on random config shapes), `cli-runner` (`branches.py preflight` and `parse` in scratch repos).
- Plans: [round 0](../../slices/S-034/verification/plan-r0.md), [round 1](../../slices/S-034/verification/plan-r1.md).
- Profile evidence: [r0 contract](../../slices/S-034/verification/r0/contract-0.md), [r1 contract](../../slices/S-034/verification/r1/contract-0.md).
- Core verifiers: [spec-fidelity r0](../../slices/S-034/verify-spec-fidelity-r0.md), [spec-fidelity r1](../../slices/S-034/verify-spec-fidelity-r1.md), [regression r0](../../slices/S-034/verify-regression-r0.md), [regression r1](../../slices/S-034/verify-regression-r1.md).
- Gate: [gate-r0](../../slices/S-034/gate-r0.md).
- Missing sources: none.
