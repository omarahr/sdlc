# Review architecture r1

No blocking findings.

- The change stays inside `_run_forge_cli` and two small helpers. Signatures, flags and the note prefix stay the same.
- `_forge_failure` and `_bounded` have one job each. Both forges share them, so no code is duplicated.
- The round 1 fix restricts the HTTP match to ASCII digits. The promoted tests pin this.
- The spec still says `<stderr>`. Proposal P-20261010-172007 covers the drift.
- Non-blocking: the launch error text can still hold a path. `_bounded` limits it to one line of 200 characters.
