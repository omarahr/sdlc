# Security review S-027c, round 0

The diff changes prompt text and one test file. It adds no code that runs.

- Each placeholder resolves through `branches.py` in `_common.md`. No user text reaches a shell.
- The force-push rule still limits the push to `<slice branch>`.
- Finding (non-blocking): `escalator.md` wraps a prose phrase in backticks as a branch name.

No blocking finding.
