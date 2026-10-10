# Security verification: S-017, round 0, part 0

- Slice: S-017 (commit b67230c, branch sdlc/S-017)
- Profile: security
- Verdict: verified (no in-scope attack broke a guarantee)

Environment: Python 3, Node 24, cli-runner with scratch HOME; gh and glab shells from the testkit stub-server on PATH; no network

Threat model: the forge answer (rule objects, stderr, exit codes) and the `--format` and `--branch` values are untrusted input. Rule authors are repo admins, so attacks that need a hostile admin are seeds. The spec states no size or time limit except the 60 s forge timeout in code.

## Charters
- VS-1: Explore regex rules and the gh and glab read path with anchor, case and nesting variants to find a derived format or a failing verdict where R-091 says ok.
- VS-2: Explore multi-rule and negated rules with hostile patterns to find a derived format where R-092 says none.
- VS-3: Explore rule type confusion, empty lists and per-sample answers to find a rule that applies when R-100 says rules are empty.
- VS-4: Explore the seven shim scenarios and the attack corpus through --format and --branch to find a crash, a changed repo or a wrong exit code at the public boundary (R-074).
- VS-5: Explore malformed, huge, hostile and hanging forge answers to find a corrupted verdict or a changed repo.

## TC-security-1 (VS-1): Rule that the default satisfies gives ok and no derivation (gh and glab, 14 attacks)

- Given: A scratch git repo with .sdlc/config.json (gitMode pr, forge set) and a gh or glab shim that prints canned JSON
- When: preflight runs with each of the 15 attacks: TC-sec-1-github, TC-sec-1-github-unanchored, TC-sec-1-github-inline-ignorecase-upper, TC-sec-1-github-case-sensitive-upper, TC-sec-1-github-nested-name, TC-sec-1-github-anchored-end-too-short, TC-sec-1-github-lookahead, TC-sec-1-glab, TC-sec-1-glab-unanchored, TC-sec-1-glab-inline-ignorecase-upper, TC-sec-1-glab-case-sensitive-upper, TC-sec-1-glab-nested-name, TC-sec-1-glab-anchored-end-too-short, TC-sec-1-glab-lookahead, TC-sec-1-calls
- Then: Each run gives one JSON object, the exit code and verdict the spec states, and the repo tree is unchanged
- Expected: every call is `api repos/{owner}/{repo}/rules/branches/<encoded name>`; slash is percent-encoded; exit 0, ok, sdlc/{name}, derived false, empty suggestion, no failing sample; exit 1 and a --branch-format suggestion, not a derived format; ok with the default, nothing derived
- Actual: All attacks held (see attacks).
- Result: pass
- Spec source: R-091 acceptance
- Test: .sdlc/slices/S-017/verification/r0/tests/security-0/preflight.verify-security.test.mjs:1
- Command: `VERIFY_REPO=<worktree of sdlc/S-017> node --test --test-concurrency=1 .sdlc/slices/S-017/verification/r0/tests/security-0/preflight.verify-security.test.mjs --test-name-pattern="TC-sec-1"`

Evidence:
- attack: attack log
  .sdlc/slices/S-017/verification/r0/logs/security-0-attacks.jsonl
- http-exchange: shim calls (read-only api calls) and tree diff
```
api repos/{owner}/{repo}/rules/branches/sdlc%2FS-001 ; api repos/{owner}/{repo}/rules/branches/sdlc%2Fstate-20261010002332 ; api repos/{owner}/{repo}/rules/branches/sdlc%2FM-1-e2e
```
- file-tree: repo tree unchanged after every refusal
```
treeUnchanged true for every run (cli-runner snapshot incl. git refs)
```

## TC-security-2 (VS-2): Two, three or negated rules give no derivation and a generic suggestion

- Given: A scratch git repo with .sdlc/config.json (gitMode pr, forge set) and a gh or glab shim that prints canned JSON
- When: preflight runs with each of the 9 attacks: TC-sec-2-two, TC-sec-2-three, TC-sec-2-neg-starts_with, TC-sec-2-neg-ends_with, TC-sec-2-neg-contains, TC-sec-2-neg-regex, TC-sec-2-neg-passing, TC-sec-2-dup, TC-sec-2-hostile-derive
- Then: Each run gives one JSON object, the exit code and verdict the spec states, and the repo tree is unchanged
- Expected: a derived format only when the derived format passes the second verdict; derived false; derived never carries an invalid git ref; the run does not crash; exit 0, ok; exit 1, derived false, labelled failing samples, suggestion with --branch-format; exit 1, derived false, labels alpha or beta on each failing sample, --branch-format in suggestion
- Actual: All attacks held (see attacks).
- Result: pass
- Spec source: R-092 acceptance
- Test: .sdlc/slices/S-017/verification/r0/tests/security-0/preflight.verify-security.test.mjs:106
- Command: `VERIFY_REPO=<worktree of sdlc/S-017> node --test --test-concurrency=1 .sdlc/slices/S-017/verification/r0/tests/security-0/preflight.verify-security.test.mjs --test-name-pattern="TC-sec-2"`

Evidence:
- attack: attack log
  .sdlc/slices/S-017/verification/r0/logs/security-0-attacks.jsonl
- http-exchange: shim calls (read-only api calls) and tree diff
```
exit 1; ok false; format sdlc/{name}; derived false; rules 2; results fail; suggestion "--branch-format \"<prefix>{name}<suffix>\" (every branch name must pass: alpha; beta)"; fail rules alpha,alpha,alpha
```
- file-tree: repo tree unchanged after every refusal
```
treeUnchanged true for every run (cli-runner snapshot incl. git refs)
```

## TC-security-3 (VS-3): Rules of another type or none leave rules empty and the verdict ok

- Given: A scratch git repo with .sdlc/config.json (gitMode pr, forge set) and a gh or glab shim that prints canned JSON
- When: preflight runs with each of the 5 attacks: TC-sec-3-othertype, TC-sec-3-typeconfusion, TC-sec-3-empty, TC-sec-3-glab-other, TC-sec-3-persample
- Then: Each run gives one JSON object, the exit code and verdict the spec states, and the repo tree is unchanged
- Expected: only the slice sample can fail; the others pass; rules empty, every sample pass (not unchecked), ok, derived false, exit 0; rules empty, ok; rules empty, pass on every sample; rules empty, pass, ok
- Actual: All attacks held (see attacks).
- Result: pass
- Spec source: R-100 acceptance
- Test: .sdlc/slices/S-017/verification/r0/tests/security-0/preflight.verify-security.test.mjs:155
- Command: `VERIFY_REPO=<worktree of sdlc/S-017> node --test --test-concurrency=1 .sdlc/slices/S-017/verification/r0/tests/security-0/preflight.verify-security.test.mjs --test-name-pattern="TC-sec-3"`

Evidence:
- attack: attack log
  .sdlc/slices/S-017/verification/r0/logs/security-0-attacks.jsonl
- http-exchange: shim calls (read-only api calls) and tree diff
```
exit 1; slice:fail,state:pass,e2e:pass
```
- file-tree: repo tree unchanged after every refusal
```
treeUnchanged true for every run (cli-runner snapshot incl. git refs)
```

## TC-security-4 (VS-4): Seven shim scenarios and refused input at the public boundary

- Given: A scratch git repo with .sdlc/config.json (gitMode pr, forge set) and a gh or glab shim that prints canned JSON
- When: preflight runs with each of the 3 attacks: TC-sec-4-shape, TC-sec-4-format-corpus, TC-sec-4-branch-corpus
- Then: Each run gives one JSON object, the exit code and verdict the spec states, and the repo tree is unchanged
- Expected: every value gives one JSON object, exit 0, 1 or 2, no traceback, no tree change; a refusal (exit 2) leaves the verdict out and calls no forge tool; one JSON object, exit 0, 1 or 2, no traceback, no tree change; the key set is the same in every JSON result; exit codes 0, 0, 1, 0, 0, 1, 2
- Actual: All attacks held (see attacks).
- Result: pass
- Spec source: R-074 acceptance
- Test: .sdlc/slices/S-017/verification/r0/tests/security-0/preflight.verify-security.test.mjs:193
- Command: `VERIFY_REPO=<worktree of sdlc/S-017> node --test --test-concurrency=1 .sdlc/slices/S-017/verification/r0/tests/security-0/preflight.verify-security.test.mjs --test-name-pattern="TC-sec-4"`

Evidence:
- attack: attack log
  .sdlc/slices/S-017/verification/r0/logs/security-0-attacks.jsonl
- http-exchange: shim calls (read-only api calls) and tree diff
```
1 none: exit 0 keys true | 2 derive: exit 0 keys true | 3 fail: exit 1 keys true | 4 pass: exit 0 keys true | 5 shim exit 1: exit 0 keys true | 6 mr bad-name: exit 1 keys true | 7 bad format: exit 2 keys true
```
- file-tree: repo tree unchanged after every refusal
```
treeUnchanged true for every run (cli-runner snapshot incl. git refs)
```

## TC-security-5 (VS-5): Broken forge answers never corrupt the verdict or touch the repo

- Given: A scratch git repo with .sdlc/config.json (gitMode pr, forge set) and a gh or glab shim that prints canned JSON
- When: preflight runs with each of the 8 attacks: TC-sec-5-malformed, TC-sec-5-glab-malformed, TC-sec-5-huge, TC-sec-5-control, TC-sec-5-glab-control, TC-sec-5-exit-with-json, TC-sec-5-gh-missing, TC-sec-5-hang
- Then: Each run gives one JSON object, the exit code and verdict the spec states, and the repo tree is unchanged
- Expected: no crash within 30 s; ok; tree unchanged; no crash; one JSON object; a note starting rules unknown on github (or an empty-rule pass for a valid list); verdict never fail; tree unchanged; no crash; unknown or empty-rule pass; verdict never fail; ok, unchecked, a note naming the missing tool, no crash; ok, unchecked, a timeout note, within about 70 s, only one call, no child left running; one JSON line; no raw control byte; one JSON object on one line of stdout; no raw control byte in stdout; tree unchanged; treated as unknown, unchecked, ok; the printed rule is ignored
- Actual: All attacks held (see attacks).
- Result: pass
- Spec source: R-074 quote (forge shim exits 1 gives rules unknown, unchecked); spec Edge cases (gh or glab unavailable gives unchecked)
- Test: .sdlc/slices/S-017/verification/r0/tests/security-0/preflight.verify-security.test.mjs:251
- Command: `VERIFY_REPO=<worktree of sdlc/S-017> node --test --test-concurrency=1 .sdlc/slices/S-017/verification/r0/tests/security-0/preflight.verify-security.test.mjs --test-name-pattern="TC-sec-5"`

Evidence:
- attack: attack log
  .sdlc/slices/S-017/verification/r0/logs/security-0-attacks.jsonl
- http-exchange: shim calls (read-only api calls) and tree diff
```
exit 0; 60138ms; calls 1; notes ["rules unknown on github: Command '['gh', 'api', 'repos/{owner}/{repo}/rules/branches/sdlc%2FS-001']' timed out after 60 seconds"]
```
- file-tree: repo tree unchanged after every refusal
```
treeUnchanged true for every run (cli-runner snapshot incl. git refs)
```

## Attacks

### TC-sec-1-github: held
- Charter: VS-1 regex rule that the default satisfies
- Input: ^[a-z]+/.+ via github
- Expected: exit 0, ok, sdlc/{name}, derived false, empty suggestion, no failing sample
- Observed: exit 0; ok true; format sdlc/{name}; derived false; rules 1; results pass; suggestion ""
- Test: .sdlc/slices/S-017/verification/r0/tests/security-0/preflight.verify-security.test.mjs:1

### TC-sec-1-github-unanchored: held
- Charter: VS-1 near variant unanchored
- Input: [a-z]+/.+ via github
- Expected: ok with the default, nothing derived
- Observed: exit 0; ok true; format sdlc/{name}; derived false; rules 1; results pass; suggestion ""
- Test: .sdlc/slices/S-017/verification/r0/tests/security-0/preflight.verify-security.test.mjs:1

### TC-sec-1-github-inline-ignorecase-upper: held
- Charter: VS-1 near variant inline-ignorecase-upper
- Input: (?i)^SDLC/ via github
- Expected: ok with the default, nothing derived
- Observed: exit 0; ok true; format sdlc/{name}; derived false; rules 1; results pass; suggestion ""
- Test: .sdlc/slices/S-017/verification/r0/tests/security-0/preflight.verify-security.test.mjs:1

### TC-sec-1-github-case-sensitive-upper: held
- Charter: VS-1 near variant case-sensitive-upper
- Input: ^SDLC/ via github
- Expected: exit 1 and a --branch-format suggestion, not a derived format
- Observed: exit 1; ok false; format sdlc/{name}; derived false; rules 1; results fail; suggestion "--branch-format \"SDLC/{name}\" (rule \"r\": regex \"^SDLC/\")"
- Test: .sdlc/slices/S-017/verification/r0/tests/security-0/preflight.verify-security.test.mjs:1

### TC-sec-1-github-nested-name: held
- Charter: VS-1 near variant nested-name
- Input: ^[a-z]+/[a-z]+/.+ via github
- Expected: exit 1 and a --branch-format suggestion, not a derived format
- Observed: exit 1; ok false; format sdlc/{name}; derived false; rules 1; results fail; suggestion "--branch-format \"a/a/{name}\" (rule \"r\": regex \"^[a-z]+/[a-z]+/.+\")"
- Test: .sdlc/slices/S-017/verification/r0/tests/security-0/preflight.verify-security.test.mjs:1

### TC-sec-1-github-anchored-end-too-short: held
- Charter: VS-1 near variant anchored-end-too-short
- Input: ^[a-z]+/.{40,}$ via github
- Expected: exit 1 and a --branch-format suggestion, not a derived format
- Observed: exit 1; ok false; format sdlc/{name}; derived false; rules 1; results fail; suggestion "--branch-format \"<literal>/{name}\" (rule \"r\": regex \"^[a-z]+/.{40,}$\"; choose a literal th"
- Test: .sdlc/slices/S-017/verification/r0/tests/security-0/preflight.verify-security.test.mjs:1

### TC-sec-1-github-lookahead: held
- Charter: VS-1 near variant lookahead
- Input: ^(?=sdlc/).+ via github
- Expected: ok with the default, nothing derived
- Observed: exit 0; ok true; format sdlc/{name}; derived false; rules 1; results pass; suggestion ""
- Test: .sdlc/slices/S-017/verification/r0/tests/security-0/preflight.verify-security.test.mjs:1

### TC-sec-1-glab: held
- Charter: VS-1 regex rule that the default satisfies
- Input: ^[a-z]+/.+ via glab
- Expected: exit 0, ok, sdlc/{name}, derived false, empty suggestion, no failing sample
- Observed: exit 0; ok true; format sdlc/{name}; derived false; rules 1; results pass; suggestion ""
- Test: .sdlc/slices/S-017/verification/r0/tests/security-0/preflight.verify-security.test.mjs:1

### TC-sec-1-glab-unanchored: held
- Charter: VS-1 near variant unanchored
- Input: [a-z]+/.+ via glab
- Expected: ok with the default, nothing derived
- Observed: exit 0; ok true; format sdlc/{name}; derived false; rules 1; results pass; suggestion ""
- Test: .sdlc/slices/S-017/verification/r0/tests/security-0/preflight.verify-security.test.mjs:1

### TC-sec-1-glab-inline-ignorecase-upper: held
- Charter: VS-1 near variant inline-ignorecase-upper
- Input: (?i)^SDLC/ via glab
- Expected: ok with the default, nothing derived
- Observed: exit 0; ok true; format sdlc/{name}; derived false; rules 1; results pass; suggestion ""
- Test: .sdlc/slices/S-017/verification/r0/tests/security-0/preflight.verify-security.test.mjs:1

### TC-sec-1-glab-case-sensitive-upper: held
- Charter: VS-1 near variant case-sensitive-upper
- Input: ^SDLC/ via glab
- Expected: exit 1 and a --branch-format suggestion, not a derived format
- Observed: exit 1; ok false; format sdlc/{name}; derived false; rules 1; results fail; suggestion "--branch-format \"SDLC/{name}\" (rule \"push rule\": regex \"^SDLC/\")"
- Test: .sdlc/slices/S-017/verification/r0/tests/security-0/preflight.verify-security.test.mjs:1

### TC-sec-1-glab-nested-name: held
- Charter: VS-1 near variant nested-name
- Input: ^[a-z]+/[a-z]+/.+ via glab
- Expected: exit 1 and a --branch-format suggestion, not a derived format
- Observed: exit 1; ok false; format sdlc/{name}; derived false; rules 1; results fail; suggestion "--branch-format \"a/a/{name}\" (rule \"push rule\": regex \"^[a-z]+/[a-z]+/.+\")"
- Test: .sdlc/slices/S-017/verification/r0/tests/security-0/preflight.verify-security.test.mjs:1

### TC-sec-1-glab-anchored-end-too-short: held
- Charter: VS-1 near variant anchored-end-too-short
- Input: ^[a-z]+/.{40,}$ via glab
- Expected: exit 1 and a --branch-format suggestion, not a derived format
- Observed: exit 1; ok false; format sdlc/{name}; derived false; rules 1; results fail; suggestion "--branch-format \"<literal>/{name}\" (rule \"push rule\": regex \"^[a-z]+/.{40,}$\"; choose a li"
- Test: .sdlc/slices/S-017/verification/r0/tests/security-0/preflight.verify-security.test.mjs:1

### TC-sec-1-glab-lookahead: held
- Charter: VS-1 near variant lookahead
- Input: ^(?=sdlc/).+ via glab
- Expected: ok with the default, nothing derived
- Observed: exit 0; ok true; format sdlc/{name}; derived false; rules 1; results pass; suggestion ""
- Test: .sdlc/slices/S-017/verification/r0/tests/security-0/preflight.verify-security.test.mjs:1

### TC-sec-1-calls: held
- Charter: VS-1 the gh shim is only asked to read
- Input: one regex rule, three sample names
- Expected: every call is `api repos/{owner}/{repo}/rules/branches/<encoded name>`; slash is percent-encoded
- Observed: api repos/{owner}/{repo}/rules/branches/sdlc%2FS-001 ; api repos/{owner}/{repo}/rules/branches/sdlc%2Fstate-20261010002332 ; api repos/{owner}/{repo}/rules/branches/sdlc%2FM-1-e2e
- Test: .sdlc/slices/S-017/verification/r0/tests/security-0/preflight.verify-security.test.mjs:99

### TC-sec-2-two: held
- Charter: VS-2 two rules, no derivation
- Input: starts_with feature/ (alpha) + ends_with -x (beta)
- Expected: exit 1, derived false, labels alpha or beta on each failing sample, --branch-format in suggestion
- Observed: exit 1; ok false; format sdlc/{name}; derived false; rules 2; results fail; suggestion "--branch-format \"<prefix>{name}<suffix>\" (every branch name must pass: alpha; beta)"; fail rules alpha,alpha,alpha
- Test: .sdlc/slices/S-017/verification/r0/tests/security-0/preflight.verify-security.test.mjs:106

### TC-sec-2-three: held
- Charter: VS-2 three rules, no derivation
- Input: three starts_with rules
- Expected: derived false
- Observed: exit 1; ok false; format sdlc/{name}; derived false; rules 3; results fail; suggestion "--branch-format \"<prefix>{name}<suffix>\" (every branch name must pass: a; b; c)"
- Test: .sdlc/slices/S-017/verification/r0/tests/security-0/preflight.verify-security.test.mjs:116

### TC-sec-2-neg-starts_with: held
- Charter: VS-2 negated starts_with rule that the default fails
- Input: starts_with negate true
- Expected: exit 1, derived false, labelled failing samples, suggestion with --branch-format
- Observed: exit 1; ok false; format sdlc/{name}; derived false; rules 1; results fail; suggestion "--branch-format \"<prefix>{name}<suffix>\" (every branch name must pass: neg)"; fail rules neg,neg,neg
- Test: .sdlc/slices/S-017/verification/r0/tests/security-0/preflight.verify-security.test.mjs:1

### TC-sec-2-neg-ends_with: held
- Charter: VS-2 negated ends_with rule that the default fails
- Input: ends_with negate true
- Expected: exit 1, derived false, labelled failing samples, suggestion with --branch-format
- Observed: exit 1; ok false; format sdlc/{name}; derived false; rules 1; results fail,pass; suggestion "--branch-format \"<prefix>{name}<suffix>\" (every branch name must pass: neg)"; fail rules neg
- Test: .sdlc/slices/S-017/verification/r0/tests/security-0/preflight.verify-security.test.mjs:1

### TC-sec-2-neg-contains: held
- Charter: VS-2 negated contains rule that the default fails
- Input: contains negate true
- Expected: exit 1, derived false, labelled failing samples, suggestion with --branch-format
- Observed: exit 1; ok false; format sdlc/{name}; derived false; rules 1; results fail; suggestion "--branch-format \"<prefix>{name}<suffix>\" (every branch name must pass: neg)"; fail rules neg,neg,neg
- Test: .sdlc/slices/S-017/verification/r0/tests/security-0/preflight.verify-security.test.mjs:1

### TC-sec-2-neg-regex: held
- Charter: VS-2 negated regex rule that the default fails
- Input: regex negate true
- Expected: exit 1, derived false, labelled failing samples, suggestion with --branch-format
- Observed: exit 1; ok false; format sdlc/{name}; derived false; rules 1; results fail; suggestion "--branch-format \"<prefix>{name}<suffix>\" (every branch name must pass: neg)"; fail rules neg,neg,neg
- Test: .sdlc/slices/S-017/verification/r0/tests/security-0/preflight.verify-security.test.mjs:1

### TC-sec-2-neg-passing: held
- Charter: VS-2 negated rule that the default passes gives ok
- Input: not starts_with zzz/
- Expected: exit 0, ok
- Observed: exit 0; ok true; format sdlc/{name}; derived false; rules 1; results pass; suggestion ""
- Test: .sdlc/slices/S-017/verification/r0/tests/security-0/preflight.verify-security.test.mjs:132

### TC-sec-2-dup: held
- Charter: VS-2 two identical rules collapse into one and may derive
- Input: two equal starts_with feature/ rules
- Expected: a derived format only when the derived format passes the second verdict
- Observed: exit 0; ok true; format feature/sdlc/{name}; derived true; rules 1; results pass; suggestion ""
- Test: .sdlc/slices/S-017/verification/r0/tests/security-0/preflight.verify-security.test.mjs:136

### TC-sec-2-hostile-derive: held
- Charter: VS-2 a starts_with pattern that would make an unsafe derived format
- Input: patterns with a second placeholder, "..", spaces, "@{", "~", a leading dash
- Expected: derived never carries an invalid git ref; the run does not crash
- Observed: "{name}" -> exit 1 derived false format sdlc/{name} | ".." -> exit 1 derived false format sdlc/{name} | "a b/" -> exit 1 derived false format sdlc/{name} | "a@{b/" -> exit 1 derived false format sdlc/{name} | "~x/" -> exit 1 derived false format sdlc/{name} | "-x/" -> exit 1 derived false format sdlc/{name} | "a\nb/" -> exit 1 derived false format sdlc/{name} | "/" -> exit 1 derived false format sdlc/{name} | ".lock/" -> exit 1 derived false format sdlc/{name}
- Test: .sdlc/slices/S-017/verification/r0/tests/security-0/preflight.verify-security.test.mjs:141

### TC-sec-3-othertype: held
- Charter: VS-3 only rules of another type
- Input: pull_request, creation, required_status_checks objects
- Expected: rules empty, every sample pass (not unchecked), ok, derived false, exit 0
- Observed: exit 0; ok true; format sdlc/{name}; derived false; rules 0; results pass; suggestion ""; rules []
- Test: .sdlc/slices/S-017/verification/r0/tests/security-0/preflight.verify-security.test.mjs:155

### TC-sec-3-typeconfusion: held
- Charter: VS-3 a failing pattern under the wrong type must not apply
- Input: commit_message_pattern regex ^zzz/, branch_name_pattern under a changed case, nested wrapper
- Expected: rules empty, ok
- Observed: exit 0; ok true; format sdlc/{name}; derived false; rules 0; results pass; suggestion ""
- Test: .sdlc/slices/S-017/verification/r0/tests/security-0/preflight.verify-security.test.mjs:159

### TC-sec-3-empty: held
- Charter: VS-3 empty list
- Input: []
- Expected: rules empty, pass on every sample
- Observed: exit 0; ok true; format sdlc/{name}; derived false; rules 0; results pass; suggestion ""
- Test: .sdlc/slices/S-017/verification/r0/tests/security-0/preflight.verify-security.test.mjs:168

### TC-sec-3-glab-other: held
- Charter: VS-3 a GitLab push rule with only other fields
- Input: commit_message_regex only, empty branch_name_regex, number, list, null body
- Expected: rules empty, pass, ok
- Observed: {"commit_message_regex":"^zzz"} -> exit 0 rules 0 pass | {"branch_name_regex":""} -> exit 0 rules 0 pass | {"branch_name_regex":5} -> exit 0 rules 0 pass | {"branch_name_regex":["^zzz"]} -> exit 0 rules 0 pass | null -> exit 0 rules 0 pass | [] -> exit 0 rules 0 pass
- Test: .sdlc/slices/S-017/verification/r0/tests/security-0/preflight.verify-security.test.mjs:172

### TC-sec-3-persample: held
- Charter: VS-3 a rule for one sample only fails only that sample
- Input: gh answers a failing rule for sdlc%2FS-001 and [] for the others
- Expected: only the slice sample can fail; the others pass
- Observed: exit 1; slice:fail,state:pass,e2e:pass
- Test: .sdlc/slices/S-017/verification/r0/tests/security-0/preflight.verify-security.test.mjs:182

### TC-sec-4-shape: held
- Charter: VS-4 public JSON keys and exit codes in all seven scenarios
- Input: seven scenarios through gh and glab shims
- Expected: the key set is the same in every JSON result; exit codes 0, 0, 1, 0, 0, 1, 2
- Observed: 1 none: exit 0 keys true | 2 derive: exit 0 keys true | 3 fail: exit 1 keys true | 4 pass: exit 0 keys true | 5 shim exit 1: exit 0 keys true | 6 mr bad-name: exit 1 keys true | 7 bad format: exit 2 keys true
- Test: .sdlc/slices/S-017/verification/r0/tests/security-0/preflight.verify-security.test.mjs:193

### TC-sec-4-format-corpus: held
- Charter: VS-4 invalid --format values from the attack corpus
- Input: injection,traversal,control-chars,flag-like-values,format-strings,unicode-whitespace,unicode-confusables,oversized
- Expected: every value gives one JSON object, exit 0, 1 or 2, no traceback, no tree change; a refusal (exit 2) leaves the verdict out and calls no forge tool
- Observed: 95 values; injection/cmd-subst:2 injection/backticks:2 injection/semicolon:2 injection/pipe:2 injection/ampersand:2 injection/redirect:2 injection/json-break:2 injection/newline-json:2 injection/git-option:2 injection/git-revision:2 injection/percent:2 injection/python-format:2 ...
- Test: .sdlc/slices/S-017/verification/r0/tests/security-0/preflight.verify-security.test.mjs:214

### TC-sec-4-branch-corpus: held
- Charter: VS-4 --branch values in mr mode against a glab regex
- Input: injection, traversal, control-chars, flag-like-values, unicode-whitespace
- Expected: one JSON object, exit 0, 1 or 2, no traceback, no tree change
- Observed: 59 values; injection/cmd-subst:1 injection/backticks:1 injection/semicolon:1 injection/pipe:1 injection/ampersand:1 injection/redirect:1 injection/json-break:1 injection/newline-json:1 injection/git-option:1 injection/git-revision:1 ...
- Test: .sdlc/slices/S-017/verification/r0/tests/security-0/preflight.verify-security.test.mjs:232

### TC-sec-5-malformed: held
- Charter: VS-5 malformed and non-list gh bodies
- Input: empty,open-brace,truncated-list,null,string,number,true,object,trailing-garbage,two-docs,bom,html,deep
- Expected: no crash; one JSON object; a note starting rules unknown on github (or an empty-rule pass for a valid list); verdict never fail; tree unchanged
- Observed: empty: exit 0 unknown true unchecked | open-brace: exit 0 unknown true unchecked | truncated-list: exit 0 unknown true unchecked | null: exit 0 unknown true unchecked | string: exit 0 unknown true unchecked | number: exit 0 unknown true unchecked | true: exit 0 unknown true unchecked | object: exit 0 unknown true unchecked | trailing-garbage: exit 0 unknown true unchecked | two-docs: exit 0 unknown true unchecked | bom: exit 0 unknown true unchecked | html: exit 0 unknown true unchecked | deep: exit 0 unknown true unchecked
- Test: .sdlc/slices/S-017/verification/r0/tests/security-0/preflight.verify-security.test.mjs:251

### TC-sec-5-glab-malformed: held
- Charter: VS-5 malformed glab push-rule bodies
- Input: empty, {, null, [], "x", 5, huge nesting
- Expected: no crash; unknown or empty-rule pass; verdict never fail
- Observed: empty: exit 0 notes ["rules unknown on gitlab: glab printed output that is not JSON"] | brace: exit 0 notes ["rules unknown on gitlab: glab printed output that is not JSON"] | list: exit 0 notes [] | str: exit 0 notes [] | num: exit 0 notes [] | deep: exit 0 notes ["rules unknown on gitlab: glab printed output that is not JSON"]
- Test: .sdlc/slices/S-017/verification/r0/tests/security-0/preflight.verify-security.test.mjs:265

### TC-sec-5-huge: held
- Charter: VS-5 very large gh bodies
- Input: 20 MB list of other-type objects; 20 MB single string rule pattern
- Expected: no crash within 30 s; ok; tree unchanged
- Observed: 31.6MB list: exit 0 990ms rules 0; 20MB pattern: exit 1 566ms ok false out 41943715 bytes
- Test: .sdlc/slices/S-017/verification/r0/tests/security-0/preflight.verify-security.test.mjs:276

### TC-sec-5-control: held
- Charter: VS-5 control characters in rule text
- Input: ESC, CR, NUL, U+2028, bidi override in label and pattern
- Expected: one JSON object on one line of stdout; no raw control byte in stdout; tree unchanged
- Observed: exit 1; stdout lines 1; raw control in stdout false; suggestion "--branch-format \"<prefix>{name}<suffix>\" (every branch name must pass: a\u001
- Test: .sdlc/slices/S-017/verification/r0/tests/security-0/preflight.verify-security.test.mjs:285

### TC-sec-5-glab-control: held
- Charter: VS-5 control characters in the glab regex
- Input: ESC and newline in branch_name_regex
- Expected: one JSON line; no raw control byte
- Observed: exit 0; lines 1
- Test: .sdlc/slices/S-017/verification/r0/tests/security-0/preflight.verify-security.test.mjs:295

### TC-sec-5-exit-with-json: held
- Charter: VS-5 gh exits non-zero but prints valid rules
- Input: exit 3 with a failing rule on stdout
- Expected: treated as unknown, unchecked, ok; the printed rule is ignored
- Observed: exit 0; ok true; format sdlc/{name}; derived false; rules 0; results unchecked; suggestion ""; notes ["rules unknown on github: HTTP 403"]
- Test: .sdlc/slices/S-017/verification/r0/tests/security-0/preflight.verify-security.test.mjs:300

### TC-sec-5-gh-missing: held
- Charter: VS-5 gh absent from PATH
- Input: PATH holds python3 and git only
- Expected: ok, unchecked, a note naming the missing tool, no crash
- Observed: exit 0; notes ["rules unknown on github: [Errno 2] No such file or directory: 'gh'"]
- Test: .sdlc/slices/S-017/verification/r0/tests/security-0/preflight.verify-security.test.mjs:304

### TC-sec-5-hang: held
- Charter: VS-5 a gh shim that never answers
- Input: stall; one call; limit is the 60 s FORGE_TIMEOUT
- Expected: ok, unchecked, a timeout note, within about 70 s, only one call, no child left running
- Observed: exit 0; 60138ms; calls 1; notes ["rules unknown on github: Command '['gh', 'api', 'repos/{owner}/{repo}/rules/branches/sdlc%2FS-001']' timed out after 60 seconds"]
- Test: .sdlc/slices/S-017/verification/r0/tests/security-0/preflight.verify-security.test.mjs:309

### SEED-nonstring-pattern: out-of-scope
- Charter: VS-5 rule with a non-string pattern crashes preflight
- Input: operator starts_with/regex/contains with pattern 5, null or a list
- Expected: one JSON object (spec: a forge answer that cannot be evaluated becomes unevaluated)
- Observed: traceback, exit 1, empty stdout | starts_with/5: exit 1 json false TypeError: startswith first arg must be str or a tuple of str, not int | regex/null: exit 1 json false TypeError: first argument must be string or compiled pattern | contains/["x"]: exit 1 json false TypeError: 'in <string>' requires string as left operand, not list
- Test: .sdlc/slices/S-017/verification/r0/tests/security-0/preflight.verify-security.test.mjs:319

### SEED-suggestion-injection: out-of-scope
- Charter: VS-2 the suggestion repeats rule text into a copy-paste command
- Input: starts_with pattern `x" ; touch PWN #`
- Expected: suggestion is a safe literal or a refusal
- Observed: suggestion carries rule text as shell syntax | "--branch-format \"x\" ; touch PWN #sdlc/{name}\""; derived false; tree unchanged true
- Test: .sdlc/slices/S-017/verification/r0/tests/security-0/preflight.verify-security.test.mjs:329

### SEED-stderr-echo: out-of-scope
- Charter: VS-5 gh stderr is copied whole into notes
- Input: stderr holds a token-like string and 200 KB of text
- Expected: secret-looking text and unbounded text do not reach the verdict
- Observed: stderr copied into notes without a limit or redaction | notes bytes 200068; has token true
- Test: .sdlc/slices/S-017/verification/r0/tests/security-0/preflight.verify-security.test.mjs:334

### SEED-redos: held
- Charter: VS-5 catastrophic regex from the forge
- Input: pattern (a*)*b-style against sample names
- Expected: finishes quickly
- Observed: 683ms exit 1
- Test: .sdlc/slices/S-017/verification/r0/tests/security-0/preflight.verify-security.test.mjs:339

## Seeds

- preflight crashes with a traceback when a rule pattern is not a string: A gh branch_name_pattern with operator starts_with, ends_with, contains or regex and a pattern that is a number, null or a list makes evaluate raise TypeError. preflight exits 1 with an empty stdout, so the driver cannot tell a crash from a failed verdict. Known from S-015 and S-016 seeds; still open. Repro: attack SEED-nonstring-pattern. (skills/sdlc/branches.py)
- the suggestion repeats rule text as shell syntax: A starts_with pattern such as x" ; touch PWN # that fails the derived format validation still appears in the suggestion line as --branch-format "x" ; touch PWN #sdlc/{name}". The suggestion also shows a derived format that validate_format refused. Rule authors are repo admins, so the threat is low. Repro: attack SEED-suggestion-injection. (skills/sdlc/branches.py)
- gh stderr goes whole into notes: On a gh failure, _run_forge_cli puts all of stderr into notes: 200 KB of text and a token-like string reached the JSON output. No limit and no redaction. Repro: attack SEED-stderr-echo. (skills/sdlc/branches.py)
- a rule pattern is echoed whole into the output: A 20 MB contains pattern from the forge gives 41 MB of stdout, because rules and the suggestion carry the pattern. No limit in the spec. Repro: attack TC-sec-5-huge. (skills/sdlc/branches.py)
- the negate guard in derive is not needed for safety: Removing the negate check from derive changes no result, because the second verdict rejects every derived format of a negated rule. The guard is dead defense in depth; tests cannot pin it alone. Mutation run on a throwaway copy. (skills/sdlc/branches.py)
