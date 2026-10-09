# S-006 failures

No product change. All five new tests passed at once, because they characterize existing behavior.
The R-120 scan names the kind, not the parsed kind. S-009 and S-021 to S-024 must tighten it once `parse` exists.

## Fix round 1

- [review] T-R-011b duplicates an existing test. The test "name puts the tail in the placeholder and lowercases only the tail" already asserts the same result.
- Fix: delete T-R-011b from branches.test.mjs. Drop its entry from tests.md.
