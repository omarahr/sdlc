# Plan S-036

## Approach
S-027c already swept the four prompts. Today `scenario-runner.md`, `env-detector.md`, `milestone-writer.md` and `e2e-harness.md` hold no `sdlc/` branch literal, and the placeholders are in place. Only the format default `sdlc/{name}` remains in `env-detector.md`; the scan allows it. This slice adds one pinned test per requirement, so each acceptance has its own test id. The tests read the prompt text and fail if a literal returns or a placeholder leaves. The test code reuses `sweepPromptText`, `stripBranchesOutput` and `LOOP_BRANCH_LITERAL` from `prompts.test.mjs`. If a test finds a gap, the slice edits that prompt line with the placeholder from `_common.md`. No product script changes.

## Files
- Modify `skills/sdlc/test/prompts.test.mjs`: add four tests after T-R-063b, one for each requirement.
- Modify only if a new test fails: `skills/sdlc/prompts/scenario-runner.md`, `env-detector.md`, `milestone-writer.md`, `e2e-harness.md`. Each edit swaps one literal for its placeholder.

## Tests
- T-R-132 (R-132), `prompts.test.mjs`: `scenario-runner.md` contains the string `git worktree add "$TMPDIR/sdlc-<milestoneId>-<areaId>" -b <e2e area branch> <e2e branch>`. It has no `sdlc/` loop literal after `stripBranchesOutput`.
- T-R-133 (R-133), `prompts.test.mjs`: `env-detector.md` has at least three `<run branch>` occurrences. It holds the phrase "a branch that parses as kind `run`". It holds no `sdlc/run-` text, and no glob `sdlc/run-*`.
- T-R-144 (R-144), `prompts.test.mjs`: `milestone-writer.md` has no loop literal. It holds `<e2e area branch>`, `<e2e branch>` and `<milestone branch>`. It has no `sdlc/M-`, `sdlc/<id>-e2e` text.
- T-R-148 (R-148), `prompts.test.mjs`: `e2e-harness.md` has no loop literal. It holds `<e2e branch>` and `<milestone branch>`.
- Each test also feeds a bad sample string to `LOOP_BRANCH_LITERAL` (for example `git checkout sdlc/M-1`) and asserts a match, to prove the guard can fail.

## Steps
1. Add the four tests. Run `node --test skills/sdlc/test/prompts.test.mjs` and confirm they pass against the current prompts.
2. Mutate one prompt line in a scratch copy of the text inside a test fixture (not on disk) to confirm each guard fails on a literal.
3. If any real prompt fails a test, edit that line to use the placeholder.
4. Run `npm test` in full.

## Risks
- The four requirements already hold. The slice adds only tests. A reviewer may see it as a no-op; the tests give each requirement its own id.
- The `sdlc/{name}` default in `env-detector.md` is allowed by the scan regex (ADR S-027c). The tests must not forbid it.

## Critique responses
- No critiques this revision.
