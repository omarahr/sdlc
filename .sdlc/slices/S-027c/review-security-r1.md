# Security review S-027c, round 1

The diff changes prompt text and tests. It adds no code that runs.

- Each placeholder resolves through `branches.py`, as `_common.md` defines. No user text reaches a shell.
- Every force-push rule still names one branch. `<slice branch>` and `<milestone branch>` stay the only force-push targets. The rules still forbid `<run branch>` and `<baseBranch>`.
- The `git branch -D <branch>` rule still acts on the verifier's own branch.
- The `git branch -d "$RUN_BRANCH"` rule quotes the variable.

No blocking finding.
