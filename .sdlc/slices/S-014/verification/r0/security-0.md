# verify-security S-014 round 0 part 0

- Commit: c1b5dff (branch sdlc/S-014)
- Verdict: no in-scope failure. 5 seeds.
- Environment: Python 3.14.7, node:test, glab and gh shims from the testkit on PATH, scratch git repos from cli-runner. No HTTP boundary.
- Run: `node --test .sdlc/slices/S-014/verification/r0/tests/security-0/read-rules.verify-security.test.mjs`
- Result: 60 tests, 53 pass, 7 fail. All 7 failures are seed probes (see Seeds).

## Threat model
The spec trusts glab (a local tool the owner installed). It does not trust the text glab prints or the names in samples. The spec states no size or line limit for notes.

## TC-security-1 (VS-1): One glab call for 1, 3, 50 and hostile samples

- Given: stub glab, forge gitlab, samples of 1, 3, 50 names and 7 hostile names
- When: read_rules(repo, samples)
- Then: one call, argv api projects/:fullpath/push_rule, cwd is the repo, no sample in argv
- Actual: 1 call each time; argv fixed; cwd equal to the repo; by_sample keyed by every sample
- Result: pass
- Source: R-030 acceptance
- Test: `.sdlc/slices/S-014/verification/r0/tests/security-0/read-rules.verify-security.test.mjs:65`

```
samples ['; rm -rf /','--hostname=evil','$(touch pwn)','`id`','../../etc/passwd','a b
c','-h']
calls: 1
argv: ['api','projects/:fullpath/push_rule']
cwd: <repo>
```

Evidence: `.sdlc/slices/S-014/verification/r0/logs/security-0-attacks.jsonl`

## TC-security-2 (VS-4): Exit 0 with a JSON error body is no rule; exit 1, 2, 127, 255 are failures

- Given: stub glab prints {message: 404 Project Not Found}
- When: run with exit 0, then 1, 2, 127, 255
- Then: exit 0: no rules, no notes, unchecked false. Non-zero: one note, unchecked true
- Actual: as expected; note is rules unknown on gitlab: glab exited with status <code>
- Result: pass
- Source: R-030 acceptance, R-031 acceptance, ADR f2c2
- Test: `.sdlc/slices/S-014/verification/r0/tests/security-0/read-rules.verify-security.test.mjs:90`

Evidence: `.sdlc/slices/S-014/verification/r0/logs/security-0-attacks.jsonl`

## TC-security-3 (VS-5): Exit 1 with stderr boom gives the exact spec note

- Given: stub glab exit 1, stderr boom
- When: read_rules(repo, [a, b])
- Then: notes equal [rules unknown on gitlab: boom]; rules, by_sample empty; unchecked true
- Actual: as expected
- Result: pass
- Source: R-031 acceptance
- Test: `.sdlc/slices/S-014/verification/r0/tests/security-0/read-rules.verify-security.test.mjs:114`

Evidence: `.sdlc/slices/S-014/verification/r0/logs/security-0-attacks.jsonl`

## TC-security-4 (VS-5): Hostile stderr (empty, multi-line, CRLF, 2 MB, control, NUL, invalid UTF-8, token-like) gives one note and never raises

- Given: stub glab exit 1 with each stderr
- When: read_rules
- Then: one note starting rules unknown on gitlab:, unchecked true, valid shape
- Actual: all 8 held. See seeds for line, length and control character findings
- Result: pass
- Source: R-031 acceptance
- Test: `.sdlc/slices/S-014/verification/r0/tests/security-0/read-rules.verify-security.test.mjs:135`

Evidence: `.sdlc/slices/S-014/verification/r0/logs/security-0-attacks.jsonl`

## TC-security-5 (VS-7): 29 odd stdout bodies keep the result shape

- Given: stub glab exit 0 with array, string, number, true, false, null, non-string regex (number, list, object, true), spaces, invalid RE2, lookahead, NUL/ESC, lone surrogate, BOM, NaN, duplicate keys, extra keys, 100000-deep array and object, 20 MB body, 1 MB regex, huge int, empty, partial, trailing garbage, HTML
- When: read_rules
- Then: no exception; any rule has exactly the five keys with right types; non-string regex gives no rule; unparseable output gives the note
- Actual: all 29 held. A regex of only spaces, invalid RE2, NUL or lone surrogate gives one rule with a string pattern
- Result: pass
- Source: R-026 acceptance, R-030 acceptance
- Test: `.sdlc/slices/S-014/verification/r0/tests/security-0/read-rules.verify-security.test.mjs:190`

Evidence: `.sdlc/slices/S-014/verification/r0/logs/security-0-attacks.jsonl`

## TC-security-6 (VS-7): A valid regex round-trips as the exact pattern with the five keys

- Given: stub glab prints a regex
- When: read_rules
- Then: rule equals {source gitlab, kind regex, pattern, negate false, label push rule}; by_sample holds it
- Actual: as expected
- Result: pass
- Source: R-026 acceptance
- Test: `.sdlc/slices/S-014/verification/r0/tests/security-0/read-rules.verify-security.test.mjs:210`

Evidence: `.sdlc/slices/S-014/verification/r0/logs/security-0-attacks.jsonl`

## TC-security-7 (VS-8): Missing glab gives the note and no side effect

- Given: PATH holds only python3 and git
- When: read_rules
- Then: one note, unchecked true, scratch tree and git refs unchanged
- Actual: note: rules unknown on gitlab: [Errno 2] No such file or directory: 'glab'; tree diff empty
- Result: pass
- Source: R-031 acceptance
- Test: `.sdlc/slices/S-014/verification/r0/tests/security-0/read-rules.verify-security.test.mjs:220`

Evidence: `.sdlc/slices/S-014/verification/r0/logs/security-0-attacks.jsonl`

## TC-security-8 (VS-8): Empty, non-JSON and partial JSON output give the not JSON note

- Given: stub glab exit 0 with each output
- When: read_rules
- Then: note rules unknown on gitlab: glab printed output that is not JSON
- Actual: as expected
- Result: pass
- Source: R-031 acceptance
- Test: `.sdlc/slices/S-014/verification/r0/tests/security-0/read-rules.verify-security.test.mjs:233`

Evidence: `.sdlc/slices/S-014/verification/r0/logs/security-0-attacks.jsonl`

## TC-security-9 (VS-8): A stalled glab hits the timeout, gives the note, leaves no child

- Given: stub glab does exec sleep 600; FORGE_TIMEOUT set to 1
- When: read_rules
- Then: note, no hang, no process left, tree unchanged
- Actual: returned in 1037 ms; no process with the stub path left; tree unchanged
- Result: pass
- Source: R-031 acceptance
- Test: `.sdlc/slices/S-014/verification/r0/tests/security-0/read-rules.verify-security.test.mjs:249`

Evidence: `.sdlc/slices/S-014/verification/r0/logs/security-0-attacks.jsonl`

## TC-security-10 (VS-8): Seed probe: a glab that forks a grandchild leaves a process after the timeout

- Given: stub glab sleeps 25 s in a child of its shell; FORGE_TIMEOUT 1
- When: read_rules
- Then: no process left
- Actual: note returned. The grandchild sleep stayed alive after the timeout. Out of scope, filed as a seed. The seed test fails by design
- Result: pass
- Source: none in the spec: seed
- Test: `.sdlc/slices/S-014/verification/r0/tests/security-0/read-rules.verify-security.test.mjs:266`

Evidence: `.sdlc/slices/S-014/verification/r0/logs/security-0-attacks.jsonl`

## TC-security-11 (VS-6): No forge makes no call for absent, empty, null, unknown, wrong-case and padded forge values

- Given: gh and glab stubs on PATH
- When: read_rules with 7 config variants
- Then: no call to either tool; no rules, no notes, empty by_sample, unchecked true
- Actual: as expected
- Result: pass
- Source: R-032 acceptance
- Test: `.sdlc/slices/S-014/verification/r0/tests/security-0/read-rules.verify-security.test.mjs:278`

Evidence: `.sdlc/slices/S-014/verification/r0/logs/security-0-attacks.jsonl`

## TC-security-12 (VS-6): Seed probe: a config that is not valid JSON

- Given: gh and glab stubs on PATH, config.json holds {not json
- When: read_rules
- Then: no call
- Actual: no call made; read_rules raises Fail (the repo's config loader convention). Filed as a seed
- Result: pass
- Source: none in the spec: seed
- Test: `.sdlc/slices/S-014/verification/r0/tests/security-0/read-rules.verify-security.test.mjs:332`

Evidence: `.sdlc/slices/S-014/verification/r0/logs/security-0-attacks.jsonl`

## TC-security-13 (VS-5): A token in the glab body or env never reaches the result, stderr or the tree

- Given: body holds private_token, env holds GITLAB_TOKEN
- When: read_rules
- Then: neither value appears; tree unchanged
- Actual: as expected
- Result: pass
- Source: R-031 acceptance
- Test: `.sdlc/slices/S-014/verification/r0/tests/security-0/read-rules.verify-security.test.mjs:301`

Evidence: `.sdlc/slices/S-014/verification/r0/logs/security-0-attacks.jsonl`

## TC-security-14 (VS-1): gh path: sample is percent-encoded in the path; FORGE_TIMEOUT applies to gh

- Given: gh stub
- When: sample a/b c?x=1&y#z; stalled gh with timeout 1
- Then: one encoded path; timeout gives a github note
- Actual: as expected
- Result: pass
- Source: R-026 acceptance
- Test: `.sdlc/slices/S-014/verification/r0/tests/security-0/read-rules.verify-security.test.mjs:313`

Evidence: `.sdlc/slices/S-014/verification/r0/logs/security-0-attacks.jsonl`

## Attacks

| id | charter | observed | result |
|---|---|---|---|
| A-VS1-1 | Explore the argv and cwd boundary with hostile branch names to find a sample reaching the child process (R-030: glab is called once) | {"calls": 1, "argv": ["api", "projects/:fullpath/push_rule"]} | held |
| A-VS1-3 | Explore the argv and cwd boundary with hostile branch names to find a sample reaching the child process (R-030: glab is called once) | {"calls": 1, "argv": ["api", "projects/:fullpath/push_rule"]} | held |
| A-VS1-50 | Explore the argv and cwd boundary with hostile branch names to find a sample reaching the child process (R-030: glab is called once) | {"calls": 1, "argv": ["api", "projects/:fullpath/push_rule"]} | held |
| A-VS1-7 | Explore the argv and cwd boundary with hostile branch names to find a sample reaching the child process (R-030: glab is called once) | {"calls": 1, "argv": ["api", "projects/:fullpath/push_rule"]} | held |
| A-VS4-exit0 | Explore exit codes with a JSON error body to find a failure read as no rule (R-030, R-031, ADR f2c2) | {"forge": "gitlab", "rules": [], "by_sample": {"a": [], "b": []}, "notes": [], "unchecked" | held |
| A-VS4-exit1 | Explore exit codes with a JSON error body to find a failure read as no rule (R-030, R-031, ADR f2c2) | ["rules unknown on gitlab: glab exited with status 1"] | held |
| A-VS4-exit2 | Explore exit codes with a JSON error body to find a failure read as no rule (R-030, R-031, ADR f2c2) | ["rules unknown on gitlab: glab exited with status 2"] | held |
| A-VS4-exit127 | Explore exit codes with a JSON error body to find a failure read as no rule (R-030, R-031, ADR f2c2) | ["rules unknown on gitlab: glab exited with status 127"] | held |
| A-VS4-exit255 | Explore exit codes with a JSON error body to find a failure read as no rule (R-030, R-031, ADR f2c2) | ["rules unknown on gitlab: glab exited with status 255"] | held |
| A-VS5-empty | Explore stderr text with the corpus to find a raise or a broken note (R-031) | {"noteLen": 50, "lines": 1, "hasCtl": false} | held |
| A-VS5-multiline | Explore stderr text with the corpus to find a raise or a broken note (R-031) | {"noteLen": 42, "lines": 3, "hasCtl": false} | out-of-scope |
| A-VS5-crlf | Explore stderr text with the corpus to find a raise or a broken note (R-031) | {"noteLen": 28, "lines": 2, "hasCtl": false} | out-of-scope |
| A-VS5-long | Explore stderr text with the corpus to find a raise or a broken note (R-031) | {"noteLen": 2000025, "lines": 1, "hasCtl": false} | out-of-scope |
| A-VS5-ctrl | Explore stderr text with the corpus to find a raise or a broken note (R-031) | {"noteLen": 41, "lines": 1, "hasCtl": true} | out-of-scope |
| A-VS5-nul | Explore stderr text with the corpus to find a raise or a broken note (R-031) | {"noteLen": 28, "lines": 1, "hasCtl": true} | out-of-scope |
| A-VS5-badutf8 | Explore stderr text with the corpus to find a raise or a broken note (R-031) | {"noteLen": 31, "lines": 1, "hasCtl": false} | held |
| A-VS5-secretish | Explore stderr text with the corpus to find a raise or a broken note (R-031) | {"noteLen": 53, "lines": 1, "hasCtl": false} | held |
| A-VS7-array | Explore hostile stdout to find a rule with a wrong shape or an exception (R-026, R-030) | {"rules": 0, "unchecked": false, "note": ""} | held |
| A-VS7-arrayOfRules | Explore hostile stdout to find a rule with a wrong shape or an exception (R-026, R-030) | {"rules": 0, "unchecked": false, "note": ""} | held |
| A-VS7-string | Explore hostile stdout to find a rule with a wrong shape or an exception (R-026, R-030) | {"rules": 0, "unchecked": false, "note": ""} | held |
| A-VS7-number | Explore hostile stdout to find a rule with a wrong shape or an exception (R-026, R-030) | {"rules": 0, "unchecked": false, "note": ""} | held |
| A-VS7-true | Explore hostile stdout to find a rule with a wrong shape or an exception (R-026, R-030) | {"rules": 0, "unchecked": false, "note": ""} | held |
| A-VS7-false | Explore hostile stdout to find a rule with a wrong shape or an exception (R-026, R-030) | {"rules": 0, "unchecked": false, "note": ""} | held |
| A-VS7-nullBody | Explore hostile stdout to find a rule with a wrong shape or an exception (R-026, R-030) | {"rules": 0, "unchecked": false, "note": ""} | held |
| A-VS7-regexNumber | Explore hostile stdout to find a rule with a wrong shape or an exception (R-026, R-030) | {"rules": 0, "unchecked": false, "note": ""} | held |
| A-VS7-regexList | Explore hostile stdout to find a rule with a wrong shape or an exception (R-026, R-030) | {"rules": 0, "unchecked": false, "note": ""} | held |
| A-VS7-regexObject | Explore hostile stdout to find a rule with a wrong shape or an exception (R-026, R-030) | {"rules": 0, "unchecked": false, "note": ""} | held |
| A-VS7-regexTrue | Explore hostile stdout to find a rule with a wrong shape or an exception (R-026, R-030) | {"rules": 0, "unchecked": false, "note": ""} | held |
| A-VS7-regexSpaces | Explore hostile stdout to find a rule with a wrong shape or an exception (R-026, R-030) | {"rules": 1, "unchecked": false, "note": ""} | held |
| A-VS7-invalidRe2 | Explore hostile stdout to find a rule with a wrong shape or an exception (R-026, R-030) | {"rules": 1, "unchecked": false, "note": ""} | held |
| A-VS7-lookahead | Explore hostile stdout to find a rule with a wrong shape or an exception (R-026, R-030) | {"rules": 1, "unchecked": false, "note": ""} | held |
| A-VS7-regexCtrl | Explore hostile stdout to find a rule with a wrong shape or an exception (R-026, R-030) | {"rules": 1, "unchecked": false, "note": ""} | held |
| A-VS7-regexLoneSurrogate | Explore hostile stdout to find a rule with a wrong shape or an exception (R-026, R-030) | {"rules": 1, "unchecked": false, "note": ""} | held |
| A-VS7-bomObject | Explore hostile stdout to find a rule with a wrong shape or an exception (R-026, R-030) | {"rules": 0, "unchecked": true, "note": "rules unknown on gitlab: glab printed output that | held |
| A-VS7-nanLiteral | Explore hostile stdout to find a rule with a wrong shape or an exception (R-026, R-030) | {"rules": 0, "unchecked": false, "note": ""} | held |
| A-VS7-duplicateKeys | Explore hostile stdout to find a rule with a wrong shape or an exception (R-026, R-030) | {"rules": 0, "unchecked": false, "note": ""} | held |
| A-VS7-extraKeys | Explore hostile stdout to find a rule with a wrong shape or an exception (R-026, R-030) | {"rules": 1, "unchecked": false, "note": ""} | held |
| A-VS7-deepArray | Explore hostile stdout to find a rule with a wrong shape or an exception (R-026, R-030) | {"rules": 0, "unchecked": false, "note": ""} | held |
| A-VS7-deepObject | Explore hostile stdout to find a rule with a wrong shape or an exception (R-026, R-030) | {"rules": 0, "unchecked": false, "note": ""} | held |
| A-VS7-bigBody | Explore hostile stdout to find a rule with a wrong shape or an exception (R-026, R-030) | {"rules": 1, "unchecked": false, "note": ""} | held |
| A-VS7-bigRegex | Explore hostile stdout to find a rule with a wrong shape or an exception (R-026, R-030) | {"rules": 1, "unchecked": false, "note": ""} | held |
| A-VS7-hugeInt | Explore hostile stdout to find a rule with a wrong shape or an exception (R-026, R-030) | {"rules": 0, "unchecked": false, "note": ""} | held |
| A-VS7-empty | Explore hostile stdout to find a rule with a wrong shape or an exception (R-026, R-030) | {"rules": 0, "unchecked": true, "note": "rules unknown on gitlab: glab printed output that | held |
| A-VS7-partial | Explore hostile stdout to find a rule with a wrong shape or an exception (R-026, R-030) | {"rules": 0, "unchecked": true, "note": "rules unknown on gitlab: glab printed output that | held |
| A-VS7-trailing | Explore hostile stdout to find a rule with a wrong shape or an exception (R-026, R-030) | {"rules": 0, "unchecked": true, "note": "rules unknown on gitlab: glab printed output that | held |
| A-VS7-html | Explore hostile stdout to find a rule with a wrong shape or an exception (R-026, R-030) | {"rules": 0, "unchecked": true, "note": "rules unknown on gitlab: glab printed output that | held |
| A-VS8-missing | Explore a missing, stalled or garbage glab to find a hang, crash or leftover process (R-031) | ["rules unknown on gitlab: [Errno 2] No such file or directory: 'glab'"] | held |
| A-VS8-stall | Explore a missing, stalled or garbage glab to find a hang, crash or leftover process (R-031) | {"ms": 1036, "note": "rules unknown on gitlab: Command '['glab', 'api', 'projects/:fullpat | held |
| A-VS8-grandchild | Explore a missing, stalled or garbage glab to find a hang, crash or leftover process (R-031) | {"leftover": 1} | out-of-scope |
| A-VS6-undefined | Explore forge values to find a call to gh or glab without a forge (R-032) | {"forge": "", "unchecked": true} | held |
| A-VS6- | Explore forge values to find a call to gh or glab without a forge (R-032) | {"forge": "", "unchecked": true} | held |
| A-VS6-null | Explore forge values to find a call to gh or glab without a forge (R-032) | {"forge": "", "unchecked": true} | held |
| A-VS6-bitbucket | Explore forge values to find a call to gh or glab without a forge (R-032) | {"forge": "bitbucket", "unchecked": true} | held |
| A-VS6-GitLab | Explore forge values to find a call to gh or glab without a forge (R-032) | {"forge": "GitLab", "unchecked": true} | held |
| A-VS6-gitlab  | Explore forge values to find a call to gh or glab without a forge (R-032) | {"forge": "gitlab ", "unchecked": true} | held |
| A-VS6-"gitlab" | Explore forge values to find a call to gh or glab without a forge (R-032) | {"forge": "\"gitlab\"", "unchecked": true} | held |
| A-gh-sample-encoding | Explore the gh path to find unencoded input (R-026) | ["api", "repos/{owner}/{repo}/rules/branches/a%2Fb%20c%3Fx%3D1%26y%23z"] | held |
| A-VS6-badjson | Explore forge values to find a call to gh or glab without a forge (R-032) | {"exc": "EXCFail:/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdl"} | out-of-scope |

## Seeds

- Failure note carries raw stderr: newlines, control characters, NUL and unbounded length: glab stderr is copied into the note unchanged. A 2 MB stderr gives a 2 MB note. Multi-line stderr gives a note with newlines. ESC and NUL pass through. The spec states no bound, so no block. Tests in the verify file named VS-5 seed fail. (`skills/sdlc/branches.py`)
- Timeout kills only the direct glab process: subprocess.run kills the child on timeout, not its children. A glab wrapper that forks a process leaves that process alive after FORGE_TIMEOUT. Start the child in its own process group and kill the group. (`skills/sdlc/branches.py`)
- read_rules raises Fail when .sdlc/config.json is not valid JSON: The plan notes expect a no-forge result for a config that is not valid JSON. The code raises Fail. This matches the loader convention, so it may be intended. No call to gh or glab happens. Decide the intended behavior. (`skills/sdlc/branches.py`)
- A regex of only spaces, or invalid RE2 syntax, becomes a rule: gitlab_rule keeps any non-empty string. A spaces-only regex gives a rule that matches every name. R-030 says only an empty regex means no rule, so this follows the spec. Judge handles invalid syntax as unevaluated. (`skills/sdlc/branches.py`)
- testkit: glab-stub cannot assert a process group or leftover child: The shim runs sleep as a child of sh. The test used ps with the stub path or the sleep text. A helper that reports leftover children would help. (`skills/sdlc/test/testkit/stub-server.mjs`)
