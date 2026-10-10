# Judge: SC-M-1-078 (voter 0)

Verdict: refuted. Class: test-bug.

The spec (section 3 and 4, R-037, R-040, R-043) requires that a working sample fails with rule `git check-ref-format` when git rejects it. It does not require that every hostile value gives a failing working sample. It does not limit how often a name appears in the output.

Reproduction on a scratch repo with secrets in the environment:
- `--branch="a b"` and `--branch=--help`: exit 1, working sample fails with `git check-ref-format`, the suggestion names the rename. Correct.
- `--branch -x` (separate argument): exit 2, one JSON error object, no git usage text. Argparse rejects the value. The spec does not define this input.
- `--branch ""`: ok true, no working sample. An earlier verify test fixes this behavior on purpose.
- `--branch @`: git accepts it, so the sample is not a failure.
- No secret leak, no Traceback, state unchanged.

The "at most once" limit is not in the spec. The args echo, the sample name and the suggestion each carry the name by design.
