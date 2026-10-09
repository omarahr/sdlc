# S-006 tests

All tests are in `skills/sdlc/test/branches.test.mjs`. Every test is a characterization test. The behavior exists now, so no test fails.

- T-R-011a — R-011 — characterization: passes now, pins lowercase of the tail only
- T-R-068a — R-068 — characterization: passes now, pins the `name` and `split` round-trip for 24 cases; the `parse` half joins in S-007
- T-R-068b — R-068 — characterization: passes now, pins CLI and Python agreement for 24 cases
- T-R-120a — R-120 — characterization: passes now, no push site names an e2e-area branch
- T-R-120b — R-120 — characterization: passes now, proves the scanner catches a planted e2e-area push
