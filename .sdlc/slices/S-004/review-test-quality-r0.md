# Review: S-004, lens test-quality, round 0

Diff checked: `177c66a..sdlc/S-004` (commit `2b1960c`). The product change adds the `run`, `milestone` and `e2e` rows to `TAILS`. The test change adds T-025, T-026 and T-027 to `skills/sdlc/test/branches.test.mjs`.

## Checks

- Behavior: the tests assert the printed branch, the JSON keys, the exit code and the Fail message. They do not assert internals.
- Negative cases: a missing part and an empty milestone id fail through the API. A missing part fails through the CLI. `n=0` gives `run-0`.
- Determinism: no sleep, no network, no order dependence. Each test uses its own scratch repo.
- Comments: the diff adds no comments.
- Nested suite runs, timing asserts, verifier tests without promotion: none.

## Findings

1. Blocking. T-025 repeats coverage that a committed test already pins.
   The slice row (`--id S-001` gives `sdlc/S-001`) and the e2e-area row (`--id M-1 --area api` gives `sdlc/M-1-e2e-api`) run in a bare repo under the default format. They assert the same key set, `format` and `branch`. The test "name takes the format from the flag, then the config, then the default" (line 490) already makes these exact checks. tests.md also says that these two rows pass before the change.
   Fix: remove the slice and e2e-area rows from T-025. Rename it to "name prints the default branch for the run, milestone and e2e kinds". In tests.md, map R-004 and R-007 to the test at line 490.

2. Non-blocking. The `run_lower` case in T-027 does not prove lowercasing.
   The tail `run-1` is already lowercase, so the case passes with or without `{name:lower}` support. The `e2e_lower` case gives the real proof.
   Fix: remove `run_lower`, or keep it only as a format check and do not count it as a lowercase check.

3. Non-blocking. The empty-part cases are not the same for each new row.
   T-026 checks an empty id only for `milestone`. It does not check `tail("e2e", id="")` or `tail("run", n="")`. The shared loop in `tail` covers them now, but a per-row builder would not.
   Fix: add `e2e_empty_id` and `run_empty_n` to the T-026 table.

4. Non-blocking. T-027 makes a second copy of the CLI missing-part loop.
   The test "name without a required part exits 2 with one JSON error and no traceback" (line 474) has the same loop for slice and e2e-area. The new kinds are new inputs, so this is not duplicate coverage.
   Fix: add the run, milestone and e2e rows to the table at line 474. Keep only the API format cases in T-027.

## Verifier tests

The cli, contract and security tests under `verification/r0/tests/` pin no subtle behavior that a committed test lacks. The known gaps (a negative `n`, a hostile id) are ADR-20261009-045048 decisions, not behavior to pin. No promotion is necessary.

needsVerify: false. The slice is rated medium, so the verification battery already runs.
