# S-015 evidence

Slice: preflight tests the mode's branch names and prints a verdict.

## R-038
With `--format`, given is true and `format` is the flag value. With a config branchFormat and no flag, given is true. With neither, given is false. An invalid format exits 2.

Tests:
- T-R-038a
- T-R-038b
- T-R-038c
- T-R-038d
- .sdlc/slices/S-015/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs:27 (VS-1 flag beats broken config)
- .sdlc/slices/S-015/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs:37 (VS-1 config alone gives given true; neither gives false)
- .sdlc/slices/S-015/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs:49 (VS-1 empty config format counts as none; broken config with no flag exits 2)
- .sdlc/slices/S-015/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs:61 (VS-1 invalid formats exit 2 with one JSON object)
- .sdlc/slices/S-015/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs:76 (VS-1 valid unusual formats)
- .sdlc/slices/S-015/verification/r0/tests/contract-0/preflight.verify-contract.test.mjs:89 (Format resolves from flag, config or default (property))
- .sdlc/slices/S-015/verification/r0/tests/contract-0/preflight.verify-contract.test.mjs:134 (Spec examples and corner formats)

## R-039
`--mode pr` samples slice, state, e2e. `--mode stack` samples run, milestone, slice. `--mode mr` and `--mode direct` sample none of the loop's kinds.

Tests:
- T-R-039a
- T-R-039b
- T-R-039c
- T-R-039d
- .sdlc/slices/S-015/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs:91 (VS-2 pr samples)
- .sdlc/slices/S-015/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs:101 (VS-2 stack samples)
- .sdlc/slices/S-015/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs:109 (VS-2 mr and direct give none)
- .sdlc/slices/S-015/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs:120 (VS-2 names follow prefix and lowercase transform)
- .sdlc/slices/S-015/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs:131 (VS-2 unknown mode and missing mode exit 2)
- .sdlc/slices/S-015/verification/r0/tests/contract-0/preflight.verify-contract.test.mjs:162 (build_samples follows the mode (property))
- .sdlc/slices/S-015/verification/r0/tests/contract-0/preflight.verify-contract.test.mjs:187 (Preflight samples per mode with prefix and lowercase formats)

## R-040
`--mode mr --branch X` adds a `working` sample named X, evaluated as given. `--mode pr --branch X` adds no `working` sample.

Tests:
- T-R-040a
- T-R-040b
- T-R-040c
- .sdlc/slices/S-015/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs:142 (VS-3 mr adds working sample last; modes ignore it)
- .sdlc/slices/S-015/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs:155 (VS-3 working name is judged as given under gitlab regex)
- .sdlc/slices/S-015/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs:171 (VS-3 working name equal to a slice name is not renamed)
- .sdlc/slices/S-015/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs:180 (VS-3 hostile working names)
- .sdlc/slices/S-015/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs:209 (VS-3 empty --branch value in mr mode)
- .sdlc/slices/S-015/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs:391 (VS-6 a..b fails with git check-ref-format with no forge)
- .sdlc/slices/S-015/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs:400 (VS-6 a..b fails with rules present; other samples keep their result (stack has no working))
- .sdlc/slices/S-015/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs:418 (VS-6 a..b fails when rules unknown; with unevaluated rule)
- .sdlc/slices/S-015/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs:434 (VS-6 invalid ref names, no forge)
- .sdlc/slices/S-015/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs:448 (VS-6 loop-kind samples with a invalid literal format part fail validation (exit 2) rather than reach forge)
- .sdlc/slices/S-015/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs:457 (VS-6 working branch invalid in pr mode is ignored)
- .sdlc/slices/S-015/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs:465 (VS-6 gh path for hostile working name is one encoded argument)
- .sdlc/slices/S-015/verification/r0/tests/cli-1/preflight.verify-cli.test.mjs:199 (Working sample equal to a slice name keeps its own row)
- .sdlc/slices/S-015/verification/r0/tests/security-0/preflight.verify-security.test.mjs:29 (mr working branch equal to a slice name is kept as given, last)
- .sdlc/slices/S-015/verification/r0/tests/security-0/preflight.verify-security.test.mjs:39 (pr, stack and direct ignore a hostile --branch)
- .sdlc/slices/S-015/verification/r0/tests/security-0/preflight.verify-security.test.mjs:53 (option-like, spaced and empty --branch=<v> never become git or gh options)
- .sdlc/slices/S-015/verification/r0/tests/security-0/preflight.verify-security.test.mjs:76 (separate option-like value for --branch exits 2 with one error object)
- .sdlc/slices/S-015/verification/r0/tests/security-0/preflight.verify-security.test.mjs:87 (attack corpus (7 families) as working branch)
- .sdlc/slices/S-015/verification/r0/tests/security-0/preflight.verify-security.test.mjs:261 (21 invalid ref names x (no forge, rules, rules unknown))
- .sdlc/slices/S-015/verification/r0/tests/security-0/preflight.verify-security.test.mjs:281 (spec example a..b, exact samples array)

## R-041
With no rules, preflight prints `ok: true` with the default format and exits 0. Samples that pass, are `unevaluated`, or are `unchecked` never block.

Tests:
- T-R-041a
- T-R-041b
- T-R-041c
- T-R-041d
- .sdlc/slices/S-015/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs:217 (VS-4 no forge gives ok and unchecked)
- .sdlc/slices/S-015/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs:231 (VS-4 matching rule passes; bad regex unevaluated; failing gh unchecked)
- .sdlc/slices/S-015/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs:253 (VS-4 gh garbage, empty, non-list JSON, gh timeout-free failure variants never block)
- .sdlc/slices/S-015/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs:280 (VS-4 gitlab null body, empty regex, glab failure)
- .sdlc/slices/S-015/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs:479 (VS-4 gh and glab absent from PATH)
- .sdlc/slices/S-015/verification/r0/tests/cli-1/preflight.verify-cli.test.mjs:14 (No gh and no glab: ok true, one rules unknown note, all unchecked)
- .sdlc/slices/S-015/verification/r0/tests/cli-1/preflight.verify-cli.test.mjs:40 (Signed-out gh gives one note and unchecked)
- .sdlc/slices/S-015/verification/r0/tests/cli-1/preflight.verify-cli.test.mjs:52 (Signed-out glab gives one note and unchecked)
- .sdlc/slices/S-015/verification/r0/tests/cli-1/preflight.verify-cli.test.mjs:62 (Garbage, empty, non-list, binary and null output never crash)
- .sdlc/slices/S-015/verification/r0/tests/cli-1/preflight.verify-cli.test.mjs:95 (Same bad regex on every sample gives one cannot evaluate note)
- .sdlc/slices/S-015/verification/r0/tests/cli-1/preflight.verify-cli.test.mjs:107 (Distinct bad rules: notes in first-seen order without duplicates)
- .sdlc/slices/S-015/verification/r0/tests/cli-1/preflight.verify-cli.test.mjs:123 (Stack mode: unknown kind and bad regex each give a note)
- .sdlc/slices/S-015/verification/r0/tests/cli-1/preflight.verify-cli.test.mjs:132 (GitLab bad push rule gives one note across samples)
- .sdlc/slices/S-015/verification/r0/tests/cli-1/preflight.verify-cli.test.mjs:141 (A read_rules failure on call 2 yields one note and all unchecked)
- .sdlc/slices/S-015/verification/r0/tests/contract-0/preflight.verify-contract.test.mjs:249 (Verdict rows, first failing rule, exit code, per-sample rules (property))
- .sdlc/slices/S-015/verification/r0/tests/contract-0/preflight.verify-contract.test.mjs:337 (Notes merge without duplicates in first-seen order)
- .sdlc/slices/S-015/verification/r0/tests/contract-0/preflight.verify-contract.test.mjs:375 (Each sample is judged against its own rules)
- .sdlc/slices/S-015/verification/r0/tests/security-0/preflight.verify-security.test.mjs:106 (no forge: ok true, all unchecked, zero gh calls, all four modes)
- .sdlc/slices/S-015/verification/r0/tests/security-0/preflight.verify-security.test.mjs:121 (matching rule passes; uncompilable regexes are unevaluated with a note)
- .sdlc/slices/S-015/verification/r0/tests/security-0/preflight.verify-security.test.mjs:136 (gh exit 1, non-JSON, JSON object, empty output give one rules-unknown note)
- .sdlc/slices/S-015/verification/r0/tests/security-0/preflight.verify-security.test.mjs:150 (forge rule with a non-string pattern (null, 5, list, dict))
- .sdlc/slices/S-015/verification/r0/tests/security-0/preflight.verify-security.test.mjs:174 (glab malformed push-rule bodies)
- .sdlc/slices/S-015/verification/r0/tests/security-0/preflight.verify-security.test.mjs:327 (gh or glab absent from PATH, four modes)
- .sdlc/slices/S-015/verification/r0/tests/security-0/preflight.verify-security.test.mjs:346 (signed-out gh, invalid UTF-8, truncated JSON, 100000-deep JSON, 300000-byte stderr)
- .sdlc/slices/S-015/verification/r0/tests/security-0/preflight.verify-security.test.mjs:400 (working branch .. and . reach gh as repos/{owner}/{repo}/rules/branches/.. and /.)
- .sdlc/slices/S-015/verification/r0/tests/security-0/preflight.verify-security.test.mjs:413 (forge regex ^(a+)+$ against a 41-character working branch)

## R-044
Every sample object carries `kind`, `name`, `result`, `rule`. The output carries `ok`, `format`, `derived`, `forge`, `rules`, `samples`, `notes`, `suggestion`. A failed sample names the first failing rule's label. Exit codes are 0, 1, and 2 for ok, not ok, and bad input.

Tests:
- T-R-044a
- T-R-044b
- T-R-044c
- T-R-044d
- T-R-044e
- T-R-044f
- .sdlc/slices/S-015/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs:296 (VS-5 output keys, exit 1, one JSON object)
- .sdlc/slices/S-015/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs:318 (VS-5 first failing rule label, later failing rules ignored; passing sample rule null)
- .sdlc/slices/S-015/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs:330 (VS-5 negate rule and contains)
- .sdlc/slices/S-015/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs:340 (VS-5 exit codes 0, 1, 2 for the same repo)
- .sdlc/slices/S-015/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs:352 (VS-5 exit 1 only from preflight; other commands exit 0 on ok:true)
- .sdlc/slices/S-015/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs:361 (VS-5 repo path with space and unicode; missing repo; non-git dir)
- .sdlc/slices/S-015/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs:374 (VS-5 twice gives the same verdict and leaves tree unchanged)
- .sdlc/slices/S-015/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs:384 (VS-5 CI env and no tty)
- .sdlc/slices/S-015/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs:391 (VS-6 a..b fails with git check-ref-format with no forge)
- .sdlc/slices/S-015/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs:400 (VS-6 a..b fails with rules present; other samples keep their result (stack has no working))
- .sdlc/slices/S-015/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs:418 (VS-6 a..b fails when rules unknown; with unevaluated rule)
- .sdlc/slices/S-015/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs:434 (VS-6 invalid ref names, no forge)
- .sdlc/slices/S-015/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs:448 (VS-6 loop-kind samples with a invalid literal format part fail validation (exit 2) rather than reach forge)
- .sdlc/slices/S-015/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs:457 (VS-6 working branch invalid in pr mode is ignored)
- .sdlc/slices/S-015/verification/r0/tests/cli-0/preflight.verify-cli.test.mjs:465 (VS-6 gh path for hostile working name is one encoded argument)
- .sdlc/slices/S-015/verification/r0/tests/cli-1/preflight.verify-cli.test.mjs:29 (Missing gh with bad ref: only the ref fails)
- .sdlc/slices/S-015/verification/r0/tests/cli-1/preflight.verify-cli.test.mjs:95 (Same bad regex on every sample gives one cannot evaluate note)
- .sdlc/slices/S-015/verification/r0/tests/cli-1/preflight.verify-cli.test.mjs:107 (Distinct bad rules: notes in first-seen order without duplicates)
- .sdlc/slices/S-015/verification/r0/tests/cli-1/preflight.verify-cli.test.mjs:141 (A read_rules failure on call 2 yields one note and all unchecked)
- .sdlc/slices/S-015/verification/r0/tests/cli-1/preflight.verify-cli.test.mjs:151 (A rule for one sample does not fail the others)
- .sdlc/slices/S-015/verification/r0/tests/cli-1/preflight.verify-cli.test.mjs:175 (Overlapping rules give per-sample first failing label)
- .sdlc/slices/S-015/verification/r0/tests/cli-1/preflight.verify-cli.test.mjs:188 (Negated rule applies per sample)
- .sdlc/slices/S-015/verification/r0/tests/cli-1/preflight.verify-cli.test.mjs:199 (Working sample equal to a slice name keeps its own row)
- .sdlc/slices/S-015/verification/r0/tests/cli-1/preflight.verify-cli.test.mjs:210 (Rule is judged on the formatted name)
- .sdlc/slices/S-015/verification/r0/tests/cli-1/preflight.verify-cli.test.mjs:223 (GitLab push rule applies to every sample with its own result)
- .sdlc/slices/S-015/verification/r0/tests/contract-0/preflight.verify-contract.test.mjs:249 (Verdict rows, first failing rule, exit code, per-sample rules (property))
- .sdlc/slices/S-015/verification/r0/tests/contract-0/preflight.verify-contract.test.mjs:337 (Notes merge without duplicates in first-seen order)
- .sdlc/slices/S-015/verification/r0/tests/contract-0/preflight.verify-contract.test.mjs:375 (Each sample is judged against its own rules)
- .sdlc/slices/S-015/verification/r0/tests/contract-0/preflight.verify-contract.test.mjs:404 (Consumer view: CLI process with a gh shim)
- .sdlc/slices/S-015/verification/r0/tests/contract-0/preflight.verify-contract.test.mjs:429 (Hostile --branch values keep the output shape)
- .sdlc/slices/S-015/verification/r0/tests/security-0/preflight.verify-security.test.mjs:187 (keys, exit 1, one JSON object, first failing rule label)
- .sdlc/slices/S-015/verification/r0/tests/security-0/preflight.verify-security.test.mjs:205 (hostile rule labels (newline, ANSI, JSON break-out, 100000 chars, RLO))
- .sdlc/slices/S-015/verification/r0/tests/security-0/preflight.verify-security.test.mjs:218 (negate as string, 0, null; ok never true with a failing sample)
- .sdlc/slices/S-015/verification/r0/tests/security-0/preflight.verify-security.test.mjs:231 (bad mode and format inputs exit 2, no side effect, shell metacharacters inert)
- .sdlc/slices/S-015/verification/r0/tests/security-0/preflight.verify-security.test.mjs:244 (attack corpus as a format prefix; gh path stays one quoted segment)
- .sdlc/slices/S-015/verification/r0/tests/security-0/preflight.verify-security.test.mjs:261 (21 invalid ref names x (no forge, rules, rules unknown))
- .sdlc/slices/S-015/verification/r0/tests/security-0/preflight.verify-security.test.mjs:281 (spec example a..b, exact samples array)
- .sdlc/slices/S-015/verification/r0/tests/security-0/preflight.verify-security.test.mjs:289 (@{-1} and @{-2} as working branch, run from a repo with branch history)
- .sdlc/slices/S-015/verification/r0/tests/security-0/preflight.verify-security.test.mjs:304 (same name from two cwds gives the same verdict)
- .sdlc/slices/S-015/verification/r0/tests/security-0/preflight.verify-security.test.mjs:316 (odd but valid names are not refused)
- .sdlc/slices/S-015/verification/r0/tests/security-0/preflight.verify-security.test.mjs:380 (a..b with gh missing)
- .sdlc/slices/S-015/verification/r0/tests/security-0/preflight.verify-security.test.mjs:421 (gh stderr holding a token is echoed into notes)
