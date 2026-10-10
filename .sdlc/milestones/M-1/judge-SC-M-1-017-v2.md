# Judge report SC-M-1-017 (voter 2)

Verdict: refuted, spec-gap.

- The spec writes the state row as `^state-(\d{14})$`. It names no digit set.
- R-106 and R-102 acceptance name only a 13-digit tail and `run-x`.
- Reproduced: parse('sdlc/{name}', 'sdlc/state-' plus 14 Arabic-Indic digits) returns kind state. Python `\d` matches Unicode digits.
- The code follows the spec text literally. The ASCII rule comes from the scenario, not the spec.
- Proposal P-20261010-M1-SC017 in SPEC-PROPOSALS.md already covers this.
