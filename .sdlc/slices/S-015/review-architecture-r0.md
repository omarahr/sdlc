# Review S-015, lens architecture, round 0

The slice fits the spec: `verdict` is a pure helper and `cmd_preflight` calls it once.
Non-blocking findings:
- `verdict` holds a dead branch: `if rules is not None and not rules: rules = []` changes nothing. Delete it.
- `cmd_preflight` builds the result with `_echo`, then `result.update(verdict(...))` overwrites the key `ok`. Build the output in one place so S-016 can reuse it.
- `read_rules` now swallows `Fail` from a broken config. `_config_format` and `_config_value` read the same file. Keep one reader.
No blocking finding.
