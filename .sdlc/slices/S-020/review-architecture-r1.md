# Architecture review S-020, round 1

The change fits the spec. `branchName` and `BRANCH_FORMAT` sit in the config section beside `REPO`. `verifyPhase` and the env-detector call use them. The replacer function inserts the tail literally.

## Findings
- Non-blocking: T-R-051b checks the default verify branch against `branches.py`. T-R-075a checks the same case. Drop the second half of T-R-051b.
- Non-blocking: `branchName` repeats the `{name}` and `{name:lower}` rule of `branches.py`. T-R-075a pins both together, so drift fails a test.
