# S-014 contract-0, round 0

Slice: S-014. Profile: contract. Round: 0. Commit: c1b5dff. Verdict: verified (11 of 11 cases pass).

Environment: Python 3 (python3 -I), Node test runner, glab and gh shims on PATH, no network.

Public surface: def read_rules(repo, samples); def gitlab_rule(body); def github_rule(obj); def make_rule(source, kind, pattern, negate, label); def evaluate(rule, sample); def judge(rules, sample); const RULE_KEYS; const FORGE_TIMEOUT. GH_TIMEOUT is gone and no file uses it.

Scenarios covered: VS-1, VS-2, VS-3, VS-4, VS-5, VS-6.

## TC-contract-1 (VS-1): One glab call for 0, 1, 3 and 50 samples

- Given: A scratch repo with forge set as the case says and a glab shim that logs cwd and argv
- When: read_rules(repo, samples) runs through python3 -I, with the shim first on PATH
- Then: One call per read_rules. Argv is api projects/:fullpath/push_rule. Cwd is the repo. No branch name reaches argv.
- Result: pass
- Spec source: R-030 acceptance
- Test: `.sdlc/slices/S-014/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs:70`

Evidence (log): run log
```
see .sdlc/slices/S-014/verification/r0/logs/contract-0-run.txt
```

Evidence (file-tree): public surface (python3 -I import by path)
```
def read_rules(repo, samples); def gitlab_rule(body); def github_rule(obj); def make_rule(source, kind, pattern, negate, label); def evaluate(rule, sample); def judge(rules, sample); const RULE_KEYS; const FORGE_TIMEOUT. GH_TIMEOUT is gone and no file uses it.
```

## TC-contract-2 (VS-1): Property: call count and argv over random sample sets

- Given: A scratch repo with forge set as the case says and a glab shim that logs cwd and argv
- When: read_rules(repo, samples) runs through python3 -I, with the shim first on PATH
- Then: 1000 runs, each with 0 to 7 samples: exactly one call with the fixed argv and cwd equal to the repo.
- Result: pass
- Spec source: R-030 acceptance
- Test: `.sdlc/slices/S-014/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs:82`

Evidence (property-run): property VS-1
```
seed=20261010 runs=1000 result=pass
```

## TC-contract-3 (VS-2): A branch_name_regex gives one rule with five keys

- Given: A scratch repo with forge set as the case says and a glab shim that logs cwd and argv
- When: read_rules(repo, samples) runs through python3 -I, with the shim first on PATH
- Then: rules holds one rule {source gitlab, kind regex, pattern, negate false, label push rule}. by_sample holds it under each sample. unchecked false. notes empty. Other push rule fields are ignored.
- Result: pass
- Spec source: R-030 acceptance; R-026
- Test: `.sdlc/slices/S-014/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs:98`

Evidence (log): run log
```
see .sdlc/slices/S-014/verification/r0/logs/contract-0-run.txt
```

## TC-contract-4 (VS-3): null, {}, null regex and empty regex give no rule

- Given: A scratch repo with forge set as the case says and a glab shim that logs cwd and argv
- When: read_rules(repo, samples) runs through python3 -I, with the shim first on PATH
- Then: Each gives rules [], notes [], unchecked false and an empty list per sample.
- Result: pass
- Spec source: R-030 acceptance
- Test: `.sdlc/slices/S-014/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs:114`

Evidence (log): run log
```
see .sdlc/slices/S-014/verification/r0/logs/contract-0-run.txt
```

## TC-contract-5 (VS-3): A whitespace-only regex (spec silent)

- Given: A scratch repo with forge set as the case says and a glab shim that logs cwd and argv
- When: read_rules(repo, samples) runs through python3 -I, with the shim first on PATH
- Then: The code treats it as a rule with pattern of three spaces. The spec defines only an empty regex. Recorded as a seed.
- Result: pass
- Spec source: R-030 quote (empty regex only)
- Test: `.sdlc/slices/S-014/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs:127`

Evidence (log): run log
```
see .sdlc/slices/S-014/verification/r0/logs/contract-0-run.txt
```

## TC-contract-6 (VS-4): Exit 0 with a JSON error body is no rule. Exit 1, 2, 127 are a failure

- Given: A scratch repo with forge set as the case says and a glab shim that logs cwd and argv
- When: read_rules(repo, samples) runs through python3 -I, with the shim first on PATH
- Then: Exit 0 gives no rule, no note, unchecked false. A non-zero exit gives one note rules unknown on gitlab: denied and unchecked true.
- Result: pass
- Spec source: R-030, R-031, ADR f2c2
- Test: `.sdlc/slices/S-014/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs:133`

Evidence (log): run log
```
see .sdlc/slices/S-014/verification/r0/logs/contract-0-run.txt
```

## TC-contract-7 (VS-5): Exit 1 with stderr boom

- Given: A scratch repo with forge set as the case says and a glab shim that logs cwd and argv
- When: read_rules(repo, samples) runs through python3 -I, with the shim first on PATH
- Then: One note rules unknown on gitlab: boom. rules and by_sample empty. unchecked true. One call.
- Result: pass
- Spec source: R-031 acceptance
- Test: `.sdlc/slices/S-014/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs:146`

Evidence (log): run log
```
see .sdlc/slices/S-014/verification/r0/logs/contract-0-run.txt
```

## TC-contract-8 (VS-5): Empty, multi-line, 200000 char, control, NUL and unicode stderr never raise

- Given: A scratch repo with forge set as the case says and a glab shim that logs cwd and argv
- When: read_rules(repo, samples) runs through python3 -I, with the shim first on PATH
- Then: Each gives one note with the prefix and unchecked true. Empty stderr still gives a reason (glab exited with status 1).
- Result: pass
- Spec source: R-031 acceptance
- Test: `.sdlc/slices/S-014/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs:152`

Evidence (log): stderr note lengths
```
lengths [50,50,42,200025,38,28,35,30]; multi-line stderr keeps its newlines in the note; a 100000 char stderr gives a 100025 char note
```

## TC-contract-9 (VS-6): No forge makes no call

- Given: A scratch repo with forge set as the case says and a glab shim that logs cwd and argv
- When: read_rules(repo, samples) runs through python3 -I, with the shim first on PATH
- Then: For forge empty, absent, null, 5, [], unknown, config [] or null and no config file: 0 calls from gh and glab shims, no rules, no notes, empty by_sample, unchecked true. A config that is not valid JSON makes read_rules raise Fail, and it makes no call.
- Result: pass
- Spec source: R-032 acceptance
- Test: `.sdlc/slices/S-014/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs:181`

Evidence (log): run log
```
see .sdlc/slices/S-014/verification/r0/logs/contract-0-run.txt
```

## TC-contract-10 (VS-6): A repo with no .sdlc/config.json makes no call

- Given: A scratch repo with forge set as the case says and a glab shim that logs cwd and argv
- When: read_rules(repo, samples) runs through python3 -I, with the shim first on PATH
- Then: 0 calls, unchecked true.
- Result: pass
- Spec source: R-032 acceptance
- Test: `.sdlc/slices/S-014/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs:203`

Evidence (log): run log
```
see .sdlc/slices/S-014/verification/r0/logs/contract-0-run.txt
```

## TC-contract-11 (VS-2): Property: result equals a reference model written from the spec

- Given: A scratch repo with forge set as the case says and a glab shim that logs cwd and argv
- When: read_rules(repo, samples) runs through python3 -I, with the shim first on PATH
- Then: 1500 runs over bodies (null, {}, arrays, scalars, regex strings, non-string regexes, JSON error bodies, invalid JSON), exits 0 to 255, stderr variants: result equals the model, one call, rules have exactly the five keys and a string pattern.
- Result: pass
- Spec source: R-030, R-031, R-026, ADR f2c2
- Test: `.sdlc/slices/S-014/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs:208`

Evidence (property-run): property VS-2..5
```
seed=20261010 runs=1500 failures=0
```

## Attacks

None.

## Seeds

- read_rules raises Fail on a config that is not valid JSON: With forge unreadable because config.json is invalid JSON, read_rules raises Fail instead of returning unchecked true. The spec does not define this case. No call is made. The caller must catch Fail.
- A failure note is not one line and not bounded: A multi-line stderr keeps its newlines in the note, and a 100000 character stderr gives a 100025 character note. The spec does not state a limit.
- A whitespace-only branch_name_regex gives a rule: The spec treats only an empty regex as no rule. A regex of spaces becomes a rule that matches names with three spaces.
- Public surface adds FORGE_TIMEOUT and gitlab_rule: Both names are new public names. The plan lists them. No consumer imports them yet. Spec section 3 does not define either.
