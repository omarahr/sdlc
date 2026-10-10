# Judge report SC-M-1-017 (voter 0)

Verdict: refuted, spec-gap.

- The spec writes the state row as `^state-(\d{14})$`. It does not say which digits `\d` matches.
- R-106 and R-102 acceptance names only a 13-digit tail and `run-x`. Neither names non-ASCII digits.
- Reproduced: in Python, `re.match(r'^state-(\d{14})$', 'state-' + 14 Arabic-Indic digits)` matches. The code in `skills/sdlc/branches.py` PARSE_ROWS follows the spec text literally.
- The scenario text "per the spec's \d on ASCII timestamps" adds an ASCII rule that the spec does not state.
- Proposal P-20261010-M1-SC017 added to SPEC-PROPOSALS.md.
