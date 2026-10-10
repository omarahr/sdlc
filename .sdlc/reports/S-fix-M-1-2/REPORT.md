# S-fix-M-1-2 · Forge rules failures give a bounded note that holds no forge stderr
Verdict: RELEASED
Commit under test: 981e541 · Rounds: 2 · Attempts: 1 · Risk: medium · Written: 2026-10-10

| Requirements | Scenarios | Cases | Passed | Failed | Blocked | Blocking defects found / fixed | Open seeds |
|---|---|---|---|---|---|---|---|
| 3 | 6 | 32 | 32 | 0 | 0 | 2 / 2 | 8 |

## Summary
The preflight no longer copies the `gh` or `glab` error text into the "rules unknown" note. The note now says `<tool> exited with status <n>`, plus `(HTTP <code>)` when stderr holds a three-digit code. A token in stderr cannot reach stdout, and a 10 MB stderr gives a note of 59 characters. The verifiers ran the real `branches.py preflight` with `gh` and `glab` shims (cli, limits and security profiles in round 0). They found that non-ASCII digits after `HTTP` reached the note, and the reviewer asked for the HTTP parser tests to join the suite. Round 1 fixed both, and the full suite passed (805 tests, 0 failed). The spec text still says `<stderr>`, and proposal P-20261010-172007 records the drift.

## Open risks
- The spec still names `<stderr>` as the note tail. Apply proposal P-20261010-172007 to the spec.
- A launch or timeout note can still name a local path or the `gh` argv. `_bounded` limits it to one line of 200 characters. No secret is in the argv today.
- No committed test covers the timeout branch of `_run_forge_cli` directly. Only the round 0 verifier tests cover it.
- The 200 and 20000 character limits come from plan.md. The spec states no number for them.
- The wall time of the 10 MB case (median 198 ms) has no spec budget. It is a measurement only.
- `subprocess.run` still reads all 10 MB of stderr into memory before the note is built.
- Round 1 ran no profile verifiers. Only the core verifiers and the regression suite checked the fix.
- The user loses the tool's own words (for example "not signed in"). `gh auth status` gives them.

## Traceability
| Requirement | Spec says | Scenarios | Cases | Result |
|---|---|---|---|---|
| R-029 | A `gh api` failure (not signed in, no access, a network error) is one note, `rules unknown on github: <stderr>`, and the samples are `unchecked`. | VS-1, VS-3, VS-4, VS-5, VS-6 | TC-cli-1..4, TC-cli-10..12, TC-limits-1..6, TC-security-1..3, 7, 9, 10, 12, 14 | pass |
| R-031 | A `glab` failure is the note `rules unknown on gitlab: <stderr>` and the samples are `unchecked`. | VS-2, VS-4, VS-5, VS-6 | TC-cli-5..7, TC-security-4, 5, 8, 10 | pass |
| R-084 | **`gh` or `glab` not available or not signed in**: `unchecked`, a note, the run launches. | VS-1, VS-2, VS-4, VS-6 | TC-cli-7..9, TC-security-1, 2, 4, 6, 11, 13 | pass |

The spec quote for R-029 and R-031 keeps `<stderr>`. ADR-20261010-172007-decision-judge-S-fix-M-1-2-91a8 sets the tail to the status and the HTTP code.

## Scenarios
### VS-1 · A failing gh rules read gives one bounded note without the token
Profiles: cli, security. Risk: gh stderr with a token reaches stdout.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-1 | gh stderr with token and HTTP 403 | PASS | `.sdlc/slices/S-fix-M-1-2/verification/r0/tests/cli-0/forge-note.verify-cli.test.mjs:1` |
| TC-cli-2 | gh stderr HTTP/2 404 with token | PASS | `.sdlc/slices/S-fix-M-1-2/verification/r0/tests/cli-0/forge-note.verify-cli.test.mjs:1` |
| TC-cli-3 | gh stderr token only, exit 4 | PASS | `.sdlc/slices/S-fix-M-1-2/verification/r0/tests/cli-0/forge-note.verify-cli.test.mjs:1` |
| TC-cli-4 | samples stay unchecked, one gh call, no token | PASS | `.sdlc/slices/S-fix-M-1-2/verification/r0/tests/cli-0/forge-note.verify-cli.test.mjs:1` |
| TC-security-1 | gh 403 with token gives one bounded note | PASS | `.sdlc/slices/S-fix-M-1-2/verification/r0/tests/security-0/forge-failure.verify-security.test.mjs:59` |
| TC-security-2 | HTTP/2 404 form, token line without status, invalid UTF-8 | PASS | `.sdlc/slices/S-fix-M-1-2/verification/r0/tests/security-0/forge-failure.verify-security.test.mjs:68` |
| TC-security-3 | Token after HTTP is not echoed | PASS | `.sdlc/slices/S-fix-M-1-2/verification/r0/tests/security-0/forge-failure.verify-security.test.mjs:75` |
| TC-security-12 | Invalid UTF-8 stderr with token | PASS | `.sdlc/slices/S-fix-M-1-2/verification/r0/tests/security-0/forge-failure.verify-security.test.mjs:199` |
| TC-security-14 | Refusal leaves no side effect | PASS | `.sdlc/slices/S-fix-M-1-2/verification/r0/tests/security-0/forge-failure.verify-security.test.mjs:217` |

<details>
<summary>Case detail (9 cases)</summary>

#### TC-cli-1 · gh stderr with token and HTTP 403 · PASS
- **Given** a scratch git repo with .sdlc/config.json forge set and a forge shim on PATH **When** python3 branches.py preflight --repo <repo> --mode pr **Then** rules unknown on github: gh exited with status 1 (HTTP 403)
- **Expected** rules unknown on github: gh exited with status 1 (HTTP 403) **Actual** matched; exit 0, ok true, single note, no secret in stdout or stderr
- **Spec source:** R-029 acceptance · **Run:** `VERIFY_REPO=<worktree of sdlc/S-fix-M-1-2> node --test .sdlc/slices/S-fix-M-1-2/verification/r0/tests/cli-0/forge-note.verify-cli.test.mjs`
- Run log: [run log](../../slices/S-fix-M-1-2/verification/r0/logs/cli-0-run1.txt)

#### TC-cli-2 · gh stderr HTTP/2 404 with token · PASS
- **Given** a scratch git repo with .sdlc/config.json forge set and a forge shim on PATH **When** python3 branches.py preflight --repo <repo> --mode pr **Then** note ends (HTTP 404); no token
- **Expected** note ends (HTTP 404); no token **Actual** matched; exit 0, ok true, single note, no secret in stdout or stderr
- **Spec source:** R-029 acceptance · **Run:** `VERIFY_REPO=<worktree of sdlc/S-fix-M-1-2> node --test .sdlc/slices/S-fix-M-1-2/verification/r0/tests/cli-0/forge-note.verify-cli.test.mjs`
- Run log: [run log](../../slices/S-fix-M-1-2/verification/r0/logs/cli-0-run1.txt)

#### TC-cli-3 · gh stderr token only, exit 4 · PASS
- **Given** a scratch git repo with .sdlc/config.json forge set and a forge shim on PATH **When** python3 branches.py preflight --repo <repo> --mode pr **Then** rules unknown on github: gh exited with status 4
- **Expected** rules unknown on github: gh exited with status 4 **Actual** matched; exit 0, ok true, single note, no secret in stdout or stderr
- **Spec source:** R-029 acceptance · **Run:** `VERIFY_REPO=<worktree of sdlc/S-fix-M-1-2> node --test .sdlc/slices/S-fix-M-1-2/verification/r0/tests/cli-0/forge-note.verify-cli.test.mjs`
- Run log: [run log](../../slices/S-fix-M-1-2/verification/r0/logs/cli-0-run1.txt)

#### TC-cli-4 · samples stay unchecked, one gh call, no token · PASS
- **Given** a scratch git repo with .sdlc/config.json forge set and a forge shim on PATH **When** python3 branches.py preflight --repo <repo> --mode pr **Then** all samples unchecked, one note
- **Expected** all samples unchecked, one note **Actual** matched; exit 0, ok true, single note, no secret in stdout or stderr
- **Spec source:** R-029 acceptance · **Run:** `VERIFY_REPO=<worktree of sdlc/S-fix-M-1-2> node --test .sdlc/slices/S-fix-M-1-2/verification/r0/tests/cli-0/forge-note.verify-cli.test.mjs`
- Run log: [run log](../../slices/S-fix-M-1-2/verification/r0/logs/cli-0-run1.txt)

#### TC-security-1 · gh 403 with token gives one bounded note · PASS
- **Given** gh stub exits 1, stderr has a token line and HTTP 403 **When** run branches.py preflight **Then** note is 'rules unknown on github: gh exited with status 1 (HTTP 403)', no token, samples unchecked
- **Expected** note is 'rules unknown on github: gh exited with status 1 (HTTP 403)', no token, samples unchecked **Actual** note is 'rules unknown on github: gh exited with status 1 (HTTP 403)', no token, samples unchecked (held)
- **Spec source:** R-029 acceptance; ADR-20261010-172007-decision-judge-S-fix-M-1-2-91a8 · **Run:** `node --test .sdlc/slices/S-fix-M-1-2/verification/r0/tests/security-0/forge-failure.verify-security.test.mjs`
- Attack log: [test log](../../slices/S-fix-M-1-2/verification/r0/logs/security-0.log)
- Exchange: stub gh/glab recorded calls; repo tree snapshot unchanged; no token text in stdout or stderr

#### TC-security-2 · HTTP/2 404 form, token line without status, invalid UTF-8 · PASS
- **Given** gh stub variants **When** run preflight **Then** status-only or status plus code, no token
- **Expected** status-only or status plus code, no token **Actual** status-only or status plus code, no token (held)
- **Spec source:** R-029 acceptance · **Run:** `node --test .sdlc/slices/S-fix-M-1-2/verification/r0/tests/security-0/forge-failure.verify-security.test.mjs`
- Attack log: [test log](../../slices/S-fix-M-1-2/verification/r0/logs/security-0.log)
- Exchange: stub gh/glab recorded calls; repo tree snapshot unchanged; no token text in stdout or stderr

#### TC-security-3 · Token after HTTP is not echoed · PASS
- **Given** stderr 'HTTP <token>' and 'HTTP 123456789' **When** run preflight **Then** no code appended, no token
- **Expected** no code appended, no token **Actual** no code appended, no token (held)
- **Spec source:** R-029 acceptance · **Run:** `node --test .sdlc/slices/S-fix-M-1-2/verification/r0/tests/security-0/forge-failure.verify-security.test.mjs`
- Attack log: [test log](../../slices/S-fix-M-1-2/verification/r0/logs/security-0.log)
- Exchange: stub gh/glab recorded calls; repo tree snapshot unchanged; no token text in stdout or stderr

#### TC-security-12 · Invalid UTF-8 stderr with token · PASS
- **Given** gh stub writes bytes ff fe 80 **When** run preflight **Then** bounded note, no token
- **Expected** bounded note, no token **Actual** bounded note, no token (held)
- **Spec source:** R-029 acceptance · **Run:** `node --test .sdlc/slices/S-fix-M-1-2/verification/r0/tests/security-0/forge-failure.verify-security.test.mjs`
- Attack log: [test log](../../slices/S-fix-M-1-2/verification/r0/logs/security-0.log)
- Exchange: stub gh/glab recorded calls; repo tree snapshot unchanged; no token text in stdout or stderr

#### TC-security-14 · Refusal leaves no side effect · PASS
- **Given** gh stub fails **When** run preflight, snapshot repo before and after **Then** tree and refs unchanged; only 'api' calls made
- **Expected** tree and refs unchanged; only 'api' calls made **Actual** tree and refs unchanged; only 'api' calls made (held)
- **Spec source:** R-029 acceptance · **Run:** `node --test .sdlc/slices/S-fix-M-1-2/verification/r0/tests/security-0/forge-failure.verify-security.test.mjs`
- Attack log: [test log](../../slices/S-fix-M-1-2/verification/r0/logs/security-0.log)
- Exchange: stub gh/glab recorded calls; repo tree snapshot unchanged; no token text in stdout or stderr

</details>

### VS-2 · A failing glab rules read gives one bounded note without the token
Profiles: cli, security. Risk: shim stderr and its secret reach the note and stdout.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-5 | glab stderr token and HTTP 401 | PASS | `.sdlc/slices/S-fix-M-1-2/verification/r0/tests/cli-0/forge-note.verify-cli.test.mjs:1` |
| TC-cli-6 | glab not signed in with token | PASS | `.sdlc/slices/S-fix-M-1-2/verification/r0/tests/cli-0/forge-note.verify-cli.test.mjs:1` |
| TC-cli-7 | glab absent from PATH | PASS | `.sdlc/slices/S-fix-M-1-2/verification/r0/tests/cli-0/forge-note.verify-cli.test.mjs:1` |
| TC-security-4 | glab 401 with token line | PASS | `.sdlc/slices/S-fix-M-1-2/verification/r0/tests/security-0/forge-failure.verify-security.test.mjs:81` |
| TC-security-5 | glab not signed in text is not copied | PASS | `.sdlc/slices/S-fix-M-1-2/verification/r0/tests/security-0/forge-failure.verify-security.test.mjs:87` |

<details>
<summary>Case detail (5 cases)</summary>

#### TC-cli-5 · glab stderr token and HTTP 401 · PASS
- **Given** a scratch git repo with .sdlc/config.json forge set and a forge shim on PATH **When** python3 branches.py preflight --repo <repo> --mode pr **Then** rules unknown on gitlab: glab exited with status 1 (HTTP 401)
- **Expected** rules unknown on gitlab: glab exited with status 1 (HTTP 401) **Actual** matched; exit 0, ok true, single note, no secret in stdout or stderr
- **Spec source:** R-031 acceptance · **Run:** `VERIFY_REPO=<worktree of sdlc/S-fix-M-1-2> node --test .sdlc/slices/S-fix-M-1-2/verification/r0/tests/cli-0/forge-note.verify-cli.test.mjs`
- Run log: [run log](../../slices/S-fix-M-1-2/verification/r0/logs/cli-0-run1.txt)

#### TC-cli-6 · glab not signed in with token · PASS
- **Given** a scratch git repo with .sdlc/config.json forge set and a forge shim on PATH **When** python3 branches.py preflight --repo <repo> --mode pr **Then** rules unknown on gitlab: glab exited with status 1
- **Expected** rules unknown on gitlab: glab exited with status 1 **Actual** matched; exit 0, ok true, single note, no secret in stdout or stderr
- **Spec source:** R-031 acceptance · **Run:** `VERIFY_REPO=<worktree of sdlc/S-fix-M-1-2> node --test .sdlc/slices/S-fix-M-1-2/verification/r0/tests/cli-0/forge-note.verify-cli.test.mjs`
- Run log: [run log](../../slices/S-fix-M-1-2/verification/r0/logs/cli-0-run1.txt)

#### TC-cli-7 · glab absent from PATH · PASS
- **Given** a scratch git repo with .sdlc/config.json forge set and a forge shim on PATH **When** python3 branches.py preflight --repo <repo> --mode pr **Then** one-line note with gitlab prefix, no home path
- **Expected** one-line note with gitlab prefix, no home path **Actual** matched; exit 0, ok true, single note, no secret in stdout or stderr
- **Spec source:** R-084 acceptance · **Run:** `VERIFY_REPO=<worktree of sdlc/S-fix-M-1-2> node --test .sdlc/slices/S-fix-M-1-2/verification/r0/tests/cli-0/forge-note.verify-cli.test.mjs`
- Run log: [run log](../../slices/S-fix-M-1-2/verification/r0/logs/cli-0-run1.txt)

#### TC-security-4 · glab 401 with token line · PASS
- **Given** glab stub exits 1 with PRIVATE-TOKEN line and HTTP 401 **When** run preflight **Then** note 'rules unknown on gitlab: glab exited with status 1 (HTTP 401)', no token
- **Expected** note 'rules unknown on gitlab: glab exited with status 1 (HTTP 401)', no token **Actual** note 'rules unknown on gitlab: glab exited with status 1 (HTTP 401)', no token (held)
- **Spec source:** R-031 acceptance · **Run:** `node --test .sdlc/slices/S-fix-M-1-2/verification/r0/tests/security-0/forge-failure.verify-security.test.mjs`
- Attack log: [test log](../../slices/S-fix-M-1-2/verification/r0/logs/security-0.log)
- Exchange: stub gh/glab recorded calls; repo tree snapshot unchanged; no token text in stdout or stderr

#### TC-security-5 · glab not signed in text is not copied · PASS
- **Given** glab stub says not logged in with token **When** run preflight **Then** note omits stderr words
- **Expected** note omits stderr words **Actual** note omits stderr words (held)
- **Spec source:** R-031 acceptance · **Run:** `node --test .sdlc/slices/S-fix-M-1-2/verification/r0/tests/security-0/forge-failure.verify-security.test.mjs`
- Attack log: [test log](../../slices/S-fix-M-1-2/verification/r0/logs/security-0.log)
- Exchange: stub gh/glab recorded calls; repo tree snapshot unchanged; no token text in stdout or stderr

</details>

### VS-3 · A gh failure with 10 MB of stderr finishes with a short note
Profiles: cli, security, limits. Risk: the note or stdout grows with stderr. Put the secret in the first line, the last line and the middle of 10 MB. Expect a note under 200 characters, stdout under 20000 characters, ok true, and no secret anywhere. Also try a slow gh against FORGE_TIMEOUT. The 200 and 20000 numbers come from the slice plan.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-10 | 10 MB stderr with token first, middle, last, then HTTP 500 | PASS | `.sdlc/slices/S-fix-M-1-2/verification/r0/tests/cli-0/forge-note.verify-cli.test.mjs:1` |
| TC-cli-11 | 10 MB stderr on one line | PASS | `.sdlc/slices/S-fix-M-1-2/verification/r0/tests/cli-0/forge-note.verify-cli.test.mjs:1` |
| TC-cli-12 | stalled gh hits FORGE_TIMEOUT | PASS | `.sdlc/slices/S-fix-M-1-2/verification/r0/tests/cli-0/forge-note.verify-cli.test.mjs:1` |
| TC-security-7 | 10 MB stderr on gh with token first, middle and last | PASS | `.sdlc/slices/S-fix-M-1-2/verification/r0/tests/security-0/forge-failure.verify-security.test.mjs:115` |
| TC-security-8 | 10 MB stderr on glab | PASS | `.sdlc/slices/S-fix-M-1-2/verification/r0/tests/security-0/forge-failure.verify-security.test.mjs:127` |
| TC-security-9 | Stalled gh with FORGE_TIMEOUT 1 | PASS | `.sdlc/slices/S-fix-M-1-2/verification/r0/tests/security-0/forge-failure.verify-security.test.mjs:136` |
| TC-limits-1 | 10 MB gh stderr, secret in the first part, gives a short note | PASS | `.sdlc/slices/S-fix-M-1-2/verification/r0/tests/limits-0/forge-limits.verify-limits.test.mjs:1` |
| TC-limits-2 | 10 MB gh stderr, secret in the middle part, gives a short note | PASS | `.sdlc/slices/S-fix-M-1-2/verification/r0/tests/limits-0/forge-limits.verify-limits.test.mjs:2` |
| TC-limits-3 | 10 MB gh stderr, secret in the last part, gives a short note | PASS | `.sdlc/slices/S-fix-M-1-2/verification/r0/tests/limits-0/forge-limits.verify-limits.test.mjs:3` |
| TC-limits-4 | Output size does not grow with stderr size | PASS | `.sdlc/slices/S-fix-M-1-2/verification/r0/tests/limits-0/forge-limits.verify-limits.test.mjs:4` |
| TC-limits-5 | Wall time of the 10 MB failure case | PASS | `.sdlc/slices/S-fix-M-1-2/verification/r0/tests/limits-0/forge-limits.verify-limits.test.mjs:5` |
| TC-limits-6 | A stalled gh ends at FORGE_TIMEOUT with a one-line note | PASS | `.sdlc/slices/S-fix-M-1-2/verification/r0/tests/limits-0/forge-limits.verify-limits.test.mjs:6` |

<details>
<summary>Case detail (12 cases)</summary>

#### TC-cli-10 · 10 MB stderr with token first, middle, last, then HTTP 500 · PASS
- **Given** a scratch git repo with .sdlc/config.json forge set and a forge shim on PATH **When** python3 branches.py preflight --repo <repo> --mode pr **Then** note 59 chars, stdout 625 chars, no token
- **Expected** note 59 chars, stdout 625 chars, no token **Actual** matched; exit 0, ok true, single note, no secret in stdout or stderr
- **Spec source:** R-029 acceptance · **Run:** `VERIFY_REPO=<worktree of sdlc/S-fix-M-1-2> node --test .sdlc/slices/S-fix-M-1-2/verification/r0/tests/cli-0/forge-note.verify-cli.test.mjs`
- Run log: [run log](../../slices/S-fix-M-1-2/verification/r0/logs/cli-0-run1.txt)

#### TC-cli-11 · 10 MB stderr on one line · PASS
- **Given** a scratch git repo with .sdlc/config.json forge set and a forge shim on PATH **When** python3 branches.py preflight --repo <repo> --mode pr **Then** note short, stdout under 20000
- **Expected** note short, stdout under 20000 **Actual** matched; exit 0, ok true, single note, no secret in stdout or stderr
- **Spec source:** R-029 acceptance · **Run:** `VERIFY_REPO=<worktree of sdlc/S-fix-M-1-2> node --test .sdlc/slices/S-fix-M-1-2/verification/r0/tests/cli-0/forge-note.verify-cli.test.mjs`
- Run log: [run log](../../slices/S-fix-M-1-2/verification/r0/logs/cli-0-run1.txt)

#### TC-cli-12 · stalled gh hits FORGE_TIMEOUT · PASS
- **Given** a scratch git repo with .sdlc/config.json forge set and a forge shim on PATH **When** python3 branches.py preflight --repo <repo> --mode pr **Then** one-line note after 60 s, ok true
- **Expected** one-line note after 60 s, ok true **Actual** matched; exit 0, ok true, single note, no secret in stdout or stderr
- **Spec source:** R-029 acceptance · **Run:** `VERIFY_REPO=<worktree of sdlc/S-fix-M-1-2> node --test .sdlc/slices/S-fix-M-1-2/verification/r0/tests/cli-0/forge-note.verify-cli.test.mjs`
- Run log: [run log](../../slices/S-fix-M-1-2/verification/r0/logs/cli-0-run1.txt)

#### TC-security-7 · 10 MB stderr on gh with token first, middle and last · PASS
- **Given** gh stub writes 10 MB **When** run preflight **Then** note under 200 characters, stdout under 20000, no token
- **Expected** note under 200 characters, stdout under 20000, no token **Actual** note under 200 characters, stdout under 20000, no token (held)
- **Spec source:** plan.md limits 200 and 20000; R-029 · **Run:** `node --test .sdlc/slices/S-fix-M-1-2/verification/r0/tests/security-0/forge-failure.verify-security.test.mjs`
- Attack log: [test log](../../slices/S-fix-M-1-2/verification/r0/logs/security-0.log)
- Exchange: stub gh/glab recorded calls; repo tree snapshot unchanged; no token text in stdout or stderr

#### TC-security-8 · 10 MB stderr on glab · PASS
- **Given** glab stub writes 10 MB **When** run preflight **Then** same bounds
- **Expected** same bounds **Actual** same bounds (held)
- **Spec source:** plan.md limits; R-031 · **Run:** `node --test .sdlc/slices/S-fix-M-1-2/verification/r0/tests/security-0/forge-failure.verify-security.test.mjs`
- Attack log: [test log](../../slices/S-fix-M-1-2/verification/r0/logs/security-0.log)
- Exchange: stub gh/glab recorded calls; repo tree snapshot unchanged; no token text in stdout or stderr

#### TC-security-9 · Stalled gh with FORGE_TIMEOUT 1 · PASS
- **Given** gh stub sleeps **When** call _run_forge_cli **Then** None plus one-line bounded error within seconds, no token
- **Expected** None plus one-line bounded error within seconds, no token **Actual** None plus one-line bounded error within seconds, no token (held)
- **Spec source:** R-084 acceptance · **Run:** `node --test .sdlc/slices/S-fix-M-1-2/verification/r0/tests/security-0/forge-failure.verify-security.test.mjs`
- Attack log: [test log](../../slices/S-fix-M-1-2/verification/r0/logs/security-0.log)
- Exchange: stub gh/glab recorded calls; repo tree snapshot unchanged; no token text in stdout or stderr

#### TC-limits-1 · 10 MB gh stderr, secret in the first part, gives a short note · PASS
- **Given** gh shim exits 1 with 10 MB stderr, token line in the first part **When** preflight --mode pr runs **Then** Note under 200 characters, stdout under 20000 characters, ok true, no secret in stdout or stderr
- **Expected** Note under 200 characters, stdout under 20000 characters, ok true, no secret in stdout or stderr **Actual** note 'rules unknown on github: gh exited with status 1 (HTTP 403)' (59 chars), stdout 597 chars, stderr 0 chars, ok true, secret absent
- **Spec source:** slice plan S-fix-M-1-2: note under 200 characters, stdout under 20000 characters (R-029) · **Run:** `VERIFY_WT=<worktree of sdlc/S-fix-M-1-2 at 5676593> node --test .sdlc/slices/S-fix-M-1-2/verification/r0/tests/limits-0/forge-limits.verify-limits.test.mjs`
- Measurement (200 note / 20000 stdout (slice plan)): note=59 chars; stdout=597 (586 for last); runs=1; env: macOS Darwin 25.6.0 arm64, Apple M5 Max, 18 CPUs, node v24.19.0, python3 3.x; gh shim with 10 MB stderr

#### TC-limits-2 · 10 MB gh stderr, secret in the middle part, gives a short note · PASS
- **Given** gh shim exits 1 with 10 MB stderr, token line in the middle part **When** preflight --mode pr runs **Then** Note under 200 characters, stdout under 20000 characters, ok true, no secret in stdout or stderr
- **Expected** Note under 200 characters, stdout under 20000 characters, ok true, no secret in stdout or stderr **Actual** note 'rules unknown on github: gh exited with status 1 (HTTP 403)' (59 chars), stdout 597 chars, stderr 0 chars, ok true, secret absent
- **Spec source:** slice plan S-fix-M-1-2: note under 200 characters, stdout under 20000 characters (R-029) · **Run:** `VERIFY_WT=<worktree of sdlc/S-fix-M-1-2 at 5676593> node --test .sdlc/slices/S-fix-M-1-2/verification/r0/tests/limits-0/forge-limits.verify-limits.test.mjs`
- Measurement (200 note / 20000 stdout (slice plan)): note=59 chars; stdout=597 (586 for last); runs=1; env: macOS Darwin 25.6.0 arm64, Apple M5 Max, 18 CPUs, node v24.19.0, python3 3.x; gh shim with 10 MB stderr

#### TC-limits-3 · 10 MB gh stderr, secret in the last part, gives a short note · PASS
- **Given** gh shim exits 1 with 10 MB stderr, token line in the last part **When** preflight --mode pr runs **Then** Note under 200 characters, stdout under 20000 characters, ok true, no secret in stdout or stderr
- **Expected** Note under 200 characters, stdout under 20000 characters, ok true, no secret in stdout or stderr **Actual** note 'rules unknown on github: gh exited with status 1' (48 chars), stdout 597 chars, stderr 0 chars, ok true, secret absent
- **Spec source:** slice plan S-fix-M-1-2: note under 200 characters, stdout under 20000 characters (R-029) · **Run:** `VERIFY_WT=<worktree of sdlc/S-fix-M-1-2 at 5676593> node --test .sdlc/slices/S-fix-M-1-2/verification/r0/tests/limits-0/forge-limits.verify-limits.test.mjs`
- Measurement (200 note / 20000 stdout (slice plan)): note=48 chars; stdout=597 (586 for last); runs=1; env: macOS Darwin 25.6.0 arm64, Apple M5 Max, 18 CPUs, node v24.19.0, python3 3.x; gh shim with 10 MB stderr

#### TC-limits-4 · Output size does not grow with stderr size · PASS
- **Given** stderr of 1 KB, 1 MB, 10 MB **When** preflight runs for each **Then** Same stdout size each time
- **Expected** Same stdout size each time **Actual** stdout size 597, 597, 597
- **Spec source:** slice plan S-fix-M-1-2: note under 200 characters, stdout under 20000 characters (R-029) · **Run:** `VERIFY_WT=<worktree of sdlc/S-fix-M-1-2 at 5676593> node --test .sdlc/slices/S-fix-M-1-2/verification/r0/tests/limits-0/forge-limits.verify-limits.test.mjs`
- Measurement (stdout chars: [597, 597, 597]; env: macOS Darwin 25.6.0 arm64, Apple M5 Max, 18 CPUs, node v24.19.0, python3 3.x; gh shim with 10 MB stderr): undefined

#### TC-limits-5 · Wall time of the 10 MB failure case · PASS
- **Given** 10 MB stderr gh shim **When** preflight, 2 warm-up runs, 10 runs **Then** No budget stated in the spec; record only
- **Expected** No budget stated in the spec; record only **Actual** median 198.2 ms, p95 221.9 ms, worst 221.9 ms
- **Spec source:** none: no time budget stated; measurement only · **Run:** `VERIFY_WT=<worktree of sdlc/S-fix-M-1-2 at 5676593> node --test .sdlc/slices/S-fix-M-1-2/verification/r0/tests/limits-0/forge-limits.verify-limits.test.mjs`
- Measurement (none stated (seed only)): runs=10, median=198.2ms, p95=221.9ms, worst=221.9ms; env: macOS Darwin 25.6.0 arm64, Apple M5 Max, 18 CPUs, node v24.19.0, python3 3.x; gh shim with 10 MB stderr

#### TC-limits-6 · A stalled gh ends at FORGE_TIMEOUT with a one-line note · PASS
- **Given** gh shim sleeps 30 s; FORGE_TIMEOUT set to 1 s **When** read_rules runs **Then** One-line note under 200 characters plus prefix, returns in under 5 s
- **Expected** One-line note under 200 characters plus prefix, returns in under 5 s **Actual** returned in 1.01 s; one-line note about 100 characters naming the argv, no home path
- **Spec source:** slice plan S-fix-M-1-2: note under 200 characters, stdout under 20000 characters (R-029) · **Run:** `VERIFY_WT=<worktree of sdlc/S-fix-M-1-2 at 5676593> node --test .sdlc/slices/S-fix-M-1-2/verification/r0/tests/limits-0/forge-limits.verify-limits.test.mjs`
- Measurement (FORGE_TIMEOUT=1 (set for test; production value 60 in branches.py:91)): elapsed=1.01s, note='rules unknown on github: Command ... timed out after 1 seconds'; env: macOS Darwin 25.6.0 arm64, Apple M5 Max, 18 CPUs, node v24.19.0, python3 3.x; gh shim with 10 MB stderr

</details>

### VS-4 · A missing tool or a timeout gives a one-line note of at most 200 characters
Profiles: cli, security, contract. Risk: launch and timeout errors keep newlines, long text or paths.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-cli-8 | gh absent from PATH | PASS | `.sdlc/slices/S-fix-M-1-2/verification/r0/tests/cli-0/forge-note.verify-cli.test.mjs:1` |
| TC-cli-9 | gh file not executable | PASS | `.sdlc/slices/S-fix-M-1-2/verification/r0/tests/cli-0/forge-note.verify-cli.test.mjs:1` |
| TC-security-6 | gh and glab absent from PATH | PASS | `.sdlc/slices/S-fix-M-1-2/verification/r0/tests/security-0/forge-failure.verify-security.test.mjs:93` |
| TC-security-11 | _bounded over multi-line, 5000-char, NUL, U+2028, U+0085, control, path text | PASS | `.sdlc/slices/S-fix-M-1-2/verification/r0/tests/security-0/forge-failure.verify-security.test.mjs:189` |
| TC-security-13 | gh not executable | PASS | `.sdlc/slices/S-fix-M-1-2/verification/r0/tests/security-0/forge-failure.verify-security.test.mjs:207` |

<details>
<summary>Case detail (5 cases)</summary>

#### TC-cli-8 · gh absent from PATH · PASS
- **Given** a scratch git repo with .sdlc/config.json forge set and a forge shim on PATH **When** python3 branches.py preflight --repo <repo> --mode pr **Then** one-line note with github prefix
- **Expected** one-line note with github prefix **Actual** matched; exit 0, ok true, single note, no secret in stdout or stderr
- **Spec source:** R-084 acceptance · **Run:** `VERIFY_REPO=<worktree of sdlc/S-fix-M-1-2> node --test .sdlc/slices/S-fix-M-1-2/verification/r0/tests/cli-0/forge-note.verify-cli.test.mjs`
- Run log: [run log](../../slices/S-fix-M-1-2/verification/r0/logs/cli-0-run1.txt)

#### TC-cli-9 · gh file not executable · PASS
- **Given** a scratch git repo with .sdlc/config.json forge set and a forge shim on PATH **When** python3 branches.py preflight --repo <repo> --mode pr **Then** one-line note, under 200 characters
- **Expected** one-line note, under 200 characters **Actual** matched; exit 0, ok true, single note, no secret in stdout or stderr
- **Spec source:** R-084 acceptance · **Run:** `VERIFY_REPO=<worktree of sdlc/S-fix-M-1-2> node --test .sdlc/slices/S-fix-M-1-2/verification/r0/tests/cli-0/forge-note.verify-cli.test.mjs`
- Run log: [run log](../../slices/S-fix-M-1-2/verification/r0/logs/cli-0-run1.txt)

#### TC-security-6 · gh and glab absent from PATH · PASS
- **Given** PATH holds only python3 and git **When** run preflight for both forges **Then** one-line note under 200 characters plus prefix, no home path
- **Expected** one-line note under 200 characters plus prefix, no home path **Actual** one-line note under 200 characters plus prefix, no home path (held)
- **Spec source:** R-084 acceptance · **Run:** `node --test .sdlc/slices/S-fix-M-1-2/verification/r0/tests/security-0/forge-failure.verify-security.test.mjs`
- Attack log: [test log](../../slices/S-fix-M-1-2/verification/r0/logs/security-0.log)
- Exchange: stub gh/glab recorded calls; repo tree snapshot unchanged; no token text in stdout or stderr

#### TC-security-11 · _bounded over multi-line, 5000-char, NUL, U+2028, U+0085, control, path text · PASS
- **Given** pycall.py batch **When** call _bounded **Then** one line, at most 200 characters, never raises
- **Expected** one line, at most 200 characters, never raises **Actual** one line, at most 200 characters, never raises (held)
- **Spec source:** R-084 acceptance · **Run:** `node --test .sdlc/slices/S-fix-M-1-2/verification/r0/tests/security-0/forge-failure.verify-security.test.mjs`
- Attack log: [test log](../../slices/S-fix-M-1-2/verification/r0/logs/security-0.log)
- Exchange: stub gh/glab recorded calls; repo tree snapshot unchanged; no token text in stdout or stderr

#### TC-security-13 · gh not executable · PASS
- **Given** gh file mode 0644 **When** run preflight **Then** one-line bounded note, no home path
- **Expected** one-line bounded note, no home path **Actual** one-line bounded note, no home path (held)
- **Spec source:** R-084 acceptance · **Run:** `node --test .sdlc/slices/S-fix-M-1-2/verification/r0/tests/security-0/forge-failure.verify-security.test.mjs`
- Attack log: [test log](../../slices/S-fix-M-1-2/verification/r0/logs/security-0.log)
- Exchange: stub gh/glab recorded calls; repo tree snapshot unchanged; no token text in stdout or stderr

</details>

### VS-5 · The failure text reads the exit status and the HTTP code only
Profiles: contract, security. Risk: Boundary: _forge_failure and _bounded through pycall.py.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-security-10 | _forge_failure over hostile stderr (empty, boom, HTTP 4031, HTTP 40, lowercase, two codes, token with HTTP, CRLF, NUL, bidi, double space) | PASS | `.sdlc/slices/S-fix-M-1-2/verification/r0/tests/security-0/forge-failure.verify-security.test.mjs:157` |

<details>
<summary>Case detail (1 cases)</summary>

#### TC-security-10 · _forge_failure over hostile stderr (empty, boom, HTTP 4031, HTTP 40, lowercase, two codes, token with HTTP, CRLF, NUL, bidi, double space) · PASS
- **Given** pycall.py batch **When** call _forge_failure **Then** never raises; code only for one exact ASCII form
- **Expected** never raises; code only for one exact ASCII form **Actual** never raises; code only for one exact ASCII form (held)
- **Spec source:** R-029 acceptance · **Run:** `node --test .sdlc/slices/S-fix-M-1-2/verification/r0/tests/security-0/forge-failure.verify-security.test.mjs`
- Attack log: [test log](../../slices/S-fix-M-1-2/verification/r0/logs/security-0.log)
- Exchange: stub gh/glab recorded calls; repo tree snapshot unchanged; no token text in stdout or stderr

</details>

### VS-6 · Non-ASCII digits in gh stderr never reach the note
Profiles: contract, security. Risk: Fix changed the HTTP match to ASCII digits only.

| Case | What it proves | Result | Test |
|---|---|---|---|
| A-15 (round 0 attack) | Unicode digits after HTTP never reach the note | FIXED, guarded | `skills/sdlc/test/branches.test.mjs:3146` |

Round 0 attack A-15 found the defect. Round 1 fixed it. No round 1 profile file exists, so the only recorded proof is the promoted test T-R-029-unicode-digits and the passing regression round 1 (805 tests, 0 failed). No profile case exists for this scenario.

## How it was attacked
One security session ran in round 0. Its charter: explore the forge CLI failure text with hostile stderr, to find a way for a secret or unbounded text to reach the note. The threat-model boundary is the `gh` and `glab` process output that `branches.py` reads. The session tried 15 attacks: 14 held and 1 broke (A-15). A-15 put Unicode digits after `HTTP`. The verifier marked it out of scope for the then-current plan. It led to the fix in round 1, so it counts here as broken and fixed. No attack leaked a token.

<details>
<summary>Attack table (15 attacks)</summary>

| Attack | Input | Expected | Observed | Result |
|---|---|---|---|---|
| A-1 | run branches.py preflight: gh stub exits 1, stderr has a token line and HTTP 403 | note is 'rules unknown on github: gh exited with status 1 (HTTP 403)', no token, samples unchecked | held | held |
| A-2 | run preflight: gh stub variants | status-only or status plus code, no token | held | held |
| A-3 | run preflight: stderr 'HTTP <token>' and 'HTTP 123456789' | no code appended, no token | held | held |
| A-4 | run preflight: glab stub exits 1 with PRIVATE-TOKEN line and HTTP 401 | note 'rules unknown on gitlab: glab exited with status 1 (HTTP 401)', no token | held | held |
| A-5 | run preflight: glab stub says not logged in with token | note omits stderr words | held | held |
| A-6 | run preflight for both forges: PATH holds only python3 and git | one-line note under 200 characters plus prefix, no home path | held | held |
| A-7 | run preflight: gh stub writes 10 MB | note under 200 characters, stdout under 20000, no token | held | held |
| A-8 | run preflight: glab stub writes 10 MB | same bounds | held | held |
| A-9 | call _run_forge_cli: gh stub sleeps | None plus one-line bounded error within seconds, no token | held | held |
| A-10 | call _forge_failure: pycall.py batch | never raises; code only for one exact ASCII form | held | held |
| A-11 | call _bounded: pycall.py batch | one line, at most 200 characters, never raises | held | held |
| A-12 | run preflight: gh stub writes bytes ff fe 80 | bounded note, no token | held | held |
| A-13 | run preflight: gh file mode 0644 | one-line bounded note, no home path | held | held |
| A-14 | run preflight, snapshot repo before and after: gh stub fails | tree and refs unchanged; only 'api' calls made | held | held |
| A-15 | stderr 'HTTP ARABIC-INDIC 303 and HTTP FULLWIDTH 403' through _forge_failure | no code appended: only an ASCII three-digit code is a code | gh exited with status 1 (HTTP <arabic-indic digits>): \\d in a str pattern matches any Unicode digit, so three attacker chosen characters reach the note | out-of-scope |

</details>

## Defects found on the way
- **Unicode digits copied as the HTTP code.** Found by the security verifier, round 0, attack A-15. Spec source: ADR-20261010-172007-decision-judge-S-fix-M-1-2-91a8 (one exact three-digit code). Reproduce: stderr `HTTP` followed by three Arabic-Indic digits gives `gh exited with status 1 (HTTP <those digits>)`. Fixed in commit 42355d5 (`re.ASCII` and `[0-9]`). Guarded by `skills/sdlc/test/branches.test.mjs:3146` (T-R-029-unicode-digits). It leaked at most three digit characters and no token.
- **No committed test for the HTTP parser edge cases.** Found by the test-quality reviewer, round 0. Spec source: R-029 acceptance. Reproduce: read `review-test-quality-r0.md`. Fixed in commit 42355d5, which promoted the verifier tests. Guarded by `skills/sdlc/test/branches.test.mjs:3121` (T-R-029-http-code) and `:3146`.
- The core verifiers (spec fidelity, regression) and the architecture and security reviews found no defect in either round.

| Seed | Found by | File |
|---|---|---|
| Launch error text can still hold a path | planner, reviews | `skills/sdlc/branches.py` |
| Spec text still names raw stderr | reviewer | `.sdlc/SPEC-PROPOSALS.md` |
| Timing assertion in the measure self-test (no pass runs it today) | reviewer | `skills/sdlc/test/testkit/measure.test.mjs` |
| Timeout branch of `_run_forge_cli` has no direct committed test | test-quality reviewer | `skills/sdlc/test/branches.test.mjs` |
| Timeout note carries the argv of the failed call | reviewer, limits verifier | `skills/sdlc/branches.py` |
| Property tests have no shrinking | reviewer | `skills/sdlc/test/testkit/property.mjs` |
| 10 MB stderr is read into memory | limits verifier | `skills/sdlc/branches.py` |
| Word boundary is ASCII only, so a code next to a non-ASCII character still counts | round 1 verifier | `skills/sdlc/branches.py` |

## Appendix
- Toolkit tools used: cli-runner (`skills/sdlc/test/testkit/cli-runner.mjs`), glab-stub (`skills/sdlc/test/testkit/glab-stub.mjs`), attack-corpus (`skills/sdlc/test/testkit/attack-corpus.mjs`), property and pycall (`skills/sdlc/test/testkit/property.mjs`, `pycall.py`), measure (`skills/sdlc/test/testkit/measure.mjs`; plan r1 listed it as not yet existing).
- Plans: [round 0](../../slices/S-fix-M-1-2/verification/plan-r0.md), [round 1](../../slices/S-fix-M-1-2/verification/plan-r1.md).
- Round 0 evidence: [cli](../../slices/S-fix-M-1-2/verification/r0/cli-0.md), [limits](../../slices/S-fix-M-1-2/verification/r0/limits-0.md), [security](../../slices/S-fix-M-1-2/verification/r0/security-0.md).
- Core verifiers: [spec fidelity r0](../../slices/S-fix-M-1-2/verify-spec-fidelity-r0.md), [r1](../../slices/S-fix-M-1-2/verify-spec-fidelity-r1.md); [regression r0](../../slices/S-fix-M-1-2/verify-regression-r0.md), [r1](../../slices/S-fix-M-1-2/verify-regression-r1.md); [gate](../../slices/S-fix-M-1-2/gate-r0.md).
- Committed tests: `skills/sdlc/test/branches.test.mjs:1829` (T-R-029a), `:3093` (T-R-029-secret), `:3104` (T-R-029-bounded), `:1947` (T-R-031a), `:3151` (T-R-031-secret), `:3162` (T-R-084-launch), `:3176` (T-R-084-multiline); e2e `e2e/tests/faults.test.mjs:128`, `:159`, `:262` (SC-M-1-059, -061, -064).
- Missing sources: no round 1 profile evidence files, so scenario VS-6 has no profile case. No contract profile file exists for round 0, although plan r0 listed it.
