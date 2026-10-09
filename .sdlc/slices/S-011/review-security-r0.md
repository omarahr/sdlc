# Security review S-011, round 0

Scope: `evaluate` and `regex_error` in `skills/sdlc/branches.py`.

No blocking finding.

- Non-blocking: a rule with a missing or non-string `pattern` raises `TypeError`. A regex pattern that Python rejects with `RecursionError` or `OverflowError` also raises. Rules come from the forge, so this is a trust boundary. S-012 must catch these errors, or `evaluate` must return `None` for them.
- Non-blocking: a regex with catastrophic backtracking can hang `evaluate`. The plan accepts this risk. Rule patterns come from the forge.
- The function reads no file, runs no process and builds no path. It has no injection or secret risk.
