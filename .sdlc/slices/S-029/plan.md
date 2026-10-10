# Plan: S-029 README documents the flag and the branch names

## Approach
This slice edits only `README.md` and adds tests. It follows spec section 9. Add the `--branch-format "<format>"` flag to the Usage table row, with one example. Add a short **Branch names** paragraph directly after the git-mode bullets. The paragraph lists the eight kinds with their tails, the default `sdlc/{name}`, the rules the pre-flight reads, and what happens on a mismatch. Add a `branchFormat` row under "What it writes to your repo". Add `branches.py` to the Development tree. `prompts/ste-style.md` stays unchanged. No prompt is edited, so `ste-check.py` has nothing new to lint; a test still runs it on the prompts directory to prove R-067. README prose is ordinary English, but the new text stays short and plain.

## Files
- Modify `README.md`: the Usage table row, the Branch names paragraph, the config table row and the Development tree line. Its responsibility is user documentation.
- Modify `skills/sdlc/test/prompts.test.mjs`: add README tests for R-066 and the unchanged-style test for R-067.

## Tests
All tests go in `skills/sdlc/test/prompts.test.mjs`, next to the existing README tests.
- T-R-066a (R-066): the Usage table row for `/sdlc <spec>` contains `[--branch-format "<format>"]`. A line below the table (the flag list) shows one example, `--branch-format "feature/PROJ-1-{name}"`.
- T-R-066b (R-066): a paragraph that starts with `**Branch names**` sits after the last `--git` bullet and before the next heading. It names all eight kinds (`run`, `slice`, `milestone`, `e2e`, `e2e-area`, `state`, `verify`, `attempt`), asserts each tail text (`run-<n>`, `<sliceId>-attempt-<n>` and the other six, as in TAILS of `branches.py`), the default `sdlc/{name}`, `{name:lower}`, GitLab push rule, GitHub ruleset, and the stop-before-launch outcome on a mismatch.
- T-R-066c (R-066): the "What it writes to your repo" section mentions `branchFormat` and `config.json`.
- T-R-066d (R-066): the Development tree block lists `branches.py`.
- R-067 (`prompts/ste-style.md` is unchanged): no new test. The existing test at `prompts.test.mjs` line 840 runs `ste-check.py` on the prompt files. It already guards the style rules. The verification step records one `git diff --stat main -- skills/sdlc/prompts/ste-style.md` with empty output as slice evidence.

## Steps
1. Write the tests first. They fail on the missing README text (T-R-066a to d).
2. Edit the Usage table row. Add `[--branch-format "<format>"]` after `[--commit-format "<format>"]`.
3. Add a bullet after the `--commit-format` bullet: `--branch-format "<format>"`, text with the `{name}` placeholder and the example `"feature/PROJ-1-{name}"`. Say what it does when absent.
4. Add the **Branch names** paragraph after the last git-mode and flag bullets, before "In every mode, ...". Content:
   - every branch the loop makes is named from one format with one `{name}` placeholder (or `{name:lower}`);
   - the default is `sdlc/{name}`;
   - the tails per kind: `run-<n>`, `<sliceId>`, `<milestoneId>`, `<milestoneId>-e2e`, `<milestoneId>-e2e-<area>`, `state-<timestamp>`, `<sliceId>-v<round>-<profile>-<part>`, `<sliceId>-attempt-<n>`;
   - before launch, the pre-flight reads the GitLab project push rule and the GitHub branch-name rulesets, and tests the names the mode pushes;
   - when the default fails a simple rule (starts with, ends with, contains), it derives a format and records it in `config.json`; otherwise it stops before launch and prints the rule, the failing sample and a suggested `--branch-format`;
   - a run in progress keeps its format; a different `--branch-format` on a resume is refused.
5. Leave the existing `sdlc/<id>-attempt-<n>` and `sdlc/run-<n>` sentences untouched. Optionally add one sentence: the pre-flight asks for a rename when the user's own branch is rejected by the rule.
6. Add the `branchFormat` row to the "What it writes to your repo" table: `.sdlc/config.json`, with `branchFormat` among its contents.
7. Add `branches.py       # names, parses and checks the loop's branches against the forge's rules` to the Development tree, after `state-write.py`.
8. Run `npm test`.

## Risks
- Existing README tests match exact phrases (`branch named \`sdlc/run-<n>\``). Mitigation: do not touch those sentences. Run the full suite.
- The README text may drift from `branches.py` tails. Mitigation: T-R-066b checks the kind names and each tail text.

## Critique responses
- spec-fidelity: the plan holds. Step 5 now leaves the existing sentences untouched and adds the optional rename sentence.
- architecture: T-R-067a is removed. The existing ste-check test covers R-067. Slice evidence records the one-time `git diff --stat main` for `ste-style.md`. T-R-066b now also asserts each tail text.
