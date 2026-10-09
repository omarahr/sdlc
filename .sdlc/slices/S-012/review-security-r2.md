# S-012 review security r2

Verdict: no blocking finding.

- The git call uses an argument list, with no shell. A sample that starts with a dash gives a failed verdict.
- Bad patterns (syntax, nesting depth, repeat count) give an unevaluated sample. judge raises no error. Checked by hand.
- All 99 tests in branches.test.mjs pass.
- Non-blocking: the sample `@` passes the ref check, because `--branch` expands `@`. Run check-ref-format without `--branch`, or reject `@`, in a later slice.
- Non-blocking: a catastrophic pattern such as `(a+)+$` can run long. The spec accepts this.
