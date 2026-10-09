# S-013 security-0 (round 0)

Slice: S-013. Profile: security. Round: 0. Commit: fe02f01. Verdict: verified (14 of 14 pass, 4 seeds).

Environment: Python 3.14.7, Node 24.19, gh stub shim from testkit stub-server, no network

Charter: threat model per spec §3. The samples, the `gh` output and the repo config are untrusted input. `gh` and the test host are trusted.

## TC-security-1 (VS-1, R-027): Corpus values stay one path segment in a two-item argv

- Given: a github repo and a gh shim
- When: read_rules runs on 8 corpus families (injection, traversal, flag-like, format strings, control chars, confusables, whitespace, oversized)
- Then: each sample gives one gh call, argv exactly [api, repos/{owner}/{repo}/rules/branches/<one segment>], tree unchanged
- Result: pass
- Spec source: R-027 acceptance
- Test: `.sdlc/slices/S-013/verification/r0/tests/security-0/read-rules.verify-security.test.mjs:62`

```
ATK-1: all entries held; only dot-only samples differ (see ATK-2)
```

## TC-security-2 (VS-1, R-027): Dot-only samples stay unencoded

- Given: samples . and ..
- When: read_rules runs
- Then: path ends in branches/. and branches/.. (quote leaves dots alone)
- Result: pass
- Spec source: R-027 acceptance (quote safe empty)
- Test: `.sdlc/slices/S-013/verification/r0/tests/security-0/read-rules.verify-security.test.mjs:84`

```
ATK-2: repos/{owner}/{repo}/rules/branches/.. . Seed: dot segment.
```

## TC-security-3 (VS-1, R-027): Placeholders and shell syntax are encoded; no marker file

- Given: samples with {owner}, $(..), backticks, ;, &&, |, newline, quote, -X, --hostname, :owner, {branch}
- When: read_rules runs
- Then: 12 calls, each argv length 2, tail has none of { } : $ ` ; & | newline quote space; marker file absent
- Result: pass
- Spec source: R-027 acceptance
- Test: `.sdlc/slices/S-013/verification/r0/tests/security-0/read-rules.verify-security.test.mjs:95`

```
ATK-3: all paths encoded
```

## TC-security-4 (VS-1, R-027): NUL in a sample is encoded as %00

- Given: sample a<NUL>b
- When: read_rules runs
- Then: one call, path ends a%00b
- Result: pass
- Spec source: R-027 acceptance
- Test: `.sdlc/slices/S-013/verification/r0/tests/security-0/read-rules.verify-security.test.mjs:114`

```
ATK-4: argv a%00b
```

## TC-security-5 (VS-4, R-029): Failure on the second sample leaks no partial rules

- Given: gh answers rules for sample 1, exit 1 for sample 2
- When: read_rules runs on 3 samples
- Then: 2 calls, rules [], by_sample {}, unchecked, one note
- Result: pass
- Spec source: R-029 acceptance
- Test: `.sdlc/slices/S-013/verification/r0/tests/security-0/read-rules.verify-security.test.mjs:124`

```
ATK-5
```

## TC-security-6 (VS-4, R-029): Hostile gh stdout never raises

- Given: stdout deep list (200000), deep object, NaN, 100000-digit int, trailing NUL, invalid UTF-8, non-dict items, bad parameters and type values, empty, blanks
- When: read_rules runs
- Then: no exception; tree unchanged; one gh call
- Result: pass
- Spec source: R-029 acceptance
- Test: `.sdlc/slices/S-013/verification/r0/tests/security-0/read-rules.verify-security.test.mjs:136`

```
ATK-6
```

## TC-security-7 (VS-4, R-029): Rule fields from gh output reach judge with odd types

- Given: gh returns patterns that are int, dict, list, null and kind list
- When: rules pass to branches.judge
- Then: read_rules does not raise; judge raises TypeError on 4 of 8 rules (out of scope: judge belongs to earlier slices, GitHub validates pattern types)
- Result: pass
- Spec source: none (seed)
- Test: `.sdlc/slices/S-013/verification/r0/tests/security-0/read-rules.verify-security.test.mjs:162`

```
ATK-7: 4 TypeError. Seed filed.
```

## TC-security-8 (VS-4, R-029): Stderr with ANSI escapes, CR/LF, NUL and 1 MB text gives one note

- Given: gh exits 1 with hostile stderr
- When: read_rules runs on 2 samples
- Then: one call, one note, no rules
- Result: pass
- Spec source: R-029 acceptance
- Test: `.sdlc/slices/S-013/verification/r0/tests/security-0/read-rules.verify-security.test.mjs:181`

```
ATK-8: note keeps ESC and newline raw; 1 MB note length 1000025. Seed.
```

## TC-security-9 (VS-4, R-029): Token-like text in stderr appears in the note; env token never appears on success

- Given: GH_TOKEN in env; gh stderr with ghp_ text
- When: read_rules runs
- Then: success result holds no token; failure note carries stderr as the spec says
- Result: pass
- Spec source: R-029 acceptance
- Test: `.sdlc/slices/S-013/verification/r0/tests/security-0/read-rules.verify-security.test.mjs:196`

```
ATK-9: note echoes stderr verbatim (spec text). Seed.
```

## TC-security-10 (VS-4, R-029): Hung gh ends in one note after the timeout

- Given: gh stalls, GH_TIMEOUT set to 1 second
- When: read_rules runs on 2 samples
- Then: 1 call, one note naming the timeout, unchecked, 1 s
- Result: pass
- Spec source: R-029 acceptance
- Test: `.sdlc/slices/S-013/verification/r0/tests/security-0/read-rules.verify-security.test.mjs:206`

```
ATK-10: 1038 ms
```

## TC-security-11 (VS-1, R-027): A gh planted in the repo never runs

- Given: repo holds ./gh and bin/gh that touch a marker; PATH has python3 and git only
- When: read_rules runs
- Then: marker absent; one note; unchecked
- Result: pass
- Spec source: R-027 acceptance (cwd=repo)
- Test: `.sdlc/slices/S-013/verification/r0/tests/security-0/read-rules.verify-security.test.mjs:219`

```
ATK-11: marker absent
```

## TC-security-12 (VS-1, R-027): Hostile forge values never reach gh

- Given: forge values GitHub, 'github ', 'github\n', GITHUB, 'github\0', gitlab, lists, objects, numbers, duplicate keys
- When: read_rules runs
- Then: 0 gh calls; no raise
- Result: pass
- Spec source: R-027 (github only)
- Test: `.sdlc/slices/S-013/verification/r0/tests/security-0/read-rules.verify-security.test.mjs:235`

```
ATK-12
```

## TC-security-13 (VS-1, R-027): gh runs with cwd equal to the repo and the tree stays unchanged

- Given: a repo
- When: read_rules runs
- Then: logged cwd equals the repo real path
- Result: pass
- Spec source: R-027 acceptance
- Test: `.sdlc/slices/S-013/verification/r0/tests/security-0/read-rules.verify-security.test.mjs:257`

```
ATK-13
```

## TC-security-14 (VS-4, R-029): A 20000-rule body stays bounded

- Given: gh returns 20000 distinct rules
- When: read_rules runs
- Then: all 20000 kept in 6.2 s (quadratic dedupe). Seed.
- Result: pass
- Spec source: none (seed)
- Test: `.sdlc/slices/S-013/verification/r0/tests/security-0/read-rules.verify-security.test.mjs:268`

```
ATK-14: 6159 ms
```

## Attacks

- ATK-1 (held): Explore read_rules path building with injection, traversal, flag-like, format, control, confusable, whitespace and oversized values to find a second path segment or extra argv item. Observed: held except dot-only.
- ATK-2 (out-of-scope): Explore read_rules with dot-only samples to find a dot segment that moves the request to another endpoint. Observed: path ends in branches/.. unencoded; urllib.parse.quote leaves dots; the spec requires that call.
- ATK-3 (held): Explore shell and gh placeholder syntax in samples to find command execution or placeholder expansion. Observed: all encoded, marker absent.
- ATK-4 (held): Explore NUL in a sample to find a crash or truncation. Observed: a%00b.
- ATK-5 (held): Explore a failure on the second sample to find partial rules. Observed: no rules, one note, 2 calls.
- ATK-6 (held): Explore hostile gh output to find an uncaught exception. Observed: no raise.
- ATK-7 (out-of-scope): Explore rules built from hostile gh fields to find a crash downstream. Observed: judge raises TypeError on 4 rules.
- ATK-8 (out-of-scope): Explore hostile gh stderr to find a forged or oversized note. Observed: one note; control characters and 1 MB kept.
- ATK-9 (held): Explore secrets handling to find a token in the result. Observed: env token absent; stderr echoed as the spec says.
- ATK-10 (held): Explore a hung gh to find a hang. Observed: 1038 ms with timeout 1.
- ATK-11 (held): Explore a repo-controlled gh binary to find execution of untrusted code. Observed: not run.
- ATK-12 (held): Explore hostile config forge values to find an unintended gh call. Observed: no call.
- ATK-13 (held): Explore cwd and tree side effects. Observed: as expected.
- ATK-14 (out-of-scope): Explore a large rule list to find unbounded work. Observed: 6159 ms, quadratic dedupe.

## Seeds

- read_rules: dot-only samples are not encoded: quote(safe='') keeps . and .. so the path ends in branches/.. . A dot segment can move the request. Git refuses these names, and the spec fixes the encoding, so no block.
- read_rules: rule fields keep the JSON types from gh: pattern and kind of any JSON type pass into rules. judge raises TypeError on int, dict, list and null patterns. S-015 should keep only str kind and pattern, or judge should treat other types as unevaluated.
- read_rules: failure note keeps raw stderr: The note keeps ANSI escapes, CR and LF, and up to any length. A token in stderr reaches the note and any log. Suggest collapsing control characters and capping the length.
- read_rules: quadratic rule dedupe: 20000 distinct rules take 6 s because of list membership tests. Use a seen set of serialized rules.
