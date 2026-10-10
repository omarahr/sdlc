# Architecture review S-020, round 2

The round 2 fixes keep the change inside the unit boundaries. `branchName` still sits in the config section. It uses a replacer function, so the tail goes in literally. The duplicate parse test is gone. The empty `branchFormat` case now sits in T-R-050a.

## Findings
- Non-blocking: T-R-051b still checks the default verify branch against `branches.py`. T-R-075a checks the same case. Drop the second half of T-R-051b.
- Non-blocking: `branchName` repeats the `{name}` and `{name:lower}` rule of `branches.py`. T-R-075a pins both together, so drift fails a test.
