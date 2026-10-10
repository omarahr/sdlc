# Security review, S-017, round 1

Scope: the diff of `skills/sdlc/branches.py` and `skills/sdlc/test/branches.test.mjs`.

- The code change adds type guards for rule patterns that are not strings.
- A non-string pattern now gives an "unevaluated" result and a note. It no longer raises an exception.
- The guards add no new input path, no shell call, no file access and no secret handling.
- The regex path keeps its existing compile check. The change adds no new regex execution.
- The tests use shims. They use no network.

No finding.
