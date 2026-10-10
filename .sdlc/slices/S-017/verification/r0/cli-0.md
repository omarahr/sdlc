# verify-cli report, S-017, round 0

- Slice: S-017 preflight edge cases and the forge shim suite
- Profile: cli, part 0
- Commit verified: b67230c (branch sdlc/S-017)
- Verdict: REFUTED (1 failing case: TC-cli-18)
- Environment: node test runner, python3 3.14 (Homebrew), gh and glab as stub-server shell shims on PATH, scratch git repos from cli-runner, no network
- Result: 23 cases, 22 pass, 1 fail
- Run log: `.sdlc/slices/S-017/verification/r0/logs/cli-0-run.txt`; transcripts: `.sdlc/slices/S-017/verification/r0/logs/cli-0-transcripts.txt`

## TC-cli-1 (VS-1): A regex the default satisfies gives ok, no derivation (gh)

- Requirements: R-091; spec source: R-091 acceptance
- Given: gh shim answers one regex rule on every sample; no format
- When: run preflight --mode pr with 7 passing patterns
- Then: exit 0, ok true, format sdlc/{name}, derived false, empty suggestion, no failing sample
- Actual: as expected for all 7 patterns; tree unchanged
- Result: **pass**
- Test: `.sdlc/slices/S-017/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs:44`
- Command: `VERIFY_ROOT=<worktree of sdlc/S-017-v0-cli-0> node --test --test-name-pattern="VS-1: one regex" .sdlc/slices/S-017/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs`

Evidence, transcripts (all patterns): `.sdlc/slices/S-017/verification/r0/logs/cli-0-transcripts.txt`

## TC-cli-2 (VS-1): Same through glab push rule

- Requirements: R-091; spec source: R-091 acceptance
- Given: glab shim answers branch_name_regex
- When: run preflight --mode pr
- Then: same keys as gh
- Actual: as expected
- Result: **pass**
- Test: `.sdlc/slices/S-017/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs:58`
- Command: `VERIFY_ROOT=<worktree of sdlc/S-017-v0-cli-0> node --test --test-name-pattern="VS-1: same through glab" .sdlc/slices/S-017/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs`

Evidence, transcripts: `.sdlc/slices/S-017/verification/r0/logs/cli-0-transcripts.txt`

## TC-cli-3 (VS-1): Near variants the default fails give exit 1, no derived format

- Requirements: R-091; spec source: R-091 acceptance
- Given: regex rules ^[A-Z]+/.+, ^[a-z]+/.+/.+, ^Sdlc/, ^[a-z]+/$, ^sdlc/[a-z]
- When: run preflight
- Then: exit 1, derived false, suggestion has --branch-format, failing samples name the rule
- Actual: as expected
- Result: **pass**
- Test: `.sdlc/slices/S-017/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs:70`
- Command: `VERIFY_ROOT=<worktree of sdlc/S-017-v0-cli-0> node --test --test-name-pattern="VS-1: near variants" .sdlc/slices/S-017/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs`

Evidence, transcripts: `.sdlc/slices/S-017/verification/r0/logs/cli-0-transcripts.txt`

## TC-cli-4 (VS-1): A given format is kept

- Requirements: R-091; spec source: R-091 acceptance
- Given: regex rule passing; --format feat/{name}
- When: run preflight
- Then: exit 0, format feat/{name}, derived false, given true
- Actual: as expected
- Result: **pass**
- Test: `.sdlc/slices/S-017/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs:82`
- Command: `VERIFY_ROOT=<worktree of sdlc/S-017-v0-cli-0> node --test --test-name-pattern="VS-1: given format" .sdlc/slices/S-017/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs`

Evidence, transcripts: `.sdlc/slices/S-017/verification/r0/logs/cli-0-transcripts.txt`

## TC-cli-5 (VS-2): starts_with plus ends_with: no derivation, generic suggestion

- Requirements: R-092; spec source: R-092 acceptance
- Given: two rules alpha and beta, no format
- When: run preflight
- Then: exit 1, ok false, derived false, suggestion has --branch-format, failing samples name alpha or beta
- Actual: as expected
- Result: **pass**
- Test: `.sdlc/slices/S-017/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs:90`
- Command: `VERIFY_ROOT=<worktree of sdlc/S-017-v0-cli-0> node --test --test-name-pattern="VS-2: starts_with plus" .sdlc/slices/S-017/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs`

Evidence, transcripts: `.sdlc/slices/S-017/verification/r0/logs/cli-0-transcripts.txt`

## TC-cli-6 (VS-2): A negated rule never derives

- Requirements: R-092; spec source: R-092 acceptance
- Given: single negated contains/starts_with/ends_with/regex rule that the default fails
- When: run preflight
- Then: exit 1, derived false, format sdlc/{name}, failing samples carry the rule label
- Actual: as expected for 4 operators
- Result: **pass**
- Test: `.sdlc/slices/S-017/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs:104`
- Command: `VERIFY_ROOT=<worktree of sdlc/S-017-v0-cli-0> node --test --test-name-pattern="VS-2: negated" .sdlc/slices/S-017/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs`

Evidence, transcripts: `.sdlc/slices/S-017/verification/r0/logs/cli-0-transcripts.txt`

## TC-cli-7 (VS-2): Three rules, and a given format, give no derivation

- Requirements: R-092; spec source: R-092 acceptance
- Given: 3 rules; or 1 starts_with rule with --format sdlc/{name}
- When: run preflight
- Then: exit 1, derived false, --branch-format in suggestion
- Actual: as expected
- Result: **pass**
- Test: `.sdlc/slices/S-017/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs:122`
- Command: `VERIFY_ROOT=<worktree of sdlc/S-017-v0-cli-0> node --test --test-name-pattern="VS-2: three rules" .sdlc/slices/S-017/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs`

Evidence, transcripts: `.sdlc/slices/S-017/verification/r0/logs/cli-0-transcripts.txt`

## TC-cli-8 (VS-2): Control: one starts_with rule derives; label fallbacks

- Requirements: R-092; spec source: R-092 acceptance
- Given: one starts_with rule; rules without name
- When: run preflight
- Then: derived true format feature/sdlc/{name}; labels fall back to ruleset <id> or branch_name_pattern
- Actual: as expected
- Result: **pass**
- Test: `.sdlc/slices/S-017/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs:136`
- Command: `VERIFY_ROOT=<worktree of sdlc/S-017-v0-cli-0> node --test --test-name-pattern="VS-2: one starts_with|VS-2: rule label" .sdlc/slices/S-017/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs`

Evidence, transcripts: `.sdlc/slices/S-017/verification/r0/logs/cli-0-transcripts.txt`

## TC-cli-9 (VS-3): Other rule types, [] and junk entries leave rules empty and ok

- Requirements: R-100; spec source: R-100 acceptance
- Given: gh answers only pull_request, creation, tag_name_pattern, commit_message_pattern; [] ; [null,1,'x',[]]
- When: run preflight
- Then: exit 0, rules [], notes [], every sample pass (not unchecked), derived false
- Actual: as expected
- Result: **pass**
- Test: `.sdlc/slices/S-017/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs:152`
- Command: `VERIFY_ROOT=<worktree of sdlc/S-017-v0-cli-0> node --test --test-name-pattern="VS-3: rules of another" .sdlc/slices/S-017/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs`

Evidence, transcripts: `.sdlc/slices/S-017/verification/r0/logs/cli-0-transcripts.txt`

## TC-cli-10 (VS-3): A rule for one sample name only fails only that sample

- Requirements: R-100; spec source: R-100 acceptance
- Given: gh call 1 (slice) returns regex ^zzz/; others []; then e2e-only variant
- When: run preflight
- Then: only the slice (or e2e) sample fails; rules holds the one rule; derived false; exit 1
- Actual: as expected
- Result: **pass**
- Test: `.sdlc/slices/S-017/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs:167`
- Command: `VERIFY_ROOT=<worktree of sdlc/S-017-v0-cli-0> node --test --test-name-pattern="VS-3: a rule for one" .sdlc/slices/S-017/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs`

Evidence, transcripts: `.sdlc/slices/S-017/verification/r0/logs/cli-0-transcripts.txt`

## TC-cli-11 (VS-3): glab null, empty regex, empty object in mr mode give ok

- Requirements: R-100; spec source: R-100 acceptance
- Given: glab answers null, {branch_name_regex:""}, {}
- When: run preflight --mode mr --branch anything-goes
- Then: exit 0, rules empty, working sample pass
- Actual: as expected
- Result: **pass**
- Test: `.sdlc/slices/S-017/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs:185`
- Command: `VERIFY_ROOT=<worktree of sdlc/S-017-v0-cli-0> node --test --test-name-pattern="VS-3: mr mode" .sdlc/slices/S-017/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs`

Evidence, transcripts: `.sdlc/slices/S-017/verification/r0/logs/cli-0-transcripts.txt`

## TC-cli-12 (VS-4): Seven shim scenarios in one run, at the public boundary

- Requirements: R-074; spec source: R-074 acceptance
- Given: gh and glab shims as the plan lists
- When: run the seven commands
- Then: each scenario's exit code and JSON keys as R-074 states, incl. mr bad-name fails the working sample and invalid --format exits 2 with one JSON error and no forge call
- Actual: as expected
- Result: **pass**
- Test: `.sdlc/slices/S-017/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs:195`
- Command: `VERIFY_ROOT=<worktree of sdlc/S-017-v0-cli-0> node --test --test-name-pattern="VS-4: seven shim" .sdlc/slices/S-017/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs`

Evidence, transcripts: `.sdlc/slices/S-017/verification/r0/logs/cli-0-transcripts.txt`

## TC-cli-13 (VS-4): Invalid input forms exit 2 with one JSON error line

- Requirements: R-074; spec source: R-074 acceptance
- Given: empty format, repeated placeholder, unknown placeholder, leading slash, unknown mode, missing mode value, no mode
- When: run preflight
- Then: exit 2, one stdout line, ok false, error string, tree unchanged
- Actual: as expected for 7 forms
- Result: **pass**
- Test: `.sdlc/slices/S-017/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs:238`
- Command: `VERIFY_ROOT=<worktree of sdlc/S-017-v0-cli-0> node --test --test-name-pattern="VS-4: invalid input" .sdlc/slices/S-017/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs`

Evidence, transcripts: `.sdlc/slices/S-017/verification/r0/logs/cli-0-transcripts.txt`

## TC-cli-14 (VS-4): stdout is one JSON line for ok, fail and unchecked

- Requirements: R-074; spec source: R-074 acceptance
- Given: three shim answers
- When: run preflight
- Then: one JSON line each
- Actual: as expected
- Result: **pass**
- Test: `.sdlc/slices/S-017/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs:260`
- Command: `VERIFY_ROOT=<worktree of sdlc/S-017-v0-cli-0> node --test --test-name-pattern="VS-4: stdout is one" .sdlc/slices/S-017/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs`

Evidence, transcripts: `.sdlc/slices/S-017/verification/r0/logs/cli-0-transcripts.txt`

## TC-cli-15 (VS-5): Malformed, non-list, empty, binary, deep and 5000-rule bodies from gh

- Requirements: R-074, R-100; spec source: R-074 acceptance; spec §3 gh failure
- Given: gh answers each broken body
- When: run preflight
- Then: exit 0, ok true, note 'rules unknown on github', all samples unchecked, tree unchanged; 5000 rules finish under 20 s
- Actual: as expected
- Result: **pass**
- Test: `.sdlc/slices/S-017/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs:268`
- Command: `VERIFY_ROOT=<worktree of sdlc/S-017-v0-cli-0> node --test --test-name-pattern="VS-5: malformed" .sdlc/slices/S-017/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs`

Evidence, transcripts: `.sdlc/slices/S-017/verification/r0/logs/cli-0-transcripts.txt`

## TC-cli-16 (VS-5): Broken glab answers

- Requirements: R-074; spec source: R-074 acceptance
- Given: glab answers malformed JSON, a list, non-string regex, exit 1 401
- When: run preflight
- Then: JSON verdict, no stderr, exit 0, note 'rules unknown on gitlab: 401 Unauthorized'
- Actual: as expected
- Result: **pass**
- Test: `.sdlc/slices/S-017/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs:297`
- Command: `VERIFY_ROOT=<worktree of sdlc/S-017-v0-cli-0> node --test --test-name-pattern="VS-5: glab broken" .sdlc/slices/S-017/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs`

Evidence, transcripts: `.sdlc/slices/S-017/verification/r0/logs/cli-0-transcripts.txt`

## TC-cli-17 (VS-5): Hostile pattern and label text (control chars, injection, format strings, confusables, oversized)

- Requirements: R-074; spec source: R-074 acceptance
- Given: 80 corpus entries x regex, starts_with, contains
- When: run preflight
- Then: JSON verdict, exit 0 or 1 matching ok, empty stderr, tree unchanged
- Actual: as expected for 240 runs
- Result: **pass**
- Test: `.sdlc/slices/S-017/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs:318`
- Command: `VERIFY_ROOT=<worktree of sdlc/S-017-v0-cli-0> node --test --test-name-pattern="VS-5: hostile" .sdlc/slices/S-017/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs`

Evidence, transcripts: `.sdlc/slices/S-017/verification/r0/logs/cli-0-transcripts.txt`

## TC-cli-18 (VS-5): A rule with a non-string pattern must not crash preflight

- Requirements: R-074; spec source: spec §3 'cannot evaluate' / 'never blocks'; spec §4 output and exit codes
- Given: gh answers one branch_name_pattern rule whose parameters.pattern is 5, null, a list or an object, operator regex, starts_with or contains
- When: run preflight --mode pr
- Then: a JSON verdict with the sample unevaluated and note 'cannot evaluate <label>' (spec section 3: a pattern that re.compile rejects gives None and never blocks); exit 0
- Actual: Python traceback (TypeError) on stderr, exit 1, empty stdout. All 6 shapes crash. Exit 1 reads as 'not ok' to the driver, which then finds no JSON.
- Result: **fail**
- Test: `.sdlc/slices/S-017/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs:335`
- Command: `VERIFY_ROOT=<worktree of sdlc/S-017-v0-cli-0> node --test --test-name-pattern="VS-5: bad regex is unevaluated" .sdlc/slices/S-017/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs`

Evidence, odd-pattern probe:
```
regex_int status 1 json false | TypeError: first argument must be string or compiled pattern
regex_null status 1 json false | TypeError: first argument must be string or compiled pattern
regex_list status 1 json false | TypeError: cannot use 'tuple' as a dict key (unhashable type: 'list')
starts_int status 1 json false | TypeError: startswith first arg must be str or a tuple of str, not int
starts_null status 1 json false | TypeError: startswith first arg must be str or a tuple of str, not NoneType
contains_obj status 1 json false | TypeError: 'in <string>' requires string as left operand, not dict
op_list/op_missing/params_str/noparams status 0 json true (unevaluated)
```

Evidence, run log: `.sdlc/slices/S-017/verification/r0/logs/cli-0-run.txt`

## TC-cli-19 (VS-5): Odd operator or missing parameters give unevaluated, not a crash

- Requirements: R-074; spec source: R-074 acceptance
- Given: rules with parameters 'x', none, operator list, no operator
- When: run preflight
- Then: exit 0, samples unevaluated, empty stderr
- Actual: as expected
- Result: **pass**
- Test: `.sdlc/slices/S-017/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs:358`
- Command: `VERIFY_ROOT=<worktree of sdlc/S-017-v0-cli-0> node --test --test-name-pattern="VS-5: rules with odd" .sdlc/slices/S-017/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs`

Evidence, odd-pattern probe: `.sdlc/slices/S-017/verification/r0/logs/cli-0-odd-probe.txt`

## TC-cli-20 (VS-5): Absent gh and absent glab

- Requirements: R-074; spec source: R-074 acceptance
- Given: PATH holds only python3 and git
- When: run preflight
- Then: exit 0, 'rules unknown on <forge>', unchecked
- Actual: as expected
- Result: **pass**
- Test: `.sdlc/slices/S-017/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs:375`
- Command: `VERIFY_ROOT=<worktree of sdlc/S-017-v0-cli-0> node --test --test-name-pattern="VS-5: absent gh" .sdlc/slices/S-017/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs`

Evidence, transcripts: `.sdlc/slices/S-017/verification/r0/logs/cli-0-transcripts.txt`

## TC-cli-21 (VS-5): A hanging shim ends with unknown rules

- Requirements: R-074; spec source: R-074 acceptance
- Given: gh shim sleeps forever
- When: run preflight
- Then: exit 0, note rules unknown, unchecked, tree unchanged, under 90 s
- Actual: ended after 60 s (FORGE_TIMEOUT) with the expected verdict
- Result: **pass**
- Test: `.sdlc/slices/S-017/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs:389`
- Command: `VERIFY_ROOT=<worktree of sdlc/S-017-v0-cli-0> node --test --test-name-pattern="VS-5: a hanging" .sdlc/slices/S-017/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs`

Evidence, transcripts: `.sdlc/slices/S-017/verification/r0/logs/cli-0-transcripts.txt`

## TC-cli-22 (VS-5): Idempotency: two runs, same verdict, tree unchanged; gh called only with api <path>

- Requirements: R-074; spec source: R-074 acceptance
- Given: starts_with rule
- When: run preflight twice
- Then: same JSON (state timestamp aside), tree unchanged, every gh call is 'api repos/{owner}/{repo}/rules/branches/<sample>'
- Actual: as expected
- Result: **pass**
- Test: `.sdlc/slices/S-017/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs:399`
- Command: `VERIFY_ROOT=<worktree of sdlc/S-017-v0-cli-0> node --test --test-name-pattern="VS-5: running twice" .sdlc/slices/S-017/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs`

Evidence, transcripts: `.sdlc/slices/S-017/verification/r0/logs/cli-0-transcripts.txt`

## TC-cli-23 (VS-5): Unicode and spaced repo path, CI=true, LANG=C

- Requirements: R-074; spec source: R-074 acceptance
- Given: repo named 'répo wïth spaces'
- When: run preflight
- Then: exit 0, ok true
- Actual: as expected
- Result: **pass**
- Test: `.sdlc/slices/S-017/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs:413`
- Command: `VERIFY_ROOT=<worktree of sdlc/S-017-v0-cli-0> node --test --test-name-pattern="VS-5: unicode" .sdlc/slices/S-017/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs`

Evidence, transcripts: `.sdlc/slices/S-017/verification/r0/logs/cli-0-transcripts.txt`

## Attacks

None beyond the hostile-text corpus in TC-cli-17.

## Seeds

- preflight is quadratic in the number of forge rules (`skills/sdlc/branches.py`): Rules lists of 1000, 5000, 10000, 20000 starts_with rules took 0.35 s, 1.5 s, 5.0 s, 18.9 s; 60000 rules took 169 s. The cause is the 'rule not in result["rules"]' scan in read_rules. Real forges cap rules far below this, so this blocks nothing.
