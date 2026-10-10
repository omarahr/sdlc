# Plan S-037

## Approach
The prompt text for this slice is already in place. The S-027 slices rewrote `state-schema.md`, `commit-state.md` and the 13 slice prompts. I checked the files: none holds a loop branch literal, and each of the 13 holds `<slice branch>`. So this slice adds the tests that prove each acceptance exactly, and it changes a prompt only where a test finds a gap. The sweep tests (T-R-063a, T-R-080) check the files broadly. They do not name the four acceptances. The new tests read the prompt files and assert each acceptance clause. A fresh implementer must run the new tests first. If one fails, the implementer fixes the prompt text with the smallest edit and keeps the prompts STE-clean (`ste-check.py`).

## Files
- Modify `skills/sdlc/test/prompts.test.mjs`: add four tests, one per requirement. They reuse `sweepPromptText`, `stripBranchesOutput` and `LOOP_BRANCH_LITERAL`.
- Modify (only if a new test fails) `skills/sdlc/prompts/state-schema.md`, `commit-state.md`, or one of the 13 slice prompts: replace a literal with its placeholder.

## Tests
All in `skills/sdlc/test/prompts.test.mjs`.
- T-R-134 (R-134): `state-schema.md` holds the text "the run branch (`run` kind under `config.branchFormat`)" in the `runBranch` bullet. The `branch` field line says "the slice branch under `config.branchFormat`". The file holds no `sdlc/S-001` and no `sdlc/run-<n>`.
- T-R-135 (R-135): `commit-state.md` holds `<slice branch>`, `<run branch>`, `<milestone branch>` and `<state branch>`. It holds no `date -u` and no `sdlc/state-`. `_common.md` maps `<state branch>` to `branches.py name --kind state`.
- T-R-146 (R-146): for each of the 13 listed files, the text (without `branches.py` output blocks) holds no `sdlc/<id>` and no `LOOP_BRANCH_LITERAL` match, and holds `<slice branch>`. The test lists the 13 names itself, so a dropped file fails it.
- T-R-149 (R-149): `state-schema.md` holds no `sdlc/S-001`, `sdlc/run-<n>` or `sdlc/M-<n>`. The `stack` bullet describes the milestone branch by kind: it matches `/milestone/` and not the literal. Only the `branchFormat` default `sdlc/{name}` may remain.

## Steps
1. Add the four tests to `prompts.test.mjs`. Run `npm test` in `skills/sdlc` for that file.
2. If a test fails, make the smallest prompt edit that satisfies the acceptance. Run `ste-check.py` on the edited prompt.
3. Run the full suite.

## Risks
- The work may already be complete, so the tests may pass on first run. That is expected. Make each test fail against the pre-S-027c text to show it is not vacuous: check it by reverting one placeholder in a scratch copy, not in the repo.
- `commit-state.md` does not spell the `branches.py` command. It reaches it through `_common.md`. The test asserts that link, not a duplicate sentence.
- Medium risk: a prompt edit could change agent behavior. The plan edits no prompt unless a test demands it.

## Critique responses
None. No critiques were given.
