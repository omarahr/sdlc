# Failures S-016

- Edited T-R-044c and T-R-073a in branches.test.mjs. See the ADR in DECISIONS.md.
- The generic suggestion line reads --branch-format "<prefix>{name}<suffix>" so that it holds the placeholder (T-R-043d, T-R-043f, T-R-043h).

## Fix round 1

- Security verifier refuted VS-4: derive output was not checked with validate_format. Fixed in cmd_preflight; promoted the test as T-R-073b.
- Other seeds (non-string patterns in S-015 evaluate, regex repeat expansion, line breaks in suggestion) are outside the spec. Not changed.

## Fix round 2

- Review found T-R-073a duplicates T-R-042b, T-R-042c and T-R-042f. Deleted T-R-073a. The R-073 mapping in tests.md now points at those three tests.
