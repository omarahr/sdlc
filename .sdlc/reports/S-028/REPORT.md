# S-028 · prompt tests guard the placeholders and the format records
Verdict: RELEASED
Commit under test: 49fc22f · Rounds: 1 · Attempts: 1 · Risk: low · Written: 2026-10-10

| Requirements | Scenarios | Cases | Passed | Failed | Blocked | Blocking defects found / fixed | Open seeds |
|---|---|---|---|---|---|---|---|
| 2 | 0 | 2 | 2 | 0 | 0 | 0 / 0 | 3 |

## Summary
The slice adds one test to the prompts test file. The test fails when a branch placeholder, the `branchFormat` record or a `SKILL.md` branch-format match disappears. The slice changes no product file. The risk is low, so the plan called for no verification profiles. The evidence is the full-suite gate in round 0: 746 tests passed, 0 failed, 1 skipped. The existing STE linter test covers every prompt file and passes. No blocking defect was found. Three non-blocking seeds remain open.

## Open risks
- No verification profile ran. The evidence is the gate and the two tests only.
- The new test repeats part of T-R-062 and T-R-046a. The spec names the test, so the overlap stays.
- The gate had no lint, typecheck, build or e2e command to run.
- The tests passed on the first run. They are characterization tests, not tests that failed before a code change.

## Traceability
| Requirement | Spec says | Scenarios | Cases | Result |
|---|---|---|---|---|
| R-081 | `_common.md defines every branch placeholder and env-detector records the format`: the eight placeholders are present; `env-detector.md` matches `/branchFormat/`; `SKILL.md` matches `/--branch-format/` and `/branches\.py" preflight/`. | none | TC-gate-1 | pass |
| R-082 | The existing STE test covers every edited prompt. | none | TC-gate-2 | pass |

## Scenarios
No verification scenarios exist for this slice. The plan lists the two tests below. The gate ran both in the full suite.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-gate-1 | The Branch names bullet holds all eight placeholders. `env-detector.md` and `SKILL.md` hold the required matches. | PASS | `skills/sdlc/test/prompts.test.mjs:1083` |
| TC-gate-2 | Every prompt file passes `ste-check.py`, with no allowlist and no skip. | PASS | `skills/sdlc/test/prompts.test.mjs:837` |

<details>
<summary>Case detail (2 cases)</summary>

#### TC-gate-1 · Placeholders and format records · PASS
- **Given** the prompt files and `SKILL.md` at the commit under test. **When** the test reads the Branch names bullet of `_common.md`, `env-detector.md` and `SKILL.md`. **Then** each assertion holds.
- **Expected** `<run branch>`, `<slice branch>`, `<milestone branch>`, `<e2e branch>`, `<e2e area branch>`, `<state branch>`, `<attempt branch>` and `<verify branch>` appear in the bullet; `/branchFormat/`, `/--branch-format/` and `/branches\.py" preflight/` match. **Actual** all hold.
- **Spec source:** R-081, section Testing. **Run:** `npm test`

```console
$ npm test
746 passed, 0 failed, 1 skipped
exit 0
```

#### TC-gate-2 · STE linter over every prompt file · PASS
- **Given** every `.md` file in the prompts directory. **When** the test runs `ste-check.py` over them. **Then** the exit code is 0.
- **Expected** no violation. **Actual** no violation.
- **Spec source:** R-082, section Testing. **Run:** `npm test`

```console
$ npm test
746 passed, 0 failed, 1 skipped
exit 0
```

</details>

## How it was attacked
No security profile was needed.

## Defects found on the way
- **Blocking defects:** none.
- **Seeds:** the table lists open seeds.

| Seed | Found by | File |
|---|---|---|
| New test overlaps T-R-062 in its placeholder loop | review | `skills/sdlc/test/prompts.test.mjs` |
| New test overlaps T-R-062 and T-R-046a | review | `skills/sdlc/test/prompts.test.mjs` |
| No comments, deterministic, honest name (informational) | review | `skills/sdlc/test/prompts.test.mjs` |

## Appendix
- Toolkit tools used: none.
- Gate: `.sdlc/slices/S-028/gate-r0.md`; receipt: `.sdlc/slices/S-028/verification/suite-receipt.json`.
- Plan: `.sdlc/slices/S-028/plan.md`; tests: `.sdlc/slices/S-028/tests.md`.
- Missing sources: no `verification/plan-r*.json`, no profile evidence, no `verify-spec-fidelity-r*.md`, no `verify-regression-r*.md`, no `review-*-r*.md` and no `failures.md` exist for this slice.
