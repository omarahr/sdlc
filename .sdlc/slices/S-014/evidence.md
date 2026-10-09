# S-014 evidence

Slice: read_rules reads the GitLab push rule and the no-forge case.

## R-030
The glab shim is called once. A null body, an error, or an empty `branch_name_regex` gives no rules. A regex gives one rule with kind `regex` and label `push rule`.

Tests:
- T-R-030a
- T-R-030b
- T-R-030c
- T-R-030d
- T-R-030e
- .sdlc/slices/S-014/verification/r0/tests/cli-0/read-rules.verify-cli.test.mjs:1 (VS-8 success path argv and cwd)
- .sdlc/slices/S-014/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs:70
- .sdlc/slices/S-014/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs:82
- .sdlc/slices/S-014/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs:98
- .sdlc/slices/S-014/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs:114
- .sdlc/slices/S-014/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs:127
- .sdlc/slices/S-014/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs:133
- .sdlc/slices/S-014/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs:208
- .sdlc/slices/S-014/verification/r0/tests/contract-1/read-rules.verify-contract.test.mjs:83
- .sdlc/slices/S-014/verification/r0/tests/contract-1/read-rules.verify-contract.test.mjs:160
- .sdlc/slices/S-014/verification/r0/tests/contract-1/read-rules.verify-contract.test.mjs:182
- .sdlc/slices/S-014/verification/r0/tests/contract-1/read-rules.verify-contract.test.mjs:220
- .sdlc/slices/S-014/verification/r0/tests/contract-1/read-rules.verify-contract.test.mjs:233
- .sdlc/slices/S-014/verification/r0/tests/contract-1/read-rules.verify-contract.test.mjs:400
- .sdlc/slices/S-014/verification/r0/tests/security-0/read-rules.verify-security.test.mjs:65
- .sdlc/slices/S-014/verification/r0/tests/security-0/read-rules.verify-security.test.mjs:90
- .sdlc/slices/S-014/verification/r0/tests/security-0/read-rules.verify-security.test.mjs:190
- .sdlc/slices/S-014/verification/r0/tests/security-0/read-rules.verify-security.test.mjs:301

## R-031
A glab shim that exits 1 gives one note starting `rules unknown on gitlab:` and every sample `unchecked`.

Tests:
- T-R-031a
- T-R-031b
- T-R-031c
- T-R-031d
- .sdlc/slices/S-014/verification/r0/tests/cli-0/read-rules.verify-cli.test.mjs:1 (VS-8 PATH with python3 and git only)
- .sdlc/slices/S-014/verification/r0/tests/cli-0/read-rules.verify-cli.test.mjs:1 (VS-8 glab slower than FORGE_TIMEOUT)
- .sdlc/slices/S-014/verification/r0/tests/cli-0/read-rules.verify-cli.test.mjs:1 (VS-8 glab that stalls)
- .sdlc/slices/S-014/verification/r0/tests/cli-0/read-rules.verify-cli.test.mjs:1 (VS-8 non-JSON/empty/partial)
- .sdlc/slices/S-014/verification/r0/tests/cli-0/read-rules.verify-cli.test.mjs:1 (VS-8 exit 127 / exit 2)
- .sdlc/slices/S-014/verification/r0/tests/cli-0/read-rules.verify-cli.test.mjs:1 (VS-8 NUL / bad utf8 stderr)
- .sdlc/slices/S-014/verification/r0/tests/cli-0/read-rules.verify-cli.test.mjs:1 (VS-8 long and multi-line stderr)
- .sdlc/slices/S-014/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs:133
- .sdlc/slices/S-014/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs:146
- .sdlc/slices/S-014/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs:152
- .sdlc/slices/S-014/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs:208
- .sdlc/slices/S-014/verification/r0/tests/contract-1/read-rules.verify-contract.test.mjs:202
- .sdlc/slices/S-014/verification/r0/tests/contract-1/read-rules.verify-contract.test.mjs:220
- .sdlc/slices/S-014/verification/r0/tests/contract-1/read-rules.verify-contract.test.mjs:320
- .sdlc/slices/S-014/verification/r0/tests/security-0/read-rules.verify-security.test.mjs:90
- .sdlc/slices/S-014/verification/r0/tests/security-0/read-rules.verify-security.test.mjs:114
- .sdlc/slices/S-014/verification/r0/tests/security-0/read-rules.verify-security.test.mjs:135
- .sdlc/slices/S-014/verification/r0/tests/security-0/read-rules.verify-security.test.mjs:220
- .sdlc/slices/S-014/verification/r0/tests/security-0/read-rules.verify-security.test.mjs:233
- .sdlc/slices/S-014/verification/r0/tests/security-0/read-rules.verify-security.test.mjs:249
- .sdlc/slices/S-014/verification/r0/tests/security-0/read-rules.verify-security.test.mjs:266
- .sdlc/slices/S-014/verification/r0/tests/security-0/read-rules.verify-security.test.mjs:301

## R-032
With `forge: ""` the preflight returns an empty rules list and every sample `unchecked`.

Tests:
- T-R-032a
- .sdlc/slices/S-014/verification/r0/tests/cli-0/read-rules.verify-cli.test.mjs:1 (VS-6 no forge value)
- .sdlc/slices/S-014/verification/r0/tests/cli-0/read-rules.verify-cli.test.mjs:1 (VS-6 no sdlc config)
- .sdlc/slices/S-014/verification/r0/tests/cli-0/read-rules.verify-cli.test.mjs:1 (VS-6 config that is not valid JSON)
- .sdlc/slices/S-014/verification/r0/tests/cli-0/read-rules.verify-cli.test.mjs:1 (VS-6 forge gitlab with no samples)
- .sdlc/slices/S-014/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs:181
- .sdlc/slices/S-014/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs:203
- .sdlc/slices/S-014/verification/r0/tests/security-0/read-rules.verify-security.test.mjs:278
- .sdlc/slices/S-014/verification/r0/tests/security-0/read-rules.verify-security.test.mjs:332

## R-026
Every rule read_rules returns has exactly these keys. `kind` is one of the four values. `source` is `github` or `gitlab`.

Tests:
- T-R-026a
- .sdlc/slices/S-014/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs:98
- .sdlc/slices/S-014/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs:208
- .sdlc/slices/S-014/verification/r0/tests/contract-1/read-rules.verify-contract.test.mjs:83
- .sdlc/slices/S-014/verification/r0/tests/contract-1/read-rules.verify-contract.test.mjs:160
- .sdlc/slices/S-014/verification/r0/tests/contract-1/read-rules.verify-contract.test.mjs:252
- .sdlc/slices/S-014/verification/r0/tests/contract-1/read-rules.verify-contract.test.mjs:301
- .sdlc/slices/S-014/verification/r0/tests/contract-1/read-rules.verify-contract.test.mjs:320
- .sdlc/slices/S-014/verification/r0/tests/contract-1/read-rules.verify-contract.test.mjs:360
- .sdlc/slices/S-014/verification/r0/tests/contract-1/read-rules.verify-contract.test.mjs:370
- .sdlc/slices/S-014/verification/r0/tests/contract-1/read-rules.verify-contract.test.mjs:385
- .sdlc/slices/S-014/verification/r0/tests/security-0/read-rules.verify-security.test.mjs:190
- .sdlc/slices/S-014/verification/r0/tests/security-0/read-rules.verify-security.test.mjs:210
- .sdlc/slices/S-014/verification/r0/tests/security-0/read-rules.verify-security.test.mjs:313
