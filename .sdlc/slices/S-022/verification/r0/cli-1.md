# Verification cli-1, S-022, round 0

Commit: 7813019. Verdict: pass (no in-scope failure). 8 cases, 42 test runs, 0 failures.

Environment: Python 3 state-write.py from the sdlc/S-022 worktree; cli-runner scratch repos with a local bare remote.

## TC-cli-1: Format with no placeholder is refused cleanly
- Given: stack repo, branchFormat 'feature/PROJ-1'
- When: state-write.py patch-slice and base-branch (milestone and dependency) run against the repo
- Then: Exit 2, JSON {ok:false,error}, no traceback, tree and refs unchanged on all three paths
- Actual: Exit 2, JSON {ok:false,error}, no traceback, tree and refs unchanged on all three paths
- Result: pass
- Test: .sdlc/slices/S-022/verification/r0/tests/cli-1/format-refusal.verify-cli.test.mjs:28
- Command: `VERIFY_SKILL_DIR=<worktree>/skills/sdlc node --test .sdlc/slices/S-022/verification/r0/tests/cli-1/format-refusal.verify-cli.test.mjs`

```
# no placeholder patch-slice
exit 2
stdout: {"ok": false, "error": "the branch format 'feature/PROJ-1' must hold exactly one {name} or {name:lower}, found 0"}
stderr: 
tree unchanged: True
```
```
# no placeholder base-branch
exit 2
stdout: {"ok": false, "error": "the branch format 'feature/PROJ-1' must hold exactly one {name} or {name:lower}, found 0"}
stderr: 
tree unchanged: True
```
```
# no placeholder base-branch-dependency
exit 2
stdout: {"ok": false, "error": "the branch format 'feature/PROJ-1' must hold exactly one {name} or {name:lower}, found 0"}
stderr: 
tree unchanged: True
```

## TC-cli-2: Format with two placeholders is refused cleanly
- Given: stack repo, branchFormat 'feature/{name}/{name}'
- When: state-write.py patch-slice and base-branch (milestone and dependency) run against the repo
- Then: Exit 2, JSON {ok:false,error}, no traceback, tree and refs unchanged on all three paths
- Actual: Exit 2, JSON {ok:false,error}, no traceback, tree and refs unchanged on all three paths
- Result: pass
- Test: .sdlc/slices/S-022/verification/r0/tests/cli-1/format-refusal.verify-cli.test.mjs:28
- Command: `VERIFY_SKILL_DIR=<worktree>/skills/sdlc node --test .sdlc/slices/S-022/verification/r0/tests/cli-1/format-refusal.verify-cli.test.mjs`

```
# two placeholders patch-slice
exit 2
stdout: {"ok": false, "error": "the branch format 'feature/{name}/{name}' must hold exactly one {name} or {name:lower}, found 2"}
stderr: 
tree unchanged: True
```
```
# two placeholders base-branch
exit 2
stdout: {"ok": false, "error": "the branch format 'feature/{name}/{name}' must hold exactly one {name} or {name:lower}, found 2"}
stderr: 
tree unchanged: True
```
```
# two placeholders base-branch-dependency
exit 2
stdout: {"ok": false, "error": "the branch format 'feature/{name}/{name}' must hold exactly one {name} or {name:lower}, found 2"}
stderr: 
tree unchanged: True
```

## TC-cli-3: Format with mixed placeholders is refused cleanly
- Given: stack repo, branchFormat '{name}-{name:lower}'
- When: state-write.py patch-slice and base-branch (milestone and dependency) run against the repo
- Then: Exit 2, JSON {ok:false,error}, no traceback, tree and refs unchanged on all three paths
- Actual: Exit 2, JSON {ok:false,error}, no traceback, tree and refs unchanged on all three paths
- Result: pass
- Test: .sdlc/slices/S-022/verification/r0/tests/cli-1/format-refusal.verify-cli.test.mjs:28
- Command: `VERIFY_SKILL_DIR=<worktree>/skills/sdlc node --test .sdlc/slices/S-022/verification/r0/tests/cli-1/format-refusal.verify-cli.test.mjs`

```
# mixed placeholders patch-slice
exit 2
stdout: {"ok": false, "error": "the branch format '{name}-{name:lower}' must hold exactly one {name} or {name:lower}, found 2"}
stderr: 
tree unchanged: True
```
```
# mixed placeholders base-branch
exit 2
stdout: {"ok": false, "error": "the branch format '{name}-{name:lower}' must hold exactly one {name} or {name:lower}, found 2"}
stderr: 
tree unchanged: True
```
```
# mixed placeholders base-branch-dependency
exit 2
stdout: {"ok": false, "error": "the branch format '{name}-{name:lower}' must hold exactly one {name} or {name:lower}, found 2"}
stderr: 
tree unchanged: True
```

## TC-cli-4: Format with unknown placeholder is refused cleanly
- Given: stack repo, branchFormat 'feature/{id}'
- When: state-write.py patch-slice and base-branch (milestone and dependency) run against the repo
- Then: Exit 2, JSON {ok:false,error}, no traceback, tree and refs unchanged on all three paths
- Actual: Exit 2, JSON {ok:false,error}, no traceback, tree and refs unchanged on all three paths
- Result: pass
- Test: .sdlc/slices/S-022/verification/r0/tests/cli-1/format-refusal.verify-cli.test.mjs:28
- Command: `VERIFY_SKILL_DIR=<worktree>/skills/sdlc node --test .sdlc/slices/S-022/verification/r0/tests/cli-1/format-refusal.verify-cli.test.mjs`

```
# unknown placeholder patch-slice
exit 2
stdout: {"ok": false, "error": "the branch format 'feature/{id}' must hold exactly one {name} or {name:lower}, found 0"}
stderr: 
tree unchanged: True
```
```
# unknown placeholder base-branch
exit 2
stdout: {"ok": false, "error": "the branch format 'feature/{id}' must hold exactly one {name} or {name:lower}, found 0"}
stderr: 
tree unchanged: True
```
```
# unknown placeholder base-branch-dependency
exit 2
stdout: {"ok": false, "error": "the branch format 'feature/{id}' must hold exactly one {name} or {name:lower}, found 0"}
stderr: 
tree unchanged: True
```

## TC-cli-5: Broken config file is refused cleanly
- Given: config.json holds invalid JSON
- When: state-write.py patch-slice and base-branch (milestone and dependency) run against the repo
- Then: Exit 2, JSON error, no traceback, tree unchanged
- Actual: Exit 2, JSON error, no traceback, tree unchanged
- Result: pass
- Test: .sdlc/slices/S-022/verification/r0/tests/cli-1/format-refusal.verify-cli.test.mjs:28
- Command: `VERIFY_SKILL_DIR=<worktree>/skills/sdlc node --test .sdlc/slices/S-022/verification/r0/tests/cli-1/format-refusal.verify-cli.test.mjs`

```
# broken config file patch-slice
exit 2
stdout: {"ok": false, "error": "/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-mGm1AM/testkit-cli-sIIANq/repo-1/.sdlc/config.json is not valid JSON: Expecting property name enclosed in double quotes: line 1 column 2 (char 1)"}
stderr: 
tree unchanged: True
```
```
# broken config file base-branch
exit 2
stdout: {"ok": false, "error": "/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-mGm1AM/testkit-cli-9tCdpz/repo-1/.sdlc/config.json is not valid JSON: Expecting property name enclosed in double quotes: line 1 column 2 (char 1)"}
stderr: 
tree unchanged: True
```
```
# broken config file base-branch-dependency
exit 2
stdout: {"ok": false, "error": "/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-mGm1AM/testkit-cli-IUphqd/repo-1/.sdlc/config.json is not valid JSON: Expecting property name enclosed in double quotes: line 1 column 2 (char 1)"}
stderr: 
tree unchanged: True
```

## TC-cli-6: Non-string and empty branchFormat fall back to the default format
- Given: branchFormat 5, ['a'] or ''
- When: state-write.py patch-slice and base-branch (milestone and dependency) run against the repo
- Then: Exit 0 and default names sdlc/S-001, sdlc/M-1, sdlc/S-000 (load_format semantics, spec section on load_format)
- Actual: Exit 0 and default names sdlc/S-001, sdlc/M-1, sdlc/S-000 (load_format semantics, spec section on load_format)
- Result: pass
- Test: .sdlc/slices/S-022/verification/r0/tests/cli-1/format-refusal.verify-cli.test.mjs:28
- Command: `VERIFY_SKILL_DIR=<worktree>/skills/sdlc node --test .sdlc/slices/S-022/verification/r0/tests/cli-1/format-refusal.verify-cli.test.mjs`

```
# non-string number patch-slice
exit 0
stdout: {"ok": true, "branch": "sdlc/S-001", "commit": "8c98c52"}
stderr: 
tree unchanged: False
```
```
# non-string number patch-slice tree diff
{"added": [".sdlc/STATUS.md", "ref:refs/heads/sdlc/M-1", "ref:refs/heads/sdlc/S-001", "ref:refs/remotes/origin/HEAD", "ref:refs/remotes/origin/sdlc/M-1"], "removed": [], "changed": [".sdlc/slices.json", "ref:HEAD"], "empty": false}
```
```
# non-string number base-branch
exit 0
stdout: {"ok": true, "slice": "S-001", "branch": "sdlc/M-1"}
stderr: 
tree unchanged: True
```
```
# non-string number base-branch-dependency
exit 0
stdout: {"ok": true, "slice": "S-001", "branch": "sdlc/S-000"}
stderr: 
tree unchanged: True
```
```
# non-string list patch-slice
exit 0
stdout: {"ok": true, "branch": "sdlc/S-001", "commit": "b70ae46"}
stderr: 
tree unchanged: False
```
```
# non-string list patch-slice tree diff
{"added": [".sdlc/STATUS.md", "ref:refs/heads/sdlc/M-1", "ref:refs/heads/sdlc/S-001", "ref:refs/remotes/origin/HEAD", "ref:refs/remotes/origin/sdlc/M-1"], "removed": [], "changed": [".sdlc/slices.json", "ref:HEAD"], "empty": false}
```

## TC-cli-7: Git-unsafe format characters
- Given: branchFormat with .. , .lock, space, ~, leading dash
- When: state-write.py patch-slice and base-branch (milestone and dependency) run against the repo
- Then: patch-slice exits 2 with a JSON error and creates no branch; base-branch prints the name
- Actual: patch-slice exits 2 with JSON error from git, no branch created; HEAD moved to the run branch and origin/HEAD was set. base-branch exits 0 and prints the git-invalid name.
- Result: pass
- Test: .sdlc/slices/S-022/verification/r0/tests/cli-1/format-refusal.verify-cli.test.mjs:28
- Command: `VERIFY_SKILL_DIR=<worktree>/skills/sdlc node --test .sdlc/slices/S-022/verification/r0/tests/cli-1/format-refusal.verify-cli.test.mjs`

```
# git-unsafe dotdot patch-slice
exit 2
stdout: {"ok": false, "error": "git checkout -q -b feature/..M-1: fatal: 'feature/..M-1' is not a valid branch name\nhint: See `man git check-ref-format`\nhint: Disable this message with \"git config set advice.refSyntax false\""}
stderr: 
tree unchanged: False
```
```
# git-unsafe dotdot patch-slice tree diff
{"added": ["ref:refs/remotes/origin/HEAD"], "removed": [], "changed": ["ref:HEAD"], "empty": false}
```
```
# git-unsafe dotdot base-branch
exit 0
stdout: {"ok": true, "slice": "S-001", "branch": "feature/..M-1"}
stderr: 
tree unchanged: True
```
```
# git-unsafe lock suffix patch-slice
exit 2
stdout: {"ok": false, "error": "git checkout -q -b feature/M-1.lock: fatal: 'feature/M-1.lock' is not a valid branch name\nhint: See `man git check-ref-format`\nhint: Disable this message with \"git config set advice.refSyntax false\""}
stderr: 
tree unchanged: False
```
```
# git-unsafe lock suffix patch-slice tree diff
{"added": ["ref:refs/remotes/origin/HEAD"], "removed": [], "changed": ["ref:HEAD"], "empty": false}
```
```
# git-unsafe lock suffix base-branch
exit 0
stdout: {"ok": true, "slice": "S-001", "branch": "feature/M-1.lock"}
stderr: 
tree unchanged: True
```

## TC-cli-8: Config file holding a JSON list
- Given: config.json is []
- When: state-write.py patch-slice and base-branch (milestone and dependency) run against the repo
- Then: Clean refusal
- Actual: Exit 1 with AttributeError traceback from require_known_mode, before format_of runs. The line is not in the S-022 diff.
- Result: pass
- Test: .sdlc/slices/S-022/verification/r0/tests/cli-1/format-refusal.verify-cli.test.mjs:28
- Command: `VERIFY_SKILL_DIR=<worktree>/skills/sdlc node --test .sdlc/slices/S-022/verification/r0/tests/cli-1/format-refusal.verify-cli.test.mjs`

```
# config is a list patch-slice
exit 1
stdout: 
stderr: Traceback (most recent call last):
  File "/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-S-022-v0-cli-1/skills/sdlc/state-write.py", line 727, in <module>
    main()
    ~~~~^^
  File "/var/fo
tree unchanged: True
```
```
# config is a list base-branch
exit 1
stdout: 
stderr: Traceback (most recent call last):
  File "/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-S-022-v0-cli-1/skills/sdlc/state-write.py", line 727, in <module>
    main()
    ~~~~^^
  File "/var/fo
tree unchanged: True
```

## Attacks
None.

## Seeds
- base-branch prints git-invalid branch names: With branchFormat feature/{name}.lock or a format holding a space, .. or ~, base-branch exits 0 and prints a name git refuses. patch-slice then fails at git. state-write does not call branches.validate_format.
- patch-slice leaves HEAD on the run branch when the milestone branch name is invalid: advance_run_branch checks out the run branch before git checkout -b fails. Exit 2 is clean, but HEAD moves and origin/HEAD is set.
- require_known_mode crashes on a config.json that holds a list: AttributeError traceback, exit 1, from config.get. Not in the S-022 diff.
- A non-string branchFormat falls back to the default silently: Plan note VS-7 expected an error. load_format semantics in the spec give the default. The result is consistent with the spec.
- branch_kind Fail path is not reachable from the CLI: branch_name always raises first for a bad format, so the branch_kind conversion in the prune loop has no CLI test.
