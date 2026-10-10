# S-035 · integrator, escalator and state-writer prompts use branch placeholders
Verdict: RELEASED
Commit under test: 5040928 · Rounds: 1 · Attempts: 1 · Risk: medium · Written: 2026-10-10

| Requirements | Scenarios | Cases | Passed | Failed | Blocked | Blocking defects found / fixed | Open seeds |
|---|---|---|---|---|---|---|---|
| 4 | 4 | 21 | 21 | 0 | 0 | 0 / 0 | 4 |

## Summary
The slice adds four tests to `skills/sdlc/test/prompts.test.mjs`. They pin that integrator.md, escalator.md and state-writer.md name branches through placeholders and hold no branch literal. They also pin that the integrator finds attempt branches through `branches.py list --kind attempt`, filtered to the slice id. The slice changes no prompt, because slices S-027b and S-027c already fixed them. The cli, contract and security profiles all passed in round 0 (21 of 21 cases). Mutation runs showed that each test fails when a literal is added. No blocking defect was found. The test-quality review calls three of the tests duplicates of older tests.

## Open risks
- The test-quality review (round 0) asked to delete or fold T-R-131, T-R-143, T-R-145 and T-R-147, because T-R-063a, T-R-080 and T-R-093a cover most of them. Only the NAMED_LITERALS check and the slice id filter wording are new. The loop released the slice. The tests do no harm.
- The scan helper `stripBranchesOutput` removes a whole fenced block that holds the word `branches.py`. A literal inside such a block is not seen. No shipped block hides one today (attack A-5, out of scope).
- `branches.py` parses `sdlc/S-1-attempt-<non-ascii digit>` as an attempt of S-1. Clean up would then delete it. The attacker needs write access to the repo branches, which lies inside the trusted boundary (attack A-3, out of scope).
- The tests pass before any change, so they characterize existing behavior. The mutation runs carry the proof that they detect a literal.
- The spec states no numbers for this slice, so no limits scenario ran.
- The gate timed 102 s on the branch against 88 s on main. The added 14 s is under the 60 s limit.

## Traceability
| Requirement | Spec says | Scenarios | Cases | Result |
|---|---|---|---|---|
| R-131 | "the slice's attempt branches (`branches.py list --kind attempt`, filtered to this slice)" | VS-1 | TC-cli-1 to TC-cli-8, TC-contract-1, TC-security-1 to TC-security-5 | pass |
| R-143 | `integrator.md`: `sdlc/<id>` (×9), `sdlc/run-<n>` (×3), `sdlc/<id>-attempt-*` become `<slice branch>`, `<run branch>`, "the slice's attempt branches (`branches.py list --kind attempt`, filtered to this slice)" | VS-2 | TC-contract-2, TC-security-6 to TC-security-8 | pass |
| R-145 | `escalator.md`: `sdlc/<id>` (×3), `sdlc/<id>-attempt-<n>` (×2), `sdlc/run-<n>` become `<slice branch>`, `<attempt branch>`, `<run branch>` | VS-3 | TC-contract-3, TC-security-9 | pass |
| R-147 | `state-writer.md`: `sdlc/<id>`, `sdlc/<id>-attempt-<n>` become `<slice branch>`, `<attempt branch>` | VS-4 | TC-contract-4, TC-security-9 | pass |

## Scenarios

### VS-1 · The integrator finds attempt branches to delete through branches.py, filtered to the slice
Profiles: cli, contract, security. Risk: the Clean up step deletes the branches of another slice.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-1 | Clean up section holds the branches.py command, the id filter and no glob | PASS | `.sdlc/slices/S-035/verification/r0/tests/cli-0/cleanup.verify-cli.test.mjs:22` |
| TC-cli-2 | Listing S-1 attempts next to S-10, S-1a and s-1 keeps only the S-1 ids | PASS | `.sdlc/slices/S-035/verification/r0/tests/cli-0/cleanup.verify-cli.test.mjs:30` |
| TC-cli-3 | A slice with no attempt branches keeps nothing | PASS | `.sdlc/slices/S-035/verification/r0/tests/cli-0/cleanup.verify-cli.test.mjs:39` |
| TC-cli-4 | Lookalike names never match S-1 | PASS | `.sdlc/slices/S-035/verification/r0/tests/cli-0/cleanup.verify-cli.test.mjs:48` |
| TC-cli-5 | A custom branch format lists attempts under its own spelling | PASS | `.sdlc/slices/S-035/verification/r0/tests/cli-0/cleanup.verify-cli.test.mjs:57` |
| TC-cli-6 | Running list twice gives the same output and changes no ref | PASS | `.sdlc/slices/S-035/verification/r0/tests/cli-0/cleanup.verify-cli.test.mjs:63` |
| TC-cli-7 | A path that is not a repository exits 2 with an error | PASS | `.sdlc/slices/S-035/verification/r0/tests/cli-0/cleanup.verify-cli.test.mjs:72` |
| TC-cli-8 | The scan regexes detect a glob added to the section (mutation) | PASS | `.sdlc/slices/S-035/verification/r0/tests/cli-0/cleanup.verify-cli.test.mjs:80` |
| TC-contract-1 | Clean up lists attempt branches through branches.py and keeps only the slice id | PASS | `.sdlc/slices/S-035/verification/r0/tests/contract-0/prompt-branch.verify-contract.test.mjs:73` |
| TC-security-1 | Attempts of S-1, S-10, S-1a, S-11: filter keeps only S-1 | PASS | `.sdlc/slices/S-035/verification/r0/tests/security-0/prompt-branches.verify-security.test.mjs` |
| TC-security-2 | Slice with no attempt branches | PASS | `.sdlc/slices/S-035/verification/r0/tests/security-0/prompt-branches.verify-security.test.mjs` |
| TC-security-3 | Hostile names (trailing dash, non-numeric n, nested, unicode hyphen, traversal) | PASS | `.sdlc/slices/S-035/verification/r0/tests/security-0/prompt-branches.verify-security.test.mjs` |
| TC-security-4 | Flag-like corpus values as --kind | PASS | `.sdlc/slices/S-035/verification/r0/tests/security-0/prompt-branches.verify-security.test.mjs` |
| TC-security-5 | Clean up section text | PASS | `.sdlc/slices/S-035/verification/r0/tests/security-0/prompt-branches.verify-security.test.mjs` |

<details>
<summary>Case detail (14 cases)</summary>

#### TC-cli-1 to TC-cli-8 · PASS
- **Given** a scratch git repo from cli-runner, or the integrator.md text **When** the Clean up section is read, or `branches.py list --kind attempt` runs and the prompt filter applies **Then** the results below hold.
- TC-cli-1: the section names `branches.py list --repo . --kind attempt` and `Keep the entries whose id equals this slice id, ignoring case`, with no `-attempt-*` and no `sdlc/<id>`.
- TC-cli-2: S-1 keeps `S-1-attempt-1`, `S-1-attempt-2` and `s-1-attempt-3`. S-10 and S-1a keep only their own. Exit 0, tree unchanged.
- TC-cli-3 to TC-cli-8: an empty keep list for S-2; lookalike names never match S-1; a `feature/` format lists `feature/S-1-attempt-1` only; two runs give equal output; a non-repository path exits 2; a mutated glob is caught.
- **Spec source:** R-131 acceptance · **Run:** `node --test .sdlc/slices/S-035/verification/r0/tests/cli-0/cleanup.verify-cli.test.mjs`
- Evidence, TC-cli-2:

```console
$ python3 skills/sdlc/branches.py list --repo <scratch> --kind attempt
exit 0
{"ok": true, "command": "list", "format": "sdlc/{name}", "kind": "attempt", "branches": [S-1 n=1, S-10 n=1, S-1a n=1, S-1 n=2, s-1 n=3]}
```

Full log: [cli-0-run.txt](../../slices/S-035/verification/r0/logs/cli-0-run.txt).

#### TC-contract-1 · Clean up lists attempts through branches.py and keeps only the slice id · PASS
- **Given** commit 5040928 **When** the scan runs on real and mutated prompt text **Then** S-1 and s-1 are kept, S-10 and S-100 are dropped, and an empty list stays empty.
- **Expected** glob, kind and prefix mutations fail T-R-131 **Actual** they fail
- **Spec source:** R-131 acceptance · **Run:** `VERIFY_WT=<worktree> TESTKIT_SEED=35001 node --test .sdlc/slices/S-035/verification/r0/tests/contract-0/prompt-branch.verify-contract.test.mjs`
- Evidence: [contract-0-run.txt](../../slices/S-035/verification/r0/logs/contract-0-run.txt), [contract-0-mutation.txt](../../slices/S-035/verification/r0/logs/contract-0-mutation.txt)

#### TC-security-1 to TC-security-5 · PASS
- **Given** commit 5040928 **When** attacks run against the real `branches.py` and the real prompt text **Then** only S-1 attempts match the S-1 filter.
- TC-security-1: attempts of S-1, S-10, S-1a and S-11 leave only `S-1-attempt-1` and `-2`; refs unchanged. TC-security-2: no entry kept for a slice with no attempts.
- TC-security-3: a nested name gets id `S-1-attempt-1`, so the S-1 filter drops it. A non-ascii digit name parses as S-1 (seed). TC-security-4: 8 flag-like `--kind` values give a non-zero exit and an unchanged tree.
- TC-security-5: the section holds no glob, no `-attempt-*`, no `--list`, no `for-each-ref`, and it names the filter.
- **Spec source:** R-131 acceptance · **Run:** `node --test .sdlc/slices/S-035/verification/r0/tests/security-0/prompt-branches.verify-security.test.mjs`

</details>

### VS-2 · integrator.md holds no branch literal and names its branches through placeholders
Profiles: contract, security. Risk: a literal in the file steers an agent that deletes and pushes branches.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-contract-2 | integrator.md holds no literal; 1099 injected literals caught | PASS | `.sdlc/slices/S-035/verification/r0/tests/contract-0/prompt-branch.verify-contract.test.mjs:21` |
| TC-security-6 | Planted literals in integrator.md (11 variants) | PASS | `.sdlc/slices/S-035/verification/r0/tests/security-0/prompt-branches.verify-security.test.mjs` |
| TC-security-7 | Literal inside a fenced block that also names branches.py | PASS | `.sdlc/slices/S-035/verification/r0/tests/security-0/prompt-branches.verify-security.test.mjs` |
| TC-security-8 | Lookalike separator and zero-width space after the slash | PASS | `.sdlc/slices/S-035/verification/r0/tests/security-0/prompt-branches.verify-security.test.mjs` |

<details>
<summary>Case detail (4 cases)</summary>

#### TC-contract-2 · integrator.md holds no literal; injected literals are caught · PASS
- **Given** commit 5040928 **When** the scan runs on the real file and on mutated text **Then** the scan catches each injected literal and flags no safe string.
- **Expected** an added literal fails the test **Actual** 1099 injected literals caught, 300 safe strings not flagged
- **Spec source:** R-143 acceptance · **Run:** `VERIFY_WT=<worktree> TESTKIT_SEED=35001 node --test .sdlc/slices/S-035/verification/r0/tests/contract-0/prompt-branch.verify-contract.test.mjs`
- property-run: mutation property, seed 35001, 1200 runs, pass.

#### TC-security-6 to TC-security-8 · PASS
- TC-security-6: the scan flags all 11 planted variants (code span, table cell, quotes, fenced block). The real file is clean and holds `<slice branch>` and `<run branch>`.
- TC-security-7: a literal inside a fenced block that also names `branches.py` is not flagged, because the exemption covers the whole block. An unclosed fence is not exempt. A paired fence with a later literal is flagged.
- TC-security-8: a zero-width space after the slash is flagged. The lookalike slash U+2215 is not a branch, so it is not flagged.
- **Spec source:** R-143 acceptance · **Run:** `node --test .sdlc/slices/S-035/verification/r0/tests/security-0/prompt-branches.verify-security.test.mjs`

</details>

### VS-3 · escalator.md holds no sdlc/ branch literal and holds the three placeholders
Profiles: contract, security. Risk: a literal in the escalator prompt drifts from the branch format.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-contract-3 | escalator.md holds no literal and three placeholders | PASS | `.sdlc/slices/S-035/verification/r0/tests/contract-0/prompt-branch.verify-contract.test.mjs:21` |
| TC-security-9 | escalator.md and state-writer.md clean; planted literal flagged; .sdlc/ paths not flagged | PASS | `.sdlc/slices/S-035/verification/r0/tests/security-0/prompt-branches.verify-security.test.mjs` |

<details>
<summary>Case detail (2 cases)</summary>

#### TC-contract-3 · escalator.md holds no literal and three placeholders · PASS
- **Given** commit 5040928 **When** `sdlc/run-3` is added to the text **Then** T-R-145 fails; the clean file passes.
- **Spec source:** R-145 acceptance · **Run:** `VERIFY_WT=<worktree> TESTKIT_SEED=35001 node --test .sdlc/slices/S-035/verification/r0/tests/contract-0/prompt-branch.verify-contract.test.mjs`
- property-run: seed 35001, 1200 runs, pass.

#### TC-security-9 · escalator.md and state-writer.md clean · PASS
- **Expected** no false positive on `.sdlc/` **Actual** both files clean; a planted literal is flagged; `.sdlc/slices` is not flagged.
- **Spec source:** R-145 and R-147 acceptance · **Run:** `node --test .sdlc/slices/S-035/verification/r0/tests/security-0/prompt-branches.verify-security.test.mjs`

</details>

### VS-4 · state-writer.md holds no sdlc/ branch literal and holds the slice and attempt placeholders
Profiles: contract. Risk: a literal in the state-writer prompt drifts from the branch format.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-contract-4 | state-writer.md holds no literal and two placeholders | PASS | `.sdlc/slices/S-035/verification/r0/tests/contract-0/prompt-branch.verify-contract.test.mjs:21` |

<details>
<summary>Case detail (1 case)</summary>

#### TC-contract-4 · state-writer.md holds no literal and two placeholders · PASS
- **Given** commit 5040928 **When** a literal is added to the text **Then** T-R-147 fails, and `.sdlc/` paths pass.
- **Spec source:** R-147 acceptance · **Run:** `VERIFY_WT=<worktree> TESTKIT_SEED=35001 node --test .sdlc/slices/S-035/verification/r0/tests/contract-0/prompt-branch.verify-contract.test.mjs`
- property-run: seed 35001, 1200 runs, pass.

</details>

## How it was attacked
One security session explored branch filtering and the scan exemption. The boundary: the prompt text and `branches.py` as the integrator reads them. Write access to the repo branches lies inside the trusted boundary. Six attacks ran. Four held (prefix ids, nested attempt names, flag-like `--kind` values, 11 literal variants). Two were out of scope: a non-ascii digit attempt number, and a literal inside a `branches.py` fenced block.

<details>
<summary>Attack table (6 attacks)</summary>

| input | expected | observed | result |
|---|---|---|---|
| S-10, S-11, S-1a attempts against slice S-1 | only S-1 kept | only S-1 kept | held |
| `sdlc/S-1-attempt-1-attempt-2` | not an S-1 attempt | id parsed as `S-1-attempt-1`; S-1 filter drops it | held |
| `sdlc/S-1-attempt-` plus U+0663 | not an attempt of S-1 | parsed as S-1 attempt n=3 | out-of-scope |
| 8 flag-like `--kind` values | refusal, no side effect | non-zero exit, tree unchanged | held |
| fenced block with `branches.py` and a literal | literal detected | literal hidden | out-of-scope |
| 11 literal variants (code span, table cell, quotes) | all flagged | all flagged | held |

</details>

## Defects found on the way
- **Blocking defects:** none. No round, profile, core verifier or review found one.
- The test-quality review blocked on duplicate tests. This is a finding on test design, not a defect in the product. See Open risks.

| Seed | Found by | File |
|---|---|---|
| New tests repeat coverage of T-R-063a, T-R-080 and T-R-093a | review (test-quality) | `skills/sdlc/test/prompts.test.mjs` |
| Prompt test file keeps growing (over 1400 lines) | review (test-quality) | `skills/sdlc/test/prompts.test.mjs` |
| Scan exemption hides a literal in any fenced block that names `branches.py` | contract and security, round 0 | `skills/sdlc/test/prompts.test.mjs` |
| `branches.py` parses a non-ascii digit attempt number | security, round 0 | `skills/sdlc/branches.py` |

## Appendix
- Toolkit: cli-runner (cli), property (contract), attack-corpus (security), listed in `.sdlc/testkit.json`.
- Plan: [plan-r0.json](../../slices/S-035/verification/plan-r0.json), [plan-r0.md](../../slices/S-035/verification/plan-r0.md).
- Evidence round 0: [cli-0.json](../../slices/S-035/verification/r0/cli-0.json), [contract-0.json](../../slices/S-035/verification/r0/contract-0.json), [security-0.json](../../slices/S-035/verification/r0/security-0.json), with `.md` summaries beside them.
- Core verifiers: [verify-spec-fidelity-r0.md](../../slices/S-035/verify-spec-fidelity-r0.md), [verify-regression-r0.md](../../slices/S-035/verify-regression-r0.md), [review-test-quality-r0.md](../../slices/S-035/review-test-quality-r0.md), [gate-r0.md](../../slices/S-035/gate-r0.md).
- Missing sources: none. The in-repo tests T-R-131, T-R-143, T-R-145 and T-R-147 sit at `skills/sdlc/test/prompts.test.mjs:1367`, `:1376`, `:1387` and `:1394`.
