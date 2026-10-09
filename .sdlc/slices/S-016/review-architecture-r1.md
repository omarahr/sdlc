# Architecture review S-016, round 1

Verdict: no blocking finding.

- Fit: derive, suggest and the regex literal builder are pure functions. They match the plan and the spec section 4 table.
- Non-blocking: the module-level `try/except ImportError` for the regex parser sits in the middle of branches.py. Move it to the import block at the top.
- Non-blocking: `_format_line` builds `labels` before the regex branch uses it. Move the line below that branch.
- Non-blocking: the regex literal builder (about 80 lines) relies on private `re._parser`. Move it to its own module if S-017 grows it.
- Non-blocking: the plan says derive does not call `validate_format`. The code calls it, after the round 0 fix. Update the plan text.
