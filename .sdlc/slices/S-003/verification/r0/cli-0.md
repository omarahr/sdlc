# S-003 verification: cli profile, part 0, round 0

- Slice: S-003
- Profile: cli
- Round: 0
- Commit: 13b17f1
- Verdict: pass (21 of 21 cases pass)

## Environment

macOS (Darwin 25.6), Python 3.14.7, Node v24.19.0, git 2.50.1; branches.py run as a subprocess by the testkit cli-runner in scratch git repos with a controlled env.

Test file: `.sdlc/slices/S-003/verification/r0/tests/cli-0/branch-name.verify-cli.test.mjs`. Full transcripts: `.sdlc/slices/S-003/verification/r0/logs/cli-0-transcripts.txt`.

## TC-cli-1 (VS-2): name --kind state takes the current UTC time under extreme TZ

- Requirements: R-018
- Spec source: R-018 acceptance (tail("state") is 14 digits); R-018 quote (state without ts generates the timestamp)
- Given: A scratch git repo with no config
- When: Run name --kind state under TZ=Pacific/Kiritimati, TZ=Etc/GMT+12 and TZ=UTC
- Then: The branch is sdlc/state-<14 digits>, and the stamp is a valid UTC date between the times before and after the call
- Expected: Exit 0, one JSON line, branch ^sdlc/state-\d{14}$, stamp inside the UTC bracket
- Actual: As expected in all three zones: for example sdlc/state-20261009042759 under UTC+14
- Result: pass
- Test: `.sdlc/slices/S-003/verification/r0/tests/cli-0/branch-name.verify-cli.test.mjs:94`
- Command: `cd <repo> && node --test --test-name-pattern='TC-cli-1 ' .sdlc/slices/S-003/verification/r0/tests/cli-0/branch-name.verify-cli.test.mjs`

```
=== TC-cli-1
$ cd $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/cwd-2
$ TZ=Pacific/Kiritimati python3 $TMPDIR/sdlc-S-003-v0-cli-0/skills/sdlc/branches.py name --repo $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/repo-1 --kind state
exit: 0 (68 ms)
--- stdout
{"ok": true, "command": "name", "format": "sdlc/{name}", "kind": "state", "branch": "sdlc/state-20261009042759"}
--- stderr

--- tree $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/cwd-2 (unchanged)
--- tree $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/repo-1 (unchanged)
```

## TC-cli-2 (VS-2): name refuses --ts with one JSON error

- Requirements: R-018
- Spec source: Plan VS-2 notes; R-099 one JSON error rule
- Given: A scratch git repo
- When: Run name --kind state --ts 20261008101500
- Then: Exit 2, one JSON error, no traceback, no tree change
- Expected: Exit 2 and {ok:false, error naming ts}
- Actual: Exit 2, error "unrecognized arguments: --ts 20261008101500", stderr empty
- Result: pass
- Test: `.sdlc/slices/S-003/verification/r0/tests/cli-0/branch-name.verify-cli.test.mjs:106`
- Command: `cd <repo> && node --test --test-name-pattern='TC-cli-2 ' .sdlc/slices/S-003/verification/r0/tests/cli-0/branch-name.verify-cli.test.mjs`

```
=== TC-cli-2
$ cd $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/cwd-6
$ python3 $TMPDIR/sdlc-S-003-v0-cli-0/skills/sdlc/branches.py name --repo $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/repo-5 --kind state --ts 20261008101500
exit: 2 (47 ms)
--- stdout
{"ok": false, "error": "unrecognized arguments: --ts 20261008101500"}
--- stderr

--- tree $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/cwd-6 (unchanged)
--- tree $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/repo-5 (unchanged)
```

## TC-cli-3 (VS-4): name --kind e2e-area without --area exits 2 with one JSON error

- Requirements: R-099
- Spec source: R-099 acceptance
- Given: A scratch git repo and a separate scratch cwd
- When: Run name --kind e2e-area --id M-1
- Then: Exit 2, one JSON object {ok:false, error} naming area, empty stderr, no change to the repo, the cwd or git refs
- Expected: Exit 2, error names area, no traceback, tree diff empty
- Actual: Exit 2, error "a e2e-area branch name needs a non-empty area", stderr empty, both trees unchanged
- Result: pass
- Test: `.sdlc/slices/S-003/verification/r0/tests/cli-0/branch-name.verify-cli.test.mjs:111`
- Command: `cd <repo> && node --test --test-name-pattern='TC-cli-3 ' .sdlc/slices/S-003/verification/r0/tests/cli-0/branch-name.verify-cli.test.mjs`

```
=== TC-cli-3
$ cd $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/cwd-8
$ python3 $TMPDIR/sdlc-S-003-v0-cli-0/skills/sdlc/branches.py name --repo $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/repo-7 --kind e2e-area --id M-1
exit: 2 (68 ms)
--- stdout
{"ok": false, "error": "a e2e-area branch name needs a non-empty area"}
--- stderr

--- tree $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/cwd-8 (unchanged)
--- tree $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/repo-7 (unchanged)
```

## TC-cli-4 (VS-4): An empty or absent required part exits 2 with one JSON error naming it

- Requirements: R-099, R-018
- Spec source: R-018 quote (a missing part is a Fail); R-099 acceptance
- Given: A scratch git repo
- When: Run name for e2e-area with --area "", without --id, with --id "", with no parts; and slice without --id, with --id "", and with --format but no --id
- Then: Each call gives exit 2 and one JSON error that names the missing part
- Expected: Exit 2, one JSON error naming area or id, no traceback, tree unchanged
- Actual: As expected for all seven calls
- Result: pass
- Test: `.sdlc/slices/S-003/verification/r0/tests/cli-0/branch-name.verify-cli.test.mjs:119`
- Command: `cd <repo> && node --test --test-name-pattern='TC-cli-4 ' .sdlc/slices/S-003/verification/r0/tests/cli-0/branch-name.verify-cli.test.mjs`

```
=== TC-cli-4
$ cd $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/cwd-10
$ python3 $TMPDIR/sdlc-S-003-v0-cli-0/skills/sdlc/branches.py name --repo $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/repo-9 --kind e2e-area --id M-1 --area ''
exit: 2 (74 ms)
--- stdout
{"ok": false, "error": "a e2e-area branch name needs a non-empty area"}
--- stderr

--- tree $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/cwd-10 (unchanged)
--- tree $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/repo-9 (unchanged)
```

## TC-cli-5 (VS-4): Kinds without a TAILS row and an unknown kind exit 2 with one JSON error

- Requirements: R-099
- Spec source: ADR-20261009-041711-decision-judge-S-003-4882
- Given: A scratch git repo
- When: Run name for kinds run, milestone, e2e, verify, attempt with every part flag, and for kind bogus
- Then: Each call gives exit 2 and one JSON error, with no traceback
- Expected: Exit 2 and one JSON error each
- Actual: Exit 2, error "no branch name is defined for kind '<kind>'" for each; bogus names the kind. Interim behavior per ADR, recorded only
- Result: pass
- Test: `.sdlc/slices/S-003/verification/r0/tests/cli-0/branch-name.verify-cli.test.mjs:130`
- Command: `cd <repo> && node --test --test-name-pattern='TC-cli-5 ' .sdlc/slices/S-003/verification/r0/tests/cli-0/branch-name.verify-cli.test.mjs`

```
=== TC-cli-5
$ cd $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/cwd-18
$ python3 $TMPDIR/sdlc-S-003-v0-cli-0/skills/sdlc/branches.py name --repo $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/repo-17 --kind run --id S-001 --n 1 --round 0 --profile cli --part 0 --area api
exit: 2 (73 ms)
--- stdout
{"ok": false, "error": "no branch name is defined for kind 'run'"}
--- stderr

--- tree $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/cwd-18 (unchanged)
--- tree $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/repo-17 (unchanged)
```

## TC-cli-6 (VS-5): The flag wins over the config, and the config wins over the default

- Requirements: R-015, R-002
- Spec source: R-015 acceptance; R-002 acceptance clause 1
- Given: A repo with branchFormat feature/PROJ-1-{name}, a repo with no config, and a plain directory
- When: Run name --kind slice --id S-001 with and without --format sdlc/{name}
- Then: The branch is sdlc/S-001 with the flag, feature/PROJ-1-S-001 without it, and sdlc/S-001 with no config
- Expected: The three R-015 names
- Actual: As expected
- Result: pass
- Test: `.sdlc/slices/S-003/verification/r0/tests/cli-0/branch-name.verify-cli.test.mjs:138`
- Command: `cd <repo> && node --test --test-name-pattern='TC-cli-6 ' .sdlc/slices/S-003/verification/r0/tests/cli-0/branch-name.verify-cli.test.mjs`

```
=== TC-cli-6
$ cd $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/cwd-25
$ python3 $TMPDIR/sdlc-S-003-v0-cli-0/skills/sdlc/branches.py name --repo $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/repo-24 --kind slice --id S-001 --format 'sdlc/{name}'
exit: 0 (64 ms)
--- stdout
{"ok": true, "command": "name", "format": "sdlc/{name}", "kind": "slice", "branch": "sdlc/S-001"}
--- stderr

--- tree $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/cwd-25 (unchanged)
--- tree $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/repo-24 (unchanged)
```

## TC-cli-7 (VS-5): A config without a usable branchFormat falls back to sdlc/{name}

- Requirements: R-015, R-002
- Spec source: R-015 quote (without either, the default applies); R-002 acceptance clause 1
- Given: Twelve config shapes: branchFormat "", null, 5, a list, an object, true, no key, {}, and a JSON array, string, number or null as the whole file
- When: Run name --kind slice --id S-001 with no flag, and call load_format(repo) through python3 -I
- Then: Each gives format sdlc/{name}, branch sdlc/S-001, and load_format agrees
- Expected: format sdlc/{name} and load_format equal to it
- Actual: As expected for all twelve shapes
- Result: pass
- Test: `.sdlc/slices/S-003/verification/r0/tests/cli-0/branch-name.verify-cli.test.mjs:163`
- Command: `cd <repo> && node --test --test-name-pattern='TC-cli-7 ' .sdlc/slices/S-003/verification/r0/tests/cli-0/branch-name.verify-cli.test.mjs`

```
=== TC-cli-7 empty string
$ cd $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/cwd-32
$ python3 $TMPDIR/sdlc-S-003-v0-cli-0/skills/sdlc/branches.py name --repo $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/repo-31 --kind slice --id S-001
exit: 0 (63 ms)
--- stdout
{"ok": true, "command": "name", "format": "sdlc/{name}", "kind": "slice", "branch": "sdlc/S-001"}
--- stderr

--- tree $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/cwd-32 (unchanged)
--- tree $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/repo-31 (unchanged)
```

## TC-cli-8 (VS-5): A broken config gives exit 2 and one JSON error, no traceback

- Requirements: R-015, R-099
- Spec source: R-099 one JSON error rule; plan VS-5 notes
- Given: Config files that are invalid JSON, 200000-deep nesting, unreadable (mode 000), a directory, and invalid UTF-8
- When: Run name --kind slice --id S-001 with no flag
- Then: Exit 2 and one JSON error each; load_format raises Fail
- Expected: Exit 2, one JSON error, empty stderr
- Actual: As expected; deep nesting gives a RecursionError message inside the JSON error
- Result: pass
- Test: `.sdlc/slices/S-003/verification/r0/tests/cli-0/branch-name.verify-cli.test.mjs:185`
- Command: `cd <repo> && node --test --test-name-pattern='TC-cli-8 ' .sdlc/slices/S-003/verification/r0/tests/cli-0/branch-name.verify-cli.test.mjs`

```
=== TC-cli-8 deep nesting
$ cd $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/cwd-74
$ python3 $TMPDIR/sdlc-S-003-v0-cli-0/skills/sdlc/branches.py name --repo $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/repo-68 --kind slice --id S-001
exit: 2 (48 ms)
--- stdout
{"ok": false, "error": "$TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/repo-68/.sdlc/config.json is not valid JSON: RecursionError: Stack overflow (used 16352 kB) while decoding a JSON array from a unicode string"}
--- stderr

--- tree $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/cwd-74 (unchanged)
--- tree $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/repo-68 (unchanged)
```

## TC-cli-9 (VS-5): An explicit empty --format fails validation and does not fall back

- Requirements: R-015
- Spec source: R-015 quote (--format overrides config.branchFormat)
- Given: A repo with branchFormat feature/{name} and a repo with no config
- When: Run name --kind slice --id S-001 --format ""
- Then: Exit 2 and one JSON error; the config is not used
- Expected: Exit 2
- Actual: Exit 2, error "the branch format '' must hold exactly one {name} or {name:lower}, found 0"
- Result: pass
- Test: `.sdlc/slices/S-003/verification/r0/tests/cli-0/branch-name.verify-cli.test.mjs:193`
- Command: `cd <repo> && node --test --test-name-pattern='TC-cli-9 ' .sdlc/slices/S-003/verification/r0/tests/cli-0/branch-name.verify-cli.test.mjs`

```
=== TC-cli-9
$ cd $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/cwd-83
$ python3 $TMPDIR/sdlc-S-003-v0-cli-0/skills/sdlc/branches.py name --repo $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/repo-82 --kind slice --id S-001 --format ''
exit: 2 (46 ms)
--- stdout
{"ok": false, "error": "the branch format '' must hold exactly one {name} or {name:lower}, found 0"}
--- stderr

--- tree $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/cwd-83 (unchanged)
--- tree $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/repo-82 (unchanged)
```

## TC-cli-10 (VS-5): --format wins even when the config is broken

- Requirements: R-015
- Spec source: R-015 quote (--format overrides config.branchFormat)
- Given: The five broken config repos of TC-cli-8
- When: Run name --kind slice --id S-001 --format team/{name}
- Then: Exit 0 and branch team/S-001; the config is not read
- Expected: Exit 0, team/S-001
- Actual: As expected for all five
- Result: pass
- Test: `.sdlc/slices/S-003/verification/r0/tests/cli-0/branch-name.verify-cli.test.mjs:200`
- Command: `cd <repo> && node --test --test-name-pattern='TC-cli-10 ' .sdlc/slices/S-003/verification/r0/tests/cli-0/branch-name.verify-cli.test.mjs`

```
=== TC-cli-10 invalid JSON
$ cd $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/cwd-91
$ python3 $TMPDIR/sdlc-S-003-v0-cli-0/skills/sdlc/branches.py name --repo $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/repo-86 --kind slice --id S-001 --format 'team/{name}'
exit: 0 (62 ms)
--- stdout
{"ok": true, "command": "name", "format": "team/{name}", "kind": "slice", "branch": "team/S-001"}
--- stderr

--- tree $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/cwd-91 (unchanged)
--- tree $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/repo-86 (unchanged)
```

## TC-cli-11 (VS-5): {name:lower} in the config lowercases the tail

- Requirements: R-015
- Spec source: R-015 acceptance (the config format applies); plan VS-5 notes
- Given: A repo with branchFormat feature/{name:lower}
- When: Run name for slice S-001, e2e-area M-1/API and state
- Then: feature/s-001, feature/m-1-e2e-api, feature/state-<14 digits>; load_format returns the raw format
- Expected: Lowercased tails
- Actual: As expected
- Result: pass
- Test: `.sdlc/slices/S-003/verification/r0/tests/cli-0/branch-name.verify-cli.test.mjs:206`
- Command: `cd <repo> && node --test --test-name-pattern='TC-cli-11 ' .sdlc/slices/S-003/verification/r0/tests/cli-0/branch-name.verify-cli.test.mjs`

```
=== TC-cli-11
$ cd $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/cwd-97
$ python3 $TMPDIR/sdlc-S-003-v0-cli-0/skills/sdlc/branches.py name --repo $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/repo-96 --kind slice --id S-001
exit: 0 (58 ms)
--- stdout
{"ok": true, "command": "name", "format": "feature/{name:lower}", "kind": "slice", "branch": "feature/s-001"}
--- stderr

--- tree $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/cwd-97 (unchanged)
--- tree $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/repo-96 (unchanged)
```

## TC-cli-12 (VS-6): The name output holds exactly ok, command, format, kind and branch

- Requirements: R-015, R-018
- Spec source: ADR-20261009-041713-decision-judge-S-003-c3ba
- Given: A repo with branchFormat feature/PROJ-1-{name}
- When: Run name for slice, e2e-area and state, each with and without --format
- Then: Each call prints one JSON line with exactly the five keys, empty stderr, exit 0
- Expected: Key set {ok, command, format, kind, branch}
- Actual: As expected for all six calls
- Result: pass
- Test: `.sdlc/slices/S-003/verification/r0/tests/cli-0/branch-name.verify-cli.test.mjs:214`
- Command: `cd <repo> && node --test --test-name-pattern='TC-cli-12 ' .sdlc/slices/S-003/verification/r0/tests/cli-0/branch-name.verify-cli.test.mjs`

```
=== TC-cli-12
$ cd $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/cwd-102
$ python3 $TMPDIR/sdlc-S-003-v0-cli-0/skills/sdlc/branches.py name --repo $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/repo-101 --kind slice --id S-001
exit: 0 (64 ms)
--- stdout
{"ok": true, "command": "name", "format": "feature/PROJ-1-{name}", "kind": "slice", "branch": "feature/PROJ-1-S-001"}
--- stderr

--- tree $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/cwd-102 (unchanged)
--- tree $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/repo-101 (unchanged)
```

## TC-cli-13 (VS-6): Unused part flags do not change the branch or crash

- Requirements: R-018
- Spec source: R-018 quote (the tail from the table in section 1); ADR-20261009-041713-decision-judge-S-003-c3ba
- Given: A repo with no config
- When: Run name for slice and e2e-area with --n 0 --part 0 --round 0 --profile x, and with non-zero values
- Then: The branch stays sdlc/S-001 or sdlc/M-1-e2e-api
- Expected: Branch unchanged, exit 0
- Actual: As expected
- Result: pass
- Test: `.sdlc/slices/S-003/verification/r0/tests/cli-0/branch-name.verify-cli.test.mjs:230`
- Command: `cd <repo> && node --test --test-name-pattern='TC-cli-13 ' .sdlc/slices/S-003/verification/r0/tests/cli-0/branch-name.verify-cli.test.mjs`

```
=== TC-cli-13
$ cd $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/cwd-109
$ python3 $TMPDIR/sdlc-S-003-v0-cli-0/skills/sdlc/branches.py name --repo $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/repo-108 --kind slice --id S-001 --n 0 --part 0 --round 0 --profile x
exit: 0 (63 ms)
--- stdout
{"ok": true, "command": "name", "format": "sdlc/{name}", "kind": "slice", "branch": "sdlc/S-001"}
--- stderr

--- tree $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/cwd-109 (unchanged)
--- tree $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/repo-108 (unchanged)
```

## TC-cli-14 (VS-6): name is idempotent and does not read the cwd, with spaces and unicode in the repo path

- Requirements: R-015
- Spec source: R-015 quote (--repo is the target repo)
- Given: A non-git repo path with a space, ü and CJK characters and config feature/{name}; a second cwd that is a repo with config other/{name}
- When: Run the same name call twice, the second from the other cwd
- Then: Both calls print the same stdout, feature/S-001
- Expected: Identical outputs
- Actual: As expected
- Result: pass
- Test: `.sdlc/slices/S-003/verification/r0/tests/cli-0/branch-name.verify-cli.test.mjs:238`
- Command: `cd <repo> && node --test --test-name-pattern='TC-cli-14 ' .sdlc/slices/S-003/verification/r0/tests/cli-0/branch-name.verify-cli.test.mjs`

```
=== TC-cli-14
$ cd $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/cwd-113
$ python3 $TMPDIR/sdlc-S-003-v0-cli-0/skills/sdlc/branches.py name --repo $'$TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/repo with space ü 名前-112' --kind slice --id S-001
exit: 0 (60 ms)
--- stdout
{"ok": true, "command": "name", "format": "feature/{name}", "kind": "slice", "branch": "feature/S-001"}
--- stderr

--- tree $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/cwd-113 (unchanged)
--- tree $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/repo with space ü 名前-112 (unchanged)
```

## TC-cli-15 (VS-6): A --repo that is not a directory exits 2 with one JSON error

- Requirements: R-099
- Spec source: R-099 one JSON error rule
- Given: A path that does not exist
- When: Run name --repo <missing> --kind slice --id S-001
- Then: Exit 2, one JSON error naming --repo
- Expected: Exit 2
- Actual: As expected
- Result: pass
- Test: `.sdlc/slices/S-003/verification/r0/tests/cli-0/branch-name.verify-cli.test.mjs:248`
- Command: `cd <repo> && node --test --test-name-pattern='TC-cli-15 ' .sdlc/slices/S-003/verification/r0/tests/cli-0/branch-name.verify-cli.test.mjs`

```
=== TC-cli-15
$ cd $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/cwd-116
$ python3 $TMPDIR/sdlc-S-003-v0-cli-0/skills/sdlc/branches.py name --repo $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/gone-115/nope --kind slice --id S-001
exit: 2 (43 ms)
--- stdout
{"ok": false, "error": "--repo '$TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/gone-115/nope' is not a directory"}
--- stderr

--- tree $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/cwd-116 (unchanged)
```

## TC-cli-16 (VS-7): preflight --format reports that format with given true in every git mode

- Requirements: R-012
- Spec source: R-012 acceptance (preflight with --format reports that format with given true)
- Given: A repo with config feature/{name}, and a repo with no config
- When: Run preflight --mode <m> --format team/{name} and --format sdlc/{name} for pr, direct, mr and stack
- Then: format equals the flag and given is the JSON boolean true
- Expected: given true, format from the flag
- Actual: As expected for all twelve calls
- Result: pass
- Test: `.sdlc/slices/S-003/verification/r0/tests/cli-0/branch-name.verify-cli.test.mjs:267`
- Command: `cd <repo> && node --test --test-name-pattern='TC-cli-16 ' .sdlc/slices/S-003/verification/r0/tests/cli-0/branch-name.verify-cli.test.mjs`

```
=== TC-cli-16
$ cd $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/cwd-119
$ python3 $TMPDIR/sdlc-S-003-v0-cli-0/skills/sdlc/branches.py preflight --repo $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/repo-117 --mode pr --format 'team/{name}'
exit: 0 (61 ms)
--- stdout
{"ok": true, "command": "preflight", "format": "team/{name}", "args": {"repo": "$TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/repo-117", "mode": "pr", "branch": null}, "given": true}
--- stderr

--- tree $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/cwd-119 (unchanged)
--- tree $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/repo-117 (unchanged)
```

## TC-cli-17 (VS-7): preflight with no flag reads config.branchFormat with given true

- Requirements: R-012
- Spec source: R-012 acceptance (with no flag it reads config.branchFormat)
- Given: Repos with config feature/{name} and sdlc/{name}
- When: Run preflight --mode <m> for every git mode
- Then: format equals the config value and given is true, also when the value equals the default
- Expected: given true
- Actual: As expected for all eight calls
- Result: pass
- Test: `.sdlc/slices/S-003/verification/r0/tests/cli-0/branch-name.verify-cli.test.mjs:277`
- Command: `cd <repo> && node --test --test-name-pattern='TC-cli-17 ' .sdlc/slices/S-003/verification/r0/tests/cli-0/branch-name.verify-cli.test.mjs`

```
=== TC-cli-17
$ cd $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/cwd-133
$ python3 $TMPDIR/sdlc-S-003-v0-cli-0/skills/sdlc/branches.py preflight --repo $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/repo-131 --mode pr
exit: 0 (59 ms)
--- stdout
{"ok": true, "command": "preflight", "format": "feature/{name}", "args": {"repo": "$TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/repo-131", "mode": "pr", "branch": null}, "given": true}
--- stderr

--- tree $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/cwd-133 (unchanged)
--- tree $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/repo-131 (unchanged)
```

## TC-cli-18 (VS-7): preflight --format with a broken config still reports the flag

- Requirements: R-012
- Spec source: R-012 quote (the --branch-format flag comes first)
- Given: The five broken config repos of TC-cli-8
- When: Run preflight --mode pr --format team/{name}
- Then: Exit 0, format team/{name}, given true; the config is not read
- Expected: given true
- Actual: As expected for all five; this matches name, which also skips the config when the flag is given
- Result: pass
- Test: `.sdlc/slices/S-003/verification/r0/tests/cli-0/branch-name.verify-cli.test.mjs:286`
- Command: `cd <repo> && node --test --test-name-pattern='TC-cli-18 ' .sdlc/slices/S-003/verification/r0/tests/cli-0/branch-name.verify-cli.test.mjs`

```
=== TC-cli-18 invalid JSON
$ cd $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/cwd-146
$ python3 $TMPDIR/sdlc-S-003-v0-cli-0/skills/sdlc/branches.py preflight --repo $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/repo-141 --mode pr --format 'team/{name}'
exit: 0 (57 ms)
--- stdout
{"ok": true, "command": "preflight", "format": "team/{name}", "args": {"repo": "$TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/repo-141", "mode": "pr", "branch": null}, "given": true}
--- stderr

--- tree $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/cwd-146 (unchanged)
--- tree $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/repo-141 (unchanged)
```

## TC-cli-19 (VS-8): preflight with no format given falls back to sdlc/{name} with given false

- Requirements: R-012, R-002
- Spec source: R-012 acceptance (with neither it falls back to sdlc/{name}); R-002 acceptance clause 1
- Given: A repo with no config, a plain directory, and the twelve fallback shapes of TC-cli-7
- When: Run preflight --mode <m> for every git mode, and call load_format(repo)
- Then: format sdlc/{name}, given false, exit 0, one JSON object; load_format returns sdlc/{name}
- Expected: given false only with the default format
- Actual: As expected for all 56 calls
- Result: pass
- Test: `.sdlc/slices/S-003/verification/r0/tests/cli-0/branch-name.verify-cli.test.mjs:292`
- Command: `cd <repo> && node --test --test-name-pattern='TC-cli-19 ' .sdlc/slices/S-003/verification/r0/tests/cli-0/branch-name.verify-cli.test.mjs`

```
=== TC-cli-19 number
$ cd $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/cwd-185
$ python3 $TMPDIR/sdlc-S-003-v0-cli-0/skills/sdlc/branches.py preflight --repo $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/repo-155 --mode pr
exit: 0 (67 ms)
--- stdout
{"ok": true, "command": "preflight", "format": "sdlc/{name}", "args": {"repo": "$TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/repo-155", "mode": "pr", "branch": null}, "given": false}
--- stderr

--- tree $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/cwd-185 (unchanged)
--- tree $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/repo-155 (unchanged)
```

## TC-cli-20 (VS-8): preflight with no flag and a broken config exits 2 with one JSON error

- Requirements: R-012, R-099
- Spec source: R-099 one JSON error rule; plan VS-8 notes
- Given: The five broken config repos of TC-cli-8
- When: Run preflight --mode pr
- Then: Exit 2 and one JSON error, not given false
- Expected: Exit 2
- Actual: As expected for all five
- Result: pass
- Test: `.sdlc/slices/S-003/verification/r0/tests/cli-0/branch-name.verify-cli.test.mjs:303`
- Command: `cd <repo> && node --test --test-name-pattern='TC-cli-20 ' .sdlc/slices/S-003/verification/r0/tests/cli-0/branch-name.verify-cli.test.mjs`

```
=== TC-cli-20 invalid JSON
$ cd $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/cwd-240
$ python3 $TMPDIR/sdlc-S-003-v0-cli-0/skills/sdlc/branches.py preflight --repo $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/repo-235 --mode pr
exit: 2 (41 ms)
--- stdout
{"ok": false, "error": "$TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/repo-235/.sdlc/config.json is not valid JSON: JSONDecodeError: Expecting ',' delimiter: line 1 column 34 (char 33)"}
--- stderr

--- tree $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/cwd-240 (unchanged)
--- tree $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/repo-235 (unchanged)
```

## TC-cli-21 (VS-8): preflight with an unknown mode or an invalid --format exits 2

- Requirements: R-012, R-099
- Spec source: R-099 one JSON error rule
- Given: A repo with no config
- When: Run preflight --mode bogus, --format "" and --format no-placeholder
- Then: Exit 2 and one JSON error each
- Expected: Exit 2
- Actual: As expected
- Result: pass
- Test: `.sdlc/slices/S-003/verification/r0/tests/cli-0/branch-name.verify-cli.test.mjs:309`
- Command: `cd <repo> && node --test --test-name-pattern='TC-cli-21 ' .sdlc/slices/S-003/verification/r0/tests/cli-0/branch-name.verify-cli.test.mjs`

```
=== TC-cli-21
$ cd $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/cwd-246
$ python3 $TMPDIR/sdlc-S-003-v0-cli-0/skills/sdlc/branches.py preflight --repo $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/repo-245 --mode bogus
exit: 2 (41 ms)
--- stdout
{"ok": false, "error": "--mode 'bogus' is not one of pr, direct, mr, stack"}
--- stderr

--- tree $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/cwd-246 (unchanged)
--- tree $TMPDIR/sdlc-test-BIGUwW/testkit-cli-c0QDo3/repo-245 (unchanged)
```

## Attacks

None. The security profile covers hostile values.

## Seeds

- branches.py --help prints argparse text, not JSON (`skills/sdlc/branches.py`): `branches.py name --help` prints the argparse usage text and exits 0. The spec does not define --help, so this is not a defect. Callers that parse stdout as JSON get text here.
- preflight output still echoes an interim args object (`skills/sdlc/branches.py`): preflight prints {ok, command, format, args, given}. The args echo holds the absolute repo path. A later slice that defines the preflight output should decide whether args stays.
- The missing-part error says 'a e2e-area branch name' (`skills/sdlc/branches.py`): The message uses the article 'a' before every kind. The text is correct in meaning but reads badly for e2e-area.
