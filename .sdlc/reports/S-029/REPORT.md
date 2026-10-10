# S-029 · README documents the flag and the branch names
Verdict: RELEASED
Commit under test: 4f56351 · Rounds: 0 · Attempts: 1 · Risk: low · Written: 2026-10-10

| Requirements | Scenarios | Cases | Passed | Failed | Blocked | Blocking defects found / fixed | Open seeds |
|---|---|---|---|---|---|---|---|
| 2 | 0 | 4 | 4 | 0 | 0 | 0 / 0 | 3 |

## Summary
The slice documents the `--branch-format` flag in `README.md`. It adds the flag to the Usage row with one example. It adds a **Branch names** paragraph that lists the eight kinds, their tails, the default `sdlc/{name}`, the rules the pre-flight reads and the outcome of a mismatch. It adds `branchFormat` to the `config.json` row and `branches.py` to the Development tree. Four README tests prove R-066. They failed first and now pass. The Gate ran `npm test` on commit 4f56351 and it passed. No verification scenario plan was recorded, because the slice changes documentation only. R-067 holds: `skills/sdlc/prompts/ste-style.md` has no diff.

## Open risks
- No scenario plan, profile evidence or review file exists for this slice. Only the Gate summary, the plan, tests.md and the test files back this report.
- Two assertions in the Branch names test cannot fail (see Defects, seeds). The test is weaker than it looks.
- The README text can drift from `TAILS` in `branches.py`. The test checks only that the tail strings are present, not that they match the module.

## Traceability
| Requirement | Spec says | Scenarios | Cases | Result |
|---|---|---|---|---|
| R-066 | "`README.md`: the Usage table gets the `--branch-format \"<format>\"` flag with one example; a short **Branch names** paragraph after the git-mode bullets lists the kinds and tails, the default, the rules the pre-flight reads and what happens on a mismatch; \"What it writes to your repo\" mentions `branchFormat` in `config.json`; the Development tree lists `branches.py`." | none | T-R-066a, T-R-066b, T-R-066c, T-R-066d | pass |
| R-067 | "`prompts/ste-style.md` is unchanged; every prompt edit passes `ste-check.py`." | none | existing ste-check test; empty diff of `ste-style.md` | pass |

## Scenarios
No verification scenario was planned. The cases below are the Gate tests from tests.md.

### Gate cases for R-066
Profiles: none. Risk: a wrong or missing README line misleads a user, and no runtime code reads the file.

| Case | What it proves | Result | Test |
|---|---|---|---|
| T-R-066a | The Usage row shows `[--branch-format "<format>"]` and a flag bullet shows the example `"feature/PROJ-1-{name}"` | PASS | `skills/sdlc/test/prompts.test.mjs:1367` |
| T-R-066b | The **Branch names** paragraph follows the last `--git` bullet and names the eight kinds, the tails, the default, `{name:lower}`, the GitLab push rule, the GitHub ruleset and the stop-before-launch outcome | PASS | `skills/sdlc/test/prompts.test.mjs:1378` |
| T-R-066c | "What it writes to your repo" mentions `branchFormat` and `config.json` | PASS | `skills/sdlc/test/prompts.test.mjs:1404` |
| T-R-066d | The Development tree lists `branches.py` | PASS | `skills/sdlc/test/prompts.test.mjs:1415` |

<details>
<summary>Case detail (4 cases)</summary>

#### T-R-066a · Usage row and flag example · PASS
- **Given** the README. **When** the test reads the `/sdlc <spec>` table row and the flag bullets. **Then** the row has the flag and a bullet has the example.
- **Expected** flag in the row and one example. **Actual** both present.
- **Spec source:** §9 (R-066) · **Run:** `node --test --test-name-pattern="R-066" skills/sdlc/test/prompts.test.mjs`
- ```console
  $ node --test --test-name-pattern="R-066" skills/sdlc/test/prompts.test.mjs
  ✔ R-066: the README Usage row and flag list show --branch-format with one example
  ℹ tests 4  ℹ pass 4  ℹ fail 0
  exit 0
  ```

#### T-R-066b · Branch names paragraph · PASS
- **Given** the README. **When** the test finds the paragraph that starts with `**Branch names**`. **Then** it sits after the last `--git` bullet and holds all the required terms.
- **Expected** eight kinds, tails, default, placeholder, rule sources, stop outcome. **Actual** all present.
- **Spec source:** §9 (R-066) · **Run:** same command
- ```console
  ✔ R-066: the README Branch names paragraph names the kinds, tails, default and mismatch outcome
  exit 0
  ```

#### T-R-066c · config.json row · PASS
- **Given** the README section "What it writes to your repo". **When** the test reads the section. **Then** it contains `branchFormat` and `config.json`.
- **Expected** both strings. **Actual** both present (row: "The run settings: git mode, commands, `commitFormat` and `branchFormat`").
- **Spec source:** §9 (R-066) · **Run:** same command

#### T-R-066d · Development tree · PASS
- **Given** the README Development tree block. **When** the test matches `branches.py`. **Then** the line is present.
- **Expected** `branches.py` listed. **Actual** listed after `state-write.py`.
- **Spec source:** §9 (R-066) · **Run:** same command

</details>

## How it was attacked
No security profile was needed.

## Defects found on the way
- **Blocking defects:** none.
- **Seeds**

| Seed | Found by | File |
|---|---|---|
| Branch-names test: the heading assertion `nextHeading < 0 \|\| nextHeading > start` always holds. The tail `<sliceId>` also passes inside `<sliceId>-attempt-<n>`. | plan review | `skills/sdlc/test/prompts.test.mjs` |
| Test names `R-066: ...` differ from the tests.md ids `T-R-066a` to `T-R-066d`. | plan review | `skills/sdlc/test/prompts.test.mjs` |

One more seed (README matches SKILL.md and branches.py) records a pass with no defect and is not open.

## Appendix
- Toolkit tools used: none (no `.sdlc/testkit.json` tool applies to documentation).
- Evidence files: `.sdlc/slices/S-029/plan.md`, `.sdlc/slices/S-029/tests.md`, `.sdlc/slices/S-029/gate-r0.md`, `.sdlc/slices/S-029/verification/suite-receipt.json`.
- Missing sources: `verification/plan-r*.json`, `verification/r*/` profile files, `verify-spec-fidelity-r*.md`, `verify-regression-r*.md`, `review-*-r*.md` and `failures.md`. None was recorded for this slice.
- R-067 evidence: `git diff --stat 16bf500~2 HEAD -- skills/sdlc/prompts/ste-style.md` printed nothing. The ste-check test is at `skills/sdlc/test/prompts.test.mjs:840`.
