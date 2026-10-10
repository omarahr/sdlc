# Verification: S-fix-M-1-2, profile cli, part 0, round 0

Commit: 5676593. Verdict: all 12 cases pass. The same cases 1, 5 and 10 fail on the commit before the fix (7a3e774), so they can fail.

Environment: macOS, node 24.19, python3, real branches.py preflight run through cli-runner; gh and glab shims from stub-server on PATH; scratch HOME and git repo

Command: `VERIFY_REPO=<worktree of sdlc/S-fix-M-1-2> node --test .sdlc/slices/S-fix-M-1-2/verification/r0/tests/cli-0/forge-note.verify-cli.test.mjs`

## TC-cli-1 (VS-1): gh stderr with token and HTTP 403
- Given: a scratch git repo with .sdlc/config.json forge set and a forge shim on PATH
- When: python3 branches.py preflight --repo <repo> --mode pr
- Then / expected: rules unknown on github: gh exited with status 1 (HTTP 403)
- Actual: matched; exit 0, ok true, single note, no secret in stdout or stderr
- Result: pass
- Spec source: R-029 acceptance
- Evidence: transcript in `.sdlc/slices/S-fix-M-1-2/verification/r0/logs/cli-0-run1.txt`

## TC-cli-2 (VS-1): gh stderr HTTP/2 404 with token
- Given: a scratch git repo with .sdlc/config.json forge set and a forge shim on PATH
- When: python3 branches.py preflight --repo <repo> --mode pr
- Then / expected: note ends (HTTP 404); no token
- Actual: matched; exit 0, ok true, single note, no secret in stdout or stderr
- Result: pass
- Spec source: R-029 acceptance
- Evidence: transcript in `.sdlc/slices/S-fix-M-1-2/verification/r0/logs/cli-0-run1.txt`

## TC-cli-3 (VS-1): gh stderr token only, exit 4
- Given: a scratch git repo with .sdlc/config.json forge set and a forge shim on PATH
- When: python3 branches.py preflight --repo <repo> --mode pr
- Then / expected: rules unknown on github: gh exited with status 4
- Actual: matched; exit 0, ok true, single note, no secret in stdout or stderr
- Result: pass
- Spec source: R-029 acceptance
- Evidence: transcript in `.sdlc/slices/S-fix-M-1-2/verification/r0/logs/cli-0-run1.txt`

## TC-cli-4 (VS-1): samples stay unchecked, one gh call, no token
- Given: a scratch git repo with .sdlc/config.json forge set and a forge shim on PATH
- When: python3 branches.py preflight --repo <repo> --mode pr
- Then / expected: all samples unchecked, one note
- Actual: matched; exit 0, ok true, single note, no secret in stdout or stderr
- Result: pass
- Spec source: R-029 acceptance
- Evidence: transcript in `.sdlc/slices/S-fix-M-1-2/verification/r0/logs/cli-0-run1.txt`

## TC-cli-5 (VS-2): glab stderr token and HTTP 401
- Given: a scratch git repo with .sdlc/config.json forge set and a forge shim on PATH
- When: python3 branches.py preflight --repo <repo> --mode pr
- Then / expected: rules unknown on gitlab: glab exited with status 1 (HTTP 401)
- Actual: matched; exit 0, ok true, single note, no secret in stdout or stderr
- Result: pass
- Spec source: R-031 acceptance
- Evidence: transcript in `.sdlc/slices/S-fix-M-1-2/verification/r0/logs/cli-0-run1.txt`

## TC-cli-6 (VS-2): glab not signed in with token
- Given: a scratch git repo with .sdlc/config.json forge set and a forge shim on PATH
- When: python3 branches.py preflight --repo <repo> --mode pr
- Then / expected: rules unknown on gitlab: glab exited with status 1
- Actual: matched; exit 0, ok true, single note, no secret in stdout or stderr
- Result: pass
- Spec source: R-031 acceptance
- Evidence: transcript in `.sdlc/slices/S-fix-M-1-2/verification/r0/logs/cli-0-run1.txt`

## TC-cli-7 (VS-2): glab absent from PATH
- Given: a scratch git repo with .sdlc/config.json forge set and a forge shim on PATH
- When: python3 branches.py preflight --repo <repo> --mode pr
- Then / expected: one-line note with gitlab prefix, no home path
- Actual: matched; exit 0, ok true, single note, no secret in stdout or stderr
- Result: pass
- Spec source: R-084 acceptance
- Evidence: transcript in `.sdlc/slices/S-fix-M-1-2/verification/r0/logs/cli-0-run1.txt`

## TC-cli-8 (VS-4): gh absent from PATH
- Given: a scratch git repo with .sdlc/config.json forge set and a forge shim on PATH
- When: python3 branches.py preflight --repo <repo> --mode pr
- Then / expected: one-line note with github prefix
- Actual: matched; exit 0, ok true, single note, no secret in stdout or stderr
- Result: pass
- Spec source: R-084 acceptance
- Evidence: transcript in `.sdlc/slices/S-fix-M-1-2/verification/r0/logs/cli-0-run1.txt`

## TC-cli-9 (VS-4): gh file not executable
- Given: a scratch git repo with .sdlc/config.json forge set and a forge shim on PATH
- When: python3 branches.py preflight --repo <repo> --mode pr
- Then / expected: one-line note, under 200 characters
- Actual: matched; exit 0, ok true, single note, no secret in stdout or stderr
- Result: pass
- Spec source: R-084 acceptance
- Evidence: transcript in `.sdlc/slices/S-fix-M-1-2/verification/r0/logs/cli-0-run1.txt`

## TC-cli-10 (VS-3): 10 MB stderr with token first, middle, last, then HTTP 500
- Given: a scratch git repo with .sdlc/config.json forge set and a forge shim on PATH
- When: python3 branches.py preflight --repo <repo> --mode pr
- Then / expected: note 59 chars, stdout 625 chars, no token
- Actual: matched; exit 0, ok true, single note, no secret in stdout or stderr
- Result: pass
- Spec source: R-029 acceptance
- Evidence: transcript in `.sdlc/slices/S-fix-M-1-2/verification/r0/logs/cli-0-run1.txt`

## TC-cli-11 (VS-3): 10 MB stderr on one line
- Given: a scratch git repo with .sdlc/config.json forge set and a forge shim on PATH
- When: python3 branches.py preflight --repo <repo> --mode pr
- Then / expected: note short, stdout under 20000
- Actual: matched; exit 0, ok true, single note, no secret in stdout or stderr
- Result: pass
- Spec source: R-029 acceptance
- Evidence: transcript in `.sdlc/slices/S-fix-M-1-2/verification/r0/logs/cli-0-run1.txt`

## TC-cli-12 (VS-3): stalled gh hits FORGE_TIMEOUT
- Given: a scratch git repo with .sdlc/config.json forge set and a forge shim on PATH
- When: python3 branches.py preflight --repo <repo> --mode pr
- Then / expected: one-line note after 60 s, ok true
- Actual: matched; exit 0, ok true, single note, no secret in stdout or stderr
- Result: pass
- Spec source: R-029 acceptance
- Evidence: transcript in `.sdlc/slices/S-fix-M-1-2/verification/r0/logs/cli-0-run1.txt`

## Transcript excerpt
```
$ python3 branches.py preflight --repo <repo> --mode pr   (gh stderr: token ghp_SECRET123, HTTP 403, exit 1)
exit: 0
notes: ["rules unknown on github: gh exited with status 1 (HTTP 403)"]
samples: slice, state, e2e all "unchecked"
timeout case: rules unknown on github: Command '['gh', 'api', ...]' timed out after 60 seconds
absent: rules unknown on github: [Errno 2] No such file or directory: 'gh'
```

## Attacks
None beyond the cases.

## Seeds
None.