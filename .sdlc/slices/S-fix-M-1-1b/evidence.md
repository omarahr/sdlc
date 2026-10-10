# Evidence: S-fix-M-1-1b

branches.py name now refuses ids and parts that do not round-trip through parse.

## R-019
`name("sdlc/{name}", "slice", id="S-001")` is `sdlc/S-001`. Every name output parses back to the same kind and parts. `{name:lower}` lowercases only the tail.

Tests:
- T-R-019-roundtrip
- T-R-019-nonascii
- T-R-019-lower-nonascii-area
- T-R-053-active
- SC-M-1-076
- T-R-019-valid
- T-R-019-int-value
- T-R-019-lower
- T-R-019-e2e-id
- T-R-019-trailing-newline
- T-R-019-parse-newline
- T-R-019-state-ts
- TC-contract-7: .sdlc/slices/S-fix-M-1-1b/verification/r1/tests/contract-0/branches-name.verify-contract.test.mjs:177
- TC-contract-8: .sdlc/slices/S-fix-M-1-1b/verification/r1/tests/contract-0/branches-name.verify-contract.test.mjs:216
- TC-contract-9: .sdlc/slices/S-fix-M-1-1b/verification/r1/tests/contract-0/branches-name.verify-contract.test.mjs:267

## R-053
next-action.py finds the active slice by parsing every local branch under the configured format. The slice id comes from the parsed id. A foreign branch never reads as active.

Tests:
- T-R-019-roundtrip
- T-R-019-nonascii
- T-R-019-lower-nonascii-area
- T-R-053-active
- SC-M-1-076
- T-R-019-valid
- T-R-019-int-value
- T-R-019-lower
- T-R-019-e2e-id
- T-R-019-trailing-newline
- T-R-019-parse-newline
- T-R-019-state-ts
- TC-contract-7: .sdlc/slices/S-fix-M-1-1b/verification/r1/tests/contract-0/branches-name.verify-contract.test.mjs:177
- TC-contract-8: .sdlc/slices/S-fix-M-1-1b/verification/r1/tests/contract-0/branches-name.verify-contract.test.mjs:216
- TC-contract-9: .sdlc/slices/S-fix-M-1-1b/verification/r1/tests/contract-0/branches-name.verify-contract.test.mjs:267

Gate: the full suite passed on commit 3566ff2 (receipt valid).
