# S-008 plan: parse precedence: run, milestone, e2e, e2e-area rows (revision 0)

## Approach
S-007 already added `PARSE_ROWS` with all eight rows and the `parse` function. This slice adds the precedence tests for rows 1 to 4. It changes no product code unless a new test fails.
Each test uses `parse` through the Python probe and, for one case per row, through the CLI. The tests pin the first-match order: a tail that fits rows 2, 3 and 4 in turn goes to the first row that matches.
The tests also pin the row boundaries the spec names: `sdlc/run-x` is null, `M-2-e2e` is not a milestone, and `M-2-e2e-api` is not an e2e.
The test for R-070 asserts the three classifications the spec names: slice, e2e-area and verify with profile `http-api`.
A failing new test means S-007 has a defect. The implementer then fixes `branches.py` and says so in the evidence.

## Files
- Modify `skills/sdlc/test/branches.test.mjs`: add the tests below after T-R-024b. About 90 lines. It reuses `pyParse`, `cliParse` and the format constants.
- No other file changes. Product code stays as S-007 left it.

## Tests
All tests are in `skills/sdlc/test/branches.test.mjs`. Run them with `node --test skills/sdlc/test/branches.test.mjs`.
- T-R-102a (R-102) "row 1 run": `sdlc/run-3` gives kind `run`, `n` 3 as an integer, tail `run-3`, and no `id`. `sdlc/run-0` and `sdlc/run-12` give `n` 0 and 12. `sdlc/run-x`, `sdlc/run-`, `sdlc/run-3-x` and `sdlc/run--1` give null. The CLI gives the same kind and `n` for `sdlc/run-3`.
- T-R-103a (R-103) "row 2 milestone": `sdlc/M-2` gives kind `milestone` and `id` `M-2`. `sdlc/M-` and `sdlc/M-x` give null. `sdlc/M-2-e2e` is not kind `milestone`. `sdlc/m-2` is null under the default format and kind `milestone` under `{name:lower}`.
- T-R-104a (R-104) "row 3 e2e": `sdlc/M-2-e2e` gives kind `e2e` and `id` `M-2`. `sdlc/M-2-e2e-api` is not kind `e2e`. `sdlc/M-2-e2e-` gives null, because the e2e-area row needs one character in `(.+)` and the e2e row needs the tail to end at `e2e`.
- T-R-105a (R-105) "row 4 e2e-area": `sdlc/M-2-e2e-api-v2` gives kind `e2e-area`, `id` `M-2`, `area` `api-v2`. `sdlc/M-2-e2e-a` gives area `a`. `sdlc/M-2-e2e-e2e` gives area `e2e`. The CLI prints the same `id` and `area` for `sdlc/M-2-e2e-api-v2`.
- T-R-105b (R-105) "area with dashes stays whole": the area `v2-api-3` and the area `0` keep their full text.
- T-R-102b to T-R-105c (R-102 to R-105) "precedence and prefixed formats": rows 1 to 4 classify the same under `feature/PROJ-1-{name}`, and under `{name}-wip`. `M-2-e2e-api-wip` under the suffix format gives area `api`.
- T-R-070a (R-070) "parse keeps the table's precedence": `S-fix-M-1-2` is kind `slice` with that id. `M-1-e2e-api` is kind `e2e-area`. `S-001-v0-http-api-0` is kind `verify` with `profile` `http-api`, round 0, part 0. The test runs under the default format and asserts all three kinds in one call.

## Steps
1. Test-writer: add the tests above. Run them. They should pass at once, because S-007 built the rows. Any failure marks a defect in `parse`.
2. If a test fails, change `PARSE_ROWS` or `parse` in `branches.py` by the smallest edit. Do not weaken the test.
3. Run `node --test skills/sdlc/test/branches.test.mjs`, then `npm test`.

## Risks
- The new tests pass before any code change. The test-writer must show each test can fail: for example, swap rows 3 and 4 in a scratch copy and see T-R-104a fail. Do not commit that swap.
- Row 4 uses `(.+)`, which also matches `/`. The spec says areas never contain `/`, but it gives no check. ADR-20261009-173303-decision-judge-S-008-a88a keeps the S-007 behavior. Add no slash test.
- Unicode digits in `\d` stay as S-007 left them. No test pins them.

## Critique responses
- "Resolved by pending: pending": the input names no concrete defect. The one open question was the slash in an e2e-area tail. ADR-20261009-173303-decision-judge-S-008-a88a settles it, and the Risks section now cites that ADR.
