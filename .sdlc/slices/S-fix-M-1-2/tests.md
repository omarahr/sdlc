T-R-029-secret — R-029 — the note holds the raw stderr, so it names the secret
T-R-029-bounded — R-029 — the note holds the whole 10 MB stderr, so it is not short
T-R-029a — R-029 — the note says `boom`, not `gh exited with status 1`
T-R-029b — R-029 — characterization, passes now
T-R-031-secret — R-031 — the note holds the raw stderr, so it names the secret
T-R-031a — R-031 — the note says `boom`, not `glab exited with status 1`
T-R-084-launch — R-084 — characterization, passes now
T-R-084-multiline — R-084 — the note keeps the newline and all 5000 characters
SC-M-1-059 — R-029 — the note holds the secret from stderr (`e2e/tests/faults.test.mjs`)
SC-M-1-061 — R-031 — the note holds the secret from stderr (`e2e/tests/faults.test.mjs`)
SC-M-1-064 — R-029 — the note holds the huge stderr (`e2e/tests/faults.test.mjs`)

## Promoted in fix round 1

T-R-029-http-code — R-029 — promoted from `verification/r0/tests/security-0/forge-failure.verify-security.test.mjs` (`verify security: VS-5 _forge_failure reads status and one HTTP code only`), in `skills/sdlc/test/branches.test.mjs`
T-R-029-unicode-digits — R-029 — promoted from the same file (`verify security: VS-5 unicode digits never reach the note`), in `skills/sdlc/test/branches.test.mjs`
