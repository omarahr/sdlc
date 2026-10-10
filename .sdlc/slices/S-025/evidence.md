# Evidence for S-025

The slice adds the Branch names section to `skills/sdlc/prompts/_common.md`. A committed test runs every name command in its table.

## R-062
_common.md has the Branch names section. It lists all eight placeholders with their commands: run branch, slice branch, milestone branch, e2e branch, e2e area branch, state branch, attempt branch, verify branch. It points to `branches.py parse` to classify a branch.

Tests:
- T-R-062
- T-R-110
- T-R-089
- T-R-090
- T-R-117
- T-R-089b every name command in the _common.md branch table runs against branches.py
- TC-cli-1: .sdlc/slices/S-025/verification/r0/tests/cli-0/branch-table.verify-cli.test.mjs:1
- TC-cli-2: .sdlc/slices/S-025/verification/r0/tests/cli-0/branch-table.verify-cli.test.mjs:1
- TC-cli-3: .sdlc/slices/S-025/verification/r0/tests/cli-0/branch-table.verify-cli.test.mjs:1
- TC-cli-4: .sdlc/slices/S-025/verification/r0/tests/cli-0/branch-table.verify-cli.test.mjs:1
- TC-cli-5: .sdlc/slices/S-025/verification/r0/tests/cli-0/branch-table.verify-cli.test.mjs:1
- TC-cli-6: .sdlc/slices/S-025/verification/r0/tests/cli-0/branch-table.verify-cli.test.mjs:1
- TC-contract-1: .sdlc/slices/S-025/verification/r0/tests/contract-0/table.verify-contract.test.mjs:21
- TC-contract-2: .sdlc/slices/S-025/verification/r0/tests/contract-0/table.verify-contract.test.mjs:48
- TC-contract-3: .sdlc/slices/S-025/verification/r0/tests/contract-0/table.verify-contract.test.mjs:41
- TC-contract-4: .sdlc/slices/S-025/verification/r0/tests/contract-0/table.verify-contract.test.mjs:26
- TC-contract-5: .sdlc/slices/S-025/verification/r0/tests/contract-0/table.verify-contract.test.mjs:69
- TC-contract-6: .sdlc/slices/S-025/verification/r0/tests/contract-0/table.verify-contract.test.mjs:80
- TC-contract-7: .sdlc/slices/S-025/verification/r0/tests/contract-0/table.verify-contract.test.mjs:165
- TC-contract-8: .sdlc/slices/S-025/verification/r0/tests/contract-0/table.verify-contract.test.mjs:131
- TC-contract-9: .sdlc/slices/S-025/verification/r0/tests/contract-0/table.verify-contract.test.mjs:156

## R-117
_common.md's Branch names section tells the reader to run `branches.py parse --repo . --branch <name>`. It says a branch that is not the loop's prints `null`.

Tests:
- T-R-062
- T-R-110
- T-R-089
- T-R-090
- T-R-117
- T-R-089b every name command in the _common.md branch table runs against branches.py
- TC-cli-1: .sdlc/slices/S-025/verification/r0/tests/cli-0/branch-table.verify-cli.test.mjs:1
- TC-cli-2: .sdlc/slices/S-025/verification/r0/tests/cli-0/branch-table.verify-cli.test.mjs:1
- TC-cli-3: .sdlc/slices/S-025/verification/r0/tests/cli-0/branch-table.verify-cli.test.mjs:1
- TC-cli-4: .sdlc/slices/S-025/verification/r0/tests/cli-0/branch-table.verify-cli.test.mjs:1
- TC-cli-5: .sdlc/slices/S-025/verification/r0/tests/cli-0/branch-table.verify-cli.test.mjs:1
- TC-cli-6: .sdlc/slices/S-025/verification/r0/tests/cli-0/branch-table.verify-cli.test.mjs:1
- TC-contract-1: .sdlc/slices/S-025/verification/r0/tests/contract-0/table.verify-contract.test.mjs:21
- TC-contract-2: .sdlc/slices/S-025/verification/r0/tests/contract-0/table.verify-contract.test.mjs:48
- TC-contract-3: .sdlc/slices/S-025/verification/r0/tests/contract-0/table.verify-contract.test.mjs:41
- TC-contract-4: .sdlc/slices/S-025/verification/r0/tests/contract-0/table.verify-contract.test.mjs:26
- TC-contract-5: .sdlc/slices/S-025/verification/r0/tests/contract-0/table.verify-contract.test.mjs:69
- TC-contract-6: .sdlc/slices/S-025/verification/r0/tests/contract-0/table.verify-contract.test.mjs:80
- TC-contract-7: .sdlc/slices/S-025/verification/r0/tests/contract-0/table.verify-contract.test.mjs:165
- TC-contract-8: .sdlc/slices/S-025/verification/r0/tests/contract-0/table.verify-contract.test.mjs:131
- TC-contract-9: .sdlc/slices/S-025/verification/r0/tests/contract-0/table.verify-contract.test.mjs:156

## R-089
_common.md's placeholder table maps `<run branch>` to the branch `config.runBranch` names in `stack` mode. Outside `stack` mode it maps to the last entry of `branches.py list --kind run`.

Tests:
- T-R-062
- T-R-110
- T-R-089
- T-R-090
- T-R-117
- T-R-089b every name command in the _common.md branch table runs against branches.py
- TC-cli-1: .sdlc/slices/S-025/verification/r0/tests/cli-0/branch-table.verify-cli.test.mjs:1
- TC-cli-2: .sdlc/slices/S-025/verification/r0/tests/cli-0/branch-table.verify-cli.test.mjs:1
- TC-cli-3: .sdlc/slices/S-025/verification/r0/tests/cli-0/branch-table.verify-cli.test.mjs:1
- TC-cli-4: .sdlc/slices/S-025/verification/r0/tests/cli-0/branch-table.verify-cli.test.mjs:1
- TC-cli-5: .sdlc/slices/S-025/verification/r0/tests/cli-0/branch-table.verify-cli.test.mjs:1
- TC-cli-6: .sdlc/slices/S-025/verification/r0/tests/cli-0/branch-table.verify-cli.test.mjs:1
- TC-contract-1: .sdlc/slices/S-025/verification/r0/tests/contract-0/table.verify-contract.test.mjs:21
- TC-contract-2: .sdlc/slices/S-025/verification/r0/tests/contract-0/table.verify-contract.test.mjs:48
- TC-contract-3: .sdlc/slices/S-025/verification/r0/tests/contract-0/table.verify-contract.test.mjs:41
- TC-contract-4: .sdlc/slices/S-025/verification/r0/tests/contract-0/table.verify-contract.test.mjs:26
- TC-contract-5: .sdlc/slices/S-025/verification/r0/tests/contract-0/table.verify-contract.test.mjs:69
- TC-contract-6: .sdlc/slices/S-025/verification/r0/tests/contract-0/table.verify-contract.test.mjs:80
- TC-contract-7: .sdlc/slices/S-025/verification/r0/tests/contract-0/table.verify-contract.test.mjs:165
- TC-contract-8: .sdlc/slices/S-025/verification/r0/tests/contract-0/table.verify-contract.test.mjs:131
- TC-contract-9: .sdlc/slices/S-025/verification/r0/tests/contract-0/table.verify-contract.test.mjs:156

## R-090
The `<verify branch>` placeholder is filled from the branch input the role's prompt carries. No prompt fills it with a `branches.py name` call.

Tests:
- T-R-062
- T-R-110
- T-R-089
- T-R-090
- T-R-117
- T-R-089b every name command in the _common.md branch table runs against branches.py
- TC-cli-1: .sdlc/slices/S-025/verification/r0/tests/cli-0/branch-table.verify-cli.test.mjs:1
- TC-cli-2: .sdlc/slices/S-025/verification/r0/tests/cli-0/branch-table.verify-cli.test.mjs:1
- TC-cli-3: .sdlc/slices/S-025/verification/r0/tests/cli-0/branch-table.verify-cli.test.mjs:1
- TC-cli-4: .sdlc/slices/S-025/verification/r0/tests/cli-0/branch-table.verify-cli.test.mjs:1
- TC-cli-5: .sdlc/slices/S-025/verification/r0/tests/cli-0/branch-table.verify-cli.test.mjs:1
- TC-cli-6: .sdlc/slices/S-025/verification/r0/tests/cli-0/branch-table.verify-cli.test.mjs:1
- TC-contract-1: .sdlc/slices/S-025/verification/r0/tests/contract-0/table.verify-contract.test.mjs:21
- TC-contract-2: .sdlc/slices/S-025/verification/r0/tests/contract-0/table.verify-contract.test.mjs:48
- TC-contract-3: .sdlc/slices/S-025/verification/r0/tests/contract-0/table.verify-contract.test.mjs:41
- TC-contract-4: .sdlc/slices/S-025/verification/r0/tests/contract-0/table.verify-contract.test.mjs:26
- TC-contract-5: .sdlc/slices/S-025/verification/r0/tests/contract-0/table.verify-contract.test.mjs:69
- TC-contract-6: .sdlc/slices/S-025/verification/r0/tests/contract-0/table.verify-contract.test.mjs:80
- TC-contract-7: .sdlc/slices/S-025/verification/r0/tests/contract-0/table.verify-contract.test.mjs:165
- TC-contract-8: .sdlc/slices/S-025/verification/r0/tests/contract-0/table.verify-contract.test.mjs:131
- TC-contract-9: .sdlc/slices/S-025/verification/r0/tests/contract-0/table.verify-contract.test.mjs:156

## R-110
_common.md's placeholder table maps `<slice branch>` to `branches.py name --kind slice --id <sliceId>`.

Tests:
- T-R-062
- T-R-110
- T-R-089
- T-R-090
- T-R-117
- T-R-089b every name command in the _common.md branch table runs against branches.py
- TC-cli-1: .sdlc/slices/S-025/verification/r0/tests/cli-0/branch-table.verify-cli.test.mjs:1
- TC-cli-2: .sdlc/slices/S-025/verification/r0/tests/cli-0/branch-table.verify-cli.test.mjs:1
- TC-cli-3: .sdlc/slices/S-025/verification/r0/tests/cli-0/branch-table.verify-cli.test.mjs:1
- TC-cli-4: .sdlc/slices/S-025/verification/r0/tests/cli-0/branch-table.verify-cli.test.mjs:1
- TC-cli-5: .sdlc/slices/S-025/verification/r0/tests/cli-0/branch-table.verify-cli.test.mjs:1
- TC-cli-6: .sdlc/slices/S-025/verification/r0/tests/cli-0/branch-table.verify-cli.test.mjs:1
- TC-contract-1: .sdlc/slices/S-025/verification/r0/tests/contract-0/table.verify-contract.test.mjs:21
- TC-contract-2: .sdlc/slices/S-025/verification/r0/tests/contract-0/table.verify-contract.test.mjs:48
- TC-contract-3: .sdlc/slices/S-025/verification/r0/tests/contract-0/table.verify-contract.test.mjs:41
- TC-contract-4: .sdlc/slices/S-025/verification/r0/tests/contract-0/table.verify-contract.test.mjs:26
- TC-contract-5: .sdlc/slices/S-025/verification/r0/tests/contract-0/table.verify-contract.test.mjs:69
- TC-contract-6: .sdlc/slices/S-025/verification/r0/tests/contract-0/table.verify-contract.test.mjs:80
- TC-contract-7: .sdlc/slices/S-025/verification/r0/tests/contract-0/table.verify-contract.test.mjs:165
- TC-contract-8: .sdlc/slices/S-025/verification/r0/tests/contract-0/table.verify-contract.test.mjs:131
- TC-contract-9: .sdlc/slices/S-025/verification/r0/tests/contract-0/table.verify-contract.test.mjs:156

