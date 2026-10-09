# Review S-016, lens security, round 1

- Verdict: no blocking finding.
- Scope: the diff of `skills/sdlc/branches.py` from 03a9a0f to 35e4a69.

## Checked
- `derive` refuses regex, negated, several, zero and non-string rules. It never runs when a format is given.
- `cmd_preflight` now runs `validate_format` on the derived format. The brace and whitespace finding from round 0 is closed.
- A failed derivation raises no error. It keeps the first verdict and exits 1.
- `_regex_literal` wraps the parse in `try/except`. It checks each candidate with `evaluate` and `validate_format`.
- The code runs no shell and writes no file. It makes only read calls to the forge.

## Non-blocking
- `_shortest` multiplies the inner string by the minimum repeat count. A nested pattern such as `(a{9999}){9999}` can use gigabytes. Cap the built length and return `None` above it.
- The suggestion line prints rule text raw inside double quotes. A quote or `$(...)` pastes into a shell as a command. Rule text comes from the repo admin, so the risk is low. Quote the value with `shlex.quote`.
- A `FutureWarning` from the regex parser can reach stderr. Suppress warnings around the parse.
