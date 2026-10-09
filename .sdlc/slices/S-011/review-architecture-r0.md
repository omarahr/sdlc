# Review S-011, lens architecture, round 0

The change fits the plan and the spec. `evaluate` computes the raw result first, then flips it. `regex_error` stays separate for S-012.
No blocking finding.

- `evaluate` and `regex_error` sit between `validate_format` and `_state_tail`. They belong to the rule section, not the name section. Non-blocking.
- `regex_error` and `_raw_result` each compile the same pattern. Non-blocking.
- A rule with a non-string `pattern` raises `TypeError`. Rules come from `read_rules`, so this is unlikely. Non-blocking.
