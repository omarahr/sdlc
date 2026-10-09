# S-006 verify-cli round 0 part 0

- Slice: S-006
- Profile: cli
- Round: 0
- Commit: ee0312c
- Verdict: pass (6 of 6 cases)
- Environment: python3 branches.py from a clean git worktree of sdlc/S-006, node 24 cli-runner with scratch HOME and TZ=UTC; no network
- Run log: .sdlc/slices/S-006/verification/r0/logs/cli-0-run.txt
- Transcripts: .sdlc/slices/S-006/verification/r0/logs/cli-0-transcripts.txt

## TC-cli-1 (VS-3): CLI name equals Python name for all 24 kind and format cases

- Given: A scratch git repo and the real branches.py
- When: Run `branches.py name --format F --kind K ...` for 8 kinds x 3 formats
- Then: branch equals mod.name; prefix, suffix and tail match; git check-ref-format passes; exit 0; stderr empty; tree unchanged
- Actual: 24 of 24 cases matched (state compared by shape because its stamp is the clock)
- Result: pass
- Source: R-011 acceptance; R-068 acceptance
- Test: .sdlc/slices/S-006/verification/r0/tests/cli-0/branches-lower.verify-cli.test.mjs:43

```
see .sdlc/slices/S-006/verification/r0/logs/cli-0-transcripts.txt
unchanged after every run (treeUnchanged asserted)
```

## TC-cli-2 (VS-1): Lower lowercases only the tail

- Given: Formats feature/PROJ-1-{name:lower}, Feat/PROJ-{name:lower}-X, Feat/PROJ-{name}-X, FEATURE/{name:lower}
- When: Run name for slice, e2e-area (area API-V2) and verify (profile HTTP-API)
- Then: feature/PROJ-1-s-001; Feat/PROJ-s-001-X; Feat/PROJ-S-001-X; FEATURE/m-1-e2e-api-v2; feature/PROJ-1-s-001-v0-http-api-0
- Actual: All five branches match exactly
- Result: pass
- Source: R-011 acceptance
- Test: .sdlc/slices/S-006/verification/r0/tests/cli-0/branches-lower.verify-cli.test.mjs:65

```
see .sdlc/slices/S-006/verification/r0/logs/cli-0-transcripts.txt
```

## TC-cli-3 (VS-3): Format comes from config; the flag overrides it

- Given: Config branchFormat feature/PROJ-1-{name:lower}; a repo with no config
- When: Run name without and with --format
- Then: s-009 lowercased from config; sdlc/S-009 with the flag; sdlc/S-009 with no config
- Actual: All three match
- Result: pass
- Source: R-011 acceptance
- Test: .sdlc/slices/S-006/verification/r0/tests/cli-0/branches-lower.verify-cli.test.mjs:79

```
see .sdlc/slices/S-006/verification/r0/logs/cli-0-transcripts.txt
```

## TC-cli-4 (VS-3): Bad kind, bad format and missing parts exit non-zero with a JSON error and no stack trace

- Given: Scratch repo
- When: Run name with kind nope; formats sdlc/x, two placeholders, {name:upper}, whitespace, ..{name:lower}; missing id; missing verify part; empty id; --n x; missing repo dir
- Then: Exit non-zero (2), ok false, no Traceback, tree unchanged
- Actual: All cases exit 2 with {ok:false,error}, no Traceback
- Result: pass
- Source: R-011 acceptance; R-068 acceptance
- Test: .sdlc/slices/S-006/verification/r0/tests/cli-0/branches-lower.verify-cli.test.mjs:87

```
see .sdlc/slices/S-006/verification/r0/logs/cli-0-transcripts.txt
exit: 2
{"ok": false, "error": "--kind 'nope' is not one of run, slice, milestone, e2e, e2e-area, state, verify, attempt"}
```

## TC-cli-5 (VS-3): Repo path with spaces and unicode, unicode id, repeated run, CI and C locale

- Given: Dir 'a dir with spaces é'
- When: Run the same name twice; id with Ä Ö İ; CI=1 LANG=C
- Then: Same stdout both times; branch uses str.lower of the id; sdlc/S-001 under C locale
- Actual: All matched
- Result: pass
- Source: R-011 acceptance
- Test: .sdlc/slices/S-006/verification/r0/tests/cli-0/branches-lower.verify-cli.test.mjs:108

```
see .sdlc/slices/S-006/verification/r0/logs/cli-0-transcripts.txt
```

## TC-cli-6 (VS-3): Unknown flag and no arguments fail cleanly

- Given: None
- When: Run name with --bogus x; run with no arguments
- Then: Exit 2 and a JSON error, no Traceback
- Actual: Exit 2: unrecognized arguments: --bogus x; exit 2: the following arguments are required: command
- Result: pass
- Source: R-011 acceptance; R-068 acceptance
- Test: .sdlc/slices/S-006/verification/r0/tests/cli-0/branches-lower.verify-cli.test.mjs:124

```
see .sdlc/slices/S-006/verification/r0/logs/cli-0-transcripts.txt
```

## Attacks

None beyond the cases above.

## Seeds

- VS-2 and VS-1 and-or VS-3 cover only the name half: The parse command is a stub that echoes its input, so the round-trip back to parts is unverified until S-007.
