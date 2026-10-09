# S-005a review: test-quality, round 0

Diff: `git diff sdlc/run-1...sdlc/S-005a` (commits 7b83b92 and de9cf46). Files: `skills/sdlc/branches.py`, `skills/sdlc/test/branches.test.mjs`.

Run: `node --test skills/sdlc/test/branches.test.mjs` gives 33 pass, 0 fail.

## Checks
- The tests assert behavior: exact branch strings, exit codes, JSON errors that name the part. They do not inspect `TAILS`.
- Negative cases: the tail test covers each missing verify part, an empty profile, and each missing attempt part. The CLI test covers verify without `--profile` and attempt without `--n`.
- Determinism: no sleeps and no network. The two clock tests check a range between two UTC reads. A second boundary does not break them.
- Names: each test name matches what it asserts.
- Comments: the diff adds no comments.
- Nested suite runs, timing asserts, unpromoted verifier tests: none.
- Verifier tests: no keep-worthy test. The loop-builder parity check in cli-0 and contract-0 is transitional, because the spec moves the loop's branch builder in a later slice.

## Findings (non-blocking)
1. The new CLI state test overlaps two existing tests. "the state tail is the current UTC time" pins the UTC window and TZ. The `name` output test pins the CLI shape `sdlc/state-<14 digits>`. The new test adds only the UTC window through the CLI. Fold the range check into the existing CLI state assertion in a later change.
2. The CLI missing-part test for verify covers only `--profile`. Missing `--id`, `--round` and `--part` are pinned only through the Python API. Add CLI rows for them when the next slice touches this test.

## Seeds
- The verifiers found that hostile `--profile` and `--id` values give ref-unsafe names. Negative integer parts give names like `S-001-attempt--1`. No requirement in this slice covers them.
