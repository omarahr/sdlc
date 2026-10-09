# Architecture review S-016, round 2

Verdict: no blocking finding.

- Fit: derive, suggest and the regex literal builder stay pure. Preflight keeps the table in the spec.
- Round 2 only removed the duplicate test T-R-073a. This does not change the architecture.
- Non-blocking: the `try/except ImportError` for the regex parser still sits in the middle of branches.py. Move it to the import block.
- Non-blocking: `_format_line` still builds `labels` before the regex branch uses it. Move the line below that branch.
- Non-blocking: plan.md says preflight does not call `validate_format` on the derived format. The code calls it. Update the plan.
- Non-blocking: `_regex_literal` relies on private `re._parser`. Move it to its own module if S-017 grows it.
