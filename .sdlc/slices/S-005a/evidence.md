# S-005a evidence: tails for state, verify and attempt

The gate receipt covers commit `b9e547f`. The full suite passed on that code: `npm test`, 78 s.

Files: `skills/sdlc/branches.py`, `skills/sdlc/test/branches.test.mjs`.

## R-008

Acceptance: `branches.py name --kind state` prints `sdlc/state-` plus 14 UTC digits in `%Y%m%d%H%M%S` order. An explicit ts part is used as given.

Tests:
- `skills/sdlc/test/branches.test.mjs: T-R-008a name --kind state prints sdlc/state- and the current UTC time`
- `skills/sdlc/test/branches.test.mjs: T-R-008b an explicit state ts is used as given under a prefixed format, and an empty ts generates one`
- `.sdlc/slices/S-005a/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:47`
- `.sdlc/slices/S-005a/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:65`
- `.sdlc/slices/S-005a/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:267`
- `.sdlc/slices/S-005a/verification/r0/tests/contract-0/tails.verify-contract.test.mjs:118`
- `.sdlc/slices/S-005a/verification/r0/tests/contract-0/tails.verify-contract.test.mjs:142`
- `.sdlc/slices/S-005a/verification/r0/tests/contract-0/tails.verify-contract.test.mjs:166`
- `.sdlc/slices/S-005a/verification/r0/tests/contract-0/tails.verify-contract.test.mjs:184`
- `.sdlc/slices/S-005a/verification/r0/tests/contract-0/tails.verify-contract.test.mjs:193`
- `.sdlc/slices/S-005a/verification/r0/tests/contract-0/tails.verify-contract.test.mjs:355`

ADRs: `ADR-20261009-041704-decision-judge-S-003-9e7b`, `ADR-20261009-053051-decision-judge-S-005-d5e2`, `ADR-20261009-053055-decision-judge-S-005-f41b`, `ADR-20261009-053059-decision-judge-S-005-23a9`, `ADR-20261009-062918-decision-judge-S-005-7fbd`, `ADR-20261009-062930-decision-judge-S-005-388e`, `ADR-20261009-063408-decision-judge-S-005-368d`

## R-009

Acceptance: `branches.py name --kind verify --id S-001 --round 0 --profile http-api --part 0` prints `sdlc/S-001-v0-http-api-0`.

Tests:
- `skills/sdlc/test/branches.test.mjs: T-R-009a name prints the default branch for the run, slice, milestone, e2e, e2e-area, verify and attempt kinds`
- `skills/sdlc/test/branches.test.mjs: T-R-009b tail builds the run, milestone, e2e, verify and attempt tails and fails on a missing part`
- `skills/sdlc/test/branches.test.mjs: T-R-009c name without a required part exits 2 with one JSON error and no traceback`
- `.sdlc/slices/S-005a/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:85`
- `.sdlc/slices/S-005a/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:115`
- `.sdlc/slices/S-005a/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:136`
- `.sdlc/slices/S-005a/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:162`
- `.sdlc/slices/S-005a/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:228`
- `.sdlc/slices/S-005a/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:277`
- `.sdlc/slices/S-005a/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:294`
- `.sdlc/slices/S-005a/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:310`
- `.sdlc/slices/S-005a/verification/r0/tests/contract-0/tails.verify-contract.test.mjs:86`
- `.sdlc/slices/S-005a/verification/r0/tests/contract-0/tails.verify-contract.test.mjs:203`
- `.sdlc/slices/S-005a/verification/r0/tests/contract-0/tails.verify-contract.test.mjs:216`
- `.sdlc/slices/S-005a/verification/r0/tests/contract-0/tails.verify-contract.test.mjs:235`
- `.sdlc/slices/S-005a/verification/r0/tests/contract-0/tails.verify-contract.test.mjs:254`
- `.sdlc/slices/S-005a/verification/r0/tests/contract-0/tails.verify-contract.test.mjs:320`
- `.sdlc/slices/S-005a/verification/r0/tests/contract-0/tails.verify-contract.test.mjs:337`
- `.sdlc/slices/S-005a/verification/r0/tests/contract-0/tails.verify-contract.test.mjs:367`
- `.sdlc/slices/S-005a/verification/r0/tests/contract-0/tails.verify-contract.test.mjs:387`
- `.sdlc/slices/S-005a/verification/r0/tests/contract-0/tails.verify-contract.test.mjs:407`
- `.sdlc/slices/S-005a/verification/r0/tests/security-0/tails.verify-security.test.mjs:72`
- `.sdlc/slices/S-005a/verification/r0/tests/security-0/tails.verify-security.test.mjs:79`
- `.sdlc/slices/S-005a/verification/r0/tests/security-0/tails.verify-security.test.mjs:100`
- `.sdlc/slices/S-005a/verification/r0/tests/security-0/tails.verify-security.test.mjs:119`
- `.sdlc/slices/S-005a/verification/r0/tests/security-0/tails.verify-security.test.mjs:142`
- `.sdlc/slices/S-005a/verification/r0/tests/security-0/tails.verify-security.test.mjs:151`
- `.sdlc/slices/S-005a/verification/r0/tests/security-0/tails.verify-security.test.mjs:241`

ADRs: `ADR-20261009-053051-decision-judge-S-005-d5e2`, `ADR-20261009-053055-decision-judge-S-005-f41b`, `ADR-20261009-053059-decision-judge-S-005-23a9`, `ADR-20261009-062918-decision-judge-S-005-7fbd`, `ADR-20261009-062930-decision-judge-S-005-388e`, `ADR-20261009-063408-decision-judge-S-005-368d`

## R-010

Acceptance: `branches.py name --kind attempt --id S-001 --n 1` prints `sdlc/S-001-attempt-1`.

Tests:
- `skills/sdlc/test/branches.test.mjs: T-R-010a name prints the default branch for the run, slice, milestone, e2e, e2e-area, verify and attempt kinds`
- `skills/sdlc/test/branches.test.mjs: T-R-010b tail builds the run, milestone, e2e, verify and attempt tails and fails on a missing part`
- `skills/sdlc/test/branches.test.mjs: T-R-010c name without a required part exits 2 with one JSON error and no traceback`
- `.sdlc/slices/S-005a/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:184`
- `.sdlc/slices/S-005a/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:201`
- `.sdlc/slices/S-005a/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:228`
- `.sdlc/slices/S-005a/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:277`
- `.sdlc/slices/S-005a/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:294`
- `.sdlc/slices/S-005a/verification/r0/tests/contract-0/tails.verify-contract.test.mjs:86`
- `.sdlc/slices/S-005a/verification/r0/tests/contract-0/tails.verify-contract.test.mjs:279`
- `.sdlc/slices/S-005a/verification/r0/tests/contract-0/tails.verify-contract.test.mjs:291`
- `.sdlc/slices/S-005a/verification/r0/tests/contract-0/tails.verify-contract.test.mjs:308`
- `.sdlc/slices/S-005a/verification/r0/tests/contract-0/tails.verify-contract.test.mjs:320`
- `.sdlc/slices/S-005a/verification/r0/tests/contract-0/tails.verify-contract.test.mjs:337`
- `.sdlc/slices/S-005a/verification/r0/tests/contract-0/tails.verify-contract.test.mjs:367`
- `.sdlc/slices/S-005a/verification/r0/tests/contract-0/tails.verify-contract.test.mjs:387`
- `.sdlc/slices/S-005a/verification/r0/tests/contract-0/tails.verify-contract.test.mjs:407`
- `.sdlc/slices/S-005a/verification/r0/tests/security-0/tails.verify-security.test.mjs:168`
- `.sdlc/slices/S-005a/verification/r0/tests/security-0/tails.verify-security.test.mjs:177`
- `.sdlc/slices/S-005a/verification/r0/tests/security-0/tails.verify-security.test.mjs:195`
- `.sdlc/slices/S-005a/verification/r0/tests/security-0/tails.verify-security.test.mjs:212`
- `.sdlc/slices/S-005a/verification/r0/tests/security-0/tails.verify-security.test.mjs:227`
- `.sdlc/slices/S-005a/verification/r0/tests/security-0/tails.verify-security.test.mjs:241`

ADRs: `ADR-20261009-053051-decision-judge-S-005-d5e2`, `ADR-20261009-053055-decision-judge-S-005-f41b`, `ADR-20261009-053059-decision-judge-S-005-23a9`, `ADR-20261009-062918-decision-judge-S-005-7fbd`, `ADR-20261009-062930-decision-judge-S-005-388e`, `ADR-20261009-063408-decision-judge-S-005-368d`
