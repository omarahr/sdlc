# Evidence for S-017: preflight edge cases and the forge shim suite

## R-074

The branches test asserts all seven preflight scenarios through gh and glab shims.

Tests:
- T-R-074a

## R-091

One regex rule that the default format satisfies gives ok, the default format and derived false.

Tests:
- T-R-091a
- T-R-091b

## R-092

Two rules, or a negated rule, with no format given: no derivation, each failing sample names its rule, and the suggestion asks for --branch-format.

Tests:
- T-R-092a
- T-R-092b
- T-R-092c

## R-100

A GitHub response with no branch_name_pattern object gives empty rules, no failing sample and ok. A rule with a non-string pattern is unevaluated and does not crash preflight.

Tests:
- T-R-100a
- T-R-100b
- T-R-100c
- T-R-100d

Final-round verification cases, all passing:
- .sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs:44
- .sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs:58
- .sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs:70
- .sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs:82
- .sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs:90
- .sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs:104
- .sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs:122
- .sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs:136
- .sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs:143
- .sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs:152
- .sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs:167
- .sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs:185
- .sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs:195
- .sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs:238
- .sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs:260
- .sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs:268
- .sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs:297
- .sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs:318
- .sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs:335
- .sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs:358
- .sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs:375
- .sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs:389
- .sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs:399
- .sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs:413
- .sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs:431
- .sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs:449
- .sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs:459
- .sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs:475
- .sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs:487
- .sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs:495
- .sdlc/slices/S-017/verification/r1/tests/cli-0/preflight.verify-cli.test.mjs:508
- .sdlc/slices/S-017/verification/r1/tests/contract-0/preflight.verify-contract.test.mjs:61
- .sdlc/slices/S-017/verification/r1/tests/contract-0/preflight.verify-contract.test.mjs:140
- .sdlc/slices/S-017/verification/r1/tests/contract-0/preflight.verify-contract.test.mjs:153
- .sdlc/slices/S-017/verification/r1/tests/contract-0/preflight.verify-contract.test.mjs:165
- .sdlc/slices/S-017/verification/r1/tests/contract-0/preflight.verify-contract.test.mjs:204
- .sdlc/slices/S-017/verification/r1/tests/contract-0/preflight.verify-contract.test.mjs:220
- .sdlc/slices/S-017/verification/r1/tests/contract-0/preflight.verify-contract.test.mjs:241
- .sdlc/slices/S-017/verification/r1/tests/contract-0/preflight.verify-contract.test.mjs:265
- .sdlc/slices/S-017/verification/r1/tests/contract-0/preflight.verify-contract.test.mjs:290
- .sdlc/slices/S-017/verification/r1/tests/contract-0/preflight.verify-contract.test.mjs:304
- .sdlc/slices/S-017/verification/r1/tests/contract-0/preflight.verify-contract.test.mjs:322
- .sdlc/slices/S-017/verification/r1/tests/contract-0/preflight.verify-contract.test.mjs:342
- .sdlc/slices/S-017/verification/r1/tests/security-0/preflight.verify-security.test.mjs:1
- .sdlc/slices/S-017/verification/r1/tests/security-0/preflight.verify-security.test.mjs:106
- .sdlc/slices/S-017/verification/r1/tests/security-0/preflight.verify-security.test.mjs:155
- .sdlc/slices/S-017/verification/r1/tests/security-0/preflight.verify-security.test.mjs:193
- .sdlc/slices/S-017/verification/r1/tests/security-0/preflight.verify-security.test.mjs:251
- .sdlc/slices/S-017/verification/r1/tests/security-0/preflight.verify-security.test.mjs:324
