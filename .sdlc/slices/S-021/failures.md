# Failures S-021

- Plan deviation: merged heads are resolved through `parse` into a map keyed by ledger id, not through `branches.name`. A lowercased format keeps the prefix case, so a name lookup misses a lowercased head.
- Plan deviation: a state head that does not parse still counts when it holds `<prefix>state-` and the suffix. Existing tests use an eight-digit timestamp.

## Fix round 1

- Review: the security verifier tests TC-security-2 and TC-security-3 are keep-worthy and no committed test covers them.
- Fix: promote both into `next-action.test.mjs` and record them in tests.md.
