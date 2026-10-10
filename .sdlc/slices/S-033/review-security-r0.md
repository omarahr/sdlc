# Security review, S-033, round 0

Scope: the diff of `sdlc/S-033` against `sdlc/run-1`. It changes `state-write.py` and `scripts.test.mjs`.

## Result

No findings.

## Notes

- `branch_run` now takes a stored run branch only when `branch_kind(fmt, stored)` is `run`. This narrows trust in a value read from a committed config.
- The function checks that the stored value is a string before it parses the value. A non-string value returns an empty run.
- The branch name reaches git as one argument in a list. No shell parses it, so no injection path exists.
- The change adds no new I/O, no new secret handling and no new path handling.
