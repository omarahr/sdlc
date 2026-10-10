# Plan S-027a: env-detector, state-schema and slicer name branches through the format

## Approach
This slice edits three prompt files and adds tests to `prompts.test.mjs`. `env-detector.md` gets the `branchFormat` input and the config line from R-064, copied word for word. The line does not read the forge's branch-name rules, and the commit-format step keeps reading `commit_message_regex`. `state-schema.md` gets a `branchFormat` entry in the `config.json` block with the spec text. It also describes the slice `branch` field and `runBranch` through the format, and no longer spells `sdlc/run-<n>` or `sdlc/S-001`. `slicer.md` writes `branch: <slice branch>`. The driver, the loop script and `_common.md` already pass and define `branchFormat` and the placeholders (S-019, S-020, S-025, S-026), so no other file changes. Every edit stays in STE and passes `ste-check.py`. The rest of the literal sweep belongs to S-027c.

## Files
- Modify `skills/sdlc/prompts/env-detector.md`: add `branchFormat` to the Inputs line, beside `commitFormat`, and a step that writes `config.branchFormat`. The step holds this sentence, unchanged from R-064: "`branchFormat`: the `branchFormat` input when it is not null; else an existing `config.branchFormat`; else `sdlc/{name}`. The driver's pre-flight derived or checked it; do not read the forge's rules here." I checked this exact sentence with `ste-check.py` and it passes. If a later edit makes it fail, record an ADR, because R-064 quotes it. The `config.json` write step keeps an existing `branchFormat`.
- Modify `skills/sdlc/prompts/state-schema.md`: add `"branchFormat": "sdlc/{name}"` to the config.json block and its description bullet. Rewrite the `runBranch` bullet and the slice `branch` field description. Replace the `"branch": "sdlc/S-001"` example value with `"<slice branch>"`. Replace the `sdlc/run-<n>` mention in the `direct` bullet with "the run branch".
- Modify `skills/sdlc/prompts/slicer.md`: change `branch: sdlc/<id>` to `branch: <slice branch>`. Add no other text about the field. The script scan test proves that no script reads it.
- Modify `skills/sdlc/test/prompts.test.mjs`: add the tests below.
- Do not change the `sdlc/run-<n>` literals in the other env-detector steps (stack-mode `runBranch` step 1 to 3). Row `env-detector.md` of the spec table belongs to S-027c, together with the existing tests that read those literals.

## Tests
- R-064: `T-R-064a: env-detector takes the branchFormat input and writes the quoted line` in `skills/sdlc/test/prompts.test.mjs`. It asserts the Inputs line names `branchFormat` and `commitFormat`. It asserts the text holds this exact sentence: "`branchFormat`: the `branchFormat` input when it is not null; else an existing `config.branchFormat`; else `sdlc/{name}`. The driver's pre-flight derived or checked it; do not read the forge's rules here."
- R-064: `T-R-064b: env-detector does not read the forge's branch-name rules`. It asserts the exact sentence above holds "do not read the forge's rules here". It asserts the text holds no `branch_name_regex` and no `branch name rule`. It asserts `commit_message_regex` is still present in the commit-format step.
- R-002 clause 2 (this slice carries R-002 beside R-064, per ADR-20261010-064552-decision-judge-S-027a-9642): `T-R-002c: env-detector writes the default format on a fresh run`. It asserts the `sdlc/{name}` fallback is in the same rule. The S-003 tests stay as clause 1 evidence.
- R-065: `T-R-065a: state-schema documents branchFormat in config.json`. It asserts the config block holds `"branchFormat": "sdlc/{name}"`. It asserts the description holds the spec text: "the format of every branch the loop makes", "`{name:lower}`", "the loop's own tail per branch kind (`branches.py`)", "Set at the first launch; a resume keeps it."
- R-065: `T-R-065b: state-schema describes the slice branch and runBranch through the format`. It asserts the text holds "the slice branch under `config.branchFormat`" and "the run branch (`run` kind under `config.branchFormat`)". It asserts the config section holds no `sdlc/run-` and the slice example holds no `sdlc/S-001`.
- R-061: `T-R-061: slicer writes the slice branch through the placeholder`. It asserts `slicer.md` holds `branch: <slice branch>` and no `branch: sdlc/`. A second test, `T-R-061b: no script reads a slice's branch field`, is a behavior test. It copies a fixture `slices.json` twice: once with every `branch` value garbage and once with the field removed. It runs `next-action.py`, `state-write.py` (a status update) and `janitor.py` on both copies, and on the original. It asserts the outputs and the resulting state are the same, apart from the `branch` field itself. `branches.py` and `sdlc-loop.js` take no slices data, so a text scan of them would flag only false hits (`e["branch"]` on list entries, `ns.branch`, `self.branch`). The test adds a source scan of `sdlc-loop.js` only for `s.branch` and `slice.branch` on slices loaded from `slices.json`. A planted-read check proves the behavior test can fail (see Steps).
- Existing tests stay unchanged: `config.json documents runBranch` (still finds `"runBranch": ""`), the env-detector run-branch tests (their literals stay until S-027c), and the STE test for every prompt file.

## Steps
1. Add the tests and run `npm test`. Confirm the new tests fail for the right reason.
2. Edit `env-detector.md`: Inputs line, then a new step 4 "Branch format" (renumber the later steps and the step 6 write-config sentence). Keep the text short and in STE.
3. Edit `state-schema.md` as listed in Files.
4. Edit `slicer.md`.
5. Run `python3 skills/sdlc/ste-check.py` on the three prompts, then `npm test` in full.
6. Hand-check one wrong text for each assertion to see the test fail: put `branch: sdlc/<id>` back in the slicer, and change one word of the quoted env-detector sentence.
7. Planted-read check: add a temporary read of `slice["branch"]` to `next-action.py`. Confirm `T-R-061b` fails. Remove the read and confirm it passes.

## Risks
- The state-writer must add R-002 to the S-027a requirements before the tests phase. If it does not, T-R-002c has no requirement to close. R-002 in both S-003 and S-027a is intended.
- Renumbering env-detector steps may break an existing test that cites a step number. Mitigation: grep the tests for "step" before the edit, and run the full suite.
- The env-detector table row of the spec also lists `sdlc/run-<n>` literals. Replacing only the input and config line leaves them in this slice. Mitigation: S-027c owns them (see its R-063 scan).
- A read of a slice's branch field can hide in a form a source scan misses. Mitigation: the behavior test compares outputs on garbage and missing values, and the planted-read check proves it can fail.

## Critique responses
- Resolved by recorded-in-DECISIONS.md, Option 1 (ADR-20261010-064552-decision-judge-S-027a-9642): S-027a carries R-002 beside R-064. The Tests section names T-R-002c as its evidence, and Risks asks the state-writer to add R-002 to the slice. The ambiguity is closed.
- Resolved by pending, "pending": no decision text came with this critique. The plan keeps the choice in ADR-20261010-144554-decision-judge-S-027a-c3e7 (state-schema example value `<slice branch>`, Option 1). No other open question remains.
- [spec-fidelity] Issue 1: Files now say the env-detector line is the R-064 sentence, unchanged, and that it passes `ste-check.py`. T-R-064a and T-R-064b assert the exact sentence, including "do not read the forge's rules here", and the Inputs line names `branchFormat` beside `commitFormat`.
- [spec-fidelity] Issue 2: the slicer.md line about scripts is dropped. Steps 6 and 7 hold the hand-check and the planted-read check. The state-writer must add R-002 to S-027a before the tests phase (see Risks).
- [architecture]: the text scan is replaced by a behavior test (T-R-061b) on garbage and missing `branch` values. It avoids the false hits in `branches.py` and `next-action.py`, and Step 7 plants a read to prove the test can fail.
