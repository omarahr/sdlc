# Plan S-028

## Approach
The tests T-R-062, T-R-064a, T-R-046a and T-R-080 already cover parts of R-081. No single test makes the exact assertion set the spec names. Add one test to `skills/sdlc/test/prompts.test.mjs` with the spec's name. It asserts the eight placeholders in `_common.md`, the `branchFormat` match in `env-detector.md` and the two `SKILL.md` matches. R-082 needs no new code. The test at line 837 runs `ste-check.py` over every `.md` file in the prompts directory, so it covers every edited prompt. Run it and record the result as evidence. Change no product file.

## Files
- Modify `skills/sdlc/test/prompts.test.mjs`: add the R-081 test next to T-R-062. Use the existing `commonBranchNames` helper and `promptText`.

## Tests
- R-081, T-R-081, `skills/sdlc/test/prompts.test.mjs`, test `_common.md defines every branch placeholder and env-detector records the format`. It asserts:
  - the Branch names bullet in `_common.md` holds all eight placeholders: `<run branch>`, `<slice branch>`, `<milestone branch>`, `<e2e branch>`, `<e2e area branch>`, `<state branch>`, `<attempt branch>`, `<verify branch>`;
  - `env-detector.md` matches `/branchFormat/`;
  - `SKILL.md` matches `/--branch-format/` and `/branches\.py" preflight/`.
- R-082, existing test `every prompt file passes the STE linter, with no allowlist and no skips` (line 837). It lints all prompt files with `ste-check.py`. Run it and cite the passing result. No new test is needed.

## Steps
1. Write the R-081 test. Confirm it passes against the current prompts.
2. Check that the test fails when one placeholder is removed from a temporary copy of the text, or reason from the `includes` assertions. Do not edit a prompt for this.
3. Run `npm test`. Confirm the STE test passes (R-082).

## Risks
- The test duplicates T-R-062 in part. This is by design: the spec names this test.
- A later prompt edit can break the STE test. The test then fails in the same run.

## Critique responses
- None. The input holds no critiques.
