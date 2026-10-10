# Evidence: S-024

Slice: janitor.py sweeps only verify branches through parse.

Files changed:
- skills/sdlc/janitor.py
- skills/sdlc/test/branches.test.mjs
- skills/sdlc/test/scripts.test.mjs

## R-060
janitor.py has no V_BRANCH or V_ID. Under a custom format it sweeps only verify branches whose id is unknown or whose status is done or rejected. It never deletes run, attempt, or any other kind.

Tests:
- the janitor has no V_BRANCH or V_ID
- the janitor deletes verify branches of finished and unknown slices and keeps live ones
- the janitor sweeps verify branches under a custom format and never touches run or attempt branches
- the janitor leaves an old-format verify branch under a derived format
- the janitor resolves a lowercased id through the ledger
- the janitor notes an unusable format and deletes nothing
- the janitor prunes a stale worktree registration before sweeping, so the branch is not pinned forever
- the janitor notes missing or unreadable state instead of deleting, and still runs
- TC-cli-1 .sdlc/slices/S-024/verification/r0/tests/cli-0/janitor.verify-cli.test.mjs:23
- TC-cli-2 .sdlc/slices/S-024/verification/r0/tests/cli-0/janitor.verify-cli.test.mjs:37
- TC-cli-3 .sdlc/slices/S-024/verification/r0/tests/cli-0/janitor.verify-cli.test.mjs:46
- TC-cli-4 .sdlc/slices/S-024/verification/r0/tests/cli-0/janitor.verify-cli.test.mjs:57
- TC-cli-5 .sdlc/slices/S-024/verification/r0/tests/cli-0/janitor.verify-cli.test.mjs:70
- TC-cli-6 .sdlc/slices/S-024/verification/r0/tests/cli-0/janitor.verify-cli.test.mjs:85
- TC-cli-7 .sdlc/slices/S-024/verification/r0/tests/cli-0/janitor.verify-cli.test.mjs:98
- TC-cli-8 .sdlc/slices/S-024/verification/r0/tests/cli-0/janitor.verify-cli.test.mjs:108
- TC-cli-9 .sdlc/slices/S-024/verification/r0/tests/cli-0/janitor.verify-cli.test.mjs:108
- TC-cli-10 .sdlc/slices/S-024/verification/r0/tests/cli-0/janitor.verify-cli.test.mjs:126
- TC-cli-11 .sdlc/slices/S-024/verification/r0/tests/cli-0/janitor.verify-cli.test.mjs:159
- TC-cli-12 .sdlc/slices/S-024/verification/r0/tests/cli-0/janitor.verify-cli.test.mjs:179
- TC-cli-13 .sdlc/slices/S-024/verification/r0/tests/cli-0/janitor.verify-cli.test.mjs:190
- TC-cli-14 .sdlc/slices/S-024/verification/r0/tests/cli-0/janitor.verify-cli.test.mjs:215
- TC-contract-1 .sdlc/slices/S-024/verification/r0/tests/contract-0/janitor.verify-contract.test.mjs:17
- TC-contract-2 .sdlc/slices/S-024/verification/r0/tests/contract-0/janitor.verify-contract.test.mjs:40
- TC-contract-3 .sdlc/slices/S-024/verification/r0/tests/contract-0/janitor.verify-contract.test.mjs:59
- TC-contract-4 .sdlc/slices/S-024/verification/r0/tests/contract-0/janitor.verify-contract.test.mjs:77
- TC-contract-5 .sdlc/slices/S-024/verification/r0/tests/contract-0/janitor.verify-contract.test.mjs:92
- TC-contract-6 .sdlc/slices/S-024/verification/r0/tests/contract-0/janitor.verify-contract.test.mjs:117
- TC-contract-7 .sdlc/slices/S-024/verification/r0/tests/contract-0/janitor.verify-contract.test.mjs:131
- TC-contract-8 .sdlc/slices/S-024/verification/r0/tests/contract-0/janitor.verify-contract.test.mjs:146
- TC-contract-9 .sdlc/slices/S-024/verification/r0/tests/contract-0/janitor.verify-contract.test.mjs:156
- TC-contract-10 .sdlc/slices/S-024/verification/r0/tests/contract-0/janitor.verify-contract.test.mjs:181
- TC-contract-11 .sdlc/slices/S-024/verification/r0/tests/contract-0/janitor.verify-contract.test.mjs:190
- TC-contract-12 .sdlc/slices/S-024/verification/r0/tests/contract-0/janitor.verify-contract.test.mjs:206
- TC-security-1 .sdlc/slices/S-024/verification/r0/tests/security-0/janitor.verify-security.test.mjs:27
- TC-security-2 .sdlc/slices/S-024/verification/r0/tests/security-0/janitor.verify-security.test.mjs:48
- TC-security-3 .sdlc/slices/S-024/verification/r0/tests/security-0/janitor.verify-security.test.mjs:61
- TC-security-4 .sdlc/slices/S-024/verification/r0/tests/security-0/janitor.verify-security.test.mjs:79
- TC-security-5 .sdlc/slices/S-024/verification/r0/tests/security-0/janitor.verify-security.test.mjs:90
- TC-security-6 .sdlc/slices/S-024/verification/r0/tests/security-0/janitor.verify-security.test.mjs:99
- TC-security-7 .sdlc/slices/S-024/verification/r0/tests/security-0/janitor.verify-security.test.mjs:111
- TC-security-8 .sdlc/slices/S-024/verification/r0/tests/security-0/janitor.verify-security.test.mjs:145
- TC-security-9 .sdlc/slices/S-024/verification/r0/tests/security-0/janitor.verify-security.test.mjs:193

## R-079
test/scripts.test.mjs asserts the sweep and the untouched kinds under a custom format.

Tests:
- the janitor has no V_BRANCH or V_ID
- the janitor deletes verify branches of finished and unknown slices and keeps live ones
- the janitor sweeps verify branches under a custom format and never touches run or attempt branches
- the janitor leaves an old-format verify branch under a derived format
- the janitor resolves a lowercased id through the ledger
- the janitor notes an unusable format and deletes nothing
- the janitor prunes a stale worktree registration before sweeping, so the branch is not pinned forever
- the janitor notes missing or unreadable state instead of deleting, and still runs
- TC-cli-1 .sdlc/slices/S-024/verification/r0/tests/cli-0/janitor.verify-cli.test.mjs:23
- TC-cli-2 .sdlc/slices/S-024/verification/r0/tests/cli-0/janitor.verify-cli.test.mjs:37
- TC-cli-3 .sdlc/slices/S-024/verification/r0/tests/cli-0/janitor.verify-cli.test.mjs:46
- TC-cli-4 .sdlc/slices/S-024/verification/r0/tests/cli-0/janitor.verify-cli.test.mjs:57
- TC-cli-5 .sdlc/slices/S-024/verification/r0/tests/cli-0/janitor.verify-cli.test.mjs:70
- TC-cli-6 .sdlc/slices/S-024/verification/r0/tests/cli-0/janitor.verify-cli.test.mjs:85
- TC-cli-7 .sdlc/slices/S-024/verification/r0/tests/cli-0/janitor.verify-cli.test.mjs:98
- TC-cli-8 .sdlc/slices/S-024/verification/r0/tests/cli-0/janitor.verify-cli.test.mjs:108
- TC-cli-9 .sdlc/slices/S-024/verification/r0/tests/cli-0/janitor.verify-cli.test.mjs:108
- TC-cli-10 .sdlc/slices/S-024/verification/r0/tests/cli-0/janitor.verify-cli.test.mjs:126
- TC-cli-11 .sdlc/slices/S-024/verification/r0/tests/cli-0/janitor.verify-cli.test.mjs:159
- TC-cli-12 .sdlc/slices/S-024/verification/r0/tests/cli-0/janitor.verify-cli.test.mjs:179
- TC-cli-13 .sdlc/slices/S-024/verification/r0/tests/cli-0/janitor.verify-cli.test.mjs:190
- TC-cli-14 .sdlc/slices/S-024/verification/r0/tests/cli-0/janitor.verify-cli.test.mjs:215
- TC-contract-1 .sdlc/slices/S-024/verification/r0/tests/contract-0/janitor.verify-contract.test.mjs:17
- TC-contract-2 .sdlc/slices/S-024/verification/r0/tests/contract-0/janitor.verify-contract.test.mjs:40
- TC-contract-3 .sdlc/slices/S-024/verification/r0/tests/contract-0/janitor.verify-contract.test.mjs:59
- TC-contract-4 .sdlc/slices/S-024/verification/r0/tests/contract-0/janitor.verify-contract.test.mjs:77
- TC-contract-5 .sdlc/slices/S-024/verification/r0/tests/contract-0/janitor.verify-contract.test.mjs:92
- TC-contract-6 .sdlc/slices/S-024/verification/r0/tests/contract-0/janitor.verify-contract.test.mjs:117
- TC-contract-7 .sdlc/slices/S-024/verification/r0/tests/contract-0/janitor.verify-contract.test.mjs:131
- TC-contract-8 .sdlc/slices/S-024/verification/r0/tests/contract-0/janitor.verify-contract.test.mjs:146
- TC-contract-9 .sdlc/slices/S-024/verification/r0/tests/contract-0/janitor.verify-contract.test.mjs:156
- TC-contract-10 .sdlc/slices/S-024/verification/r0/tests/contract-0/janitor.verify-contract.test.mjs:181
- TC-contract-11 .sdlc/slices/S-024/verification/r0/tests/contract-0/janitor.verify-contract.test.mjs:190
- TC-contract-12 .sdlc/slices/S-024/verification/r0/tests/contract-0/janitor.verify-contract.test.mjs:206
- TC-security-1 .sdlc/slices/S-024/verification/r0/tests/security-0/janitor.verify-security.test.mjs:27
- TC-security-2 .sdlc/slices/S-024/verification/r0/tests/security-0/janitor.verify-security.test.mjs:48
- TC-security-3 .sdlc/slices/S-024/verification/r0/tests/security-0/janitor.verify-security.test.mjs:61
- TC-security-4 .sdlc/slices/S-024/verification/r0/tests/security-0/janitor.verify-security.test.mjs:79
- TC-security-5 .sdlc/slices/S-024/verification/r0/tests/security-0/janitor.verify-security.test.mjs:90
- TC-security-6 .sdlc/slices/S-024/verification/r0/tests/security-0/janitor.verify-security.test.mjs:99
- TC-security-7 .sdlc/slices/S-024/verification/r0/tests/security-0/janitor.verify-security.test.mjs:111
- TC-security-8 .sdlc/slices/S-024/verification/r0/tests/security-0/janitor.verify-security.test.mjs:145
- TC-security-9 .sdlc/slices/S-024/verification/r0/tests/security-0/janitor.verify-security.test.mjs:193

## R-085
Under a derived format `feature/sdlc/{name}`, `parse` of `sdlc/S-001` returns null and `list` does not return it. The janitor does not delete an old-format verify branch such as `sdlc/S-001-v0-http-api-0`.

Tests:
- the janitor has no V_BRANCH or V_ID
- the janitor deletes verify branches of finished and unknown slices and keeps live ones
- the janitor sweeps verify branches under a custom format and never touches run or attempt branches
- the janitor leaves an old-format verify branch under a derived format
- the janitor resolves a lowercased id through the ledger
- the janitor notes an unusable format and deletes nothing
- the janitor prunes a stale worktree registration before sweeping, so the branch is not pinned forever
- the janitor notes missing or unreadable state instead of deleting, and still runs
- TC-cli-1 .sdlc/slices/S-024/verification/r0/tests/cli-0/janitor.verify-cli.test.mjs:23
- TC-cli-2 .sdlc/slices/S-024/verification/r0/tests/cli-0/janitor.verify-cli.test.mjs:37
- TC-cli-3 .sdlc/slices/S-024/verification/r0/tests/cli-0/janitor.verify-cli.test.mjs:46
- TC-cli-4 .sdlc/slices/S-024/verification/r0/tests/cli-0/janitor.verify-cli.test.mjs:57
- TC-cli-5 .sdlc/slices/S-024/verification/r0/tests/cli-0/janitor.verify-cli.test.mjs:70
- TC-cli-6 .sdlc/slices/S-024/verification/r0/tests/cli-0/janitor.verify-cli.test.mjs:85
- TC-cli-7 .sdlc/slices/S-024/verification/r0/tests/cli-0/janitor.verify-cli.test.mjs:98
- TC-cli-8 .sdlc/slices/S-024/verification/r0/tests/cli-0/janitor.verify-cli.test.mjs:108
- TC-cli-9 .sdlc/slices/S-024/verification/r0/tests/cli-0/janitor.verify-cli.test.mjs:108
- TC-cli-10 .sdlc/slices/S-024/verification/r0/tests/cli-0/janitor.verify-cli.test.mjs:126
- TC-cli-11 .sdlc/slices/S-024/verification/r0/tests/cli-0/janitor.verify-cli.test.mjs:159
- TC-cli-12 .sdlc/slices/S-024/verification/r0/tests/cli-0/janitor.verify-cli.test.mjs:179
- TC-cli-13 .sdlc/slices/S-024/verification/r0/tests/cli-0/janitor.verify-cli.test.mjs:190
- TC-cli-14 .sdlc/slices/S-024/verification/r0/tests/cli-0/janitor.verify-cli.test.mjs:215
- TC-contract-1 .sdlc/slices/S-024/verification/r0/tests/contract-0/janitor.verify-contract.test.mjs:17
- TC-contract-2 .sdlc/slices/S-024/verification/r0/tests/contract-0/janitor.verify-contract.test.mjs:40
- TC-contract-3 .sdlc/slices/S-024/verification/r0/tests/contract-0/janitor.verify-contract.test.mjs:59
- TC-contract-4 .sdlc/slices/S-024/verification/r0/tests/contract-0/janitor.verify-contract.test.mjs:77
- TC-contract-5 .sdlc/slices/S-024/verification/r0/tests/contract-0/janitor.verify-contract.test.mjs:92
- TC-contract-6 .sdlc/slices/S-024/verification/r0/tests/contract-0/janitor.verify-contract.test.mjs:117
- TC-contract-7 .sdlc/slices/S-024/verification/r0/tests/contract-0/janitor.verify-contract.test.mjs:131
- TC-contract-8 .sdlc/slices/S-024/verification/r0/tests/contract-0/janitor.verify-contract.test.mjs:146
- TC-contract-9 .sdlc/slices/S-024/verification/r0/tests/contract-0/janitor.verify-contract.test.mjs:156
- TC-contract-10 .sdlc/slices/S-024/verification/r0/tests/contract-0/janitor.verify-contract.test.mjs:181
- TC-contract-11 .sdlc/slices/S-024/verification/r0/tests/contract-0/janitor.verify-contract.test.mjs:190
- TC-contract-12 .sdlc/slices/S-024/verification/r0/tests/contract-0/janitor.verify-contract.test.mjs:206
- TC-security-1 .sdlc/slices/S-024/verification/r0/tests/security-0/janitor.verify-security.test.mjs:27
- TC-security-2 .sdlc/slices/S-024/verification/r0/tests/security-0/janitor.verify-security.test.mjs:48
- TC-security-3 .sdlc/slices/S-024/verification/r0/tests/security-0/janitor.verify-security.test.mjs:61
- TC-security-4 .sdlc/slices/S-024/verification/r0/tests/security-0/janitor.verify-security.test.mjs:79
- TC-security-5 .sdlc/slices/S-024/verification/r0/tests/security-0/janitor.verify-security.test.mjs:90
- TC-security-6 .sdlc/slices/S-024/verification/r0/tests/security-0/janitor.verify-security.test.mjs:99
- TC-security-7 .sdlc/slices/S-024/verification/r0/tests/security-0/janitor.verify-security.test.mjs:111
- TC-security-8 .sdlc/slices/S-024/verification/r0/tests/security-0/janitor.verify-security.test.mjs:145
- TC-security-9 .sdlc/slices/S-024/verification/r0/tests/security-0/janitor.verify-security.test.mjs:193

## R-086
Under `feature/p-1-{name:lower}`, janitor.py parses the verify branch `feature/p-1-s-001-v0-http-api-0` with the ledger's ids, the id resolves to `S-001`, and the branch of a todo slice is not swept.

Tests:
- the janitor has no V_BRANCH or V_ID
- the janitor deletes verify branches of finished and unknown slices and keeps live ones
- the janitor sweeps verify branches under a custom format and never touches run or attempt branches
- the janitor leaves an old-format verify branch under a derived format
- the janitor resolves a lowercased id through the ledger
- the janitor notes an unusable format and deletes nothing
- the janitor prunes a stale worktree registration before sweeping, so the branch is not pinned forever
- the janitor notes missing or unreadable state instead of deleting, and still runs
- TC-cli-1 .sdlc/slices/S-024/verification/r0/tests/cli-0/janitor.verify-cli.test.mjs:23
- TC-cli-2 .sdlc/slices/S-024/verification/r0/tests/cli-0/janitor.verify-cli.test.mjs:37
- TC-cli-3 .sdlc/slices/S-024/verification/r0/tests/cli-0/janitor.verify-cli.test.mjs:46
- TC-cli-4 .sdlc/slices/S-024/verification/r0/tests/cli-0/janitor.verify-cli.test.mjs:57
- TC-cli-5 .sdlc/slices/S-024/verification/r0/tests/cli-0/janitor.verify-cli.test.mjs:70
- TC-cli-6 .sdlc/slices/S-024/verification/r0/tests/cli-0/janitor.verify-cli.test.mjs:85
- TC-cli-7 .sdlc/slices/S-024/verification/r0/tests/cli-0/janitor.verify-cli.test.mjs:98
- TC-cli-8 .sdlc/slices/S-024/verification/r0/tests/cli-0/janitor.verify-cli.test.mjs:108
- TC-cli-9 .sdlc/slices/S-024/verification/r0/tests/cli-0/janitor.verify-cli.test.mjs:108
- TC-cli-10 .sdlc/slices/S-024/verification/r0/tests/cli-0/janitor.verify-cli.test.mjs:126
- TC-cli-11 .sdlc/slices/S-024/verification/r0/tests/cli-0/janitor.verify-cli.test.mjs:159
- TC-cli-12 .sdlc/slices/S-024/verification/r0/tests/cli-0/janitor.verify-cli.test.mjs:179
- TC-cli-13 .sdlc/slices/S-024/verification/r0/tests/cli-0/janitor.verify-cli.test.mjs:190
- TC-cli-14 .sdlc/slices/S-024/verification/r0/tests/cli-0/janitor.verify-cli.test.mjs:215
- TC-contract-1 .sdlc/slices/S-024/verification/r0/tests/contract-0/janitor.verify-contract.test.mjs:17
- TC-contract-2 .sdlc/slices/S-024/verification/r0/tests/contract-0/janitor.verify-contract.test.mjs:40
- TC-contract-3 .sdlc/slices/S-024/verification/r0/tests/contract-0/janitor.verify-contract.test.mjs:59
- TC-contract-4 .sdlc/slices/S-024/verification/r0/tests/contract-0/janitor.verify-contract.test.mjs:77
- TC-contract-5 .sdlc/slices/S-024/verification/r0/tests/contract-0/janitor.verify-contract.test.mjs:92
- TC-contract-6 .sdlc/slices/S-024/verification/r0/tests/contract-0/janitor.verify-contract.test.mjs:117
- TC-contract-7 .sdlc/slices/S-024/verification/r0/tests/contract-0/janitor.verify-contract.test.mjs:131
- TC-contract-8 .sdlc/slices/S-024/verification/r0/tests/contract-0/janitor.verify-contract.test.mjs:146
- TC-contract-9 .sdlc/slices/S-024/verification/r0/tests/contract-0/janitor.verify-contract.test.mjs:156
- TC-contract-10 .sdlc/slices/S-024/verification/r0/tests/contract-0/janitor.verify-contract.test.mjs:181
- TC-contract-11 .sdlc/slices/S-024/verification/r0/tests/contract-0/janitor.verify-contract.test.mjs:190
- TC-contract-12 .sdlc/slices/S-024/verification/r0/tests/contract-0/janitor.verify-contract.test.mjs:206
- TC-security-1 .sdlc/slices/S-024/verification/r0/tests/security-0/janitor.verify-security.test.mjs:27
- TC-security-2 .sdlc/slices/S-024/verification/r0/tests/security-0/janitor.verify-security.test.mjs:48
- TC-security-3 .sdlc/slices/S-024/verification/r0/tests/security-0/janitor.verify-security.test.mjs:61
- TC-security-4 .sdlc/slices/S-024/verification/r0/tests/security-0/janitor.verify-security.test.mjs:79
- TC-security-5 .sdlc/slices/S-024/verification/r0/tests/security-0/janitor.verify-security.test.mjs:90
- TC-security-6 .sdlc/slices/S-024/verification/r0/tests/security-0/janitor.verify-security.test.mjs:99
- TC-security-7 .sdlc/slices/S-024/verification/r0/tests/security-0/janitor.verify-security.test.mjs:111
- TC-security-8 .sdlc/slices/S-024/verification/r0/tests/security-0/janitor.verify-security.test.mjs:145
- TC-security-9 .sdlc/slices/S-024/verification/r0/tests/security-0/janitor.verify-security.test.mjs:193

