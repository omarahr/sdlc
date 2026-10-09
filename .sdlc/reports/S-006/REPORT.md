# S-006 · lowercase tails and the cross-format round-trip
Verdict: RELEASED
Commit under test: e926f76 · Rounds: 2 · Attempts: 1 · Risk: low · Written: 2026-10-09

| Requirements | Scenarios | Cases | Passed | Failed | Blocked | Blocking defects found / fixed | Open seeds |
|---|---|---|---|---|---|---|---|
| 3 | 5 | 12 | 12 | 0 | 0 | 0 / 0 | 7 |

## Summary
The slice adds tests only. Product code does not change. The tests pin three facts: `{name:lower}` lowercases only the tail, `name` and `split` round-trip all eight kinds under three formats, and no push or pull-request site names an `e2e-area` branch. Two profiles checked this: contract (property run of 3000 cases, spec examples, scanner semantics, four mutations) and cli (24 cases through `branches.py name`, error paths, unicode). Round 0 found no defect. The review found one duplicate test, T-R-011b. The fix round deleted it, and round 1 passed with no new defect. R-011 and R-120 hold. R-068 holds for the `name` and `split` half. The `parse` half closes in S-007.

## Open risks
- R-068 is partial: `parse` does not exist yet, so the round-trip back to parts is unchecked. S-007 adds the assertion and closes R-068 (ADR-20261009-164238).
- The R-120 scan matches the kind name `e2e-area` and the `-e2e-` tail, not the parsed kind. A push that builds the branch through a variable passes unseen (ADR-20261009-164239).
- The scan misses a list-form `gh pr create` call, because the pattern needs the text `pr create`.
- The scan uses a window of 4 lines. An `e2e-area` name more than 3 lines after the push line passes unseen.
- The scan reads six source files. It does not read the prompts.
- S-009 and S-021 to S-024 must tighten the scan once `parse` exists.
- Round 1 re-ran no profile. The fix only deleted a duplicate test, and the full suite and the spec-fidelity and regression checks passed on the new commit.

## Traceability
| Requirement | Spec says | Scenarios | Cases | Result |
|---|---|---|---|---|
| R-011 | `{name:lower}` lowercases the tail, for rules that forbid uppercase. | VS-1, VS-3 | TC-contract-1, TC-contract-2, TC-contract-5, TC-cli-2, TC-cli-3 | pass |
| R-068 | `name and parse round-trip every kind under the default, a prefixed and a lowercased format`… | VS-2, VS-3 | TC-contract-3, TC-contract-6, TC-cli-1, TC-cli-4, TC-cli-5, TC-cli-6 | pass (name and split half; parse half in S-007) |
| R-120 | `\| e2e-area \| <milestoneId>-e2e-<area> \| sdlc/M-1-e2e-api \| never \|` | VS-4, VS-5 | TC-contract-4, TC-contract-5 | pass (kind-name scan) |

## Scenarios

### VS-1 · A lowercased format lowercases only the tail
Profiles: contract, cli. Risk: the lower step spreads to the prefix, the suffix or the literal text.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-contract-1 | Prefix and suffix keep case; the middle is the lowercased tail (3000 runs) | PASS | `.sdlc/slices/S-006/verification/r0/tests/contract-0/branch-format.verify-contract.test.mjs:37` |
| TC-contract-2 | The spec examples hold verbatim | PASS | `.sdlc/slices/S-006/verification/r0/tests/contract-0/branch-format.verify-contract.test.mjs:48` |
| TC-cli-2 | The CLI lowercases only the tail for five formats | PASS | `.sdlc/slices/S-006/verification/r0/tests/cli-0/branches-lower.verify-cli.test.mjs:65` |

<details>
<summary>Case detail (3 cases)</summary>

#### TC-contract-1 · name lowercases only the tail under {name:lower} · PASS
- **Given** formats `feature/PROJ-1-{name:lower}`, `Feat/PROJ-{name:lower}-X`, `FEAT/{name:lower}` and mixed-case parts. **When** `name` and `tail` run, and 3000 generated cases meet a reference model. **Then** prefix and suffix keep case, and the middle is the lowercased tail.
- **Expected** `feature/PROJ-1-s-001`, `Feat/PROJ-s-001-X`, `FEAT/m-1-e2e-api`. **Actual** all equal, 0 violations.
- **Spec source:** R-011 acceptance · **Run:** `VERIFY_ROOT=<worktree> TESTKIT_SEED=20261010 node --test .sdlc/slices/S-006/verification/r0/tests/contract-0/branch-format.verify-contract.test.mjs`

```text
property name-vs-model: seed=20261010 runs=3000 violations=0
```

#### TC-contract-2 · Spec examples run verbatim · PASS
- **Given** the R-011 example and the kind table samples. **When** `name` runs on each. **Then** the branch equals the spec string.
- **Expected** 7 spec strings. **Actual** 7 equal.
- **Spec source:** R-011 acceptance; kind table · **Run:** same as TC-contract-1

```text
feature/PROJ-1-s-001, feature/PROJ-1-S-001, Feat/PROJ-s-001-X, FEAT/m-1-e2e-api, sdlc/M-1-e2e-api, sdlc/M-1-e2e, sdlc/S-001-v0-http-api-0
```

#### TC-cli-2 · Lower lowercases only the tail · PASS
- **Given** four formats, including `Feat/PROJ-{name:lower}-X` and `FEATURE/{name:lower}`. **When** `branches.py name` runs for slice, e2e-area (area `API-V2`) and verify (profile `HTTP-API`). **Then** five exact branches.
- **Expected** `feature/PROJ-1-s-001`; `Feat/PROJ-s-001-X`; `Feat/PROJ-S-001-X`; `FEATURE/m-1-e2e-api-v2`; `feature/PROJ-1-s-001-v0-http-api-0`. **Actual** all five match.
- **Spec source:** R-011 acceptance · **Run:** `node --test .sdlc/slices/S-006/verification/r0/tests/cli-0/branches-lower.verify-cli.test.mjs`
- Evidence: [transcripts](../../slices/S-006/verification/r0/logs/cli-0-transcripts.txt)

</details>

### VS-2 · Every kind builds a valid branch that split reverses under three formats
Profiles: contract. Risk: a kind row builds a tail that `split` cannot reverse, or git rejects the branch.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-contract-3 | 24 branches pass `git check-ref-format`; the middle equals the tail | PASS | `.sdlc/slices/S-006/verification/r0/tests/contract-0/branch-format.verify-contract.test.mjs:69` |
| TC-contract-6 | `name`, `tail` and `split` keep their shape; stdlib imports only | PASS | `.sdlc/slices/S-006/verification/r0/tests/contract-0/branch-format.verify-contract.test.mjs:140` |

<details>
<summary>Case detail (2 cases)</summary>

#### TC-contract-3 · Every kind under three formats builds a valid branch that split reverses · PASS
- **Given** 8 kinds and 3 formats with the spec sample parts. **When** `name` builds, `split` strips, and `git check-ref-format --branch` runs. **Then** git accepts every branch and the middle equals the tail.
- **Expected** 24 valid branches. **Actual** 24 valid, no placeholder left. A generated run of 3000 cases (ids with `İ`, `ß`, `Σ`, CJK, emoji) gave 0 violations.
- **Spec source:** R-068 quote · **Run:** same as TC-contract-1
- Evidence: [run log](../../slices/S-006/verification/r0/logs/contract-0-run.txt)

#### TC-contract-6 · Surface and dependencies · PASS
- **Given** `branches.py` loaded by path. **When** the public functions and imports are listed. **Then** no new dependency.
- **Expected** stdlib only. **Actual** `argparse,json,os,re,subprocess,sys,datetime`.
- **Spec source:** R-068 acceptance · **Run:** same as TC-contract-1
- Evidence: [surface log](../../slices/S-006/verification/r0/logs/contract-0-surface.txt)

</details>

### VS-3 · The CLI name agrees with the Python name for all 24 cases
Profiles: cli. Risk: the CLI prints a branch that differs from `mod.name`, or fails with a stack trace.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-1 | CLI `branch` equals `mod.name` for 24 cases | PASS | `.sdlc/slices/S-006/verification/r0/tests/cli-0/branches-lower.verify-cli.test.mjs:43` |
| TC-cli-3 | The format comes from config; the flag overrides it | PASS | `.sdlc/slices/S-006/verification/r0/tests/cli-0/branches-lower.verify-cli.test.mjs:79` |
| TC-cli-4 | Bad input exits 2 with a JSON error and no stack trace | PASS | `.sdlc/slices/S-006/verification/r0/tests/cli-0/branches-lower.verify-cli.test.mjs:87` |
| TC-cli-5 | Paths with spaces, unicode ids and the C locale give stable output | PASS | `.sdlc/slices/S-006/verification/r0/tests/cli-0/branches-lower.verify-cli.test.mjs:108` |
| TC-cli-6 | An unknown flag and no arguments fail cleanly | PASS | `.sdlc/slices/S-006/verification/r0/tests/cli-0/branches-lower.verify-cli.test.mjs:124` |

<details>
<summary>Case detail (5 cases)</summary>

#### TC-cli-1 · CLI name equals Python name for all 24 cases · PASS
- **Given** a scratch git repo and the real `branches.py`. **When** `name --format F --kind K` runs for 8 kinds and 3 formats. **Then** `branch` equals `mod.name`, exit 0, stderr empty, tree unchanged.
- **Expected** 24 matches. **Actual** 24 of 24 (the state kind is compared by shape, because its stamp is the clock).
- **Spec source:** R-011 and R-068 acceptance · **Run:** `node --test .sdlc/slices/S-006/verification/r0/tests/cli-0/branches-lower.verify-cli.test.mjs`
- Evidence: [transcripts](../../slices/S-006/verification/r0/logs/cli-0-transcripts.txt)

#### TC-cli-3 · Format comes from config; the flag overrides it · PASS
- **Given** config `branchFormat` `feature/PROJ-1-{name:lower}`, and a repo with no config. **When** `name` runs with and without `--format`. **Then** `s-009` lowercased from config, `sdlc/S-009` with the flag or no config.
- **Expected** and **Actual** all three match.
- **Spec source:** R-011 acceptance · **Run:** same as TC-cli-1

#### TC-cli-4 · Bad kind, bad format and missing parts exit non-zero · PASS
- **Given** a scratch repo. **When** `name` runs with kind `nope`, six bad formats, a missing or empty id, a missing verify part, `--n x`, and a missing repo directory. **Then** exit 2, `ok` false, no `Traceback`, tree unchanged.
- **Expected** and **Actual** all cases exit 2.
- **Spec source:** R-011 and R-068 acceptance · **Run:** same as TC-cli-1

```console
$ branches.py name --kind nope
{"ok": false, "error": "--kind 'nope' is not one of run, slice, milestone, e2e, e2e-area, state, verify, attempt"}
exit 2
```

#### TC-cli-5 · Spaces, unicode, repeat run, CI and C locale · PASS
- **Given** the directory `a dir with spaces é`. **When** the same `name` runs twice, with ids that hold `Ä Ö İ`, and under `CI=1 LANG=C`. **Then** equal output, `str.lower` of the id, and `sdlc/S-001` under the C locale.
- **Expected** and **Actual** all match.
- **Spec source:** R-011 acceptance · **Run:** same as TC-cli-1

#### TC-cli-6 · Unknown flag and no arguments fail cleanly · PASS
- **Given** no setup. **When** `name --bogus x` and no arguments run. **Then** exit 2 and a JSON error, no `Traceback`.
- **Expected** and **Actual** exit 2 for both.
- **Spec source:** R-011 and R-068 acceptance · **Run:** same as TC-cli-1

</details>

### VS-4 · No push or pull-request site names an e2e-area branch
Profiles: contract. Risk: the scan passes on an empty match, or reads comments as sites.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-contract-4 | The scanner flags planted pushes within the window, skips comments, and finds a real site | PASS | `.sdlc/slices/S-006/verification/r0/tests/contract-0/branch-format.verify-contract.test.mjs:95` |

<details>
<summary>Case detail (1 case)</summary>

#### TC-contract-4 · Scanner semantics: sites, windows, comments, limits · PASS
- **Given** strings with pushes, `pr create`, wrapped pushes, comments and a variable-built branch. **When** the scanner function from `branches.test.mjs` runs. **Then** it reports `e2e-area` pushes inside the 4-line window and skips comments.
- **Expected** planted push 1 violation; plain `e2e` 0; comment 0. **Actual** as expected. Three limits were confirmed: a variable-built branch, a list-form `pr create`, and an `e2e-area` name more than 3 lines after the push line all pass unseen.
- **Spec source:** R-120 acceptance · **Run:** same as TC-contract-1
- Evidence: [run log](../../slices/S-006/verification/r0/logs/contract-0-run.txt)

</details>

### VS-5 · A planted e2e-area push is reported by the scanner
Profiles: contract. Risk: the R-120 test cannot fail.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-contract-5 | Four planted defects fail the real tests; the clean copy passes | PASS | `.sdlc/slices/S-006/verification/r0/tests/contract-0/branch-format.verify-contract.test.mjs:112` |

<details>
<summary>Case detail (1 case)</summary>

#### TC-contract-5 · Mutation: planted defects fail the real tests · PASS
- **Given** a scratch copy of the skill with one planted defect each. **When** `node --test` runs the real tests in the copy. **Then** each mutated run exits non-zero and the clean copy exits 0.
- **Expected** 4 mutations caught. **Actual** all 4 caught, clean exit 0.
- **Spec source:** R-120 and R-011 acceptance · **Run:** same as TC-contract-1

```text
mutation e2e-area push in state-write.py: exit 1
mutation drop lower: exit 1
mutation lower whole branch: exit 1
mutation lower prefix only: exit 1
```

</details>

## How it was attacked
No security profile was needed. The security review (lenses r0 and r1) found no injection, secret, network call or untrusted deserialization: the tests pass fixed argument arrays to `execFileSync` and `spawnSync`, and the scanner reads six fixed file names. The four mutations in TC-contract-5 and the bad-input cases in TC-cli-4 and TC-cli-6 acted as the attack set. All were caught or rejected.

## Defects found on the way
- **Blocking defects:** none in any round, profile, core verifier or review.
- **Non-blocking fix:** the architecture review in round 0 found the duplicate test T-R-011b. Commit `fb6e40a` deleted it. T-R-011a still guards the same result.

| Seed | Found by | File |
|---|---|---|
| R-068 parse half missing (round trip covers `name` and `split` only) | cli verifier, plan | `skills/sdlc/branches.py` |
| R-120 scan misses list-form `gh pr create` | contract verifier | `skills/sdlc/test/branches.test.mjs` |
| R-120 scan names the kind, not the parsed kind; reads six files only | contract verifier, plan | `skills/sdlc/test/branches.test.mjs` |
| 24-case list built twice; state branch split by string operations | architecture review | `skills/sdlc/test/branches.test.mjs` |
| Scanner `findE2eAreaPushViolations` lives in the test file; move it to `harness.mjs` when S-009 reuses it | architecture review | `skills/sdlc/test/branches.test.mjs` |
| T-R-068a restates the tail rule with `row.tail.toLowerCase()` | review | `skills/sdlc/test/branches.test.mjs` |
| The R-120 scan is a text heuristic with a window of 4 lines | review | `skills/sdlc/test/branches.test.mjs` |

## Appendix
- Tools used: cli-runner (cli profile, scratch HOME, `TZ=UTC`) and property (contract profile, seed 20261010).
- Plans: [r0](../../slices/S-006/verification/plan-r0.md), [r1](../../slices/S-006/verification/plan-r1.md).
- Profile evidence (round 0): [contract](../../slices/S-006/verification/r0/contract-0.md), [cli](../../slices/S-006/verification/r0/cli-0.md).
- Core verifiers: [spec fidelity r0](../../slices/S-006/verify-spec-fidelity-r0.md), [spec fidelity r1](../../slices/S-006/verify-spec-fidelity-r1.md), [regression r0](../../slices/S-006/verify-regression-r0.md), [regression r1](../../slices/S-006/verify-regression-r1.md).
- Reviews: [architecture r0](../../slices/S-006/review-architecture-r0.md), [architecture r1](../../slices/S-006/review-architecture-r1.md), [security r0](../../slices/S-006/review-security-r0.md), [security r1](../../slices/S-006/review-security-r1.md). Gate: [gate r0](../../slices/S-006/gate-r0.md).
- Missing source: round 1 has no profile evidence files, because the fix round re-ran no profile.
