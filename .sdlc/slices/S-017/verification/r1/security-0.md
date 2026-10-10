# Security verification, S-017, round 1

- Slice: S-017
- Profile: security (part 0)
- Round: 1
- Commit: da88101
- Verdict: verified. 7 cases (6 scenarios), 0 failed. 51 tests pass.

Environment: Python 3 skill scripts, Node test runner, gh and glab shims from the testkit (no network), scratch git repos.

Threat model: the forge answer and its rule text are untrusted input to preflight. Rule authors are repo admins, so shell-text issues are seeds.

## TC-security-1 (VS-1): Rule that the default satisfies gives ok and no derivation (gh and glab, 14 attacks)

- Given: A scratch git repo with .sdlc/config.json (gitMode pr, forge set) and a gh or glab shim that prints canned JSON
- When: preflight runs with each of the 15 attacks: TC-sec-1-github, TC-sec-1-github-unanchored, TC-sec-1-github-inline-ignorecase-upper, TC-sec-1-github-case-sensitive-upper, TC-sec-1-github-nested-name, TC-sec-1-github-anchored-end-too-short, TC-sec-1-github-lookahead, TC-sec-1-glab, TC-sec-1-glab-unanchored, TC-sec-1-glab-inline-ignorecase-upper, TC-sec-1-glab-case-sensitive-upper, TC-sec-1-glab-nested-name, TC-sec-1-glab-anchored-end-too-short, TC-sec-1-glab-lookahead, TC-sec-1-calls
- Then: Each run gives one JSON object, the exit code and verdict the spec states, and the repo tree is unchanged
- Expected: every call is `api repos/{owner}/{repo}/rules/branches/<encoded name>`; slash is percent-encoded; exit 0, ok, sdlc/{name}, derived false, empty suggestion, no failing sample; exit 1 and a --branch-format suggestion, not a derived format; ok with the default, nothing derived
- Actual: Re-run in round 1 on da88101: every attack in this scenario held. 
- Result: pass
- Spec source: R-091 acceptance
- Test: `.sdlc/slices/S-017/verification/r1/tests/security-0/preflight.verify-security.test.mjs:1`

Evidence (attack): attack log
See `.sdlc/slices/S-017/verification/r1/logs/security-0-attacks.jsonl`.

Evidence (log): test run (51 pass, 0 fail)
See `.sdlc/slices/S-017/verification/r1/logs/security-0-run.txt`.

## TC-security-2 (VS-2): Two, three or negated rules give no derivation and a generic suggestion

- Given: A scratch git repo with .sdlc/config.json (gitMode pr, forge set) and a gh or glab shim that prints canned JSON
- When: preflight runs with each of the 9 attacks: TC-sec-2-two, TC-sec-2-three, TC-sec-2-neg-starts_with, TC-sec-2-neg-ends_with, TC-sec-2-neg-contains, TC-sec-2-neg-regex, TC-sec-2-neg-passing, TC-sec-2-dup, TC-sec-2-hostile-derive
- Then: Each run gives one JSON object, the exit code and verdict the spec states, and the repo tree is unchanged
- Expected: a derived format only when the derived format passes the second verdict; derived false; derived never carries an invalid git ref; the run does not crash; exit 0, ok; exit 1, derived false, labelled failing samples, suggestion with --branch-format; exit 1, derived false, labels alpha or beta on each failing sample, --branch-format in suggestion
- Actual: Re-run in round 1 on da88101: every attack in this scenario held. 
- Result: pass
- Spec source: R-092 acceptance
- Test: `.sdlc/slices/S-017/verification/r1/tests/security-0/preflight.verify-security.test.mjs:106`

Evidence (attack): attack log
See `.sdlc/slices/S-017/verification/r1/logs/security-0-attacks.jsonl`.

Evidence (log): test run (51 pass, 0 fail)
See `.sdlc/slices/S-017/verification/r1/logs/security-0-run.txt`.

## TC-security-3 (VS-3): Rules of another type or none leave rules empty and the verdict ok

- Given: A scratch git repo with .sdlc/config.json (gitMode pr, forge set) and a gh or glab shim that prints canned JSON
- When: preflight runs with each of the 5 attacks: TC-sec-3-othertype, TC-sec-3-typeconfusion, TC-sec-3-empty, TC-sec-3-glab-other, TC-sec-3-persample
- Then: Each run gives one JSON object, the exit code and verdict the spec states, and the repo tree is unchanged
- Expected: only the slice sample can fail; the others pass; rules empty, every sample pass (not unchecked), ok, derived false, exit 0; rules empty, ok; rules empty, pass on every sample; rules empty, pass, ok
- Actual: Re-run in round 1 on da88101: every attack in this scenario held. 
- Result: pass
- Spec source: R-100 acceptance
- Test: `.sdlc/slices/S-017/verification/r1/tests/security-0/preflight.verify-security.test.mjs:155`

Evidence (attack): attack log
See `.sdlc/slices/S-017/verification/r1/logs/security-0-attacks.jsonl`.

Evidence (log): test run (51 pass, 0 fail)
See `.sdlc/slices/S-017/verification/r1/logs/security-0-run.txt`.

## TC-security-4 (VS-4): Seven shim scenarios and refused input at the public boundary

- Given: A scratch git repo with .sdlc/config.json (gitMode pr, forge set) and a gh or glab shim that prints canned JSON
- When: preflight runs with each of the 3 attacks: TC-sec-4-shape, TC-sec-4-format-corpus, TC-sec-4-branch-corpus
- Then: Each run gives one JSON object, the exit code and verdict the spec states, and the repo tree is unchanged
- Expected: every value gives one JSON object, exit 0, 1 or 2, no traceback, no tree change; a refusal (exit 2) leaves the verdict out and calls no forge tool; one JSON object, exit 0, 1 or 2, no traceback, no tree change; the key set is the same in every JSON result; exit codes 0, 0, 1, 0, 0, 1, 2
- Actual: Re-run in round 1 on da88101: every attack in this scenario held. 
- Result: pass
- Spec source: R-074 acceptance
- Test: `.sdlc/slices/S-017/verification/r1/tests/security-0/preflight.verify-security.test.mjs:193`

Evidence (attack): attack log
See `.sdlc/slices/S-017/verification/r1/logs/security-0-attacks.jsonl`.

Evidence (log): test run (51 pass, 0 fail)
See `.sdlc/slices/S-017/verification/r1/logs/security-0-run.txt`.

## TC-security-5 (VS-5): Broken forge answers never corrupt the verdict or touch the repo

- Given: A scratch git repo with .sdlc/config.json (gitMode pr, forge set) and a gh or glab shim that prints canned JSON
- When: preflight runs with each of the 8 attacks: TC-sec-5-malformed, TC-sec-5-glab-malformed, TC-sec-5-huge, TC-sec-5-control, TC-sec-5-glab-control, TC-sec-5-exit-with-json, TC-sec-5-gh-missing, TC-sec-5-hang
- Then: Each run gives one JSON object, the exit code and verdict the spec states, and the repo tree is unchanged
- Expected: no crash within 30 s; ok; tree unchanged; no crash; one JSON object; a note starting rules unknown on github (or an empty-rule pass for a valid list); verdict never fail; tree unchanged; no crash; unknown or empty-rule pass; verdict never fail; ok, unchecked, a note naming the missing tool, no crash; ok, unchecked, a timeout note, within about 70 s, only one call, no child left running; one JSON line; no raw control byte; one JSON object on one line of stdout; no raw control byte in stdout; tree unchanged; treated as unknown, unchecked, ok; the printed rule is ignored
- Actual: Re-run in round 1 on da88101: every attack in this scenario held. 
- Result: pass
- Spec source: R-074 quote (forge shim exits 1 gives rules unknown, unchecked); spec Edge cases (gh or glab unavailable gives unchecked)
- Test: `.sdlc/slices/S-017/verification/r1/tests/security-0/preflight.verify-security.test.mjs:251`

Evidence (attack): attack log
See `.sdlc/slices/S-017/verification/r1/logs/security-0-attacks.jsonl`.

Evidence (log): test run (51 pass, 0 fail)
See `.sdlc/slices/S-017/verification/r1/logs/security-0-run.txt`.

## TC-security-6 (VS-6): A non-string rule pattern is unevaluated and never crashes preflight

- Given: A gh rule of type branch_name_pattern with operator starts_with, ends_with, contains or regex and a pattern of int, float, null, list, object, true, false, empty list or an overflowing number; or a glab branch_name_regex of those types
- When: preflight runs alone on each rule, next to a passing rule, next to a failing rule in both orders, and with odd operator, name, negate and parameters types
- Then: exit 0 or 1 with one JSON object and no traceback; a cannot evaluate note; derived false and format unchanged; failing samples keep their rule label; a bad rule never hides a failing rule; repo tree unchanged
- Expected: No TypeError, no derived format from such a rule, cannot evaluate note (R-074, R-100)
- Actual: All 7 VS-6 attacks held on da88101. The same tests fail on 78833d2 (5 of 8 fail, with a traceback), so they detect the round 0 defect.
- Result: pass
- Spec source: R-074 and R-100 acceptance (plan notes for VS-6)
- Test: `.sdlc/slices/S-017/verification/r1/tests/security-0/preflight.verify-security.test.mjs:324`

Evidence (attack): VS-6 attacks
```
TC-sec-6-gh-matrix: held - starts_with/int:0 starts_with/float:0 starts_with/null:0 starts_with/list:0 starts_with/object:0 starts_with/true:0 starts_with/false:0 starts_with/em
TC-sec-6-gh-no-derive: held - int: format sdlc/{name} derived false sugg "" | float: format sdlc/{name} derived false sugg "" | null: format sdlc/{name} derived false sugg "" | lis
TC-sec-6-gh-mixed: held - starts_with/int:0/1/1 starts_with/float:0/1/1 starts_with/null:0/1/1 starts_with/list:0/1/1 starts_with/object:0/1/1 starts_with/true:0/1/1 starts_wit
TC-sec-6-gh-sample-label: held - exit 1; ok false; format sdlc/{name}; derived false; rules 2; results fail; suggestion "--branch-format \"<prefix>{name}<suffix>\" (every branch name 
TC-sec-6-glab: held - int: exit 0 rules 0 notes [] | float: exit 0 rules 0 notes [] | null: exit 0 rules 0 notes [] | list: exit 0 rules 0 notes [] | object: exit 0 rules 0
TC-sec-6-glab-push-rule-fields: held - exit 1 ok false; list body exit 0
TC-sec-6-other-fields: held - op-int:0 op-list:0 name-int:0 name-null:0 negate-str:0 negate-list:0 params-list:0 params-null:0 params-str:0 type-int:0 item-null:0 no-pattern:0
TC-sec-6-surrogate-pattern: held - starts_with/surrogate:1 ends_with/surrogate:1 contains/surrogate:1 regex/surrogate:1 starts_with/invalid-re:0 ends_with/invalid-re:0 contains/invalid-
```

Evidence (log): test run
See `.sdlc/slices/S-017/verification/r1/logs/security-0-run.txt`.

## Attacks

- TC-sec-1-github [held] VS-1 regex rule that the default satisfies: input ^[a-z]+/.+ via github; observed exit 0; ok true; format sdlc/{name}; derived false; rules 1; results pass; suggestion ""
- TC-sec-1-github-unanchored [held] VS-1 near variant unanchored: input [a-z]+/.+ via github; observed exit 0; ok true; format sdlc/{name}; derived false; rules 1; results pass; suggestion ""
- TC-sec-1-github-inline-ignorecase-upper [held] VS-1 near variant inline-ignorecase-upper: input (?i)^SDLC/ via github; observed exit 0; ok true; format sdlc/{name}; derived false; rules 1; results pass; suggestion ""
- TC-sec-1-github-case-sensitive-upper [held] VS-1 near variant case-sensitive-upper: input ^SDLC/ via github; observed exit 1; ok false; format sdlc/{name}; derived false; rules 1; results fail; suggestion "--branch-format \"SDLC/{name}\" (rule \"r\": regex \"^SDLC/\")"
- TC-sec-1-github-nested-name [held] VS-1 near variant nested-name: input ^[a-z]+/[a-z]+/.+ via github; observed exit 1; ok false; format sdlc/{name}; derived false; rules 1; results fail; suggestion "--branch-format \"a/a/{name}\" (rule \"r\": regex \"^[a-z]+/[a-z]+/.+\")"
- TC-sec-1-github-anchored-end-too-short [held] VS-1 near variant anchored-end-too-short: input ^[a-z]+/.{40,}$ via github; observed exit 1; ok false; format sdlc/{name}; derived false; rules 1; results fail; suggestion "--branch-format \"<literal>/{name}\" (rule \"r\": regex \"^[a-z]+/.{40,}$\"; choose a literal th"
- TC-sec-1-github-lookahead [held] VS-1 near variant lookahead: input ^(?=sdlc/).+ via github; observed exit 0; ok true; format sdlc/{name}; derived false; rules 1; results pass; suggestion ""
- TC-sec-1-glab [held] VS-1 regex rule that the default satisfies: input ^[a-z]+/.+ via glab; observed exit 0; ok true; format sdlc/{name}; derived false; rules 1; results pass; suggestion ""
- TC-sec-1-glab-unanchored [held] VS-1 near variant unanchored: input [a-z]+/.+ via glab; observed exit 0; ok true; format sdlc/{name}; derived false; rules 1; results pass; suggestion ""
- TC-sec-1-glab-inline-ignorecase-upper [held] VS-1 near variant inline-ignorecase-upper: input (?i)^SDLC/ via glab; observed exit 0; ok true; format sdlc/{name}; derived false; rules 1; results pass; suggestion ""
- TC-sec-1-glab-case-sensitive-upper [held] VS-1 near variant case-sensitive-upper: input ^SDLC/ via glab; observed exit 1; ok false; format sdlc/{name}; derived false; rules 1; results fail; suggestion "--branch-format \"SDLC/{name}\" (rule \"push rule\": regex \"^SDLC/\")"
- TC-sec-1-glab-nested-name [held] VS-1 near variant nested-name: input ^[a-z]+/[a-z]+/.+ via glab; observed exit 1; ok false; format sdlc/{name}; derived false; rules 1; results fail; suggestion "--branch-format \"a/a/{name}\" (rule \"push rule\": regex \"^[a-z]+/[a-z]+/.+\")"
- TC-sec-1-glab-anchored-end-too-short [held] VS-1 near variant anchored-end-too-short: input ^[a-z]+/.{40,}$ via glab; observed exit 1; ok false; format sdlc/{name}; derived false; rules 1; results fail; suggestion "--branch-format \"<literal>/{name}\" (rule \"push rule\": regex \"^[a-z]+/.{40,}$\"; choose a li"
- TC-sec-1-glab-lookahead [held] VS-1 near variant lookahead: input ^(?=sdlc/).+ via glab; observed exit 0; ok true; format sdlc/{name}; derived false; rules 1; results pass; suggestion ""
- TC-sec-1-calls [held] VS-1 the gh shim is only asked to read: input one regex rule, three sample names; observed api repos/{owner}/{repo}/rules/branches/sdlc%2FS-001 ; api repos/{owner}/{repo}/rules/branches/sdlc%2Fstate-20261010010450 ; api repos/{owner}/{repo}/rules/branches/sdlc%2FM-1-e2e
- TC-sec-2-two [held] VS-2 two rules, no derivation: input starts_with feature/ (alpha) + ends_with -x (beta); observed exit 1; ok false; format sdlc/{name}; derived false; rules 2; results fail; suggestion "--branch-format \"<prefix>{name}<suffix>\" (every branch name must pass: alpha; beta)"; fail rules alpha,alpha,a
- TC-sec-2-three [held] VS-2 three rules, no derivation: input three starts_with rules; observed exit 1; ok false; format sdlc/{name}; derived false; rules 3; results fail; suggestion "--branch-format \"<prefix>{name}<suffix>\" (every branch name must pass: a; b; c)"
- TC-sec-2-neg-starts_with [held] VS-2 negated starts_with rule that the default fails: input starts_with negate true; observed exit 1; ok false; format sdlc/{name}; derived false; rules 1; results fail; suggestion "--branch-format \"<prefix>{name}<suffix>\" (every branch name must pass: neg)"; fail rules neg,neg,neg
- TC-sec-2-neg-ends_with [held] VS-2 negated ends_with rule that the default fails: input ends_with negate true; observed exit 1; ok false; format sdlc/{name}; derived false; rules 1; results fail,pass; suggestion "--branch-format \"<prefix>{name}<suffix>\" (every branch name must pass: neg)"; fail rules neg
- TC-sec-2-neg-contains [held] VS-2 negated contains rule that the default fails: input contains negate true; observed exit 1; ok false; format sdlc/{name}; derived false; rules 1; results fail; suggestion "--branch-format \"<prefix>{name}<suffix>\" (every branch name must pass: neg)"; fail rules neg,neg,neg
- TC-sec-2-neg-regex [held] VS-2 negated regex rule that the default fails: input regex negate true; observed exit 1; ok false; format sdlc/{name}; derived false; rules 1; results fail; suggestion "--branch-format \"<prefix>{name}<suffix>\" (every branch name must pass: neg)"; fail rules neg,neg,neg
- TC-sec-2-neg-passing [held] VS-2 negated rule that the default passes gives ok: input not starts_with zzz/; observed exit 0; ok true; format sdlc/{name}; derived false; rules 1; results pass; suggestion ""
- TC-sec-2-dup [held] VS-2 two identical rules collapse into one and may derive: input two equal starts_with feature/ rules; observed exit 0; ok true; format feature/sdlc/{name}; derived true; rules 1; results pass; suggestion ""
- TC-sec-2-hostile-derive [held] VS-2 a starts_with pattern that would make an unsafe derived format: input patterns with a second placeholder, "..", spaces, "@{", "~", a leading dash; observed "{name}" -> exit 1 derived false format sdlc/{name} | ".." -> exit 1 derived false format sdlc/{name} | "a b/" -> exit 1 derived false format sdlc/{name} | "a@{b/" -> exit 1 derived false format sdlc/
- TC-sec-3-othertype [held] VS-3 only rules of another type: input pull_request, creation, required_status_checks objects; observed exit 0; ok true; format sdlc/{name}; derived false; rules 0; results pass; suggestion ""; rules []
- TC-sec-3-typeconfusion [held] VS-3 a failing pattern under the wrong type must not apply: input commit_message_pattern regex ^zzz/, branch_name_pattern under a changed case, nested wrapper; observed exit 0; ok true; format sdlc/{name}; derived false; rules 0; results pass; suggestion ""
- TC-sec-3-empty [held] VS-3 empty list: input []; observed exit 0; ok true; format sdlc/{name}; derived false; rules 0; results pass; suggestion ""
- TC-sec-3-glab-other [held] VS-3 a GitLab push rule with only other fields: input commit_message_regex only, empty branch_name_regex, number, list, null body; observed {"commit_message_regex":"^zzz"} -> exit 0 rules 0 pass | {"branch_name_regex":""} -> exit 0 rules 0 pass | {"branch_name_regex":5} -> exit 0 rules 0 pass | {"branch_name_regex":["^zzz"]} -> exit 0 rul
- TC-sec-3-persample [held] VS-3 a rule for one sample only fails only that sample: input gh answers a failing rule for sdlc%2FS-001 and [] for the others; observed exit 1; slice:fail,state:pass,e2e:pass
- TC-sec-4-shape [held] VS-4 public JSON keys and exit codes in all seven scenarios: input seven scenarios through gh and glab shims; observed 1 none: exit 0 keys true | 2 derive: exit 0 keys true | 3 fail: exit 1 keys true | 4 pass: exit 0 keys true | 5 shim exit 1: exit 0 keys true | 6 mr bad-name: exit 1 keys true | 7 bad format: exit 2 k
- TC-sec-4-format-corpus [held] VS-4 invalid --format values from the attack corpus: input injection,traversal,control-chars,flag-like-values,format-strings,unicode-whitespace,unicode-confusables,oversized; observed 95 values; injection/cmd-subst:2 injection/backticks:2 injection/semicolon:2 injection/pipe:2 injection/ampersand:2 injection/redirect:2 injection/json-break:2 injection/newline-json:2 injection/git-o
- TC-sec-4-branch-corpus [held] VS-4 --branch values in mr mode against a glab regex: input injection, traversal, control-chars, flag-like-values, unicode-whitespace; observed 59 values; injection/cmd-subst:1 injection/backticks:1 injection/semicolon:1 injection/pipe:1 injection/ampersand:1 injection/redirect:1 injection/json-break:1 injection/newline-json:1 injection/git-o
- TC-sec-5-malformed [held] VS-5 malformed and non-list gh bodies: input empty,open-brace,truncated-list,null,string,number,true,object,trailing-garbage,two-docs,bom,html,deep; observed empty: exit 0 unknown true unchecked | open-brace: exit 0 unknown true unchecked | truncated-list: exit 0 unknown true unchecked | null: exit 0 unknown true unchecked | string: exit 0 unknown true unc
- TC-sec-5-glab-malformed [held] VS-5 malformed glab push-rule bodies: input empty, {, null, [], "x", 5, huge nesting; observed empty: exit 0 notes ["rules unknown on gitlab: glab printed output that is not JSON"] | brace: exit 0 notes ["rules unknown on gitlab: glab printed output that is not JSON"] | list: exit 0 notes [] | 
- TC-sec-5-huge [held] VS-5 very large gh bodies: input 20 MB list of other-type objects; 20 MB single string rule pattern; observed 31.6MB list: exit 0 1099ms rules 0; 20MB pattern: exit 1 514ms ok false out 41943715 bytes
- TC-sec-5-control [held] VS-5 control characters in rule text: input ESC, CR, NUL, U+2028, bidi override in label and pattern; observed exit 1; stdout lines 1; raw control in stdout false; suggestion "--branch-format \"<prefix>{name}<suffix>\" (every branch name must pass: a\u001
- TC-sec-5-glab-control [held] VS-5 control characters in the glab regex: input ESC and newline in branch_name_regex; observed exit 0; lines 1
- TC-sec-5-exit-with-json [held] VS-5 gh exits non-zero but prints valid rules: input exit 3 with a failing rule on stdout; observed exit 0; ok true; format sdlc/{name}; derived false; rules 0; results unchecked; suggestion ""; notes ["rules unknown on github: HTTP 403"]
- TC-sec-5-gh-missing [held] VS-5 gh absent from PATH: input PATH holds python3 and git only; observed exit 0; notes ["rules unknown on github: [Errno 2] No such file or directory: 'gh'"]
- TC-sec-5-hang [held] VS-5 a gh shim that never answers: input stall; one call; limit is the 60 s FORGE_TIMEOUT; observed exit 0; 60149ms; calls 1; notes ["rules unknown on github: Command '['gh', 'api', 'repos/{owner}/{repo}/rules/branches/sdlc%2FS-001']' timed out after 60 seconds"]
- TC-sec-6-gh-matrix [held] VS-6 non-string pattern on every operator, gh: input 4 operators x 9 non-string values as the only rule; observed starts_with/int:0 starts_with/float:0 starts_with/null:0 starts_with/list:0 starts_with/object:0 starts_with/true:0 starts_with/false:0 starts_with/empty-list:0 starts_with/bigint:0 ends_with/int:0 en
- TC-sec-6-gh-no-derive [held] VS-6 a non-string starts_with never gives a derived format: input starts_with 5, null, list, object; observed int: format sdlc/{name} derived false sugg "" | float: format sdlc/{name} derived false sugg "" | null: format sdlc/{name} derived false sugg "" | list: format sdlc/{name} derived false sugg "" | obje
- TC-sec-6-gh-mixed [held] VS-6 one bad rule next to one good rule: input bad (each non-string, each op) + good starts_with "sdlc/"; bad + failing regex ^zzz/; observed starts_with/int:0/1/1 starts_with/float:0/1/1 starts_with/null:0/1/1 starts_with/list:0/1/1 starts_with/object:0/1/1 starts_with/true:0/1/1 starts_with/false:0/1/1 starts_with/empty-list:0/1/1 starts_
- TC-sec-6-gh-sample-label [held] VS-6 failing samples still name their rule next to an unevaluable one: input bad regex pattern 5 + failing starts_with "feature/" labelled alpha; observed exit 1; ok false; format sdlc/{name}; derived false; rules 2; results fail; suggestion "--branch-format \"<prefix>{name}<suffix>\" (every branch name must pass: bad; alpha)"; fail rules alpha,alpha,al
- TC-sec-6-glab [held] VS-6 non-string branch_name_regex on glab: input branch_name_regex as 5, null, list, object, true, false; observed int: exit 0 rules 0 notes [] | float: exit 0 rules 0 notes [] | null: exit 0 rules 0 notes [] | list: exit 0 rules 0 notes [] | object: exit 0 rules 0 notes [] | true: exit 0 rules 0 notes [] | false:
- TC-sec-6-glab-push-rule-fields [held] VS-6 other glab push-rule fields with odd types: input branch_name_regex string plus commit_message_regex 5; regex list-wrapped; observed exit 1 ok false; list body exit 0
- TC-sec-6-other-fields [held] VS-6 odd types in the other fields of a gh rule: input operator non-string, name non-string, negate string, parameters list, parameters null, type non-string; observed op-int:0 op-list:0 name-int:0 name-null:0 negate-str:0 negate-list:0 params-list:0 params-null:0 params-str:0 type-int:0 item-null:0 no-pattern:0
- TC-sec-6-surrogate-pattern [held] VS-6 pattern text that is a string but odd: input lone surrogate escape, very long regex, invalid regex, regex with NUL; observed starts_with/surrogate:1 ends_with/surrogate:1 contains/surrogate:1 regex/surrogate:1 starts_with/invalid-re:0 ends_with/invalid-re:0 contains/invalid-re:0 regex/invalid-re:0 starts_with/nul:1 ends_wit
- SEED-suggestion-injection [out-of-scope] VS-2 the suggestion repeats rule text into a copy-paste command: input starts_with pattern `x" ; touch PWN #`; observed suggestion carries rule text as shell syntax | "--branch-format \"x\" ; touch PWN #sdlc/{name}\""; derived false; tree unchanged true
- SEED-stderr-echo [out-of-scope] VS-5 gh stderr is copied whole into notes: input stderr holds a token-like string and 200 KB of text; observed stderr copied into notes without a limit or redaction | notes bytes 200068; has token true
- SEED-redos [held] VS-5 catastrophic regex from the forge: input pattern (a*)*b-style against sample names; observed 643ms exit 1

## Seeds

- the suggestion repeats rule text as shell syntax (skills/sdlc/branches.py): A starts_with pattern such as x" ; touch PWN # that fails the derived format validation still appears in the suggestion line as --branch-format "x" ; touch PWN #sdlc/{name}". The suggestion also shows a derived format that validate_format refused. Rule authors are repo admins, so the threat is low. Repro: attack SEED-suggestion-injection.
- gh stderr goes whole into notes (skills/sdlc/branches.py): On a gh failure, _run_forge_cli puts all of stderr into notes: 200 KB of text and a token-like string reached the JSON output. No limit and no redaction. Repro: attack SEED-stderr-echo.
- a rule pattern is echoed whole into the output (skills/sdlc/branches.py): A 20 MB contains pattern from the forge gives 41 MB of stdout, because rules and the suggestion carry the pattern. No limit in the spec. Repro: attack TC-sec-5-huge.
- the negate guard in derive is not needed for safety (skills/sdlc/branches.py): Removing the negate check from derive changes no result, because the second verdict rejects every derived format of a negated rule. The guard is dead defense in depth; tests cannot pin it alone. Mutation run on a throwaway copy.
