# Judge report: SC-M-1-012 (voter 0)

Verdict: refuted, spec-gap.

Reproduced in a scratch git repo, three runs.
- `name --kind slice --id 'S-001; touch /tmp/pwn-x'` exits 0 and prints `sdlc/S-001; touch /tmp/pwn-x`. git refuses it.
- `--id '../../etc/passwd'` exits 0 and prints `sdlc/../../etc/passwd`. git refuses it.
- No file is created and no shell runs the text. The output is one JSON object.

Spec check. R-017 makes `validate_format` test the format with the sample id S-001. The spec says exit 2 on bad input. It does not say `name` must check a part against `git check-ref-format`. Ids come from the ledger. The scenario expectation goes beyond the spec text.

A proposal is in `.sdlc/SPEC-PROPOSALS.md` (P-20261010-M1-SC012).
