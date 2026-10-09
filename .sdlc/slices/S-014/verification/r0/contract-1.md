# S-014 contract verification, part 1, round 0

- Slice: S-014
- Profile: contract
- Round: 0
- Commit: c1b5dff
- Verdict: pass (13 of 13 cases), 4 seeds

Environment: Python 3.14.7, Node v24.19.0, shell shims for gh and glab on PATH (no network), scratch git repos, S-013 code from commit e575c1b as the reference for VS-9

Run all: `VERIFY_WORKTREE=<worktree of sdlc/S-014> TESTKIT_SEED=14001 node --test --test-reporter=spec .sdlc/slices/S-014/verification/r0/tests/contract-1/read-rules.verify-contract.test.mjs`

## TC-contract-1 (VS-7): 44 odd glab bodies keep the result shape

- Given: a gitlab repo and a glab shim that prints each body: array, string, number, bool, null, 100000 nested arrays, regex as number, list, object, invalid RE2, NUL, control chars, lone surrogate, 1 MB regex, NaN, BOM, two documents, empty output, 8 MB body, 2M-entry array
- When: read_rules(repo, [feat/a, feat/b]) runs for each body
- Then: each result has the five top keys; every rule has exactly the five spec keys with the right types; a non-string regex gives no rule; a string regex gives one rule; unparseable output gives one note and unchecked true
- Actual: 44 of 44 cases match. No exception. Probe: a regex of only spaces gives a rule (not covered by the spec).
- Result: pass
- Spec source: R-030 acceptance; R-026 acceptance
- Test: `.sdlc/slices/S-014/verification/r0/tests/contract-1/read-rules.verify-contract.test.mjs:83`

examples run (log, full log `.sdlc/slices/S-014/verification/r0/logs/contract-1-final.log`):
```
VS-7 examples: 44 cases, probes: whitespace-only regex: rules=[{"source":"gitlab","kind":"regex","pattern":"   ","negate":false,"label":"push rule"}] unchecked=false
```

## TC-contract-2 (VS-7): Property: 1500 random glab bodies against a model written from the spec

- Given: a seeded generator of JSON bodies (null, {}, odd regex types, invalid regexes, extra keys, bad text) and sample lists
- When: read_rules runs through a glab shim for each body
- Then: one regex rule exactly when branch_name_regex is a non-empty string; no rule and no note for other parsed values; one note and unchecked for unparseable text
- Actual: 0 violations in 1500 runs
- Result: pass
- Spec source: R-030 acceptance
- Test: `.sdlc/slices/S-014/verification/r0/tests/contract-1/read-rules.verify-contract.test.mjs:160`

glab body property (property-run, full log `.sdlc/slices/S-014/verification/r0/logs/contract-1-final.log`):
```
property glab body: seed=14001 runs=1500 violations=0
```

## TC-contract-3 (VS-7): Property: gitlab_rule is total and matches the model for 2000 values

- Given: the pure function gitlab_rule and 2000 generated values
- When: gitlab_rule(value) runs through pycall
- Then: returns the one regex rule for a non-empty string regex in a dict, else None; never raises
- Actual: 0 violations in 2000 runs
- Result: pass
- Spec source: R-030 acceptance
- Test: `.sdlc/slices/S-014/verification/r0/tests/contract-1/read-rules.verify-contract.test.mjs:182`

gitlab_rule property (property-run, full log `.sdlc/slices/S-014/verification/r0/logs/contract-1-final.log`):
```
property gitlab_rule: seed=14002 runs=2000 violations=0
```

## TC-contract-4 (VS-7): Probe: failure notes for odd stderr

- Given: glab exits 1 with stderr: boom, empty, multi-line, 200000 characters, control characters, NUL, CR LF, U+2028
- When: read_rules runs
- Then: one note starting rules unknown on gitlab:, empty rules and by_sample, unchecked true, no exception
- Actual: All 10 give that shape. The note keeps line breaks and NUL from stderr in 3 cases, and a 200000 character stderr gives a 200025 character note. The spec states no limit, so these go to seeds.
- Result: pass
- Spec source: R-031 acceptance
- Test: `.sdlc/slices/S-014/verification/r0/tests/contract-1/read-rules.verify-contract.test.mjs:202`

note lengths (log, full log `.sdlc/slices/S-014/verification/r0/logs/contract-1-final.log`):
```
note lengths: 29,50,30,200025,33,37,35,34,28,28; multi-line notes: 3
```

## TC-contract-5 (VS-7): Exit codes 1, 2, 127 and 255 with a JSON error body on stdout; exit 0 with the same body

- Given: a glab shim that prints {"message": "404 Project Not Found"}
- When: read_rules runs for each exit code
- Then: non-zero exit gives the rules unknown note and unchecked true; exit 0 gives no rule, no note and unchecked false (ADR f2c2)
- Actual: matches for all five
- Result: pass
- Spec source: R-030, R-031 acceptance; ADR f2c2
- Test: `.sdlc/slices/S-014/verification/r0/tests/contract-1/read-rules.verify-contract.test.mjs:220`

test result (log, full log `.sdlc/slices/S-014/verification/r0/logs/contract-1-final.log`):
```
pass: TC-contract-5
```

## TC-contract-6 (VS-7): One glab call with the literal argv and the repo as cwd, for hostile sample names

- Given: samples --help, -x, $(touch pwn), a b, empty, newline, unicode, 50000 characters, ../../etc
- When: read_rules runs once
- Then: one call; argv is api projects/:fullpath/push_rule; cwd is the repo; no sample reaches argv; by_sample has one key per distinct sample; no file pwn
- Actual: matches
- Result: pass
- Spec source: R-030 acceptance
- Test: `.sdlc/slices/S-014/verification/r0/tests/contract-1/read-rules.verify-contract.test.mjs:233`

test result (log, full log `.sdlc/slices/S-014/verification/r0/logs/contract-1-final.log`):
```
pass: TC-contract-6
```

## TC-contract-7 (VS-9): S-013 GitHub cases give the same results before and after the refactor

- Given: the S-013 version of branches.py (commit e575c1b) and the S-014 version, one gh shim; two operators, negate true and false, a skipped non-pattern rule, a failure on the second sample, a failure with empty stderr, a JSON object, non-JSON output, no samples
- When: read_rules runs on both versions
- Then: equal results; exact S-013 notes
- Actual: 7 of 7 scenarios equal; rules, by_sample, notes and unchecked as before
- Result: pass
- Spec source: R-026 acceptance
- Test: `.sdlc/slices/S-014/verification/r0/tests/contract-1/read-rules.verify-contract.test.mjs:252`

test result (log, full log `.sdlc/slices/S-014/verification/r0/logs/contract-1-final.log`):
```
pass: TC-contract-7
```

## TC-contract-8 (VS-9): Property: 1200 random gh scenarios give equal results on the S-013 and S-014 code

- Given: a seeded generator of gh outputs: rule lists, other rule types, junk entries, exit codes, bad JSON, 0 to 4 samples, up to 4 steps
- When: read_rules runs on both versions through the same shim
- Then: equal results; for well-formed rules, exactly the five keys, a kind among the four values, a string pattern
- Actual: 0 differences in 1200 runs; no shape violation for well-formed rules. 177 runs with malformed gh rules (no parameters) give kind null and pattern null in both versions (seed).
- Result: pass
- Spec source: R-026 acceptance
- Test: `.sdlc/slices/S-014/verification/r0/tests/contract-1/read-rules.verify-contract.test.mjs:301`

gh differential (property-run, full log `.sdlc/slices/S-014/verification/r0/logs/contract-1-final.log`):
```
property gh differential: seed=14003 runs=1200 violations=0 malformed-gh-rule-probes=177 first=#7 kind null
```

## TC-contract-9 (VS-9): FORGE_TIMEOUT stops a slow gh and a slow glab; GH_PROMPT_DISABLED stays 1

- Given: FORGE_TIMEOUT set to 1, a shim that sleeps 6 s; a parent env with GH_PROMPT_DISABLED=0
- When: read_rules runs for github and for gitlab
- Then: one note, unchecked true, return after about 1 s; the shim sees GH_PROMPT_DISABLED=1
- Actual: github 1.004 s, gitlab 1.005 s; the shim saw 1 for both
- Result: pass
- Spec source: R-031 acceptance; plan VS-9 notes
- Test: `.sdlc/slices/S-014/verification/r0/tests/contract-1/read-rules.verify-contract.test.mjs:320`

timeouts and env (measurement, full log `.sdlc/slices/S-014/verification/r0/logs/contract-1-final.log`):
```
timeouts: {"github":1.0039777755737305,"gitlab":1.0049958229064941}; GH_PROMPT_DISABLED seen by shim with parent value 0: {"github":["1"],"gitlab":["1"]}
```

## TC-contract-10 (VS-9): A missing gh is a note, not a crash

- Given: PATH with python3 and git only
- When: read_rules runs on a github repo
- Then: one note starting rules unknown on github:, no rules, unchecked true
- Actual: matches
- Result: pass
- Spec source: R-026; S-013 behavior
- Test: `.sdlc/slices/S-014/verification/r0/tests/contract-1/read-rules.verify-contract.test.mjs:360`

test result (log, full log `.sdlc/slices/S-014/verification/r0/logs/contract-1-final.log`):
```
pass: TC-contract-10
```

## TC-contract-11 (VS-9): gh is called once per sample with the quoted path, in the repo; glab is not called

- Given: a gh shim and a glab shim on PATH; samples with spaces, slash, hash, unicode, --help
- When: read_rules runs on a github repo
- Then: four gh calls with argv api repos/{owner}/{repo}/rules/branches/<quoted>; no glab call
- Actual: matches
- Result: pass
- Spec source: R-026; S-013 behavior
- Test: `.sdlc/slices/S-014/verification/r0/tests/contract-1/read-rules.verify-contract.test.mjs:370`

test result (log, full log `.sdlc/slices/S-014/verification/r0/logs/contract-1-final.log`):
```
pass: TC-contract-11
```

## TC-contract-12 (VS-9): Surface of branches.py after the refactor

- Given: branches.py loaded by path with python3 -I
- When: list the names and the signature
- Then: read_rules(repo, samples); FORGE_TIMEOUT present; GH_TIMEOUT removed; stdlib imports only
- Actual: matches. New helpers: _run_forge_cli, _glab_push_rule, _collect_rules, gitlab_rule, make_rule, RULE_KEYS.
- Result: pass
- Spec source: plan Files section
- Test: `.sdlc/slices/S-014/verification/r0/tests/contract-1/read-rules.verify-contract.test.mjs:385`

surface listing (log, full log `.sdlc/slices/S-014/verification/r0/logs/contract-1-final.log`):
```
read_rules(repo, samples) FORGE_TIMEOUT=60 has FORGE_TIMEOUT=true has GH_TIMEOUT=false
imports: import argparse import json import os import re import subprocess import sys import urllib.parse from datetime import datetime, timezone
```

## TC-contract-13 (VS-7): Determinism and input immutability

- Given: a glab shim that prints a regex body
- When: read_rules runs twice with the same samples list
- Then: equal results; the samples list is unchanged
- Actual: matches. Probe: by_sample lists and the rule dicts are shared between samples and rules (spec states no immutability, so a seed).
- Result: pass
- Spec source: R-030 acceptance
- Test: `.sdlc/slices/S-014/verification/r0/tests/contract-1/read-rules.verify-contract.test.mjs:400`

aliasing probe (log, full log `.sdlc/slices/S-014/verification/r0/logs/contract-1-final.log`):
```
aliasing probe: {"b_list_aliased":true,"b_label":"mutated","samples":["a","b"]}
```

## Attacks

None filed from this profile.

## Seeds

- gh rule with missing parameters returns kind null and pattern null: A gh body entry {"type": "branch_name_pattern"} with no parameters gives a rule with kind null and pattern null, in the S-013 code and the S-014 code alike. R-026 acceptance says kind is one of four values and pattern is a string. GitHub always sends the parameters, so no real input shows it. Fix: drop the rule or give a note when operator or pattern is not valid (github_rule). (`skills/sdlc/branches.py`)
- A forge failure note keeps line breaks, NUL and any length of stderr: With stderr 'a\nb' the note is 'rules unknown on gitlab: a\nb'. A 200000 character stderr gives a 200025 character note. NUL and CR pass through. The spec says only that the note holds <stderr>. The plan's VS-5 asks for one line and a bound. Fix: collapse whitespace and cut to a fixed length in _run_forge_cli. (`skills/sdlc/branches.py`)
- A regex of only spaces becomes a rule: {"branch_name_regex": "   "} gives one regex rule with pattern '   '. The spec treats an empty regex as no rule and says nothing about spaces. GitLab would likely reject such a push rule. (`skills/sdlc/branches.py`)
- read_rules results share list and dict objects: For a gitlab push rule, every by_sample entry is the same list object, and its rule dict is the same object as the one in rules. A caller that edits one entry changes all of them. The spec states no immutability rule. Fix: copy the list and the rule per sample. (`skills/sdlc/branches.py`)
