# S-010 verify-contract, part 0, round 0

Slice: S-010. Profile: contract. Round: 0. Commit: 79efa1c. Verdict: pass (15 cases, 15 passed).

Environment: Python 3.14.7, Node 24.19.0, git (Xcode) on macOS APFS (case-insensitive: the test avoids names that differ only in case); fixture repos in scratch directories; cli-runner, property and attack-corpus from the testkit; module under test imported by absolute path, never from internal source paths of the repo under test.

Test file: `.sdlc/slices/S-010/verification/r0/tests/contract-0/branches.verify-contract.test.mjs`. Full run log: `.sdlc/slices/S-010/verification/r0/logs/contract-0-run.log`. The hostile-names case was re-run after a test fix: `.sdlc/slices/S-010/verification/r0/logs/contract-0-hostile-rerun.log`.

## TC-contract-1 (VS-1): Public surface lists list_kind(repo, fmt, kind) and the stdlib-only import set

- Given: branches.py imported as a consumer imports it
- When: Inspect signatures and imports
- Then: list_kind(repo, fmt, kind), parse(fmt, branch, ids=None), name(fmt, kind, **parts); only stdlib imports
- Spec source: R-025 quote
- Result: pass
- Test: `.sdlc/slices/S-010/verification/r0/tests/contract-0/branches.verify-contract.test.mjs:25`

surface listing (type-check):

```
build_parser ()
cmd_list (ns)
cmd_name (ns)
cmd_parse (ns)
cmd_preflight (ns)
list_kind (repo, fmt, kind)
load_format (repo)
load_git_modes (path=...)
main (argv=None)
name (fmt, kind, **parts)
parse (fmt, branch, ids=None)
split (fmt)
tail (kind, **parts)
validate_format (fmt)
imports: argparse, datetime, json, os, re, subprocess, sys
```

## TC-contract-2 (VS-1): list --kind slice returns only slices, sorted by name, with parts

- Given: Repo with 12 branches of every kind plus zeta
- When: list --kind slice
- Then: sdlc/S-001, S-002, S-010, S-fix-M-1-2 in that order; kind slice, id equals tail; tree unchanged
- Spec source: R-025 acceptance
- Result: pass
- Test: `.sdlc/slices/S-010/verification/r0/tests/contract-0/branches.verify-contract.test.mjs:64`

list --kind slice (transcript):

```
branches: sdlc/S-001, sdlc/S-002, sdlc/S-010, sdlc/S-fix-M-1-2 (each {branch,kind:slice,tail,id,known:null})
```

## TC-contract-3 (VS-1): Sort is by name, not by creation order

- Given: Slice branches created in reverse and mixed order
- When: list --kind slice
- Then: Result equals the code-point sorted names
- Spec source: R-025 quote
- Result: pass
- Test: `.sdlc/slices/S-010/verification/r0/tests/contract-0/branches.verify-contract.test.mjs:78`

order (log):

```
created S-9, S-100, S-10, S-1, S-a, S-B, S-fix-M-2-1, S-fix-M-1-1; listed in sorted order
```

## TC-contract-4 (VS-2): run and attempt sort by n as JSON integers; ties by full branch name

- Given: run-10,2,100,1,007,0 and attempts of S-001 and S-002 with n 1,2,10,100
- When: list --kind run, list --kind attempt
- Then: run n: 0,1,2,7,10,100; attempt order S-001-1, S-001-2, S-002-2, S-001-10, S-002-10, S-001-100; n is a number
- Spec source: R-094 acceptance; ADR 7c1e
- Result: pass
- Test: `.sdlc/slices/S-010/verification/r0/tests/contract-0/branches.verify-contract.test.mjs:85`

run (transcript):

```
[["sdlc/run-0",0],["sdlc/run-1",1],["sdlc/run-2",2],["sdlc/run-007",7],["sdlc/run-10",10],["sdlc/run-100",100]]
```

attempt (transcript):

```
[["sdlc/S-001-attempt-1",1],["sdlc/S-001-attempt-2",2],["sdlc/S-002-attempt-2",2],["sdlc/S-001-attempt-10",10],["sdlc/S-002-attempt-10",10],["sdlc/S-001-attempt-100",100]]
```

## TC-contract-5 (VS-2): Huge n (41 digits, 200 digits) sorts as an integer and prints exactly

- Given: run branches with 40-digit, 41-digit and zero-padded n
- When: list --kind run
- Then: Integer order; stdout holds the exact digits; 200-digit n gives exit 0
- Spec source: R-025 quote
- Result: pass
- Test: `.sdlc/slices/S-010/verification/r0/tests/contract-0/branches.verify-contract.test.mjs:104`

200-digit n (log):

```
status=0 stdoutBytes=845 stderr=""
```

## TC-contract-6 (VS-4): Format changes what list returns; --format overrides config; default applies without either

- Given: Repo with config branchFormat team/{name} and branches of four formats
- When: list with config, with --format feature/PROJ-1-{name}, {name:lower}, zzz/{name}, sdlc/{name}-x
- Then: Each call returns only the branches of its format; format echoed
- Spec source: R-025 acceptance; spec section 2 (--format overrides config)
- Result: pass
- Test: `.sdlc/slices/S-010/verification/r0/tests/contract-0/branches.verify-contract.test.mjs:120`

lower (transcript):

```
[["feature/PROJ-1-S-001","S-001"],["feature/PROJ-1-S-004","S-004"],["feature/proj-1-s-003","s-003"]]
```

## TC-contract-7 (VS-4): Invalid format fails with the same error and exit 2 as parse

- Given: Seven invalid formats and an invalid config format
- When: list --format <bad> vs parse --format <bad>
- Then: Exit 2, ok false, same error text, empty stderr
- Spec source: spec section 2 (exit 2 with ok false)
- Result: pass
- Test: `.sdlc/slices/S-010/verification/r0/tests/contract-0/branches.verify-contract.test.mjs:143`

example (transcript):

```
list --format 'a b/{name}' -> 2 {"ok": false, "error": "the branch format 'a b/{name}' holds whitespace"}; parse -> 2 same error
```

## TC-contract-8 (VS-7): Each kind returns its parts; output keys are ok, command, format, kind, branches; parse agrees

- Given: Fixture with every kind
- When: list --kind <each kind>
- Then: Parts match parse; known null; key order ok,command,format,kind,branches
- Spec source: ADR bd10
- Result: pass
- Test: `.sdlc/slices/S-010/verification/r0/tests/contract-0/branches.verify-contract.test.mjs:172`

verify and e2e-area entries (transcript):

```
{"branch":"sdlc/S-001-v0-http-api-0","kind":"verify","tail":"S-001-v0-http-api-0","id":"S-001","round":0,"profile":"http-api","part":0,"known":null}
{"branch":"sdlc/M-1-e2e-api","kind":"e2e-area","tail":"M-1-e2e-api","id":"M-1","area":"api","known":null}
```

## TC-contract-9 (VS-7): id key holds for every kind that has an id

- Given: Fixture with every kind
- When: list per kind
- Then: slice, milestone, e2e, e2e-area, verify and attempt entries carry a string id
- Spec source: ADR bd10 (branch and id for S-005 and S-027)
- Result: pass
- Test: `.sdlc/slices/S-010/verification/r0/tests/contract-0/branches.verify-contract.test.mjs:197`

kinds without id (log):

```
run and state entries have no id key (parse gives none); see seeds
```

## TC-contract-10 (VS-6): Hostile branch names classify by the spec table or drop out; list never crashes

- Given: 84 refs: attempt-0/007, unicode digits, confusables, ZWSP, leading dash, shell metacharacters, 40 non-ASCII digit run names
- When: list for all eight kinds
- Then: Exit 0, one JSON object, empty stderr, tree unchanged; bad names absent; attempt-007 and attempt-0 present
- Spec source: R-025 acceptance (foreign branches absent)
- Result: pass
- Test: `.sdlc/slices/S-010/verification/r0/tests/contract-0/branches.verify-contract.test.mjs:210`

rerun (log):

```
.sdlc/slices/S-010/verification/r0/logs/contract-0-hostile-rerun.log: pass; 46 non-ASCII digit names classified (seed)
```

## TC-contract-11 (VS-6): Attack corpus for --repo, --kind and --format (650 invocations) gives one JSON object, exit 0 or 2, tree unchanged

- Given: 11 corpus families, five argv forms each
- When: branches.py list <value>
- Then: Never a traceback; ok equals (exit 0); no mutation
- Spec source: spec section 2 (one JSON object, exit 2 on bad input)
- Result: pass
- Test: `.sdlc/slices/S-010/verification/r0/tests/contract-0/branches.verify-contract.test.mjs:262`

corpus (log):

```
EX VS-6 corpus invocations=650; the only successes are valid formats such as %s/{name} and {name}
```

## TC-contract-12 (VS-6): Flag-like and abbreviated arguments give a JSON error or a defined result

- Given: Eleven argv shapes
- When: list with --repo --kind, --kind --help, --, duplicate --kind, --rep, --kin, unknown flag, missing flags
- Then: Exit 0 or 2, JSON, no traceback
- Spec source: spec section 2
- Result: pass
- Test: `.sdlc/slices/S-010/verification/r0/tests/contract-0/branches.verify-contract.test.mjs:295`

samples (transcript):

```
list --repo <repo> --kind --help -> 2 argument --kind: expected one argument
list --repo <repo> --kind slice --kind run -> 0 (last wins)
list --repo <repo> --kin slice -> 0 (abbreviation)
```

## TC-contract-13 (VS-1): Determinism, purity and cwd independence via the public entry point

- Given: Fixture repo
- When: list_kind five times; CLI from another cwd and with --repo .
- Then: Equal results; snapshot including refs unchanged; CLI equals API
- Spec source: R-025 quote
- Result: pass
- Test: `.sdlc/slices/S-010/verification/r0/tests/contract-0/branches.verify-contract.test.mjs:319`

result (log):

```
5 equal results; repo snapshot diff empty; CLI branches equal API value
```

## TC-contract-14 (VS-1): A tag or remote-tracking ref with a branch name does not change the result

- Given: Tags sdlc/S-001 and sdlc/S-003, remote ref origin/sdlc/S-009
- When: list --kind slice
- Then: sdlc/S-001 and sdlc/S-002 only
- Spec source: R-025 acceptance
- Result: pass
- Test: `.sdlc/slices/S-010/verification/r0/tests/contract-0/branches.verify-contract.test.mjs:347`

result (log):

```
[sdlc/S-001, sdlc/S-002]
```

## TC-contract-15 (VS-1): PROPERTY list_kind equals a reference model for 1200 random repos

- Given: 1200 formats (prefix, suffix, name and name:lower), 0 to 14 branches of random kinds, foreign names
- When: list_kind(repo, fmt, kind) via python3 -I; 120 of them also through the CLI
- Then: Branch set, order and parts equal the model built from construction; foreign names absent; CLI equals API
- Spec source: R-025 quote; R-094 acceptance; ADR 7c1e
- Result: pass
- Test: `.sdlc/slices/S-010/verification/r0/tests/contract-0/branches.verify-contract.test.mjs:356`

list_kind vs model (property-run):

```
property-run list_kind-vs-model: seed=1288679427 runs=1200 violations=0 nonEmptyResults=640 maxEntries=6 lowerWorlds=443
property-run cli-agrees-with-api: seed=1288679427 runs=120 violations=0
Earlier run seed=253635815 runs=1200: 3 violations, all from a model error (foreign tail S-1-v1-x is a slice by the table); model fixed, then 0 violations
```

## Attacks

The eleven attack-corpus families ran against --repo, --kind and --format in five argv forms (650 invocations). Every call gave exit 0 or 2, one JSON object, no traceback and an unchanged tree.

## Seeds

- Non-ASCII Unicode digits count as digits in run, attempt, state, verify and milestone names: The regexes use \d without re.ASCII, so sdlc/run-١ (Arabic-Indic one) and sdlc/run-１０ (fullwidth) list as run with n 1 and 10. 46 such names were classified. Later numbering reads this list. The spec table does not say ASCII only. Use [0-9] or re.ASCII. (skills/sdlc/branches.py)
- run and state entries have no id key: The verify plan asked for branch and id on every kind. parse gives no id for run and state, and ADR bd10 keeps parse parts, so the output is consistent with the ADR. A caller that reads branches[].id must skip run and state. (skills/sdlc/branches.py)
- Malformed attempt names list as slice: sdlc/S-001-attempt-, sdlc/S-001-attempt-x and sdlc/S-001-attempt-1x match the slice row of the table, so list --kind slice returns them with id S-001-attempt-x. This follows the table. A caller that treats every slice entry as a ledger id sees extra ids; parse with ids marks known false. (skills/sdlc/branches.py)
- list_kind returns [] for an unknown kind through the API: The CLI rejects an unknown kind with exit 2. list_kind(repo, fmt, 'nonsense') returns [] without an error. A typo in a later caller looks like no branches. (skills/sdlc/branches.py)
- argparse accepts abbreviated flags and a repeated --kind: list --kin slice and list --rep <repo> succeed. A repeated --kind uses the last value. Set allow_abbrev=False on the parsers if exact flags are wanted. (skills/sdlc/branches.py)
- list reads refs/heads with %(refname), not the spec's %(refname:short): The code strips refs/heads/ from the full refname. The result is the same except where a tag shares a branch name, and it avoids the heads/ shortening. The spec text names refname:short. The behavior is correct and the plan allowed it. (skills/sdlc/branches.py)
- testkit: no helper to create many refs in one repo: The property test creates refs with git update-ref --stdin in its own file. A shared helper would speed other verifiers. (skills/sdlc/test/testkit/cli-runner.mjs)
