# Review S-010, lens architecture, round 0

The change fits the plan. `list_kind` is small and `cmd_list` stays thin.
No blocking finding.

- `_git` duplicates the run-and-catch pattern of the earlier subprocess call near line 50. Non-blocking.
- `NUMERIC_SORT_KINDS` sits mid-file, away from `PARSE_ROWS`. Non-blocking.
