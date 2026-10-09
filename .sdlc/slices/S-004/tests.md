# Tests: S-004

All tests are in `skills/sdlc/test/branches.test.mjs`.

- T-025 `name prints the default branch for the run, slice, milestone, e2e and e2e-area kinds` — R-003, R-004, R-005, R-006, R-007 — fails now: the run case exits 2 with "no branch name is defined for kind 'run'". The milestone and e2e cases fail for the same reason. The slice and e2e-area cases pass now, because S-003 added those rows.
- T-026 `tail builds the run, milestone and e2e tails and fails on a missing part` — R-003, R-005, R-006 — fails now: `TAILS` has no `run`, `milestone` or `e2e` row ("no branch name is defined for kind").
- T-027 `name for the run, milestone and e2e kinds follows a prefixed and a lowercased format and fails without its part` — R-003, R-005, R-006 — fails now: `name` raises "no branch name is defined for kind 'milestone'" for the prefixed format.
