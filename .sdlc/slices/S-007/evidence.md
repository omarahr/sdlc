# Evidence: S-007 parse classifies a branch tail

Code: `skills/sdlc/branches.py`. Tests: `skills/sdlc/test/branches.test.mjs`.
The gate receipt covers commit 1d38bb4. The full suite passed on this code.

| Requirement | Tests |
|---|---|
| R-021 | T-R-021a, T-R-021b |
| R-022 | T-R-022a, T-R-022b |
| R-023 | T-R-023a, T-R-023b |
| R-024 | T-R-024a, T-R-024b |
| R-069 | T-R-069a |
| R-068 | T-R-068a closes with its parse assertion (see ADR-20261009-164238-decision-judge-S-006-a3a8) |

The verifiers ran contract, cli and security cases in round 0. All cases passed.
