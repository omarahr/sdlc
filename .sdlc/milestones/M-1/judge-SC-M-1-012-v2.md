# Judge report: SC-M-1-012, voter 2

Verdict: not refuted. This is a product bug.

Reproduction (scratch repo, three own calls):
- `branches.py name --repo R --kind slice --id 'S-001; touch /tmp/pwn-x'` exits 0 and prints `sdlc/S-001; touch /tmp/pwn-x`.
- The same call with id `S-001<newline>S-002` exits 0 and prints a branch with a newline.
- The same call with id `../../etc/passwd` exits 0 and prints `sdlc/../../etc/passwd`.
- `git check-ref-format --branch` refuses the first and third branch (exit 128).

Cause: `cmd_name` never runs `ref_format_error` on the built branch. `validate_format` checks only the sample id `S-001`.

The scenario expectation matches the source: the output must be an error or a valid branch.
