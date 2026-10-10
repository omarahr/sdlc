# Review S-033, lens test-quality, round 0

Commit reviewed: 94e98a7.

## Blocking

- Comments added by the slice. The test file gains the banner line `// ---------- S-033: ... ----------`. `branch_run` in state-write.py gains a new docstring paragraph. Delete both.
- Missing test for the `isinstance(stored, str)` guard. The verifier test `.sdlc/slices/S-033/verification/r0/tests/contract-0/branch-run.verify-contract.test.mjs` (the example case at line 73) checks non-string `runBranch` values (5, null, list, object, true). No committed test covers them. Promote those cases into the `branch_run takes a run branch only when it parses to kind run` test, and add a promotion record to tests.md.

## Non-blocking

- The test `the prune treats only branches that parse to milestone...` overlaps the existing test at line 2017 and the test at line 2032. It adds foreign kinds only. Merge the extra branches into the existing test if the overlap grows.
- Seeds from the verifier: non-object config JSON raises AttributeError in `branch_run`. This exists on main. The janitor gives no note for git-unsafe formats.
