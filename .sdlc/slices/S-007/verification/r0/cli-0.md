# verify-cli: S-007 round 0 part 0

- Slice: S-007
- Profile: cli
- Round: 0
- Commit: ca640fc
- Verdict: verified (6 of 6 cases pass)

Environment: Python 3.14.7 (python3 via cli-runner), Node 24.19, macOS, scratch git repos, no network

## TC-cli-1 (VS-1): A foreign branch gives kind null and no part keys

- Given: main, feature/PROJ-1-foo, sdlc/feature-x, a branch shorter than prefix plus suffix, empty branch, case-different prefix
- When: branches.py parse runs as a child process in a scratch git repo with a controlled environment
- Then: Each prints exactly ok, command, format, branch, kind:null and exits 0; the tree and refs stay unchanged.
- Expected: Each prints exactly ok, command, format, branch, kind:null and exits 0; the tree and refs stay unchanged.
- Actual: All 12 branches gave kind null with five keys and exit 0.
- Result: pass
- Spec source: R-021 acceptance
- Test: .sdlc/slices/S-007/verification/r0/tests/cli-0/branches-parse.verify-cli.test.mjs:56
- Command: `VERIFY_ROOT=<worktree of sdlc/S-007> node --test .sdlc/slices/S-007/verification/r0/tests/cli-0/branches-parse.verify-cli.test.mjs`

### VS-1 first transcripts

```
$ branches.py parse --branch "main" (format sdlc/{name} via config)
exit 0
stdout: {"ok": true, "command": "parse", "format": "sdlc/{name}", "branch": "main", "kind": null}
stderr: 
tree unchanged: true
$ branches.py parse --branch "feature/PROJ-1-foo" (format feature/PROJ-1-{name} via config)
exit 0
stdout: {"ok": true, "command": "parse", "format": "feature/PROJ-1-{name}", "branch": "feature/PROJ-1-foo", "kind": null}
stderr: 
tree unchanged: true
$ branches.py parse --branch "sdlc/feature-x" (format sdlc/{name} via config)
exit 0
stdout: {"ok": true, "command": "parse", "format": "sdlc/{name}", "branch": "sdlc/feature-x", "kind": null}
stderr: 
tree unchanged: true
$ branches.py parse --branch "feature/PROJ-1-foo" (format feature/PROJ-1-{name} via --format)
exit 0
stdout: {"ok": true, "command": "parse", "format": "feature/PROJ-1-{name}", "branch": "feature/PROJ-1-foo", "kind": null}
stderr: 
tree unchanged: true
$ branches.py parse --branch "sdlc" (format sdlc/{name} via config)
exit 0
stdout: {"ok": true, "command": "parse", "format": "sdlc/{name}", "branch": "sdlc", "kind": null}
stderr: 
tree unchanged: true
$ branches.py parse --branch "sdl" (format sdlc/{name} via config)
exit 0
stdout: {"ok": true, "command": "parse", "format": "sdlc/{name}", "branch": "sdl", "kind": null}
stderr: 
tree unchanged: true
```

### VS-1 all transcripts

See `.sdlc/slices/S-007/verification/r0/logs/cli-0-transcripts.txt`.

### tree before and after

```
treeUnchanged: true for every run; no added, removed or changed paths, refs unchanged
```

## TC-cli-2 (VS-2): Prefix and suffix pass but no row matches gives null

- Given: sdlc/, sdlc/run-, sdlc/run-x, S-001 and S-001-wip under {name}-wip, overlapping prefix and suffix (aba, abba under ab{name}ba, aaa under aa{name}aa)
- When: branches.py parse runs as a child process in a scratch git repo with a controlled environment
- Then: null for each; S-001-wip gives slice S-001; abS-1ba gives slice.
- Expected: null for each; S-001-wip gives slice S-001; abS-1ba gives slice.
- Actual: All matched expectations; overlap and empty tails gave null with no wrong slice.
- Result: pass
- Spec source: R-021 acceptance
- Test: .sdlc/slices/S-007/verification/r0/tests/cli-0/branches-parse.verify-cli.test.mjs:71
- Command: `VERIFY_ROOT=<worktree of sdlc/S-007> node --test .sdlc/slices/S-007/verification/r0/tests/cli-0/branches-parse.verify-cli.test.mjs`

### VS-2 first transcripts

```
$ branches.py parse --branch "sdlc/" (format sdlc/{name} via config)
exit 0
stdout: {"ok": true, "command": "parse", "format": "sdlc/{name}", "branch": "sdlc/", "kind": null}
stderr: 
tree unchanged: true
$ branches.py parse --branch "sdlc/run-" (format sdlc/{name} via config)
exit 0
stdout: {"ok": true, "command": "parse", "format": "sdlc/{name}", "branch": "sdlc/run-", "kind": null}
stderr: 
tree unchanged: true
$ branches.py parse --branch "sdlc/run-x" (format sdlc/{name} via config)
exit 0
stdout: {"ok": true, "command": "parse", "format": "sdlc/{name}", "branch": "sdlc/run-x", "kind": null}
stderr: 
tree unchanged: true
$ branches.py parse --branch "sdlc/state-1" (format sdlc/{name} via config)
exit 0
stdout: {"ok": true, "command": "parse", "format": "sdlc/{name}", "branch": "sdlc/state-1", "kind": null}
stderr: 
tree unchanged: true
$ branches.py parse --branch "sdlc/M-" (format sdlc/{name} via config)
exit 0
stdout: {"ok": true, "command": "parse", "format": "sdlc/{name}", "branch": "sdlc/M-", "kind": null}
stderr: 
tree unchanged: true
$ branches.py parse --branch "sdlc/S-" (format sdlc/{name} via config)
exit 0
stdout: {"ok": true, "command": "parse", "format": "sdlc/{name}", "branch": "sdlc/S-", "kind": null}
stderr: 
tree unchanged: true
```

### VS-2 all transcripts

See `.sdlc/slices/S-007/verification/r0/logs/cli-0-transcripts.txt`.

### tree before and after

```
treeUnchanged: true for every run; no added, removed or changed paths, refs unchanged
```

## TC-cli-3 (VS-3): Each tail is classified by the first matching row

- Given: one branch per row, S-fix-M-1-2, M-1-e2e-api, M-1-e2e, M-1-e2e-a-b, double-match tails S-001-v0-x-attempt-3 and M-1-e2e-api-v0-x-0
- When: branches.py parse runs as a child process in a scratch git repo with a controlled environment
- Then: Row order decides: verify beats attempt, e2e-area beats verify, area a-b parses whole, profile http-api parses with lazy group.
- Expected: Row order decides: verify beats attempt, e2e-area beats verify, area a-b parses whole, profile http-api parses with lazy group.
- Actual: All kinds and parts matched the table order.
- Result: pass
- Spec source: R-022 acceptance
- Test: .sdlc/slices/S-007/verification/r0/tests/cli-0/branches-parse.verify-cli.test.mjs:87
- Command: `VERIFY_ROOT=<worktree of sdlc/S-007> node --test .sdlc/slices/S-007/verification/r0/tests/cli-0/branches-parse.verify-cli.test.mjs`

### VS-3 first transcripts

```
$ branches.py parse --branch "sdlc/run-2" (format sdlc/{name} via config)
exit 0
stdout: {"ok": true, "command": "parse", "format": "sdlc/{name}", "branch": "sdlc/run-2", "kind": "run", "tail": "run-2", "n": 2, "known": null}
stderr: 
tree unchanged: true
$ branches.py parse --branch "sdlc/M-1" (format sdlc/{name} via config)
exit 0
stdout: {"ok": true, "command": "parse", "format": "sdlc/{name}", "branch": "sdlc/M-1", "kind": "milestone", "tail": "M-1", "id": "M-1", "known": null}
stderr: 
tree unchanged: true
$ branches.py parse --branch "sdlc/M-1-e2e" (format sdlc/{name} via config)
exit 0
stdout: {"ok": true, "command": "parse", "format": "sdlc/{name}", "branch": "sdlc/M-1-e2e", "kind": "e2e", "tail": "M-1-e2e", "id": "M-1", "known": null}
stderr: 
tree unchanged: true
$ branches.py parse --branch "sdlc/M-1-e2e-api" (format sdlc/{name} via config)
exit 0
stdout: {"ok": true, "command": "parse", "format": "sdlc/{name}", "branch": "sdlc/M-1-e2e-api", "kind": "e2e-area", "tail": "M-1-e2e-api", "id": "M-1", "area": "api", "known": null}
stderr: 
tree unchanged: true
$ branches.py parse --branch "sdlc/M-1-e2e-a-b" (format sdlc/{name} via config)
exit 0
stdout: {"ok": true, "command": "parse", "format": "sdlc/{name}", "branch": "sdlc/M-1-e2e-a-b", "kind": "e2e-area", "tail": "M-1-e2e-a-b", "id": "M-1", "area": "a-b", "known": null}
stderr: 
tree unchanged: true
$ branches.py parse --branch "sdlc/state-20261008101500" (format sdlc/{name} via config)
exit 0
stdout: {"ok": true, "command": "parse", "format": "sdlc/{name}", "branch": "sdlc/state-20261008101500", "kind": "state", "tail": "state-20261008101500", "ts": "20261008101500", "known": null}
stderr: 
tree unchanged: true
```

### VS-3 all transcripts

See `.sdlc/slices/S-007/verification/r0/logs/cli-0-transcripts.txt`.

### tree before and after

```
treeUnchanged: true for every run; no added, removed or changed paths, refs unchanged
```

## TC-cli-4 (VS-4): Case-insensitive matching applies only under {name:lower}

- Given: feature/PROJ-1-s-001, m-1-e2e-api, run-2, mixed-case prefix, sdlc/{name:lower}-wip with -WIP
- When: branches.py parse runs as a child process in a scratch git repo with a controlled environment
- Then: Lower format classifies lowercase tails; plain format gives null for s-001 and m-1-e2e-api and RUN-2. run-2 is lowercase in the table, so it classifies under both formats.
- Expected: Lower format classifies lowercase tails; plain format gives null for s-001 and m-1-e2e-api and RUN-2. run-2 is lowercase in the table, so it classifies under both formats.
- Actual: Matched. Plan note says run-2 gives null under the plain format; the spec regex ^run-(\d+)$ matches it, so the note is wrong, not the product.
- Result: pass
- Spec source: R-022 acceptance
- Test: .sdlc/slices/S-007/verification/r0/tests/cli-0/branches-parse.verify-cli.test.mjs:117
- Command: `VERIFY_ROOT=<worktree of sdlc/S-007> node --test .sdlc/slices/S-007/verification/r0/tests/cli-0/branches-parse.verify-cli.test.mjs`

### VS-4 first transcripts

```
$ branches.py parse --branch "feature/PROJ-1-s-001" (format feature/PROJ-1-{name:lower} via config)
exit 0
stdout: {"ok": true, "command": "parse", "format": "feature/PROJ-1-{name:lower}", "branch": "feature/PROJ-1-s-001", "kind": "slice", "tail": "s-001", "id": "s-001", "known": null}
stderr: 
tree unchanged: true
$ branches.py parse --branch "feature/PROJ-1-m-1-e2e-api" (format feature/PROJ-1-{name:lower} via config)
exit 0
stdout: {"ok": true, "command": "parse", "format": "feature/PROJ-1-{name:lower}", "branch": "feature/PROJ-1-m-1-e2e-api", "kind": "e2e-area", "tail": "m-1-e2e-api", "id": "m-1", "area": "api", "known": null}
stderr: 
tree unchanged: true
$ branches.py parse --branch "feature/PROJ-1-run-2" (format feature/PROJ-1-{name:lower} via config)
exit 0
stdout: {"ok": true, "command": "parse", "format": "feature/PROJ-1-{name:lower}", "branch": "feature/PROJ-1-run-2", "kind": "run", "tail": "run-2", "n": 2, "known": null}
stderr: 
tree unchanged: true
$ branches.py parse --branch "feature/PROJ-1-s-001-v0-http-api-0" (format feature/PROJ-1-{name:lower} via config)
exit 0
stdout: {"ok": true, "command": "parse", "format": "feature/PROJ-1-{name:lower}", "branch": "feature/PROJ-1-s-001-v0-http-api-0", "kind": "verify", "tail": "s-001-v0-http-api-0", "id": "s-001", "round": 0, "profile": "http-api", "part": 0, "known": null}
stderr: 
tree unchanged: true
$ branches.py parse --branch "feature/PROJ-1-state-20261008101500" (format feature/PROJ-1-{name:lower} via config)
exit 0
stdout: {"ok": true, "command": "parse", "format": "feature/PROJ-1-{name:lower}", "branch": "feature/PROJ-1-state-20261008101500", "kind": "state", "tail": "state-20261008101500", "ts": "20261008101500", "known": null}
stderr: 
tree unchanged: true
$ branches.py parse --branch "feature/PROJ-1-s-001" (format feature/PROJ-1-{name} via config)
exit 0
stdout: {"ok": true, "command": "parse", "format": "feature/PROJ-1-{name}", "branch": "feature/PROJ-1-s-001", "kind": null}
stderr: 
tree unchanged: true
```

### VS-4 all transcripts

See `.sdlc/slices/S-007/verification/r0/logs/cli-0-transcripts.txt`.

### tree before and after

```
treeUnchanged: true for every run; no added, removed or changed paths, refs unchanged
```

## TC-cli-5 (VS-5): The result holds the parts that apply

- Given: run-2, run-0042, state ts, verify, e2e-area, attempt, slice, milestone, e2e, a 30-digit run number
- When: branches.py parse runs as a child process in a scratch git repo with a controlled environment
- Then: Key order and set per kind; n, round, part are JSON integers; tail always present; no key outside the table.
- Expected: Key order and set per kind; n, round, part are JSON integers; tail always present; no key outside the table.
- Actual: Matched. run-0042 gives n 42 and tail run-0042. A 30-digit n prints as an integer.
- Result: pass
- Spec source: R-023 acceptance
- Test: .sdlc/slices/S-007/verification/r0/tests/cli-0/branches-parse.verify-cli.test.mjs:139
- Command: `VERIFY_ROOT=<worktree of sdlc/S-007> node --test .sdlc/slices/S-007/verification/r0/tests/cli-0/branches-parse.verify-cli.test.mjs`

### VS-5 first transcripts

```
$ branches.py parse --branch "sdlc/run-2" (format sdlc/{name} via config)
exit 0
stdout: {"ok": true, "command": "parse", "format": "sdlc/{name}", "branch": "sdlc/run-2", "kind": "run", "tail": "run-2", "n": 2, "known": null}
stderr: 
tree unchanged: true
$ branches.py parse --branch "sdlc/run-0042" (format sdlc/{name} via config)
exit 0
stdout: {"ok": true, "command": "parse", "format": "sdlc/{name}", "branch": "sdlc/run-0042", "kind": "run", "tail": "run-0042", "n": 42, "known": null}
stderr: 
tree unchanged: true
$ branches.py parse --branch "sdlc/state-20261008101500" (format sdlc/{name} via config)
exit 0
stdout: {"ok": true, "command": "parse", "format": "sdlc/{name}", "branch": "sdlc/state-20261008101500", "kind": "state", "tail": "state-20261008101500", "ts": "20261008101500", "known": null}
stderr: 
tree unchanged: true
$ branches.py parse --branch "sdlc/S-001-v0-http-api-0" (format sdlc/{name} via config)
exit 0
stdout: {"ok": true, "command": "parse", "format": "sdlc/{name}", "branch": "sdlc/S-001-v0-http-api-0", "kind": "verify", "tail": "S-001-v0-http-api-0", "id": "S-001", "round": 0, "profile": "http-api", "part": 0, "known": null}
stderr: 
tree unchanged: true
$ branches.py parse --branch "sdlc/M-1-e2e-api" (format sdlc/{name} via config)
exit 0
stdout: {"ok": true, "command": "parse", "format": "sdlc/{name}", "branch": "sdlc/M-1-e2e-api", "kind": "e2e-area", "tail": "M-1-e2e-api", "id": "M-1", "area": "api", "known": null}
stderr: 
tree unchanged: true
$ branches.py parse --branch "sdlc/S-001-attempt-3" (format sdlc/{name} via config)
exit 0
stdout: {"ok": true, "command": "parse", "format": "sdlc/{name}", "branch": "sdlc/S-001-attempt-3", "kind": "attempt", "tail": "S-001-attempt-3", "id": "S-001", "n": 3, "known": null}
stderr: 
tree unchanged: true
```

### VS-5 all transcripts

See `.sdlc/slices/S-007/verification/r0/logs/cli-0-transcripts.txt`.

### tree before and after

```
treeUnchanged: true for every run; no added, removed or changed paths, refs unchanged
```

## TC-cli-6 (VS-8): The parse command prints one flat JSON object

- Given: one-line output; missing --branch; invalid formats (nobrace, double placeholder, open brace, whitespace, git-unsafe, empty); missing repo dir; invalid config.json; unknown flag; directory with spaces and unicode; repeat run
- When: branches.py parse runs as a child process in a scratch git repo with a controlled environment
- Then: Exit 2 with {ok:false,error} for every error input; no nested objects; repeated runs give identical output; tree and refs unchanged.
- Expected: Exit 2 with {ok:false,error} for every error input; no nested objects; repeated runs give identical output; tree and refs unchanged.
- Actual: Matched.
- Result: pass
- Spec source: R-023 quote and R-021 acceptance
- Test: .sdlc/slices/S-007/verification/r0/tests/cli-0/branches-parse.verify-cli.test.mjs:168
- Command: `VERIFY_ROOT=<worktree of sdlc/S-007> node --test .sdlc/slices/S-007/verification/r0/tests/cli-0/branches-parse.verify-cli.test.mjs`

### VS-8 first transcripts

```
$ branches.py parse --branch "sdlc/S-001-v0-http-api-0" (format sdlc/{name} via config)
exit 0
stdout: {"ok": true, "command": "parse", "format": "sdlc/{name}", "branch": "sdlc/S-001-v0-http-api-0", "kind": "verify", "tail": "S-001-v0-http-api-0", "id": "S-001", "round": 0, "profile": "http-api", "part": 0, "known": null}
stderr: 
tree unchanged: true
$ branches.py parse --repo <repo>
exit 2
stdout: {"ok": false, "error": "the following arguments are required: --branch"}
stderr: 
tree unchanged: true
$ branches.py parse --branch main --format "nobrace"
exit 2
stdout: {"ok": false, "error": "the branch format 'nobrace' must hold exactly one {name} or {name:lower}, found 0"}
stderr: 
tree unchanged: true
$ branches.py parse --branch main --format "{name}{name}"
exit 2
stdout: {"ok": false, "error": "the branch format '{name}{name}' must hold exactly one {name} or {name:lower}, found 2"}
stderr: 
tree unchanged: true
$ branches.py parse --branch main --format "a{name}{"
exit 2
stdout: {"ok": false, "error": "the branch format 'a{name}{' holds a brace outside its placeholder"}
stderr: 
tree unchanged: true
$ branches.py parse --branch main --format "a b/{name}"
exit 2
stdout: {"ok": false, "error": "the branch format 'a b/{name}' holds whitespace"}
stderr: 
tree unchanged: true
```

### VS-8 all transcripts

See `.sdlc/slices/S-007/verification/r0/logs/cli-0-transcripts.txt`.

### tree before and after

```
treeUnchanged: true for every run; no added, removed or changed paths, refs unchanged
```

## Attacks

None for this profile.

## Seeds

- plan note for VS-4 is wrong about run-2: The plan says run-2 gives null under the plain format. Row 1 is the lowercase literal run-, so it matches under both formats. No product defect.
- a branch starting with a dash cannot pass as '--branch -x': argparse reads '--branch -wip' as a flag and exits 2 with ok:false. The '--branch=-wip' form works. Git refuses branch names that start with a dash, so this is cosmetic.
- slice row accepts any S- tail, such as S-001-attempt-: Row 8 is ^(S-[A-Za-z0-9-]+)$ as in the spec. A tail like S-001-v-x-0 or S-001-attempt- classifies as a slice with that whole text as id. The spec allows it; the loop may treat such a branch as a loop slice branch.
