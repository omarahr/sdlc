## Approach
Slice S-027c already swapped the branch literals in integrator.md, escalator.md and state-writer.md for placeholders. S-027b already moved attempt-branch discovery to `branches.py list --kind attempt`. No prompt text needs a change. This slice adds one named acceptance test per requirement to `skills/sdlc/test/prompts.test.mjs`. Each test reads the prompt file and checks its own acceptance sentence directly. The tests are stricter than T-R-063a: they check each file alone and check the attempt-branch discovery wording. If a test finds a gap, the slice fixes the prompt line. The slice makes no change to scripts.

## Files
- Modify `skills/sdlc/test/prompts.test.mjs`: add four tests (T-R-131, T-R-143, T-R-145, T-R-147) after T-R-080.
- Modify (only if a test fails) `skills/sdlc/prompts/integrator.md`, `skills/sdlc/prompts/escalator.md`, `skills/sdlc/prompts/state-writer.md`: replace any remaining branch literal with the placeholder.

## Tests
- T-R-131 (R-131), `skills/sdlc/test/prompts.test.mjs`: the integrator Clean up section holds the command `branches.py list --repo . --kind attempt`, filters to the slice id, and holds no `sdlc/<id>-attempt-*` glob and no `-attempt-*` text.
- T-R-143 (R-143), same file: integrator.md, after the `branches.py` output blocks are removed, holds no `sdlc/<id>`, `sdlc/run-<n>` or `sdlc/<id>-attempt-*`. It holds `<slice branch>` and `<run branch>`. It names attempt branches through `branches.py list --kind attempt`.
- T-R-145 (R-145), same file: escalator.md holds no `sdlc/` branch literal (scan regex of T-R-080). It holds `<slice branch>`, `<attempt branch>` and `<run branch>`.
- T-R-147 (R-147), same file: state-writer.md holds no `sdlc/` branch literal. It holds `<slice branch>` and `<attempt branch>`.
- Regression: the full `npm test` run stays green, including T-R-063a, T-R-063b, T-R-080 and T-R-093a to T-R-093c.

## Steps
1. Add the four tests. Reuse `sweepPromptText`, `stripBranchesOutput`, `LOOP_BRANCH_LITERAL` and `cleanUpSection`.
2. Run `npm test`. The tests should pass at once, because the prompts are already correct.
3. If a test fails, edit the named prompt line and run `npm test` again.
4. Do not weaken or skip any test.

## Risks
- The tests pass before any change, so they prove no new behavior. Mitigation: each test also checks a bad sample string, as T-R-080 does, so the scan is proven to detect a literal.
- A line in integrator.md that quotes a literal inside a `branches.py` output block is exempt from the scan. Mitigation: use `stripBranchesOutput` only, as the existing tests do.
- The plan touches one test file, about 60 lines. The slice stays small.

## Critique responses
None. There are no critiques in revision 0.
