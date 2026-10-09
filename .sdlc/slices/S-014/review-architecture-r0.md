# S-014 architecture review, round 0

No blocking finding. The slice fits the plan and the unit boundaries.

- Non-blocking: `_collect_rules` returns nested tuples such as `(None, (None, error))`. The `None` sample is a sentinel that `read_rules` must know. Return `(rules, error)` per forge call and let `read_rules` build `by_sample`.
- Non-blocking: `_collect_rules` and `read_rules` both loop over the error entries. One loop in `read_rules` can serve both forges.
- Non-blocking: `_run_forge_cli` sets `GH_PROMPT_DISABLED` for `glab` too. The variable is harmless there. Name it in a constant if a `glab` variable is needed later.
