# Verification: security, part 0

- Slice: S-015
- Profile: security
- Round: 0
- Commit: 7f87721
- Verdict: no in-scope failure. 22 tests pass; 6 tests are todo seeds (A8, A17, A18, A25, A26, A27).

## Environment

node v24.19.0, python3 with git 2.50.1 (Apple Git-155), gh and glab shims from the testkit on a controlled PATH, no network

## Charters and threat model

- VS-3: explore the mr working branch with option-like, spaced, empty and corpus names to find a rename, an option injection or a side effect (R-040).
- VS-4: explore forge answers (matching, uncompilable, failing, malformed) to find a crash or a block (R-041).
- VS-5: explore output shape and exit codes with hostile labels and formats to find a second JSON object or a wrong ok (R-044).
- VS-6: explore invalid ref names under three forge states to find a name that passes (R-044, R-040, spec section 3).
- VS-7: explore a missing, signed-out and garbage forge tool to find a crash or block (R-084, R-041).

The spec states no threat model. The command runs locally. The user, the repo config and the forge answer are treated as semi-trusted. Attacks that need a malformed forge answer or a hostile cwd become seeds.

Run log: `.sdlc/slices/S-015/verification/r0/logs/security-0-run.txt`. Attack log: `.sdlc/slices/S-015/verification/r0/logs/security-0-attacks.jsonl`. Each test asserts no tree change (git refs included) and no gh call beyond the stated ones.

## Cases

### TC-security-1 (VS-3, A1): mr working branch equal to a slice name is kept as given, last

- Given: a scratch git repo, a gh or glab shim, a controlled PATH
- When: preflight runs with the attack input
- Then / expected: one working sample named sdlc/S-001, exit 0, tree unchanged
- Actual: as expected
- Result: held
- Spec source: R-040 acceptance
- Test: `.sdlc/slices/S-015/verification/r0/tests/security-0/preflight.verify-security.test.mjs:29`

### TC-security-2 (VS-3, A2): pr, stack and direct ignore a hostile --branch

- Given: a scratch git repo, a gh or glab shim, a controlled PATH
- When: preflight runs with the attack input
- Then / expected: no working sample; no gh argv carries the value
- Actual: as expected
- Result: held
- Spec source: R-040 acceptance
- Test: `.sdlc/slices/S-015/verification/r0/tests/security-0/preflight.verify-security.test.mjs:39`

### TC-security-3 (VS-3, A3): option-like, spaced and empty --branch=<v> never become git or gh options

- Given: a scratch git repo, a gh or glab shim, a controlled PATH
- When: preflight runs with the attack input
- Then / expected: working name verbatim; option-like and spaced names fail; empty adds no sample; gh path stays one quoted segment
- Actual: as expected
- Result: held
- Spec source: R-040 acceptance
- Test: `.sdlc/slices/S-015/verification/r0/tests/security-0/preflight.verify-security.test.mjs:53`

### TC-security-4 (VS-3, A3b): separate option-like value for --branch exits 2 with one error object

- Given: a scratch git repo, a gh or glab shim, a controlled PATH
- When: preflight runs with the attack input
- Then / expected: exit 2, {ok:false,error}
- Actual: as expected
- Result: held
- Spec source: R-040 acceptance
- Test: `.sdlc/slices/S-015/verification/r0/tests/security-0/preflight.verify-security.test.mjs:76`

### TC-security-5 (VS-3, A4): attack corpus (7 families) as working branch

- Given: a scratch git repo, a gh or glab shim, a controlled PATH
- When: preflight runs with the attack input
- Then / expected: no crash, name verbatim, tree unchanged, exit 1 iff fail
- Actual: as expected
- Result: held
- Spec source: R-040 acceptance
- Test: `.sdlc/slices/S-015/verification/r0/tests/security-0/preflight.verify-security.test.mjs:87`

### TC-security-6 (VS-4, A5): no forge: ok true, all unchecked, zero gh calls, all four modes

- Given: a scratch git repo, a gh or glab shim, a controlled PATH
- When: preflight runs with the attack input
- Then / expected: as stated
- Actual: as expected
- Result: held
- Spec source: R-041 acceptance
- Test: `.sdlc/slices/S-015/verification/r0/tests/security-0/preflight.verify-security.test.mjs:106`

### TC-security-7 (VS-4, A6): matching rule passes; uncompilable regexes are unevaluated with a note

- Given: a scratch git repo, a gh or glab shim, a controlled PATH
- When: preflight runs with the attack input
- Then / expected: exit 0, pass / unevaluated, cannot evaluate note
- Actual: as expected
- Result: held
- Spec source: R-041 acceptance
- Test: `.sdlc/slices/S-015/verification/r0/tests/security-0/preflight.verify-security.test.mjs:121`

### TC-security-8 (VS-4, A7): gh exit 1, non-JSON, JSON object, empty output give one rules-unknown note

- Given: a scratch git repo, a gh or glab shim, a controlled PATH
- When: preflight runs with the attack input
- Then / expected: exit 0, unchecked, one gh call
- Actual: as expected
- Result: held
- Spec source: R-041 acceptance
- Test: `.sdlc/slices/S-015/verification/r0/tests/security-0/preflight.verify-security.test.mjs:136`

### TC-security-9 (VS-4, A8): forge rule with a non-string pattern (null, 5, list, dict)

- Given: a scratch git repo, a gh or glab shim, a controlled PATH
- When: preflight runs with the attack input
- Then / expected: exit 0 and a JSON object
- Actual: exit 1, Python traceback, no JSON, for 6 of 9 shapes (TypeError in evaluate)
- Result: out-of-scope
- Spec source: R-041 acceptance
- Test: `.sdlc/slices/S-015/verification/r0/tests/security-0/preflight.verify-security.test.mjs:150`

### TC-security-10 (VS-4, A9): glab malformed push-rule bodies

- Given: a scratch git repo, a gh or glab shim, a controlled PATH
- When: preflight runs with the attack input
- Then / expected: no crash
- Actual: as expected
- Result: held
- Spec source: R-041 acceptance
- Test: `.sdlc/slices/S-015/verification/r0/tests/security-0/preflight.verify-security.test.mjs:174`

### TC-security-11 (VS-5, A10): keys, exit 1, one JSON object, first failing rule label

- Given: a scratch git repo, a gh or glab shim, a controlled PATH
- When: preflight runs with the attack input
- Then / expected: as stated
- Actual: as expected
- Result: held
- Spec source: R-044 acceptance
- Test: `.sdlc/slices/S-015/verification/r0/tests/security-0/preflight.verify-security.test.mjs:187`

### TC-security-12 (VS-5, A11): hostile rule labels (newline, ANSI, JSON break-out, 100000 chars, RLO)

- Given: a scratch git repo, a gh or glab shim, a controlled PATH
- When: preflight runs with the attack input
- Then / expected: one JSON line, label verbatim
- Actual: as expected
- Result: held
- Spec source: R-044 acceptance
- Test: `.sdlc/slices/S-015/verification/r0/tests/security-0/preflight.verify-security.test.mjs:205`

### TC-security-13 (VS-5, A12): negate as string, 0, null; ok never true with a failing sample

- Given: a scratch git repo, a gh or glab shim, a controlled PATH
- When: preflight runs with the attack input
- Then / expected: ok equals no fail
- Actual: as expected
- Result: held
- Spec source: R-044 acceptance
- Test: `.sdlc/slices/S-015/verification/r0/tests/security-0/preflight.verify-security.test.mjs:218`

### TC-security-14 (VS-5, A13): bad mode and format inputs exit 2, no side effect, shell metacharacters inert

- Given: a scratch git repo, a gh or glab shim, a controlled PATH
- When: preflight runs with the attack input
- Then / expected: exit 2 or 0, one JSON object, tree unchanged
- Actual: as expected
- Result: held
- Spec source: R-044 acceptance
- Test: `.sdlc/slices/S-015/verification/r0/tests/security-0/preflight.verify-security.test.mjs:231`

### TC-security-15 (VS-5, A14): attack corpus as a format prefix; gh path stays one quoted segment

- Given: a scratch git repo, a gh or glab shim, a controlled PATH
- When: preflight runs with the attack input
- Then / expected: no crash; no raw / ? # or space in the gh path
- Actual: as expected
- Result: held
- Spec source: R-044 acceptance
- Test: `.sdlc/slices/S-015/verification/r0/tests/security-0/preflight.verify-security.test.mjs:244`

### TC-security-16 (VS-6, A15): 21 invalid ref names x (no forge, rules, rules unknown)

- Given: a scratch git repo, a gh or glab shim, a controlled PATH
- When: preflight runs with the attack input
- Then / expected: fail with git check-ref-format (or the forge label when a rule fails first); other samples unchecked
- Actual: as expected
- Result: held
- Spec source: R-044 acceptance; spec §3 line 118
- Test: `.sdlc/slices/S-015/verification/r0/tests/security-0/preflight.verify-security.test.mjs:261`

### TC-security-17 (VS-6, A16): spec example a..b, exact samples array

- Given: a scratch git repo, a gh or glab shim, a controlled PATH
- When: preflight runs with the attack input
- Then / expected: [{working,a..b,fail,git check-ref-format}] exit 1
- Actual: as expected
- Result: held
- Spec source: R-044 acceptance; spec §3 line 118
- Test: `.sdlc/slices/S-015/verification/r0/tests/security-0/preflight.verify-security.test.mjs:281`

### TC-security-18 (VS-6, A17): @{-1} and @{-2} as working branch, run from a repo with branch history

- Given: a scratch git repo, a gh or glab shim, a controlled PATH
- When: preflight runs with the attack input
- Then / expected: fail (refs/heads/@{-1} is not a valid ref)
- Actual: unchecked, exit 0: git check-ref-format --branch expands @{-n} against the cwd repo
- Result: out-of-scope
- Spec source: R-044 acceptance; spec §3 line 118
- Test: `.sdlc/slices/S-015/verification/r0/tests/security-0/preflight.verify-security.test.mjs:289`

### TC-security-19 (VS-6, A18): same name from two cwds gives the same verdict

- Given: a scratch git repo, a gh or glab shim, a controlled PATH
- When: preflight runs with the attack input
- Then / expected: same result
- Actual: unchecked from a repo with history, fail from a plain directory
- Result: out-of-scope
- Spec source: R-044 acceptance; spec §3 line 118
- Test: `.sdlc/slices/S-015/verification/r0/tests/security-0/preflight.verify-security.test.mjs:304`

### TC-security-20 (VS-6, A19): odd but valid names are not refused

- Given: a scratch git repo, a gh or glab shim, a controlled PATH
- When: preflight runs with the attack input
- Then / expected: unchecked, exit 0
- Actual: as expected
- Result: held
- Spec source: R-044 acceptance; spec §3 line 118
- Test: `.sdlc/slices/S-015/verification/r0/tests/security-0/preflight.verify-security.test.mjs:316`

### TC-security-21 (VS-7, A20): gh or glab absent from PATH, four modes

- Given: a scratch git repo, a gh or glab shim, a controlled PATH
- When: preflight runs with the attack input
- Then / expected: exit 0, ok true, one note, unchecked (direct on github has no sample and no note)
- Actual: as expected
- Result: held
- Spec source: R-084 acceptance
- Test: `.sdlc/slices/S-015/verification/r0/tests/security-0/preflight.verify-security.test.mjs:327`

### TC-security-22 (VS-7, A21): signed-out gh, invalid UTF-8, truncated JSON, 100000-deep JSON, 300000-byte stderr

- Given: a scratch git repo, a gh or glab shim, a controlled PATH
- When: preflight runs with the attack input
- Then / expected: exit 0, one note, unchecked
- Actual: as expected
- Result: held
- Spec source: R-084 acceptance
- Test: `.sdlc/slices/S-015/verification/r0/tests/security-0/preflight.verify-security.test.mjs:346`

### TC-security-23 (VS-7, A22): glab signed-out and garbage

- Given: a scratch git repo, a gh or glab shim, a controlled PATH
- When: preflight runs with the attack input
- Then / expected: exit 0, ok true
- Actual: as expected
- Result: held
- Spec source: R-084 acceptance
- Test: `.sdlc/slices/S-015/verification/r0/tests/security-0/preflight.verify-security.test.mjs:368`

### TC-security-24 (VS-7, A23): a..b with gh missing

- Given: a scratch git repo, a gh or glab shim, a controlled PATH
- When: preflight runs with the attack input
- Then / expected: exit 1, git check-ref-format, one note
- Actual: as expected
- Result: held
- Spec source: R-084 acceptance
- Test: `.sdlc/slices/S-015/verification/r0/tests/security-0/preflight.verify-security.test.mjs:380`

### TC-security-25 (VS-7, A24): executable gh planted in the repo with an empty PATH entry

- Given: a scratch git repo, a gh or glab shim, a controlled PATH
- When: preflight runs with the attack input
- Then / expected: planted tool not run
- Actual: as expected
- Result: held
- Spec source: R-084 acceptance
- Test: `.sdlc/slices/S-015/verification/r0/tests/security-0/preflight.verify-security.test.mjs:389`

### TC-security-26 (VS-4, A25): working branch .. and . reach gh as repos/{owner}/{repo}/rules/branches/.. and /.

- Given: a scratch git repo, a gh or glab shim, a controlled PATH
- When: preflight runs with the attack input
- Then / expected: no request for an invalid ref name
- Actual: gh api called with a dot segment, a different endpoint
- Result: out-of-scope
- Spec source: R-041 acceptance
- Test: `.sdlc/slices/S-015/verification/r0/tests/security-0/preflight.verify-security.test.mjs:400`

### TC-security-27 (VS-4, A26): forge regex ^(a+)+$ against a 41-character working branch

- Given: a scratch git repo, a gh or glab shim, a controlled PATH
- When: preflight runs with the attack input
- Then / expected: finishes
- Actual: still running after 8 s (catastrophic backtracking)
- Result: out-of-scope
- Spec source: R-041 acceptance
- Test: `.sdlc/slices/S-015/verification/r0/tests/security-0/preflight.verify-security.test.mjs:413`

### TC-security-28 (VS-5, A27): gh stderr holding a token is echoed into notes

- Given: a scratch git repo, a gh or glab shim, a controlled PATH
- When: preflight runs with the attack input
- Then / expected: no secret in output
- Actual: the token text appears in notes
- Result: out-of-scope
- Spec source: R-044 acceptance
- Test: `.sdlc/slices/S-015/verification/r0/tests/security-0/preflight.verify-security.test.mjs:421`

## Attacks

| id | result | observed |
|---|---|---|
| A1 | held | as expected |
| A2 | held | as expected |
| A3 | held | as expected |
| A3b | held | as expected |
| A4 | held | as expected |
| A5 | held | as expected |
| A6 | held | as expected |
| A7 | held | as expected |
| A8 | out-of-scope | exit 1, Python traceback, no JSON, for 6 of 9 shapes (TypeError in evaluate) |
| A9 | held | as expected |
| A10 | held | as expected |
| A11 | held | as expected |
| A12 | held | as expected |
| A13 | held | as expected |
| A14 | held | as expected |
| A15 | held | as expected |
| A16 | held | as expected |
| A17 | out-of-scope | unchecked, exit 0: git check-ref-format --branch expands @{-n} against the cwd repo |
| A18 | out-of-scope | unchecked from a repo with history, fail from a plain directory |
| A19 | held | as expected |
| A20 | held | as expected |
| A21 | held | as expected |
| A22 | held | as expected |
| A23 | held | as expected |
| A24 | held | as expected |
| A25 | out-of-scope | gh api called with a dot segment, a different endpoint |
| A26 | out-of-scope | still running after 8 s (catastrophic backtracking) |
| A27 | out-of-scope | the token text appears in notes |

## Seeds

- A forge rule with a non-string pattern crashes preflight. Rules from gh with pattern null, a number, a list or a dict, and an operator starts_with, ends_with, contains or regex, raise TypeError in evaluate/_raw_result. Preflight exits 1 with a traceback and no JSON, so the caller reads it as not ok. Catch TypeError in _raw_result and return None so the sample is unevaluated. Test: preflight.verify-security.test.mjs:150 (A8, todo).
- ref_format_error uses --branch and the process cwd, so @{-n} gives a cwd-dependent verdict. git check-ref-format --branch expands @{-1} against the repository in the cwd. In a repo with branch history, --branch=@{-1} gives unchecked and exit 0. In a plain directory it gives fail. The name refs/heads/@{-1} is invalid. The spec names the --branch form, so this is a seed. Run git from a scratch cwd or add a plain check-ref-format on refs/heads/<name>. Tests: preflight.verify-security.test.mjs:289, :304 (A17, A18, todo).
- Dot-segment names reach gh as a path segment. A working branch .. or . passes through urllib.parse.quote unchanged, so gh api is called with repos/{owner}/{repo}/rules/branches/.. . The request is read-only but targets another endpoint. Skip the gh call for a sample that fails the local ref check. Test: preflight.verify-security.test.mjs:400 (A25, todo).
- verify-limits: forge regex with catastrophic backtracking hangs preflight. A forge pattern ^(a+)+$ against a 41-character working branch does not finish in 8 s. re.search has no time limit. The spec states no limit. Test: preflight.verify-security.test.mjs:413 (A26, todo).
- Forge CLI stderr is copied into notes verbatim. The note rules unknown on github: <stderr> holds the full stderr, up to the whole stream (300000 bytes held in A21). A stderr that holds a token would reach the output and any log. The spec says the note holds <stderr>, so this is a seed. Truncate and redact. Test: preflight.verify-security.test.mjs:421 (A27, todo).
- github direct mode gives no rules-unknown note when gh is missing, gitlab does. With no samples (direct mode) and gh absent, preflight prints ok true and no note. With glab absent it prints one note. The two forges differ. The R-084 acceptance covers samples, so this is a seed. Tests: preflight.verify-security.test.mjs:327 (A20).
- testkit: attack-corpus has no ref-name family. The corpus lacks git ref-name attacks (@{-1}, refs/heads/ prefixes, trailing dot, .lock, bracket and backslash). A15 and A17 define their lists inline.
