# Evidence: S-fix-M-1-2

branches.py writes a bounded forge failure note from the exit status and the HTTP code. It never copies forge stderr.

## R-029
A failing `gh api` call gives one bounded note. The note holds the exit status and one ASCII HTTP code. It holds no forge stderr and no secret.

Tests:
- T-R-029-secret
- T-R-029-bounded
- T-R-029a
- T-R-029b
- T-R-031-secret
- T-R-031a
- T-R-084-launch
- T-R-084-multiline
- SC-M-1-059
- SC-M-1-061
- SC-M-1-064
- T-R-029-http-code
- T-R-029-unicode-digits
- .sdlc/slices/S-fix-M-1-2/verification/r0/tests/security-0/forge-failure.verify-security.test.mjs:59
- .sdlc/slices/S-fix-M-1-2/verification/r0/tests/security-0/forge-failure.verify-security.test.mjs:68
- .sdlc/slices/S-fix-M-1-2/verification/r0/tests/security-0/forge-failure.verify-security.test.mjs:75
- .sdlc/slices/S-fix-M-1-2/verification/r0/tests/security-0/forge-failure.verify-security.test.mjs:81
- .sdlc/slices/S-fix-M-1-2/verification/r0/tests/security-0/forge-failure.verify-security.test.mjs:87
- .sdlc/slices/S-fix-M-1-2/verification/r0/tests/security-0/forge-failure.verify-security.test.mjs:93
- .sdlc/slices/S-fix-M-1-2/verification/r0/tests/security-0/forge-failure.verify-security.test.mjs:115
- .sdlc/slices/S-fix-M-1-2/verification/r0/tests/security-0/forge-failure.verify-security.test.mjs:127
- .sdlc/slices/S-fix-M-1-2/verification/r0/tests/security-0/forge-failure.verify-security.test.mjs:136
- .sdlc/slices/S-fix-M-1-2/verification/r0/tests/security-0/forge-failure.verify-security.test.mjs:157
- .sdlc/slices/S-fix-M-1-2/verification/r0/tests/security-0/forge-failure.verify-security.test.mjs:189
- .sdlc/slices/S-fix-M-1-2/verification/r0/tests/security-0/forge-failure.verify-security.test.mjs:199
- .sdlc/slices/S-fix-M-1-2/verification/r0/tests/security-0/forge-failure.verify-security.test.mjs:207
- .sdlc/slices/S-fix-M-1-2/verification/r0/tests/security-0/forge-failure.verify-security.test.mjs:217
- .sdlc/slices/S-fix-M-1-2/verification/r0/tests/limits-0/forge-limits.verify-limits.test.mjs:1
- .sdlc/slices/S-fix-M-1-2/verification/r0/tests/limits-0/forge-limits.verify-limits.test.mjs:2
- .sdlc/slices/S-fix-M-1-2/verification/r0/tests/limits-0/forge-limits.verify-limits.test.mjs:3
- .sdlc/slices/S-fix-M-1-2/verification/r0/tests/limits-0/forge-limits.verify-limits.test.mjs:4
- .sdlc/slices/S-fix-M-1-2/verification/r0/tests/limits-0/forge-limits.verify-limits.test.mjs:5
- .sdlc/slices/S-fix-M-1-2/verification/r0/tests/limits-0/forge-limits.verify-limits.test.mjs:6
- .sdlc/slices/S-fix-M-1-2/verification/r0/tests/cli-0/forge-note.verify-cli.test.mjs

## R-031
A failing `glab` call gives the same bounded note on gitlab. No shim stderr or secret reaches the note or stdout.

Tests:
- T-R-029-secret
- T-R-029-bounded
- T-R-029a
- T-R-029b
- T-R-031-secret
- T-R-031a
- T-R-084-launch
- T-R-084-multiline
- SC-M-1-059
- SC-M-1-061
- SC-M-1-064
- T-R-029-http-code
- T-R-029-unicode-digits
- .sdlc/slices/S-fix-M-1-2/verification/r0/tests/security-0/forge-failure.verify-security.test.mjs:59
- .sdlc/slices/S-fix-M-1-2/verification/r0/tests/security-0/forge-failure.verify-security.test.mjs:68
- .sdlc/slices/S-fix-M-1-2/verification/r0/tests/security-0/forge-failure.verify-security.test.mjs:75
- .sdlc/slices/S-fix-M-1-2/verification/r0/tests/security-0/forge-failure.verify-security.test.mjs:81
- .sdlc/slices/S-fix-M-1-2/verification/r0/tests/security-0/forge-failure.verify-security.test.mjs:87
- .sdlc/slices/S-fix-M-1-2/verification/r0/tests/security-0/forge-failure.verify-security.test.mjs:93
- .sdlc/slices/S-fix-M-1-2/verification/r0/tests/security-0/forge-failure.verify-security.test.mjs:115
- .sdlc/slices/S-fix-M-1-2/verification/r0/tests/security-0/forge-failure.verify-security.test.mjs:127
- .sdlc/slices/S-fix-M-1-2/verification/r0/tests/security-0/forge-failure.verify-security.test.mjs:136
- .sdlc/slices/S-fix-M-1-2/verification/r0/tests/security-0/forge-failure.verify-security.test.mjs:157
- .sdlc/slices/S-fix-M-1-2/verification/r0/tests/security-0/forge-failure.verify-security.test.mjs:189
- .sdlc/slices/S-fix-M-1-2/verification/r0/tests/security-0/forge-failure.verify-security.test.mjs:199
- .sdlc/slices/S-fix-M-1-2/verification/r0/tests/security-0/forge-failure.verify-security.test.mjs:207
- .sdlc/slices/S-fix-M-1-2/verification/r0/tests/security-0/forge-failure.verify-security.test.mjs:217
- .sdlc/slices/S-fix-M-1-2/verification/r0/tests/limits-0/forge-limits.verify-limits.test.mjs:1
- .sdlc/slices/S-fix-M-1-2/verification/r0/tests/limits-0/forge-limits.verify-limits.test.mjs:2
- .sdlc/slices/S-fix-M-1-2/verification/r0/tests/limits-0/forge-limits.verify-limits.test.mjs:3
- .sdlc/slices/S-fix-M-1-2/verification/r0/tests/limits-0/forge-limits.verify-limits.test.mjs:4
- .sdlc/slices/S-fix-M-1-2/verification/r0/tests/limits-0/forge-limits.verify-limits.test.mjs:5
- .sdlc/slices/S-fix-M-1-2/verification/r0/tests/limits-0/forge-limits.verify-limits.test.mjs:6
- .sdlc/slices/S-fix-M-1-2/verification/r0/tests/cli-0/forge-note.verify-cli.test.mjs

## R-084
A launch failure of `gh` or `glab` gives one bounded note. The run still launches with `ok: true` and unchecked samples.

Tests:
- T-R-029-secret
- T-R-029-bounded
- T-R-029a
- T-R-029b
- T-R-031-secret
- T-R-031a
- T-R-084-launch
- T-R-084-multiline
- SC-M-1-059
- SC-M-1-061
- SC-M-1-064
- T-R-029-http-code
- T-R-029-unicode-digits
- .sdlc/slices/S-fix-M-1-2/verification/r0/tests/security-0/forge-failure.verify-security.test.mjs:59
- .sdlc/slices/S-fix-M-1-2/verification/r0/tests/security-0/forge-failure.verify-security.test.mjs:68
- .sdlc/slices/S-fix-M-1-2/verification/r0/tests/security-0/forge-failure.verify-security.test.mjs:75
- .sdlc/slices/S-fix-M-1-2/verification/r0/tests/security-0/forge-failure.verify-security.test.mjs:81
- .sdlc/slices/S-fix-M-1-2/verification/r0/tests/security-0/forge-failure.verify-security.test.mjs:87
- .sdlc/slices/S-fix-M-1-2/verification/r0/tests/security-0/forge-failure.verify-security.test.mjs:93
- .sdlc/slices/S-fix-M-1-2/verification/r0/tests/security-0/forge-failure.verify-security.test.mjs:115
- .sdlc/slices/S-fix-M-1-2/verification/r0/tests/security-0/forge-failure.verify-security.test.mjs:127
- .sdlc/slices/S-fix-M-1-2/verification/r0/tests/security-0/forge-failure.verify-security.test.mjs:136
- .sdlc/slices/S-fix-M-1-2/verification/r0/tests/security-0/forge-failure.verify-security.test.mjs:157
- .sdlc/slices/S-fix-M-1-2/verification/r0/tests/security-0/forge-failure.verify-security.test.mjs:189
- .sdlc/slices/S-fix-M-1-2/verification/r0/tests/security-0/forge-failure.verify-security.test.mjs:199
- .sdlc/slices/S-fix-M-1-2/verification/r0/tests/security-0/forge-failure.verify-security.test.mjs:207
- .sdlc/slices/S-fix-M-1-2/verification/r0/tests/security-0/forge-failure.verify-security.test.mjs:217
- .sdlc/slices/S-fix-M-1-2/verification/r0/tests/limits-0/forge-limits.verify-limits.test.mjs:1
- .sdlc/slices/S-fix-M-1-2/verification/r0/tests/limits-0/forge-limits.verify-limits.test.mjs:2
- .sdlc/slices/S-fix-M-1-2/verification/r0/tests/limits-0/forge-limits.verify-limits.test.mjs:3
- .sdlc/slices/S-fix-M-1-2/verification/r0/tests/limits-0/forge-limits.verify-limits.test.mjs:4
- .sdlc/slices/S-fix-M-1-2/verification/r0/tests/limits-0/forge-limits.verify-limits.test.mjs:5
- .sdlc/slices/S-fix-M-1-2/verification/r0/tests/limits-0/forge-limits.verify-limits.test.mjs:6
- .sdlc/slices/S-fix-M-1-2/verification/r0/tests/cli-0/forge-note.verify-cli.test.mjs
