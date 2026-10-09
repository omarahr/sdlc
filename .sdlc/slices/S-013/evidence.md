# S-013 evidence

Slice: read_rules reads GitHub branch name patterns.

## R-027
The gh shim records one call per sample. The path is `repos/<owner>/<repo>/rules/branches/<sample>` with every `/` in the sample encoded as `%2F`.

Tests:
- T-R-027a
- T-R-027b
- T-R-027c
- .sdlc/slices/S-013/verification/r0/tests/security-0/read-rules.verify-security.test.mjs:62
- .sdlc/slices/S-013/verification/r0/tests/security-0/read-rules.verify-security.test.mjs:84
- .sdlc/slices/S-013/verification/r0/tests/security-0/read-rules.verify-security.test.mjs:95
- .sdlc/slices/S-013/verification/r0/tests/security-0/read-rules.verify-security.test.mjs:114
- .sdlc/slices/S-013/verification/r0/tests/security-0/read-rules.verify-security.test.mjs:219
- .sdlc/slices/S-013/verification/r0/tests/security-0/read-rules.verify-security.test.mjs:235
- .sdlc/slices/S-013/verification/r0/tests/security-0/read-rules.verify-security.test.mjs:257
- .sdlc/slices/S-013/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs:45
- .sdlc/slices/S-013/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs:61
- .sdlc/slices/S-013/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs:73
- .sdlc/slices/S-013/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs:144
- .sdlc/slices/S-013/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs:261
- .sdlc/slices/S-013/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs:282
- .sdlc/slices/S-013/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs:315
- .sdlc/slices/S-013/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs:324
- .sdlc/slices/S-013/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs:332

## R-028
Canned GitHub JSON with branch_name_pattern and other rule types yields only the pattern rules. negate defaults to false. The label falls back from `parameters.name` to `ruleset <id>` to `branch_name_pattern`.

Tests:
- T-R-028a
- T-R-028b
- T-R-028c
- T-R-028d
- T-R-028e
- T-R-028f
- .sdlc/slices/S-013/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs:82
- .sdlc/slices/S-013/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs:97
- .sdlc/slices/S-013/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs:115
- .sdlc/slices/S-013/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs:123
- .sdlc/slices/S-013/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs:138
- .sdlc/slices/S-013/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs:324

## R-029
A gh shim that exits 1 gives `ok: true`, one note starting `rules unknown on github:`, and every sample `unchecked`.

Tests:
- T-R-029a
- T-R-029b
- T-R-029c
- .sdlc/slices/S-013/verification/r0/tests/security-0/read-rules.verify-security.test.mjs:124
- .sdlc/slices/S-013/verification/r0/tests/security-0/read-rules.verify-security.test.mjs:136
- .sdlc/slices/S-013/verification/r0/tests/security-0/read-rules.verify-security.test.mjs:162
- .sdlc/slices/S-013/verification/r0/tests/security-0/read-rules.verify-security.test.mjs:181
- .sdlc/slices/S-013/verification/r0/tests/security-0/read-rules.verify-security.test.mjs:196
- .sdlc/slices/S-013/verification/r0/tests/security-0/read-rules.verify-security.test.mjs:206
- .sdlc/slices/S-013/verification/r0/tests/security-0/read-rules.verify-security.test.mjs:268
- .sdlc/slices/S-013/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs:163
- .sdlc/slices/S-013/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs:174
- .sdlc/slices/S-013/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs:181
- .sdlc/slices/S-013/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs:189
- .sdlc/slices/S-013/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs:201
- .sdlc/slices/S-013/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs:210
- .sdlc/slices/S-013/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs:220

## R-084
With `gh` absent from `PATH` on a github-mode repo, preflight prints `ok: true`, one note, and every sample `unchecked`. The same holds for `glab` on a gitlab-mode repo. It does not crash and does not block.

Tests:
- T-R-084a
- .sdlc/slices/S-013/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs:229
- .sdlc/slices/S-013/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs:240
- .sdlc/slices/S-013/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs:252

The full suite passed on the final code (suite receipt valid).
