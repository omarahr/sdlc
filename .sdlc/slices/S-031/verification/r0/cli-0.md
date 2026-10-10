# Slice S-031, profile cli, round 0

Commit: 94acd53
Verdict: all 11 cases pass. No defect found.

Environment: Node test runner, python3 branches.py from the slice commit, cli-runner scratch repos, stub-server gh shim and glab-stub, no network
## TC-cli-1 (VS-1, R-127): Github regex rule feature matches x/feature/{name}

- Given: A scratch git repo made by cli-runner with a controlled HOME and PATH
- When: preflight pr with --format x/feature/{name}, gh shim returns regex rule "feature"
- Then: every sample passes, exit 0, tree unchanged
- Expected: every sample passes, exit 0, tree unchanged
- Actual: matches expected
- Result: pass
- Spec source: R-127 acceptance
- Test: `.sdlc/slices/S-031/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:15`
- Command: `node --test .sdlc/slices/S-031/verification/r0/tests/cli-0/branches.verify-cli.test.mjs`
## TC-cli-2 (VS-1, R-127): Rule ^feature/ fails the default format and passes feature/{name}

- Given: A scratch git repo made by cli-runner with a controlled HOME and PATH
- When: preflight pr with default format, then feature/{name}, then x/feature/{name}
- Then: default: exit 1 and slice sample fail; feature/: exit 0; x/feature/: exit 1 (anchored at start)
- Expected: default: exit 1 and slice sample fail; feature/: exit 0; x/feature/: exit 1 (anchored at start)
- Actual: matches expected
- Result: pass
- Spec source: R-127 acceptance
- Test: `.sdlc/slices/S-031/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:25`
- Command: `node --test .sdlc/slices/S-031/verification/r0/tests/cli-0/branches.verify-cli.test.mjs`
## TC-cli-3 (VS-1, R-127): Invalid or empty regex patterns do not crash the command

- Given: A scratch git repo made by cli-runner with a controlled HOME and PATH
- When: rule patterns "(", "[", "*abc", "" through the gh shim
- Then: exit 0..2, JSON on stdout, no Traceback, tree unchanged
- Expected: exit 0..2, JSON on stdout, no Traceback, tree unchanged
- Actual: matches expected
- Result: pass
- Spec source: R-127 quote
- Test: `.sdlc/slices/S-031/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:40`
- Command: `node --test .sdlc/slices/S-031/verification/r0/tests/cli-0/branches.verify-cli.test.mjs`
## TC-cli-4 (VS-2, R-140): Gitlab reads exactly one call, api projects/:fullpath/push_rule

- Given: A scratch git repo made by cli-runner with a controlled HOME and PATH
- When: preflight in pr and stack with glab stub returning branch_name_regex
- Then: one recorded argv [api, projects/:fullpath/push_rule], no group path, one rule with source gitlab and label push rule
- Expected: one recorded argv [api, projects/:fullpath/push_rule], no group path, one rule with source gitlab and label push rule
- Actual: matches expected
- Result: pass
- Spec source: R-140 acceptance
- Test: `.sdlc/slices/S-031/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:53`
- Command: `node --test .sdlc/slices/S-031/verification/r0/tests/cli-0/branches.verify-cli.test.mjs`
## TC-cli-5 (VS-2, R-140): Empty body and glab failure

- Given: A scratch git repo made by cli-runner with a controlled HOME and PATH
- When: glab stub returns {} then exits 1 with boom
- Then: empty body: no rules, one call; failure: no rules, note holds boom, all samples unchecked, one call
- Expected: empty body: no rules, one call; failure: no rules, note holds boom, all samples unchecked, one call
- Actual: matches expected
- Result: pass
- Spec source: R-140 acceptance
- Test: `.sdlc/slices/S-031/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:71`
- Command: `node --test .sdlc/slices/S-031/verification/r0/tests/cli-0/branches.verify-cli.test.mjs`
## TC-cli-6 (VS-3, R-142): Literal prefix with ticket key names the slice branch

- Given: A scratch git repo made by cli-runner with a controlled HOME and PATH
- When: name slice S-001, S-002, S-027a, S-fix-3 and milestone M-1 with feature/PROJ-123-{name}; preflight pr; trailing slash variant
- Then: feature/PROJ-123-S-001; preflight ok true, given true, slice sample feature/PROJ-123-S-001; trailing slash gives a JSON verdict, exit 0 or 2
- Expected: feature/PROJ-123-S-001; preflight ok true, given true, slice sample feature/PROJ-123-S-001; trailing slash gives a JSON verdict, exit 0 or 2
- Actual: matches expected
- Result: pass
- Spec source: R-142 acceptance
- Test: `.sdlc/slices/S-031/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:88`
- Command: `node --test .sdlc/slices/S-031/verification/r0/tests/cli-0/branches.verify-cli.test.mjs`
## TC-cli-7 (VS-4, R-150): Format sdlc/{name}.. is refused with check-ref-format reason

- Given: A scratch git repo made by cli-runner with a controlled HOME and PATH
- When: preflight pr --format sdlc/{name}..
- Then: exit 2, one JSON line, ok false, error holds check-ref-format and not a valid branch name, tree unchanged
- Expected: exit 2, one JSON line, ok false, error holds check-ref-format and not a valid branch name, tree unchanged
- Actual: matches expected
- Result: pass
- Spec source: R-150 acceptance
- Test: `.sdlc/slices/S-031/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:113`
- Command: `node --test .sdlc/slices/S-031/verification/r0/tests/cli-0/branches.verify-cli.test.mjs`
## TC-cli-8 (VS-4, R-150): Other invalid parts and hostile values are refused or handled without a crash

- Given: A scratch git repo made by cli-runner with a controlled HOME and PATH
- When: formats with space, ~, :, trailing dot, .lock, leading dash, BEL, newline, ^, [, ?, //; corpus families flag-like-values, control-chars, injection
- Then: invalid parts: exit 2 ok false; corpus values: JSON, no Traceback, exit 0..2, tree unchanged
- Expected: invalid parts: exit 2 ok false; corpus values: JSON, no Traceback, exit 0..2, tree unchanged
- Actual: matches expected
- Result: pass
- Spec source: R-150 acceptance
- Test: `.sdlc/slices/S-031/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:125`
- Command: `node --test .sdlc/slices/S-031/verification/r0/tests/cli-0/branches.verify-cli.test.mjs`
## TC-cli-9 (VS-4, R-150): Format text is never run as a command

- Given: A scratch git repo made by cli-runner with a controlled HOME and PATH
- When: formats with $(touch M), backticks and ;touch M; inside
- Then: marker file never created
- Expected: marker file never created
- Actual: matches expected
- Result: pass
- Spec source: R-150 scope
- Test: `.sdlc/slices/S-031/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:147`
- Command: `node --test .sdlc/slices/S-031/verification/r0/tests/cli-0/branches.verify-cli.test.mjs`
## TC-cli-10 (VS-5, R-151): No format and no rules keeps default in four modes

- Given: A scratch git repo made by cli-runner with a controlled HOME and PATH
- When: preflight in pr, stack, mr, direct on a repo with no config
- Then: exit 0, ok true, format sdlc/{name}, derived false, given false, rules empty, samples pass or unchecked, state sample starts with sdlc/state-
- Expected: exit 0, ok true, format sdlc/{name}, derived false, given false, rules empty, samples pass or unchecked, state sample starts with sdlc/state-
- Actual: matches expected
- Result: pass
- Spec source: R-151 acceptance
- Test: `.sdlc/slices/S-031/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:159`
- Command: `node --test .sdlc/slices/S-031/verification/r0/tests/cli-0/branches.verify-cli.test.mjs`
## TC-cli-11 (VS-5, R-151): Empty GitHub list keeps default in four modes

- Given: A scratch git repo made by cli-runner with a controlled HOME and PATH
- When: forge github, gh shim returns [] in each mode
- Then: exit 0, ok true, default format, derived false, rules empty, samples pass or unchecked
- Expected: exit 0, ok true, default format, derived false, rules empty, samples pass or unchecked
- Actual: matches expected
- Result: pass
- Spec source: R-151 acceptance
- Test: `.sdlc/slices/S-031/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:177`
- Command: `node --test .sdlc/slices/S-031/verification/r0/tests/cli-0/branches.verify-cli.test.mjs`
## Manual probe output

```
$ branches.py preflight --mode pr --format sdlc/{name}..
{"ok": false, "error": "the branch format 'sdlc/{name}..' gives 'sdlc/S-001..', which git check-ref-format refuses: fatal: 'sdlc/S-001..' is not a valid branch name"}
exit=2
$ branches.py name --kind slice --id S-001 --format feature/PROJ-123-{name}
{"ok": true, "command": "name", "format": "feature/PROJ-123-{name}", "kind": "slice", "branch": "feature/PROJ-123-S-001"}
exit=0
$ preflight mr, no config
{"ok": true, "command": "preflight", "format": "sdlc/{name}", "args": {"repo": "/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/tmp.kvKRsf2Bii", "mode": "mr", "branch": null}, "given": false, "derived": false, "suggestion": "", "forge": "", "rules": [], "samples": [], "notes": []}
exit=0
```

## Run output (tail)

```
✔ verify cli: VS-4 other invalid parts and hostile values (TC-cli-8) (6323.007625ms)
✔ verify cli: VS-4 format is never run as a command (TC-cli-9) (525.802792ms)
✔ verify cli: VS-5 no format and no rules keeps default in every mode (TC-cli-10) (846.283708ms)
✔ verify cli: VS-5 github shim returning empty list keeps default (TC-cli-11) (1232.269042ms)
ℹ tests 11
ℹ suites 0
ℹ pass 11
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 15850.75275
```

## Attacks

The corpus families flag-like-values, control-chars and injection ran against `preflight --format`. None crashed the tool, changed the tree or ran a command.

## Seeds

None.
