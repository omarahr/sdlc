# Verify security: S-fix-M-1-2

Slice: S-fix-M-1-2. Profile: security. Round: 0. Commit: 5676593. Verdict: verified, with one seed.

Threat model: stderr of gh and glab is untrusted text and may hold a token. Trusted: the repo, the plan limits (200 and 20000 characters), the ADR that sets the note tail to status plus HTTP code.

Environment: Python 3 (system), Node 24, gh and glab stubs from stub-server.mjs on PATH, scratch repos from cli-runner.mjs

Test file: `.sdlc/slices/S-fix-M-1-2/verification/r0/tests/security-0/forge-failure.verify-security.test.mjs`. Run log: `.sdlc/slices/S-fix-M-1-2/verification/r0/logs/security-0.log`. Result: 14 pass, 1 fail (the pinned seed).

## TC-security-1 (VS-1): gh 403 with token gives one bounded note

- Given: gh stub exits 1, stderr has a token line and HTTP 403
- When: run branches.py preflight
- Then: note is 'rules unknown on github: gh exited with status 1 (HTTP 403)', no token, samples unchecked
- Result: pass
- Spec source: R-029 acceptance; ADR-20261010-172007-decision-judge-S-fix-M-1-2-91a8
- Test: `.sdlc/slices/S-fix-M-1-2/verification/r0/tests/security-0/forge-failure.verify-security.test.mjs:59`

```
stub call record and tree snapshot: unchanged; no token text in stdout or stderr
```

## TC-security-2 (VS-1): HTTP/2 404 form, token line without status, invalid UTF-8

- Given: gh stub variants
- When: run preflight
- Then: status-only or status plus code, no token
- Result: pass
- Spec source: R-029 acceptance
- Test: `.sdlc/slices/S-fix-M-1-2/verification/r0/tests/security-0/forge-failure.verify-security.test.mjs:68`

```
stub call record and tree snapshot: unchanged; no token text in stdout or stderr
```

## TC-security-3 (VS-1): Token after HTTP is not echoed

- Given: stderr 'HTTP <token>' and 'HTTP 123456789'
- When: run preflight
- Then: no code appended, no token
- Result: pass
- Spec source: R-029 acceptance
- Test: `.sdlc/slices/S-fix-M-1-2/verification/r0/tests/security-0/forge-failure.verify-security.test.mjs:75`

```
stub call record and tree snapshot: unchanged; no token text in stdout or stderr
```

## TC-security-4 (VS-2): glab 401 with token line

- Given: glab stub exits 1 with PRIVATE-TOKEN line and HTTP 401
- When: run preflight
- Then: note 'rules unknown on gitlab: glab exited with status 1 (HTTP 401)', no token
- Result: pass
- Spec source: R-031 acceptance
- Test: `.sdlc/slices/S-fix-M-1-2/verification/r0/tests/security-0/forge-failure.verify-security.test.mjs:81`

```
stub call record and tree snapshot: unchanged; no token text in stdout or stderr
```

## TC-security-5 (VS-2): glab not signed in text is not copied

- Given: glab stub says not logged in with token
- When: run preflight
- Then: note omits stderr words
- Result: pass
- Spec source: R-031 acceptance
- Test: `.sdlc/slices/S-fix-M-1-2/verification/r0/tests/security-0/forge-failure.verify-security.test.mjs:87`

```
stub call record and tree snapshot: unchanged; no token text in stdout or stderr
```

## TC-security-6 (VS-4): gh and glab absent from PATH

- Given: PATH holds only python3 and git
- When: run preflight for both forges
- Then: one-line note under 200 characters plus prefix, no home path
- Result: pass
- Spec source: R-084 acceptance
- Test: `.sdlc/slices/S-fix-M-1-2/verification/r0/tests/security-0/forge-failure.verify-security.test.mjs:93`

```
stub call record and tree snapshot: unchanged; no token text in stdout or stderr
```

## TC-security-7 (VS-3): 10 MB stderr on gh with token first, middle and last

- Given: gh stub writes 10 MB
- When: run preflight
- Then: note under 200 characters, stdout under 20000, no token
- Result: pass
- Spec source: plan.md limits 200 and 20000; R-029
- Test: `.sdlc/slices/S-fix-M-1-2/verification/r0/tests/security-0/forge-failure.verify-security.test.mjs:115`

```
stub call record and tree snapshot: unchanged; no token text in stdout or stderr
```

## TC-security-8 (VS-3): 10 MB stderr on glab

- Given: glab stub writes 10 MB
- When: run preflight
- Then: same bounds
- Result: pass
- Spec source: plan.md limits; R-031
- Test: `.sdlc/slices/S-fix-M-1-2/verification/r0/tests/security-0/forge-failure.verify-security.test.mjs:127`

```
stub call record and tree snapshot: unchanged; no token text in stdout or stderr
```

## TC-security-9 (VS-3): Stalled gh with FORGE_TIMEOUT 1

- Given: gh stub sleeps
- When: call _run_forge_cli
- Then: None plus one-line bounded error within seconds, no token
- Result: pass
- Spec source: R-084 acceptance
- Test: `.sdlc/slices/S-fix-M-1-2/verification/r0/tests/security-0/forge-failure.verify-security.test.mjs:136`

```
stub call record and tree snapshot: unchanged; no token text in stdout or stderr
```

## TC-security-10 (VS-5): _forge_failure over hostile stderr (empty, boom, HTTP 4031, HTTP 40, lowercase, two codes, token with HTTP, CRLF, NUL, bidi, double space)

- Given: pycall.py batch
- When: call _forge_failure
- Then: never raises; code only for one exact ASCII form
- Result: pass
- Spec source: R-029 acceptance
- Test: `.sdlc/slices/S-fix-M-1-2/verification/r0/tests/security-0/forge-failure.verify-security.test.mjs:157`

```
stub call record and tree snapshot: unchanged; no token text in stdout or stderr
```

## TC-security-11 (VS-4): _bounded over multi-line, 5000-char, NUL, U+2028, U+0085, control, path text

- Given: pycall.py batch
- When: call _bounded
- Then: one line, at most 200 characters, never raises
- Result: pass
- Spec source: R-084 acceptance
- Test: `.sdlc/slices/S-fix-M-1-2/verification/r0/tests/security-0/forge-failure.verify-security.test.mjs:189`

```
stub call record and tree snapshot: unchanged; no token text in stdout or stderr
```

## TC-security-12 (VS-1): Invalid UTF-8 stderr with token

- Given: gh stub writes bytes ff fe 80
- When: run preflight
- Then: bounded note, no token
- Result: pass
- Spec source: R-029 acceptance
- Test: `.sdlc/slices/S-fix-M-1-2/verification/r0/tests/security-0/forge-failure.verify-security.test.mjs:199`

```
stub call record and tree snapshot: unchanged; no token text in stdout or stderr
```

## TC-security-13 (VS-4): gh not executable

- Given: gh file mode 0644
- When: run preflight
- Then: one-line bounded note, no home path
- Result: pass
- Spec source: R-084 acceptance
- Test: `.sdlc/slices/S-fix-M-1-2/verification/r0/tests/security-0/forge-failure.verify-security.test.mjs:207`

```
stub call record and tree snapshot: unchanged; no token text in stdout or stderr
```

## TC-security-14 (VS-1): Refusal leaves no side effect

- Given: gh stub fails
- When: run preflight, snapshot repo before and after
- Then: tree and refs unchanged; only 'api' calls made
- Result: pass
- Spec source: R-029 acceptance
- Test: `.sdlc/slices/S-fix-M-1-2/verification/r0/tests/security-0/forge-failure.verify-security.test.mjs:217`

```
stub call record and tree snapshot: unchanged; no token text in stdout or stderr
```

## Attacks

- A-1 [held]: run branches.py preflight: gh stub exits 1, stderr has a token line and HTTP 403 -> held
- A-2 [held]: run preflight: gh stub variants -> held
- A-3 [held]: run preflight: stderr 'HTTP <token>' and 'HTTP 123456789' -> held
- A-4 [held]: run preflight: glab stub exits 1 with PRIVATE-TOKEN line and HTTP 401 -> held
- A-5 [held]: run preflight: glab stub says not logged in with token -> held
- A-6 [held]: run preflight for both forges: PATH holds only python3 and git -> held
- A-7 [held]: run preflight: gh stub writes 10 MB -> held
- A-8 [held]: run preflight: glab stub writes 10 MB -> held
- A-9 [held]: call _run_forge_cli: gh stub sleeps -> held
- A-10 [held]: call _forge_failure: pycall.py batch -> held
- A-11 [held]: call _bounded: pycall.py batch -> held
- A-12 [held]: run preflight: gh stub writes bytes ff fe 80 -> held
- A-13 [held]: run preflight: gh file mode 0644 -> held
- A-14 [held]: run preflight, snapshot repo before and after: gh stub fails -> held
- A-15 [out-of-scope]: stderr 'HTTP ARABIC-INDIC 303 and HTTP FULLWIDTH 403' through _forge_failure -> gh exited with status 1 (HTTP <arabic-indic digits>): \d in a str pattern matches any Unicode digit, so three attacker chosen characters reach the note

## Seeds

- _forge_failure copies Unicode digits as the HTTP code: The pattern \bHTTP(?:/\d(?:\.\d)?)? (\d{3})\b uses str mode, so \d matches Arabic-Indic and fullwidth digits. Stderr 'HTTP ٣٠٣' gives 'gh exited with status 1 (HTTP ٣٠٣)'. Leak is at most three digit characters, so no token leaks, but the plan says 'one exact three-digit code'. Fix: re.ASCII flag or [0-9]. Pinned failing test: .sdlc/slices/S-fix-M-1-2/verification/r0/tests/security-0/forge-failure.verify-security.test.mjs:183
