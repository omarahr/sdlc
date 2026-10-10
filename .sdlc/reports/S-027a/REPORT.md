# S-027a · env-detector, state-schema and slicer name branches through the format
Verdict: RELEASED
Commit under test: db0008a (gate receipt covers 74f5c70) · Rounds: 1 (round 0) · Attempts: 1 · Risk: medium · Written: 2026-10-10

| Requirements | Scenarios | Cases | Passed | Failed | Blocked | Blocking defects found / fixed | Open seeds |
|---|---|---|---|---|---|---|---|
| 4 | 6 | 10 | 10 | 0 | 0 | 0 / 0 | 4 |

## Summary
The slice changes three prompt files, so the loop names its branches through `config.branchFormat`. `env-detector.md` takes a `branchFormat` input and records it, else the existing value, else `sdlc/{name}`. `state-schema.md` documents the field, and `slicer.md` writes `branch: <slice branch>`. The verifiers ran the contract, cli and security profiles at round 0. They read the prompts as a consumer does, and they ran the scripts on 149 hostile `branch` values. Every case passed in the first round. The core verifiers and both reviewers found no blocking defect. The full suite passed at the gate (739 passed, 1 skipped). Four non-blocking seeds remain open.

## Open risks
- Seed: R-002 is missing from the slice's `requirements` in `slices.json`. ADR-20261010-064552 says the slice carries R-002. Test T-R-002c has no requirement to close until the state-writer adds it.
- Seed: `state-schema.md` line 220 still names the slice branch as `sdlc/<id>`. This is outside R-061 and R-065.
- The `sdlc/run-<n>` literals stay in the stack steps of `env-detector.md`. This is deliberate. S-027c owns them, so this report does not count them as defects.
- T-R-002c repeats part of T-R-064a. The ADR keeps it as the R-002 evidence.
- Nothing was measured without a spec number. The test time was 90 s against an 88 s baseline.

## Traceability
| Requirement | Spec says | Scenarios | Cases | Result |
|---|---|---|---|---|
| R-064 | "`env-detector.md` gains the input `branchFormat` and the config line: "`branchFormat`: the `branchFormat` input when it is not null; else an existing `config.branchFormat`; else `sdlc/{name}`. The driver's pre-flight derived or checked it; do not read the forge's rules here." Its commit-format step keeps reading the push rule for `commit_message_regex`." | VS-1, VS-2 | TC-contract-1, TC-cli-1, TC-contract-2 | pass |
| R-002 | "The default is `sdlc/{name}`." | VS-3 | TC-contract-3, TC-cli-2 | pass |
| R-065 | "`state-schema.md` documents `"branchFormat": "sdlc/{name}"` in `config.json`: "the format of every branch the loop makes: …  Set at the first launch; a resume keeps it."" | VS-4 | TC-contract-4 | pass |
| R-061 | "**`slicer.md`** writes the slice's informational `branch` field through the module (`<slice branch>` below); nothing in the scripts reads that field." | VS-5, VS-6 | TC-contract-5, TC-cli-3, TC-cli-4, TC-security-1 | pass |

## Scenarios

### VS-1 · env-detector takes the branchFormat input and writes the quoted rule
Profiles: contract, cli. Risk: the quoted sentence drifts, or the renumbered steps break a cross-reference.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-contract-1 | The Inputs line names `branchFormat`. The R-064 sentence appears once. Steps run 1 to 8. | PASS | `skills/sdlc/test/prompts.test.mjs:1098` |
| TC-cli-1 | `ste-check.py` passes the three prompts. No cited step number moved. | PASS | `.sdlc/slices/S-027a/verification/r0/tests/cli-0/prompts-and-format.verify-cli.test.mjs:15` |

<details>
<summary>Case detail (2 cases)</summary>

#### TC-contract-1 · env-detector takes branchFormat and holds the quoted rule · PASS
- **Given** the slice commit read as a consumer reads it. **When** the verifier reads the Inputs line, step 4, the step numbers, the config write step and `ste-check.py`. **Then** the sentence appears once, steps run 1 to 8, step 7 keeps `branchFormat`.
- **Expected** all assertions hold. **Actual** 17 of 17 tests passed.
- **Spec source:** R-064 quote and acceptance · **Run:** `node --test .sdlc/slices/S-027a/verification/r0/tests/contract-0/branch-format.verify-contract.test.mjs`
- Evidence (log): [contract-0.txt](../../slices/S-027a/verification/r0/logs/contract-0.txt)

#### TC-cli-1 · ste-check.py passes the edited prompts · PASS
- **Given** the edited `env-detector.md`, `slicer.md` and `state-schema.md`. **When** `ste-check.py` runs on them. **Then** it exits 0 with no output.
- **Expected** exit 0. **Actual** exit 0. A copy with one banned word exits 1, so the check can fail.
- **Spec source:** R-064 · **Run:** `node --test .sdlc/slices/S-027a/verification/r0/tests/cli-0/prompts-and-format.verify-cli.test.mjs`
```console
$ python3 skills/sdlc/ste-check.py prompts/env-detector.md prompts/slicer.md prompts/state-schema.md
exit 0
```

</details>

### VS-2 · env-detector does not read the forge's branch-name rules and keeps commit_message_regex
Profiles: contract. Risk: a push-rule read for branches hides in near-miss wording.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-contract-2 | No branch-name rule wording exists. The one push rule line names `commit_message_regex` only. | PASS | `skills/sdlc/test/prompts.test.mjs:1107` |

<details>
<summary>Case detail (1 case)</summary>

#### TC-contract-2 · No branch-name rule read, commit_message_regex kept · PASS
- **Given** the slice commit. **When** the verifier searches `env-detector.md` for branch-name rule wording and push rule reads. **Then** none is found, and step 4 holds no forge call.
- **Expected** no branch-name read. **Actual** 17 of 17 tests passed.
- **Spec source:** R-064 acceptance · **Run:** `node --test .sdlc/slices/S-027a/verification/r0/tests/contract-0/branch-format.verify-contract.test.mjs`
- Evidence (log): [contract-0.txt](../../slices/S-027a/verification/r0/logs/contract-0.txt)

</details>

### VS-3 · A fresh run records the default sdlc/{name}
Profiles: contract, cli. Risk: a branch of the rule leaves `branchFormat` unset or empty.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-contract-3 | The rule order is input, existing value, `sdlc/{name}`. `load_format` returns the default for 1000 configs without a value. | PASS | `skills/sdlc/test/prompts.test.mjs:1115` |
| TC-cli-2 | A repo with no config, no field, an empty string or null names `sdlc/S-001`. A set format wins. | PASS | `.sdlc/slices/S-027a/verification/r0/tests/cli-0/prompts-and-format.verify-cli.test.mjs:58` |

<details>
<summary>Case detail (2 cases)</summary>

#### TC-contract-3 · Fresh run falls back to sdlc/{name} · PASS
- **Given** the slice commit. **When** the verifier checks the rule order and calls `load_format` on 1000 configs without a usable value and 1000 with one. **Then** the default and the configured value come back as expected.
- **Expected** no violation. **Actual** 0 violations in both runs.
- **Spec source:** R-002 acceptance · **Run:** `TESTKIT_SEED=27001 node --test .sdlc/slices/S-027a/verification/r0/tests/contract-0/branch-format.verify-contract.test.mjs`
- Property run: `load_format`, seed 27001, 1000 runs, 0 violations (default).
- Property run: `load_format`, seed 27002, 1000 runs, 0 violations (configured value wins).

#### TC-cli-2 · branches.py names the slice branch through the default · PASS
- **Given** repos with no config, a config without the field, an empty string and null. **When** `branches.py name --kind slice --id S-001` runs. **Then** it exits 0 with format `sdlc/{name}`.
- **Expected** `sdlc/S-001` each time, and `feature/S-001` for a set format `feature/{name}`. **Actual** as expected. An unparseable config exits 2.
- **Spec source:** R-002 clause 2 · **Run:** `node --test .sdlc/slices/S-027a/verification/r0/tests/cli-0/prompts-and-format.verify-cli.test.mjs`
```console
$ python3 skills/sdlc/branches.py name --repo <repo> --kind slice --id S-001
{"ok": true, "command": "name", "format": "sdlc/{name}", "kind": "slice", "branch": "sdlc/S-001"}
exit 0
```

</details>

### VS-4 · state-schema documents branchFormat, the slice branch and runBranch through the format
Profiles: contract. Risk: the quoted text drifts, or an old literal stays in the config section.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-contract-4 | The config block holds `branchFormat`. The description and the two phrases match the spec. No `sdlc/run-` in the config section. | PASS | `skills/sdlc/test/prompts.test.mjs:1123` and `:1136` |

<details>
<summary>Case detail (1 case)</summary>

#### TC-contract-4 · state-schema documents the format · PASS
- **Given** the slice commit. **When** the verifier parses the config block and reads the field descriptions. **Then** the block holds `sdlc/{name}`, the text matches, and no `sdlc/S-001` stays in the slice example.
- **Expected** all assertions hold. **Actual** 17 of 17 tests passed.
- **Spec source:** R-065 quote and acceptance · **Run:** `node --test .sdlc/slices/S-027a/verification/r0/tests/contract-0/branch-format.verify-contract.test.mjs`
- Evidence (log): [contract-0.txt](../../slices/S-027a/verification/r0/logs/contract-0.txt)

</details>

### VS-5 · slicer writes the slice branch through the placeholder
Profiles: contract. Risk: another prompt on the slicer path still says `sdlc/<id>`.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-contract-5 | `slicer.md` holds `branch: <slice branch>`. No prompt tells the slicer to write `sdlc/<id>`. | PASS | `skills/sdlc/test/prompts.test.mjs:1145` |

<details>
<summary>Case detail (1 case)</summary>

#### TC-contract-5 · slicer writes the placeholder · PASS
- **Given** the slice commit. **When** the verifier reads `slicer.md` and searches all prompts for a `branch: sdlc/` instruction. **Then** none is found, and `_common.md` maps the placeholder to `branches.py`.
- **Expected** all assertions hold. **Actual** 17 of 17 tests passed.
- **Spec source:** R-061 acceptance · **Run:** `node --test .sdlc/slices/S-027a/verification/r0/tests/contract-0/branch-format.verify-contract.test.mjs`
- Evidence (log): [contract-0.txt](../../slices/S-027a/verification/r0/logs/contract-0.txt)

</details>

### VS-6 · No script reads a slice's branch field
Profiles: cli, security. Risk: a script reads the field and a hostile value changes its output or state.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-3 | 38 variants of the `branch` value change no output or state. A planted read makes the test fail. | PASS | `skills/sdlc/test/prompts.test.mjs:1195` |
| TC-cli-4 | `sdlc-loop.js` has no read of a slice's branch. | PASS | `skills/sdlc/test/prompts.test.mjs:1221` |
| TC-security-1 | 149 hostile variants change no output, state, git ref or file outside the repo. | PASS | `.sdlc/slices/S-027a/verification/r0/tests/security-0/branch-field.verify-security.test.mjs:1` |

<details>
<summary>Case detail (3 cases)</summary>

#### TC-cli-3 · No script reads the field (38 variants) · PASS
- **Given** a ledger of 3 slices and a git repo. **When** `next-action.py`, `state-write.py` (`status`, `base-branch`, `patch-slice`) and `janitor.py` run with the field removed, null, number, bool, list, object, empty, newline, traversal, 2 MB, flag-like and 24 corpus values. **Then** every output, `STATUS.md` and `slices.json` equal the original, apart from `branch` and the commit hash.
- **Expected** equal. **Actual** all 38 equal. A planted read made 3 of 3 sampled variants fail.
- **Spec source:** R-061 acceptance · **Run:** `node --test .sdlc/slices/S-027a/verification/r0/tests/cli-0/branch-field.verify-cli.test.mjs`
```console
$ node --test branch-field.verify-cli.test.mjs
tests 40, pass 40, fail 0
```

#### TC-cli-4 · sdlc-loop.js never reads a slice's branch field · PASS
- **Given** the `sdlc-loop.js` source. **When** the verifier scans for `s.branch`, `slice.branch` and `['branch']`. **Then** no hit.
- **Expected** no hit. **Actual** no hit.
- **Spec source:** R-061 acceptance · **Run:** `node --test .sdlc/slices/S-027a/verification/r0/tests/cli-0/prompts-and-format.verify-cli.test.mjs`

#### TC-security-1 · Hostile branch values change nothing · PASS
- **Given** three slices with the field garbage, non-string or removed. **When** the scripts run. **Then** outputs, state, git refs, `STATUS.md` and outside files equal the original.
- **Expected** equal. **Actual** equal in 149 variants.
- **Spec source:** R-061 acceptance · **Run:** `node --test .sdlc/slices/S-027a/verification/r0/tests/security-0/branch-field.verify-security.test.mjs`

</details>

## How it was attacked
One security session (VS-6, R-061). The charter: make a hostile `branch` value change a script's output or state. The boundary is the `slices.json` file that a human or agent may edit. Four attacks were tried, and four held. None broke, and none was out of scope.

<details>
<summary>Attack table</summary>

| input | expected | observed | result |
|---|---|---|---|
| A-1: every corpus family as the `branch` value | no change in output or state | no change | held |
| A-2: null, numbers, list, object, nested list, empty, 1 MB string | no change | no change | held |
| A-3: field removed | no change | no change | held |
| A-4: search for a read of a slice branch in `sdlc-loop.js` and the scripts | no read | no read | held |

</details>

## Defects found on the way
- **Blocking defects:** none. The spec-fidelity and regression verifiers held, both reviewers found no blocking finding, and the gate passed.
- **Seeds**

| Seed | Found by | File |
|---|---|---|
| R-002 missing from the S-027a requirements | review (architecture) | `.sdlc/slices.json` |
| T-R-002c repeats coverage of T-R-064a (kept as the R-002 trace) | review (architecture, test-quality) | `skills/sdlc/test/prompts.test.mjs` |
| `sdlc/run-<n>` literals remain in the env-detector stack steps (S-027c owns them) | review (architecture) | `skills/sdlc/prompts/env-detector.md` |
| `state-schema.md` reports section still names the slice branch as `sdlc/<id>` | verify-contract | `skills/sdlc/prompts/state-schema.md` |

## Appendix
- Tools: cli-runner, attack-corpus, property (testkit: `.sdlc/testkit.json`, tools under `skills/sdlc/test/testkit`).
- Plan: [plan-r0.json](../../slices/S-027a/verification/plan-r0.json), [plan-r0.md](../../slices/S-027a/verification/plan-r0.md).
- Round 0 profile evidence: [cli-0](../../slices/S-027a/verification/r0/cli-0.md), [contract-0](../../slices/S-027a/verification/r0/contract-0.md), [security-0](../../slices/S-027a/verification/r0/security-0.md).
- Core verifiers: [spec-fidelity r0](../../slices/S-027a/verify-spec-fidelity-r0.md), [regression r0](../../slices/S-027a/verify-regression-r0.md), [gate r0](../../slices/S-027a/gate-r0.md).
- Reviews: [architecture r0](../../slices/S-027a/review-architecture-r0.md), [test-quality r0](../../slices/S-027a/review-test-quality-r0.md).
- Missing sources: `failures.md` does not exist, because the slice had no failed round. The verifier tests under `verification/r0/tests/` are unpromoted evidence.
