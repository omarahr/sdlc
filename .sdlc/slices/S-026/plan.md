# Plan S-026: _common.md completes the placeholder table

## Approach
Slice S-025 already added the Branch names bullet to `skills/sdlc/prompts/_common.md`. It holds all eight table rows, copied from spec section 8. The rows for the milestone, e2e, e2e area, state and attempt placeholders match the spec text word for word. This slice proves those five rows with tests, one per requirement. The tests follow the style of the R-110 and R-089 tests in `prompts.test.mjs`. They use the existing `commonBranchNames` and `branchRow` helpers. If a test shows a row that differs from the spec, fix that row in `_common.md`. Otherwise `_common.md` stays as it is. Keep the text inside the STE check.

## Files
- Modify `skills/sdlc/test/prompts.test.mjs`: add five tests, one per requirement, after the R-089 test.
- Verify, and change only if a test fails: `skills/sdlc/prompts/_common.md`, the five rows.

## Tests
- R-111: `T-R-111: the milestone branch placeholder maps to branches.py name` in `skills/sdlc/test/prompts.test.mjs`. It asserts the `<milestone branch>` row holds `branches.py name --kind milestone --id <milestoneId>`.
- R-112: `T-R-112: the e2e branch placeholder maps to branches.py name`. It asserts the `<e2e branch>` row holds `branches.py name --kind e2e --id <milestoneId>`. It asserts that the row holds no `--area` argument.
- R-113: `T-R-113: the e2e area branch placeholder maps to branches.py name`. It asserts the `<e2e area branch>` row holds `branches.py name --kind e2e-area --id <milestoneId> --area <areaId>`.
- R-114: `T-R-114: the state branch placeholder takes no id and makes the timestamp`. It asserts the `<state branch>` row holds `branches.py name --kind state`. It asserts the row holds no `--id` argument. It asserts the row says it makes the timestamp.
- R-115: `T-R-115: the attempt branch placeholder maps to branches.py name`. It asserts the `<attempt branch>` row holds `branches.py name --kind attempt --id <sliceId> --n <n>`.
- Existing test `every name command in the _common.md branch table runs against branches.py` already runs these commands against `branches.py`. It stays unchanged.

## Steps
1. Add the five tests. Run `npm test` and check which tests fail.
2. If a row differs from the spec, fix the row in `_common.md`. Run the STE check on the file.
3. Run `npm test` and see all tests pass.

## Risks
- The rows may already pass, so the new tests do not fail first. Mitigation: record this in the notes. Check each assertion against a wrong row by hand once.
- A row edit could break the STE check or the table-run test. Mitigation: run the full suite.

## Critique responses
None. This is revision 0 with no critiques.
