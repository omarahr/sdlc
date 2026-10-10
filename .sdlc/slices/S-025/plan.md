# Plan S-025: _common.md Branch names section

## Approach
Add one bullet, "Branch names", to `skills/sdlc/prompts/_common.md`. Put it after the "Git" bullet. Copy its text from spec §8. The bullet states the rule (one format, `config.branchFormat`, never write a name by hand). It holds a table with the eight placeholders and the command for each. It ends with the `branches.py parse` sentence. The `<run branch>` row has two cases: the `config.runBranch` value in `stack` mode, and the last entry of `branches.py list --kind run` otherwise. The `<verify branch>` row names the `branch` input of the role's prompt and has no `branches.py name` call. A new test in `prompts.test.mjs` checks the section. No role file changes here: other slices replace the literals. The text must pass `ste-check.py`, so keep sentences short and wording constant.

## Files
- Modify `skills/sdlc/prompts/_common.md`: add the Branch names bullet and table.
- Modify `skills/sdlc/test/prompts.test.mjs`: add tests for the section.

## Tests
- R-062: `_common.md defines every branch placeholder` in `skills/sdlc/test/prompts.test.mjs`. It asserts a "Branch names" bullet exists. It asserts that `config.branchFormat` and `sdlc/{name}` appear in it. It asserts that all eight placeholders (`<run branch>`, `<slice branch>`, `<milestone branch>`, `<e2e branch>`, `<e2e area branch>`, `<state branch>`, `<attempt branch>`, `<verify branch>`) appear as table rows, each with a command cell. It asserts a `branches.py parse` mention.
- R-110: `the slice branch placeholder maps to branches.py name`. It asserts the `<slice branch>` row holds `branches.py name --kind slice --id <sliceId>`.
- R-089: `the run branch placeholder follows the git mode`. It asserts the `<run branch>` row holds `config.runBranch`, `stack`, and `branches.py list --kind run` with "last entry".
- R-090: `the verify branch placeholder comes from the prompt input`. It asserts the `<verify branch>` row holds "the `branch` input" and no `branches.py name --kind verify` text appears in `_common.md`.
- R-117: `the section tells the reader to classify a branch with parse`. It asserts the text `branches.py parse --repo . --branch <name>` and that a foreign branch prints `null`.
- Existing STE test in `prompts.test.mjs` covers the edited prompt.

## Steps
1. Write the failing tests in `prompts.test.mjs`. Run `npm test` and see them fail.
2. Add the bullet and table to `_common.md`, from spec §8.
3. Run `python3 skills/sdlc/ste-check.py` on `_common.md` (the way the existing STE test does) and fix long sentences.
4. Run `npm test` and see all tests pass.

## Risks
- The table text can fail the STE check (sentence length, "name" used as noun and verb). Mitigation: run the check, reword.
- A wrong command in the table misdirects every agent. Mitigation: tests compare each command to the argument names `branches.py` accepts (`--kind`, `--id`, `--area`, `--n`).
- The new text names `sdlc/{name}` literally. The planned "no literal branch" test for later slices exempts `{name}` forms, so no conflict arises here.
- The existing tests that read `_common.md` may match on its structure. Mitigation: run the full suite.

## Critique responses
None. This is revision 0 with no critiques.
