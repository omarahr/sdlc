# S-023 verify-cli, round 0

- Slice: S-023
- Profile: cli, part 0
- Commit: 1365f3a
- Verdict: verified (8 of 8 cases pass)

Environment: python3 with the built skill scripts run as a developer runs them, scratch git repos in a temp directory, node 24 test runner, cli-runner testkit; head build compared with its parent commit 4a15c07.

## TC-cli-1 (VS-1): patch-slice names the branch from a custom format

- Given: config branchFormat feature/PROJ-1-{name}
- When: state-write.py patch-slice --repo R --slice S-001 with {"phase":"tests"}
- Then: exit 0, branch feature/PROJ-1-S-001, and that branch is checked out
- Actual: exit 0, branch feature/PROJ-1-S-001, checked out
- Result: pass
- Source: R-059 acceptance
- Test: `.sdlc/slices/S-023/verification/r0/tests/cli-0/state-write.verify-cli.test.mjs:21`

```
head custom 0 {"ok": true, "branch": "feature/PROJ-1-S-001", "commit": "ed21a11"}
```

## TC-cli-2 (VS-1): patch-slice under a lowercase format

- Given: branchFormat feature/{name:lower}
- When: patch-slice S-001
- Then: branch feature/s-001
- Actual: branch feature/s-001
- Result: pass
- Source: R-059 acceptance
- Test: `.sdlc/slices/S-023/verification/r0/tests/cli-0/state-write.verify-cli.test.mjs:27`

```
head lower 0 {"ok": true, "branch": "feature/s-001", "commit": "0c5fd87"}
```

## TC-cli-3 (VS-1): patch-slice falls back to the default format

- Given: no branchFormat, or an empty, null, numeric or list value
- When: patch-slice S-001
- Then: branch sdlc/S-001 each time
- Actual: branch sdlc/S-001 each time
- Result: pass
- Source: R-059 acceptance
- Test: `.sdlc/slices/S-023/verification/r0/tests/cli-0/state-write.verify-cli.test.mjs:33`

```
head bf "" 0 {"ok": true, "branch": "sdlc/S-001"}
head bf 5 0 {"ok": true, "branch": "sdlc/S-001"}
head bf null 0 ...
head bf ["x"] 0 ...
```

## TC-cli-4 (VS-1): Invalid branchFormat gives a clean Fail from patch-slice

- Given: branchFormat bad{x}, x, has space/{name}, a//{name}, {name}.lock
- When: patch-slice S-001
- Then: exit non-zero, JSON ok:false, no traceback
- Actual: exit 2, JSON ok:false, no traceback; output equals the output before the change
- Result: pass
- Source: R-059 acceptance
- Test: `.sdlc/slices/S-023/verification/r0/tests/cli-0/state-write.verify-cli.test.mjs:46`

```
head badfmt "bad{x}" 2 {"ok": false, "error": "the branch format 'bad{x}' must hold exactly one {name} or {name:lower}, found 0"}
```

## TC-cli-5 (VS-1): Missing, invalid and no-.sdlc config give the same error as before the change

- Given: config.json absent, invalid JSON; repo without .sdlc
- When: patch-slice S-001 on the head build and on the parent commit
- Then: identical exit code and message in both builds
- Actual: identical: exit 2 with "missing <repo>/.sdlc/config.json", "... is not valid JSON ...", "no .sdlc/ in <repo>"
- Result: pass
- Source: R-059 acceptance
- Test: `.sdlc/slices/S-023/verification/r0/tests/cli-0/state-write.verify-cli.test.mjs:54`

```
head missingConfig 2 {"ok": false, "error": "missing <repo>/.sdlc/config.json"}
base missingConfig 2 {"ok": false, "error": "missing <repo>/.sdlc/config.json"}
```

## TC-cli-6 (VS-2): base-branch uses the custom lowercase format and changes nothing

- Given: branchFormat feature/{name:lower}; S-001 awaiting-merge with branch feature/s-001; S-002 depends on it
- When: base-branch --slice S-002
- Then: branch feature/s-001; file tree and refs unchanged
- Actual: branch feature/s-001; treeUnchanged true. Stack mode gives feature/m-1. Default format gives sdlc/S-001
- Result: pass
- Source: R-059 acceptance
- Test: `.sdlc/slices/S-023/verification/r0/tests/cli-0/state-write.verify-cli.test.mjs:66`

```
head base 0 {"ok": true, "slice": "S-002", "branch": "feature/s-001"}
head stack 0 {"ok": true, "slice": "S-001", "branch": "feature/m-1"}
```

## TC-cli-7 (VS-2): base-branch with a bad branchFormat is a clean Fail when the answer needs the format

- Given: branchFormat bad{x}, zz, {name}{name}; S-002 depends on an awaiting-merge S-001
- When: base-branch --slice S-002
- Then: exit non-zero, ok:false, no traceback
- Actual: exit 2, ok:false, no traceback, same as before the change
- Result: pass
- Source: R-059 acceptance
- Test: `.sdlc/slices/S-023/verification/r0/tests/cli-0/state-write.verify-cli.test.mjs:81`

```
head base-badfmt-dep "bad{x}" 2 {"ok": false, "error": "the branch format 'bad{x}' must hold exactly one {name} or {name:lower}, found 0"}
```

## TC-cli-8 (VS-2): base-branch with a bad or absent config.json is a clean Fail

- Given: config.json absent or invalid JSON
- When: base-branch --slice S-001
- Then: exit 2, ok:false, no traceback
- Actual: exit 2, ok:false, no traceback
- Result: pass
- Source: R-059 acceptance
- Test: `.sdlc/slices/S-023/verification/r0/tests/cli-0/state-write.verify-cli.test.mjs:97`

```
head base-cfg null 2 {"ok": false, "error": "missing <repo>/.sdlc/config.json"}
head base-cfg "{nope" 2 {"ok": false, "error": "<repo>/.sdlc/config.json is not valid JSON ..."}
```

Full run log: `.sdlc/slices/S-023/verification/r0/logs/cli-0-run.log`. All 26 test runs pass (13 on the head build, 13 on its parent for comparison).

## Attacks

None for this profile.

## Seeds

- base-branch accepts an invalid branchFormat when the answer never uses the format: With branchFormat bad{x} and a slice with no awaiting-merge dependency, base-branch exits 0 and prints main. format_of does not validate the format. The behavior is the same before the change, and no requirement demands validation. VS-2 note expects a clean failure for a bad format, and that holds only when the answer builds a branch name. (skills/sdlc/state-write.py)
- A config.json that is a JSON array gives a Python traceback: require_known_mode calls config.get on a list, so patch-slice and base-branch exit 1 with AttributeError and no JSON error. The output is the same before the change. (skills/sdlc/state-write.py)
- patch-slice with a format that git refuses fails late with a raw git message: Formats such as has space/{name}, a//{name} and {name}.lock pass format_of and fail inside git checkout -b. The failure is clean (exit 2, ok:false) but names git, not the format. Same as before the change. (skills/sdlc/state-write.py)
