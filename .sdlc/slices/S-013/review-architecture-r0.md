# S-013 architecture review, round 0

Verdict: clean. No blocking finding.

- `read_rules` fits the plan. It adds no command, and S-014 and S-015 can extend it.
- `_config_value` removes duplication. `_config_format` keeps one config error path.
- `make_rule` and `RULE_KEYS` give every rule the same five keys.
- `by_sample` keeps each rule with its own sample.

Non-blocking: the `unchecked` flag is true for both "forge not github" and "gh failed". S-014 should tell the two apart in its notes.
