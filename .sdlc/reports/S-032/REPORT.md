# S-032 · preflight samples each kind in its own mode
Verdict: RELEASED
Commit under test: e155032 · Rounds: 2 · Attempts: 1 · Risk: low · Written: 2026-10-10

| Requirements | Scenarios | Cases | Passed | Failed | Blocked | Blocking defects found / fixed | Open seeds |
|---|---|---|---|---|---|---|---|
| 2 | 5 | 9 | 9 | 0 | 0 | 1 / 1 | 2 |

## Summary
The slice proves that `branches.py preflight` samples each branch kind only in its own mode. The `state` and `e2e` kinds appear in `pr` mode only. The `run` and `milestone` kinds appear in `stack` mode only. No mode samples `e2e-area`, `verify` or `attempt`. The cli and security profiles checked this, with custom formats and 130 hostile corpus entries. All 9 cases passed and the product code did not change. The architecture review found that five new tests only repeated T-R-039 and T-R-040. The fix round deleted them (commit `a36ae03`).

## Open risks
- The slice has no new test of its own. The existing tests `T-R-039a` to `T-R-039c` and `T-R-040c` guard R-136 and R-137.
- The hostile-input checks cannot see a refusal that yields no samples. The kinds check then holds for an empty set. It proves no extra kind and no traceback, not the refusal text.
- The verify sweep of 130 corpus entries over 4 modes takes about 144 s. The verify tests sit under `.sdlc/`, outside the product suite, so this cost does not slow `npm test`.
- Lint, typecheck, build and e2e commands are not set in config. The gate ran `npm test` only.

## Traceability
| Requirement | Spec says | Scenarios | Cases | Result |
|---|---|---|---|---|
| R-136 | "\| `state` \| `state-<UTC timestamp, %Y%m%d%H%M%S>` \| `sdlc/state-20261008101500` \| pr \|" | VS-1, VS-2 | TC-cli-1, TC-cli-2 | pass |
| R-137 | "\| `run` \| `run-<n>` \| `sdlc/run-1` \| stack \|" | VS-3, VS-4, VS-5 | TC-cli-3, TC-cli-4, TC-cli-5, TC-security-1, TC-security-2, TC-security-3, TC-security-4 | pass |

## Scenarios

### VS-1 · The pr preflight samples a state branch and the stack preflight does not
Profiles: cli. Risk: a wrong mode table would push a state branch in the wrong mode.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-1 | The pr mode samples one `sdlc/state-<14 digits>`, the stack mode samples none, and a custom format changes the prefix only | PASS | `.sdlc/slices/S-032/verification/r0/tests/cli-0/kinds.verify-cli.test.mjs:21` |

<details>
<summary>Case detail (1 case)</summary>

#### TC-cli-1 · pr samples one state branch, stack none · PASS
- **Given** a scratch git repo from cli-runner **When** `branches.py preflight` runs in `pr` and `stack` mode, also with a custom format **Then** the samples hold the kinds the table allows.
- **Expected** pr samples `sdlc/state-<14 digits>`; stack samples none. **Actual** pr samples: slice, state (`sdlc/state-20261010101651`), e2e. Stack samples: run, milestone, slice. With `feature/{name}` and `--format x/{name}` the names were `feature/state-<14 digits>` and `x/state-<14 digits>`.
- **Spec source:** R-136 quote and acceptance · **Run:** `node --test .sdlc/slices/S-032/verification/r0/tests/cli-0/kinds.verify-cli.test.mjs`
- Evidence (transcript): see `../../slices/S-032/verification/r0/logs/cli-0-transcripts.txt`.

```console
$ python3 skills/sdlc/branches.py preflight --repo <scratch> --mode pr
exit 0
samples: slice sdlc/S-001 · state sdlc/state-20261010101651 · e2e sdlc/M-1-e2e
```

</details>

### VS-2 · The mr and direct preflights sample no state branch
Profiles: cli. Risk: the working sample that `--branch` adds in `mr` mode could carry the wrong kind.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-2 | The mr and direct modes sample no state kind, with and without `--branch` | PASS | `.sdlc/slices/S-032/verification/r0/tests/cli-0/kinds.verify-cli.test.mjs:34` |

<details>
<summary>Case detail (1 case)</summary>

#### TC-cli-2 · mr and direct sample no state · PASS
- **Given** a scratch git repo **When** preflight runs in `mr` and `direct` mode, with and without `--branch` **Then** no sample has kind `state`.
- **Expected** no state kind. **Actual** mr without `--branch`: no samples. mr with `--branch`: one `working` sample only. direct: no samples in both cases.
- **Spec source:** R-136 quote and acceptance · **Run:** `node --test .sdlc/slices/S-032/verification/r0/tests/cli-0/kinds.verify-cli.test.mjs`
- Evidence (transcript): `../../slices/S-032/verification/r0/logs/cli-0-transcripts.txt`.

</details>

### VS-3 · The stack preflight samples run and milestone branches and the pr preflight does not
Profiles: cli. Risk: a wrong mode table would push run branches in `pr` mode.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-3 | Only stack samples run and milestone, and both follow the branch format | PASS | `.sdlc/slices/S-032/verification/r0/tests/cli-0/kinds.verify-cli.test.mjs:46` |

<details>
<summary>Case detail (1 case)</summary>

#### TC-cli-3 · stack samples run and milestone · PASS
- **Given** a scratch git repo **When** preflight runs in every mode, also with `feature/{name}` **Then** only stack holds run and milestone.
- **Expected** only stack samples them. **Actual** stack: `sdlc/run-1`, `sdlc/M-1`. pr, mr, direct: no run or milestone. With `feature/{name}`: `feature/run-1`, `feature/M-1`.
- **Spec source:** R-137 quote and acceptance · **Run:** `node --test .sdlc/slices/S-032/verification/r0/tests/cli-0/kinds.verify-cli.test.mjs`
- Evidence (transcript): `../../slices/S-032/verification/r0/logs/cli-0-transcripts.txt`.

</details>

### VS-4 · Only the pr preflight samples an e2e branch
Profiles: cli. Risk: a wrong mode table would sample an e2e branch in a mode that never pushes it.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-4 | Only pr samples an e2e branch | PASS | `.sdlc/slices/S-032/verification/r0/tests/cli-0/kinds.verify-cli.test.mjs:58` |

<details>
<summary>Case detail (1 case)</summary>

#### TC-cli-4 · only pr samples e2e · PASS
- **Given** a scratch git repo **When** preflight runs in every mode **Then** only pr holds an e2e sample.
- **Expected** only pr samples e2e. **Actual** pr: `sdlc/M-1-e2e` (`feature/M-1-e2e` with a custom format). stack, mr, direct: no e2e sample.
- **Spec source:** R-137 quote and acceptance · **Run:** `node --test .sdlc/slices/S-032/verification/r0/tests/cli-0/kinds.verify-cli.test.mjs`
- Evidence (transcript): `../../slices/S-032/verification/r0/logs/cli-0-transcripts.txt`.

</details>

### VS-5 · No mode samples a kind that the loop never pushes
Profiles: cli, security. Risk: hostile input could add a kind outside the table or crash the command.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-5 | No mode samples `e2e-area`, `verify` or `attempt`, also with hostile `--branch`, `--format` and config `branchFormat` | PASS | `.sdlc/slices/S-032/verification/r0/tests/cli-0/kinds.verify-cli.test.mjs:64` |
| TC-security-1 | Baseline: each mode samples only its own kinds | PASS | `.sdlc/slices/S-032/verification/r0/tests/security-0/sampled-kinds.verify-security.test.mjs:24` |
| TC-security-2 | Hostile `--branch` values add no sampled kind | PASS | `.sdlc/slices/S-032/verification/r0/tests/security-0/sampled-kinds.verify-security.test.mjs:33` |
| TC-security-3 | Hostile `--format` values add no sampled kind and do not crash | PASS | `.sdlc/slices/S-032/verification/r0/tests/security-0/sampled-kinds.verify-security.test.mjs:46` |
| TC-security-4 | Hostile `branchFormat` in config adds no sampled kind and does not crash | PASS | `.sdlc/slices/S-032/verification/r0/tests/security-0/sampled-kinds.verify-security.test.mjs:58` |

<details>
<summary>Case detail (5 cases)</summary>

#### TC-cli-5 · no unpushed kind in any mode · PASS
- **Given** a scratch git repo **When** preflight runs in four modes, with 130 attack-corpus entries as `--branch` (4 modes), `--format` (pr) and config `branchFormat` (stack) **Then** the kinds stay inside the table.
- **Expected** no `e2e-area`, `verify` or `attempt`. **Actual** each mode held only its allowed kinds. No traceback, no new kind.
- **Spec source:** R-137 quote and acceptance · **Run:** `node --test .sdlc/slices/S-032/verification/r0/tests/cli-0/kinds.verify-cli.test.mjs`
- Evidence (transcript): `../../slices/S-032/verification/r0/logs/cli-0-transcripts.txt`.

#### TC-security-1 · baseline kinds per mode · PASS
- **Given** a scratch repo **When** preflight runs in pr, stack, mr, direct **Then** kinds stay in the allowed set and stderr holds no traceback.
- **Expected** allowed kinds only. **Actual** held.
- **Spec source:** R-137 acceptance · **Run:** `node --test .sdlc/slices/S-032/verification/r0/tests/security-0/sampled-kinds.verify-security.test.mjs`
- Evidence (log): `../../slices/S-032/verification/r0/logs/security-0-test.log`.

#### TC-security-2 · hostile `--branch` · PASS
- **Given** a scratch repo **When** each argv-safe entry of 7 corpus families runs as `--branch` in 4 modes **Then** kinds stay in the allowed set.
- **Expected** kinds unchanged. **Actual** held.
- **Spec source:** R-137 acceptance · **Run:** `node --test .sdlc/slices/S-032/verification/r0/tests/security-0/sampled-kinds.verify-security.test.mjs`
- Evidence (log): `../../slices/S-032/verification/r0/logs/security-0-test.log`.

#### TC-security-3 · hostile `--format` · PASS
- **Given** a scratch repo **When** each corpus entry runs as `--format` in 4 modes **Then** kinds stay in the allowed set and nothing crashes.
- **Expected** kinds unchanged, no traceback. **Actual** held.
- **Spec source:** R-137 acceptance · **Run:** `node --test .sdlc/slices/S-032/verification/r0/tests/security-0/sampled-kinds.verify-security.test.mjs`
- Evidence (log): `../../slices/S-032/verification/r0/logs/security-0-test.log`.

#### TC-security-4 · hostile config `branchFormat` · PASS
- **Given** a scratch repo **When** each corpus entry is the config `branchFormat` in 4 modes **Then** kinds stay in the allowed set and nothing crashes.
- **Expected** kinds unchanged, no traceback. **Actual** held.
- **Spec source:** R-137 acceptance · **Run:** `node --test .sdlc/slices/S-032/verification/r0/tests/security-0/sampled-kinds.verify-security.test.mjs`
- Evidence (log): `../../slices/S-032/verification/r0/logs/security-0-test.log`.

</details>

## How it was attacked
One security session (security-0, round 0). Its charter: find a sampled kind outside the mode table, or a crash, through hostile `--branch`, `--format` and config `branchFormat` values. The boundary is the `preflight` command. The attacker controls argv values and the config file. The session used 7 corpus families (flag-like, traversal, control characters, confusables, injection, format-string, whitespace) in 4 modes. It ran 3 attacks. 3 held, 0 broke, 0 were out of scope.

<details>
<summary>Attack table</summary>

| input · expected · observed | result |
|---|---|
| A-1 `--branch`, 7 families, 4 modes · kinds unchanged · kinds unchanged | held |
| A-2 `--format`, 7 families, 4 modes · kinds unchanged, no traceback · held | held |
| A-3 config `branchFormat`, 7 families, 4 modes · kinds unchanged, no traceback · held | held |

</details>

## Defects found on the way
- **Blocking defects**
  - Duplicate tests. The architecture review (review-architecture-r0) found that the five new tests T-R-136a to T-R-137c repeated T-R-039 and T-R-040. Spec source: none (test quality). Reproduce: compare the new tests with `T-R-039a` to `T-R-039c`. Fix: commit `a36ae03` deleted them. Guard: `skills/sdlc/test/branches.test.mjs:2073` (`T-R-039a`), `:2082` (`T-R-039b`), `:2088` (`T-R-039c`), `:2120` (`T-R-040c`).
  - No verifier, security review or core verifier found a product defect.
- **Seeds**

| Seed | Found by | File |
|---|---|---|
| verify: hostile sweep of preflight is slow (about 144 s for 130 entries over 4 modes) | cli verifier, round 0 | `skills/sdlc/test/testkit/cli-runner.mjs` |
| Hostile-input test cannot see a refusal that yields no samples | security verifier, round 0 | `.sdlc/slices/S-032/verification/r0/tests/security-0/sampled-kinds.verify-security.test.mjs` |

## Appendix
- Toolkit: cli-runner (`skills/sdlc/test/testkit/cli-runner.mjs`) and attack-corpus (130 argv-safe entries).
- Plans: `../../slices/S-032/verification/plan-r0.json`, `../../slices/S-032/verification/plan-r1.json`.
- Round 0 evidence: `../../slices/S-032/verification/r0/cli-0.json`, `../../slices/S-032/verification/r0/cli-0.md`, `../../slices/S-032/verification/r0/security-0.json`, `../../slices/S-032/verification/r0/security-0.md`.
- Round 1 ran the core verifiers only. It reused the round 0 profile results because the fix changed no observable behavior.
- Core verifier summaries: `../../slices/S-032/verify-spec-fidelity-r0.md`, `../../slices/S-032/verify-spec-fidelity-r1.md`, `../../slices/S-032/verify-regression-r0.md`, `../../slices/S-032/verify-regression-r1.md`.
- Reviews: `../../slices/S-032/review-architecture-r0.md`, `../../slices/S-032/review-security-r0.md`, `../../slices/S-032/review-security-r1.md`. Gate: `../../slices/S-032/gate-r0.md`.
- Missing sources: none.
