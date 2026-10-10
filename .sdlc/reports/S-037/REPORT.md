# S-037 · state-schema, commit-state and the slice prompts use branch placeholders
Verdict: RELEASED
Commit under test: c530270 · Rounds: 3 (r0, r1, r2) · Attempts: 1 · Risk: medium · Written: 2026-10-10

| Requirements | Scenarios | Cases | Passed | Failed | Blocked | Blocking defects found / fixed | Open seeds |
|---|---|---|---|---|---|---|---|
| 4 | 6 | 12 | 12 | 0 | 0 | 2 / 2 | 3 |

## Summary
Agents that commit and push read these prompts. The prompts now name each branch through a placeholder, so a changed branch format cannot break them. S-027 had already made the prompt edits. This slice adds tests that pin them and changes no product file. The contract and cli profiles scanned the 15 prompt files and ran `branches.py name --kind state` under three formats. The review found two blocking problems: new tests that repeated T-R-063a and T-R-065b. Two fix rounds removed them. Three seeds remain open, and all are optional trims.

## Open risks
- The verifier cases ran only in round r0, at commit 0e58a38. Rounds r1 and r2 re-ran the full suite, not these cases.
- TC-contract-6 names T-R-134 and T-R-146. Fix rounds deleted both tests. T-R-065b, T-R-063a and T-R-149 now guard R-134. T-R-063a guards R-146. The r0 mutation run showed these tests fail on a returned literal.
- R-134 and R-146 have no dedicated test id. Existing tests hold their acceptance.
- Seed: T-R-135 and T-R-149 repeat checks of T-R-063a, T-R-063b and T-R-065b. The trim is optional.
- Seed: `branches.py name --kind state` accepts `--id` and ignores it. The effect is harmless.
- No lint, typecheck, build or e2e command is configured. The gate ran `npm test` only (782 tests, 781 passed, 1 skipped, 0 failed).
- The gate run took 121 s against 88 s on the default branch. The added 33 s is below the 60 s limit.

## Traceability
| Requirement | Spec says | Scenarios | Cases | Result |
|---|---|---|---|---|
| R-134 | `runBranch` "the run branch (`run` kind under `config.branchFormat`)" | VS-1, VS-6 | TC-contract-1, TC-contract-6 | pass |
| R-135 | `commit-state.md` … `<slice branch>`, `<run branch>`, `<milestone branch>`, `<state branch>` (replacing `sdlc/state-$(date -u +%Y%m%d%H%M%S)`) | VS-2, VS-3, VS-6 | TC-contract-2, TC-contract-3, TC-contract-6, TC-cli-1 to TC-cli-6 | pass |
| R-146 | The 13 listed prompt files: `sdlc/<id>` becomes `<slice branch>` | VS-4, VS-6 | TC-contract-4, TC-contract-6 | pass |
| R-149 | `state-schema.md` … `sdlc/S-001`, `sdlc/run-<n>`, `sdlc/M-<n>` become descriptions by kind | VS-5, VS-6 | TC-contract-5, TC-contract-6 | pass |

## Scenarios
Repo tests that guard the slice: `skills/sdlc/test/prompts.test.mjs:1506` (T-R-135), `:1516` (T-R-149), `:1211` (T-R-065b), `:1317` (T-R-063a).

### VS-1 · state-schema.md describes runBranch and the slice branch field by kind
Profiles: contract. A literal branch in the schema would tie every agent to one format.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-contract-1 | runBranch and branch field text, `<slice branch>` in the JSON example, no `sdlc/S-` or `sdlc/run-` literal | PASS | `.sdlc/slices/S-037/verification/r0/tests/contract-0/prompts.verify-contract.test.mjs:13` |

<details>
<summary>Case detail (1 case)</summary>

#### TC-contract-1 · state-schema.md names runBranch and the branch field by kind · PASS
- **Given** the prompt files at 0e58a38 **When** independent scans run **Then** state-schema.md has the runBranch text, the slice branch text and no loop literal.
- **Expected** as stated **Actual** as stated
- **Spec source:** R-134 acceptance · **Run:** `VERIFY_ROOT=<worktree> node --test .sdlc/slices/S-037/verification/r0/tests/contract-0/prompts.verify-contract.test.mjs`
- property-run: `node --test`, 5 tests, 5 pass, 0 fail. Exhaustive scan of fixed files; no seed; 1 run.

</details>

### VS-2 · commit-state.md uses the four branch placeholders
Profiles: contract. A literal in a command block would push work to a wrong branch.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-contract-2 | Four placeholders present; no `sdlc/` literal in prose, code blocks or inline code | PASS | `.sdlc/slices/S-037/verification/r0/tests/contract-0/prompts.verify-contract.test.mjs:27` |

<details>
<summary>Case detail (1 case)</summary>

#### TC-contract-2 · commit-state.md holds the four placeholders and no loop literal · PASS
- **Given** the prompt files at 0e58a38 **When** independent scans run **Then** all four placeholders appear and no `sdlc/` literal appears anywhere in the file.
- **Expected** as stated **Actual** as stated
- **Spec source:** R-135 acceptance · **Run:** `VERIFY_ROOT=<worktree> node --test .sdlc/slices/S-037/verification/r0/tests/contract-0/prompts.verify-contract.test.mjs`
- property-run: 5 tests, 5 pass, 0 fail.

</details>

### VS-3 · The state branch name comes from branches.py, not date -u
Profiles: contract, cli. A hand-built state name would ignore the configured format.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-contract-3 | No `date -u`, `$(date` or `%Y%m%d`; `_common.md` maps `<state branch>` to `branches.py name --kind state` | PASS | `.sdlc/slices/S-037/verification/r0/tests/contract-0/prompts.verify-contract.test.mjs:38` |
| TC-cli-1 | `commit-state.md` has no `date -u` and uses `<state branch>` | PASS | `.sdlc/slices/S-037/verification/r0/tests/cli-0/state-branch.verify-cli.test.mjs:10` |
| TC-cli-2 | `_common.md` table row maps `<state branch>` to the command | PASS | `.sdlc/slices/S-037/verification/r0/tests/cli-0/state-branch.verify-cli.test.mjs:16` |
| TC-cli-3 | Default format gives `sdlc/state-<14 digits>`, a valid ref of kind state | PASS | `.sdlc/slices/S-037/verification/r0/tests/cli-0/state-branch.verify-cli.test.mjs:26` |
| TC-cli-4 | Format `feature/{name}` gives `feature/state-<14 digits>` | PASS | `.sdlc/slices/S-037/verification/r0/tests/cli-0/state-branch.verify-cli.test.mjs:26` |
| TC-cli-5 | Format `Team_X/{name:lower}-bot` gives `Team_X/state-<ts>-bot` | PASS | `.sdlc/slices/S-037/verification/r0/tests/cli-0/state-branch.verify-cli.test.mjs:26` |
| TC-cli-6 | Invalid format exits 2 with error JSON; extra `--id` is accepted | PASS | `.sdlc/slices/S-037/verification/r0/tests/cli-0/state-branch.verify-cli.test.mjs:42` |

<details>
<summary>Case detail (7 cases)</summary>

#### TC-contract-3 · commit-state.md holds no date -u; _common.md maps <state branch> to branches.py · PASS
- **Given** the prompt files at 0e58a38 **When** independent scans and the command run **Then** no date command remains, one `_common.md` row maps the placeholder, and the command gives valid state names for 3 formats.
- **Spec source:** R-135 acceptance · **Run:** `VERIFY_ROOT=<worktree> node --test .sdlc/slices/S-037/verification/r0/tests/contract-0/prompts.verify-contract.test.mjs`
- property-run: 5 tests, 5 pass, 0 fail.
- transcript: [contract-0-state-branch.txt](../../slices/S-037/verification/r0/logs/contract-0-state-branch.txt)

```console
format=[] name=sdlc/state-20261010132711
valid
format=[feature/{name}] name=feature/state-20261010132711
valid
format=[team/{name:lower}-x] name=team/state-20261010132712-x
valid
```

#### TC-cli-1 · commit-state.md holds no date -u and uses <state branch> · PASS
- **Given** the slice branch at 0e58a38 **When** the check runs **Then** no `date -u`, no `sdlc/state-` literal, and `<state branch>` is present.
- **Spec source:** R-135 acceptance · **Run:** `node --test .sdlc/slices/S-037/verification/r0/tests/cli-0/state-branch.verify-cli.test.mjs`
- transcript: `grep -c 'date -u' commit-state.md` gave 0.

#### TC-cli-2 · _common.md maps <state branch> to branches.py name --kind state · PASS
- **Given** the slice branch at 0e58a38 **When** the check runs **Then** the table row is present.
- **Spec source:** R-135 acceptance · **Run:** same command as TC-cli-1
- transcript: ``| `<state branch>` | `branches.py name --kind state` (it makes the timestamp) |``

#### TC-cli-3 · Default format gives sdlc/state-<14 digits> · PASS
- **Given** a scratch repo with the default format **When** `branches.py name --kind state` runs **Then** the ref is valid and parses as kind state.
- **Spec source:** R-135 acceptance · **Run:** same command as TC-cli-1
- transcript, then file-tree (scratch tree unchanged):

```console
$ python3 skills/sdlc/branches.py name --repo <scratch> --kind state
{"ok": true, "kind": "state", "branch": "sdlc/state-20261010132549"}
exit 0
```

#### TC-cli-4 · Custom format feature/{name} · PASS
- **Given** a scratch repo with format `feature/{name}` **When** the command runs **Then** the branch is `feature/state-<14 digits>`.
- **Spec source:** R-135 acceptance · **Run:** same command as TC-cli-1

```console
{"ok": true, "format": "feature/{name}", "branch": "feature/state-20261010132549"}
exit 0
```

#### TC-cli-5 · Format with {name:lower} and suffix · PASS
- **Given** a scratch repo with format `Team_X/{name:lower}-bot` **When** the command runs **Then** the branch is `Team_X/state-<ts>-bot`.
- **Spec source:** R-135 acceptance · **Run:** same command as TC-cli-1

```console
{"ok": true, "format": "Team_X/{name:lower}-bot", "branch": "Team_X/state-20261010132550-bot"}
exit 0
```

#### TC-cli-6 · Invalid format and extra --id · PASS
- **Given** a format with whitespace, and a call with `--id` **When** the command runs **Then** the invalid format exits 2 with error JSON, and `--id` on state is accepted without error.
- **Spec source:** R-135 acceptance · **Run:** same command as TC-cli-1

```console
{"ok": false, "error": "the branch format 'bad format/{name}' holds whitespace"}
exit 2
```

</details>

### VS-4 · Each of the 13 slice prompts uses <slice branch> and no sdlc/<id> literal
Profiles: contract. A literal would send a slice agent to a branch of the wrong name.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-contract-4 | 13 distinct files exist, each holds `<slice branch>`, none holds a loop literal | PASS | `.sdlc/slices/S-037/verification/r0/tests/contract-0/prompts.verify-contract.test.mjs:48` |

<details>
<summary>Case detail (1 case)</summary>

#### TC-contract-4 · The 13 slice prompts exist, hold <slice branch> and hold no loop literal · PASS
- **Given** the prompt files at 0e58a38 **When** independent scans run **Then** 13 distinct files exist, each holds `<slice branch>`, and none holds `sdlc/<id>`, `sdlc/S-`, `sdlc/run-` or any loop literal.
- **Spec source:** R-146 acceptance · **Run:** `VERIFY_ROOT=<worktree> node --test .sdlc/slices/S-037/verification/r0/tests/contract-0/prompts.verify-contract.test.mjs`
- property-run: 5 tests, 5 pass, 0 fail.

</details>

### VS-5 · state-schema.md names the milestone branch by kind and holds no loop literal
Profiles: contract. A literal milestone name would break `stack` mode under another format.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-contract-5 | `stack` bullet matches `/milestone/` and holds no `sdlc/`; only the `sdlc/{name}` default remains | PASS | `.sdlc/slices/S-037/verification/r0/tests/contract-0/prompts.verify-contract.test.mjs:63` |

<details>
<summary>Case detail (1 case)</summary>

#### TC-contract-5 · state-schema.md stack bullet names the milestone by kind · PASS
- **Given** the prompt files at 0e58a38 **When** independent scans run **Then** the bullet names the milestone branch by kind and the only `sdlc/` text outside `.sdlc/` is `sdlc/{name}`.
- **Spec source:** R-149 acceptance · **Run:** `VERIFY_ROOT=<worktree> node --test .sdlc/slices/S-037/verification/r0/tests/contract-0/prompts.verify-contract.test.mjs`
- property-run: 5 tests, 5 pass, 0 fail.

</details>

### VS-6 · The new tests fail when a literal or placeholder is reverted
Profiles: contract. A test that cannot fail guards nothing.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-contract-6 | 13 mutations on a scratch copy each fail the matching test | PASS | `.sdlc/slices/S-037/verification/r0/logs/contract-0-mutations.txt:1` |

<details>
<summary>Case detail (1 case)</summary>

#### TC-contract-6 · The new tests fail when a literal or placeholder returns · PASS
- **Given** the prompt files at 0e58a38 **When** each old literal returns, or a placeholder goes, in a scratch copy **Then** the matching test fails.
- **Expected** every mutation fails a test **Actual** no mutation passed. The run named T-R-134 and T-R-146, which later fix rounds deleted.
- **Spec source:** R-134, R-135, R-146, R-149 acceptance · **Run:** mutation script, log linked below
- transcript: [contract-0-mutations.txt](../../slices/S-037/verification/r0/logs/contract-0-mutations.txt)

```console
state-schema: "<slice branch>" -> "sdlc/S-001"        fails T-R-134, T-R-149
state-schema: add (sdlc/M-<n>) to stack bullet         fails T-R-149
commit-state: append `date -u` line                    fails T-R-135
commit-state: drop <milestone branch>                  fails T-R-135
_common: state branch mapping -> `date -u`             fails T-R-135
implementer: <slice branch> -> sdlc/<id>               fails T-R-146
```

</details>

## How it was attacked
No security profile was needed. The slice reads repo prompt files only. The security review found no input that crosses a trust boundary (review-security-r0 to r2).

## Defects found on the way
- **Blocking defects**
  - T-R-146 duplicated T-R-063a. Found by the architecture review, round 0 (repeated in round 1). Spec source: test-quality lens. Reproduce: compare the 13-file loop of T-R-146 with T-R-063a. Fixed in commit d658422 (T-R-134 removed) and a1b046d (T-R-146 removed). T-R-063a now guards R-146.
  - T-R-134 duplicated T-R-065b, T-R-063a and T-R-149. Found by the architecture review, round 0. Fixed in commit d658422. T-R-065b now guards R-134.
- **Seeds** (open only)

| Seed | Found by | File |
|---|---|---|
| T-R-149 repeats literal-absence checks of T-R-063a | architecture review | `skills/sdlc/test/prompts.test.mjs` |
| T-R-135 repeats the `sdlc/state-` check of T-R-063b | architecture review | `skills/sdlc/test/prompts.test.mjs` |
| `branches.py name --kind state` ignores `--id` silently | cli verifier | `skills/sdlc/branches.py` |

## Appendix
- Toolkit: cli-runner (`branches.py name --kind state` in scratch repos) and property (contract scans of the prompt files). No tool file lives outside the round folder.
- Plans: [r0](../../slices/S-037/verification/plan-r0.md), [r1](../../slices/S-037/verification/plan-r1.md), [r2](../../slices/S-037/verification/plan-r2.md).
- Profile evidence (round 0): [contract-0](../../slices/S-037/verification/r0/contract-0.md), [cli-0](../../slices/S-037/verification/r0/cli-0.md).
- Core verifiers: [fidelity r0](../../slices/S-037/verify-spec-fidelity-r0.md), [r1](../../slices/S-037/verify-spec-fidelity-r1.md), [r2](../../slices/S-037/verify-spec-fidelity-r2.md); [regression r0](../../slices/S-037/verify-regression-r0.md), [r1](../../slices/S-037/verify-regression-r1.md), [r2](../../slices/S-037/verify-regression-r2.md).
- Reviews: architecture and security, rounds r0 to r2, in `.sdlc/slices/S-037/`. Gate: [gate-r0](../../slices/S-037/gate-r0.md).
- Missing sources: none. Rounds r1 and r2 have no profile evidence, because they re-ran no profile cases.
