# S-009 plan: parse precedence: state, verify, attempt, slice rows (revision 0)

## Approach
S-007 already added `PARSE_ROWS` with all eight rows, and S-008 pinned rows 1 to 4. This slice adds tests for rows 5 to 8: state, verify, attempt and slice. It changes no product code unless a new test fails.
Each test calls `parse` through the Python probe (`pyParse`, `parseOne`). One case per row also runs through the CLI (`cliParse`).
The tests pin the first-match order. A tail such as `S-001-v0-http-api-0` also fits the slice row, so it must go to verify. A tail such as `S-001-attempt-2` also fits the slice row, so it must go to attempt.
The tests also pin the row boundaries. A 13-digit or 15-digit state tail is null. A verify tail without a part digit is not a verify. An attempt tail without a number is not an attempt.
A failing new test means S-007 has a defect. The implementer then fixes `branches.py` by the smallest edit and says so in the evidence.

## Files
- Modify `skills/sdlc/test/branches.test.mjs`: add the tests below after T-R-105c and T-R-070a. About 110 lines. It reuses `pyParse`, `parseOne`, `cliParse` and the format constants.
- No other file changes. Product code stays as S-007 left it.

## Tests
All tests are in `skills/sdlc/test/branches.test.mjs`. Run them with `node --test skills/sdlc/test/branches.test.mjs`.
- T-R-106a (R-106) "row 5 state": `sdlc/state-20261008101500` gives kind `state`, `ts` `20261008101500` as a string, tail `state-20261008101500`, and no `id`. The CLI gives the same kind and `ts`.
- T-R-106b (R-106) "state needs exactly 14 digits": a 13-digit tail (`sdlc/state-2026100810150`) is null. A 15-digit tail is null. `sdlc/state-` and `sdlc/state-2026100810150x` are null. A tail with a letter among the digits is null.
- T-R-107a (R-107) "row 6 verify": `sdlc/S-001-v0-http-api-0` gives kind `verify`, `id` `S-001`, `round` 0, `profile` `http-api`, `part` 0, all numbers as integers. `sdlc/S-001-v12-cli-3` gives round 12, profile `cli`, part 3. The CLI gives the same parts.
- T-R-107b (R-107) "verify beats slice": `S-001-v0-http-api-0` is kind `verify`, not kind `slice`. `S-fix-M-1-2-v1-cli-0` is kind `verify` with `id` `S-fix-M-1-2`.
- T-R-107c (R-107) "verify boundaries": `sdlc/S-001-v0-http-api` (no part digit), `sdlc/S-001-v-cli-0` (no round) and `sdlc/S-001-v0--0` (empty profile) are not kind `verify`. The profile `a-b-c` keeps its full text, because the profile group is lazy and the part group takes the last digits.
- T-R-108a (R-108) "row 7 attempt": `sdlc/S-001-attempt-2` gives kind `attempt`, `id` `S-001`, `n` 2 as an integer. `sdlc/S-005b-attempt-10` gives `n` 10. The CLI gives the same parts.
- T-R-108b (R-108) "attempt beats slice": `S-001-attempt-2` is kind `attempt`, not kind `slice`. `sdlc/S-001-attempt-` and `sdlc/S-001-attempt-x` are not kind `attempt`.
- T-R-109a (R-109) "row 8 slice": `sdlc/S-001` gives kind `slice` and `id` `S-001`. `sdlc/S-fix-M-1-2` gives kind `slice` and `id` `S-fix-M-1-2`. `sdlc/S-005b` gives `id` `S-005b`. The CLI gives the same kind and `id`.
- T-R-109b (R-109) "slice boundaries": `sdlc/S-` , `sdlc/X-001`, `sdlc/s-001` (default format, case-sensitive) and `sdlc/S-001/x` are null. `sdlc/s-001` is kind `slice` under `{name:lower}`.
- T-R-106c to T-R-109c (R-106 to R-109) "rows 5 to 8 under prefixed and suffixed formats": the four rows classify the same under `feature/PROJ-1-{name}` and under `{name}-wip`. `S-001-v0-http-api-0-wip` under the suffix format gives kind `verify`, part 0.
- T-R-109d (R-109) "ledger ids on the last four rows": with `ids: ['S-001']`, a slice, an attempt and a verify branch of `S-001` each give `known` true. A slice branch of `S-002` gives `known` false. A state branch gives `known` null, because it has no `id`.

## Steps
1. Test-writer: add the tests above. Run them. They should pass at once, because S-007 built the rows. Any failure marks a defect in `parse`.
2. Show that each test can fail: in a scratch copy of `branches.py`, move the slice row before the verify row, and see T-R-107b fail. Change the state row to `\d+`, and see T-R-106b fail. Do not commit these edits.
3. If a test fails for a real defect, change `PARSE_ROWS` or `parse` in `branches.py` by the smallest edit. Do not weaken the test.
4. Run `node --test skills/sdlc/test/branches.test.mjs`, then `npm test`.

## Risks
- The new tests pass before any code change. Step 2 gives the proof that they can fail.
- Under the default format, an upper-case profile such as `S-001-v0-HTTP-0` fails the verify row, which needs `[a-z0-9-]`. It then falls to the slice row. Add no test for it: the loop names profiles in lower case, and the spec states the regex as it is.
- A slice id may contain `-v1-x-0`. Such a branch parses as verify. The spec accepts this order, so the tests state it only for the named examples.
- Unicode digits in `\d` stay as S-007 left them. No test pins them. The seeds from S-007 about trailing newlines and huge digit runs stay open and out of scope.

## Critique responses
- No critiques were given (revision 0).
