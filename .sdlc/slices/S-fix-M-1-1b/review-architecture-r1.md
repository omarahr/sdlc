# Review: architecture, round 1

The change fits the plan. `name` now checks its own output through `parse`. The check lives in two small helpers next to `name`. The CLI is unchanged. No blocking finding.

## Findings
- Non-blocking: `next-action.py` calls `branches._ascii_lower`, a private name. Rename it to `ascii_lower` or add a public wrapper.
- Non-blocking: `_check_round_trip` and `_same_part` sit between `name` and `PARSE_ROWS`, but they use `INTEGER_PARTS`, defined after them. This works at run time. Move `INTEGER_PARTS` above `name` for readability.
