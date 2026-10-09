# Review: S-004, lens architecture, round 0

Diff reviewed: `git diff 177c66a...sdlc/S-004` (the slice commits on top of S-003).

## Scope

- `skills/sdlc/branches.py`: three new rows in `TAILS` (`run`, `milestone`, `e2e`).
- `skills/sdlc/test/branches.test.mjs`: T-025 to T-027.
- `.sdlc/DECISIONS.md`: ADR-20261009-045048-decision-judge-S-004-7815.

## Findings

None.

## Notes

- The rows match the spec section 1 table: `run-<n>`, `<milestoneId>`, `<milestoneId>-e2e`.
- The rows extend the one `TAILS` table from ADR-20261009-034220. `tail`, `name` and `cmd_name` do not change. The unit boundary holds.
- The row order follows the section 1 table order. The `verify` and `attempt` rows stay with S-005, as the plan says.
- The `slice` and `milestone` rows have the same builder. This is acceptable: each row names one kind, and a shared helper adds no clarity.
- The ADR records the known round-trip gap for a non-`M-` id and a negative `n`. S-007 owns the round-trip proof.
- The tests reuse the existing `run`, `oneObject`, `gitRepo`, `probe` and `CALL` helpers. They add no new helper.
