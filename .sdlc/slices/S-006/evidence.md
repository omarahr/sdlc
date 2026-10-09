# S-006 evidence: lowercase tails and the cross-format round trip

The gate receipt covers commit `77fec02`. The full suite passed on that code: `npm test`, 68 s.

Files: `skills/sdlc/test/branches.test.mjs`. The slice adds tests only. No product code changes.

## R-011

Acceptance: `name("feature/PROJ-1-{name:lower}", "slice", id="S-001")` is `feature/PROJ-1-s-001`. The literal text keeps its case.

Tests:
- `skills/sdlc/test/branches.test.mjs :: T-R-011a name lowercases only the tail under {name:lower}`
- `.sdlc/slices/S-006/verification/r0/tests/cli-0/branches-lower.verify-cli.test.mjs:43`
- `.sdlc/slices/S-006/verification/r0/tests/cli-0/branches-lower.verify-cli.test.mjs:65`
- `.sdlc/slices/S-006/verification/r0/tests/cli-0/branches-lower.verify-cli.test.mjs:79`
- `.sdlc/slices/S-006/verification/r0/tests/cli-0/branches-lower.verify-cli.test.mjs:108`
- `.sdlc/slices/S-006/verification/r0/tests/contract-0/branch-format.verify-contract.test.mjs:37`
- `.sdlc/slices/S-006/verification/r0/tests/contract-0/branch-format.verify-contract.test.mjs:48`

ADRs: `ADR-20261009-164239-decision-judge-S-006-db35`

## R-068

Acceptance: `skills/sdlc/test/branches.test.mjs` is new. It runs `branches.py` through execFileSync and imports it in a probe for the Python API. Its round-trip test covers all eight kinds under the three formats.

Tests:
- `skills/sdlc/test/branches.test.mjs :: T-R-068a name and split round-trip every kind under the default, a prefixed and a lowercased format`
- `skills/sdlc/test/branches.test.mjs :: T-R-068b the CLI name matches the Python name for all 24 cases`
- `.sdlc/slices/S-006/verification/r0/tests/cli-0/branches-lower.verify-cli.test.mjs:43`
- `.sdlc/slices/S-006/verification/r0/tests/cli-0/branches-lower.verify-cli.test.mjs:87`
- `.sdlc/slices/S-006/verification/r0/tests/cli-0/branches-lower.verify-cli.test.mjs:124`
- `.sdlc/slices/S-006/verification/r0/tests/contract-0/branch-format.verify-contract.test.mjs:69`
- `.sdlc/slices/S-006/verification/r0/tests/contract-0/branch-format.verify-contract.test.mjs:140`

ADRs: `ADR-20261009-034229-decision-judge-S-002-b015`, `ADR-20261009-164238-decision-judge-S-006-a3a8`, `ADR-20261009-164239-decision-judge-S-006-db35`

## R-120

Acceptance: A source check over `sdlc-loop.js` and the skill scripts finds no `git push` or pull-request creation for a branch whose parsed kind is `e2e-area`. An e2e-area branch stays local.

Tests:
- `skills/sdlc/test/branches.test.mjs :: T-R-120a no push or pull-request site names an e2e-area branch`
- `skills/sdlc/test/branches.test.mjs :: T-R-120b a planted e2e-area push is caught`
- `.sdlc/slices/S-006/verification/r0/tests/contract-0/branch-format.verify-contract.test.mjs:95`
- `.sdlc/slices/S-006/verification/r0/tests/contract-0/branch-format.verify-contract.test.mjs:112`

ADRs: `ADR-20261009-164239-decision-judge-S-006-db35`, `ADR-20261009-164239-decision-judge-S-006-ec63`

## Open items

- R-068 stays `in_progress`. The tests pin the name and split half. The parse half closes in S-007, as ADR-20261009-164238-decision-judge-S-006-a3a8 says.
- The R-120 scan matches the kind name and the `-e2e-` tail. S-009 and S-021 to S-024 must tighten it to the parsed kind.
