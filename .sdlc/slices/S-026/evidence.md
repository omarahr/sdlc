# Evidence for S-026

The slice adds tests that pin the last placeholder rows in `skills/sdlc/prompts/_common.md`: milestone, e2e, e2e area, state and attempt branch. The rows already held the right commands. The tests are characterization tests.

## R-111
_common.md's placeholder table maps `<milestone branch>` to `branches.py name --kind milestone --id <milestoneId>`.

Tests:
- T-R-111: the milestone branch placeholder maps to branches.py name
- TC-cli-1: .sdlc/slices/S-026/verification/r0/tests/cli-0/branch-table.verify-cli.test.mjs:15
- TC-cli-6: .sdlc/slices/S-026/verification/r0/tests/cli-0/branch-table.verify-cli.test.mjs:70
- TC-contract-1: .sdlc/slices/S-026/verification/r0/tests/contract-0/placeholder-table.verify-contract.test.mjs:25
- TC-contract-6: .sdlc/slices/S-026/verification/r0/tests/contract-0/placeholder-table.verify-contract.test.mjs:44

## R-112
_common.md's placeholder table maps `<e2e branch>` to `branches.py name --kind e2e --id <milestoneId>`.

Tests:
- T-R-112: the e2e branch placeholder maps to branches.py name
- TC-cli-2: .sdlc/slices/S-026/verification/r0/tests/cli-0/branch-table.verify-cli.test.mjs:26
- TC-cli-6: .sdlc/slices/S-026/verification/r0/tests/cli-0/branch-table.verify-cli.test.mjs:70
- TC-contract-2: .sdlc/slices/S-026/verification/r0/tests/contract-0/placeholder-table.verify-contract.test.mjs:25
- TC-contract-6: .sdlc/slices/S-026/verification/r0/tests/contract-0/placeholder-table.verify-contract.test.mjs:44

## R-113
_common.md's placeholder table maps `<e2e area branch>` to `branches.py name --kind e2e-area --id <milestoneId> --area <areaId>`.

Tests:
- T-R-113: the e2e area branch placeholder maps to branches.py name
- TC-cli-3: .sdlc/slices/S-026/verification/r0/tests/cli-0/branch-table.verify-cli.test.mjs:36
- TC-cli-6: .sdlc/slices/S-026/verification/r0/tests/cli-0/branch-table.verify-cli.test.mjs:70
- TC-contract-3: .sdlc/slices/S-026/verification/r0/tests/contract-0/placeholder-table.verify-contract.test.mjs:25
- TC-contract-6: .sdlc/slices/S-026/verification/r0/tests/contract-0/placeholder-table.verify-contract.test.mjs:44

## R-114
_common.md's placeholder table maps `<state branch>` to `branches.py name --kind state`, which makes the timestamp.

Tests:
- T-R-114: the state branch placeholder takes no id and makes the timestamp
- TC-cli-4: .sdlc/slices/S-026/verification/r0/tests/cli-0/branch-table.verify-cli.test.mjs:48
- TC-cli-6: .sdlc/slices/S-026/verification/r0/tests/cli-0/branch-table.verify-cli.test.mjs:70
- TC-contract-4: .sdlc/slices/S-026/verification/r0/tests/contract-0/placeholder-table.verify-contract.test.mjs:25
- TC-contract-6: .sdlc/slices/S-026/verification/r0/tests/contract-0/placeholder-table.verify-contract.test.mjs:44

## R-115
_common.md's placeholder table maps `<attempt branch>` to `branches.py name --kind attempt --id <sliceId> --n <n>`.

Tests:
- T-R-115: the attempt branch placeholder maps to branches.py name
- TC-cli-5: .sdlc/slices/S-026/verification/r0/tests/cli-0/branch-table.verify-cli.test.mjs:56
- TC-cli-6: .sdlc/slices/S-026/verification/r0/tests/cli-0/branch-table.verify-cli.test.mjs:70
- TC-contract-5: .sdlc/slices/S-026/verification/r0/tests/contract-0/placeholder-table.verify-contract.test.mjs:25
- TC-contract-6: .sdlc/slices/S-026/verification/r0/tests/contract-0/placeholder-table.verify-contract.test.mjs:44
