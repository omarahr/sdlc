# Judge report SC-M-1-017 (voter 1)

Verdict: refuted, spec-gap.

- The spec writes the state row as `^state-(\d{14})$`. It does not name a digit set.
- R-106 and R-102 acceptance texts do not cover non-ASCII digits.
- I reproduced the result. parse('sdlc/{name}', 'sdlc/state-' + 14 Arabic-Indic digits) returns kind state with ts set to those digits.
- The same happens for 'sdlc/run-' plus an Arabic-Indic digit: kind run, n 7.
- Python `\d` matches Unicode digits in str patterns. The code follows the written pattern.
- Branch names from format() hold only ASCII digits.
- The proposal P-20261010-M1-SC017 in SPEC-PROPOSALS.md already covers this gap. I added nothing.
