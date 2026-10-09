# Verification: S-015, profile cli, part 0, round 0

- Commit: 7f87721
- Verdict: verified. 35 cases ran, 35 passed.
- Environment: python3 3.14.7, node, git, macOS. cli-runner with scratch HOME and repos. gh and glab are shell shims from stub-server and glab-stub. No network.
- Test file: `tests/cli-0/preflight.verify-cli.test.mjs`
- Run log: `.sdlc/slices/S-015/verification/r0/logs/cli-0-run.txt`

## TC-cli-1 (VS-1): VS-1 flag beats broken config

- Requirements: R-038
- Spec source: R-038 acceptance
- Given: A scratch git repo built by cli-runner, with the forge shims named in the test
- When: branches.py preflight runs as a real process; see the transcript
- Then: The assertions in the test hold: exit code, JSON keys, sample results, notes, and an unchanged tree
- Result: pass
- Test: `tests/cli-0/preflight.verify-cli.test.mjs:27`

```
$ cd /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/cwd-2
$ python3 /Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/branches.py preflight --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-1 --mode direct --format 'team/{name}'
exit: 0 (62 ms)
--- stdout
{"ok": true, "command": "preflight", "format": "team/{name}", "args": {"repo": "/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-1", "mode": "direct", "branch": null}, "given": true, "derived": false, "suggestion": "", "forge": "", "rules": [], "samples": [], "notes": []}
--- stderr

--- tree /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/cwd-2 (unchanged)
--- tree /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-1 (unchanged)
```

## TC-cli-2 (VS-1): VS-1 config alone gives given true; neither gives false

- Requirements: R-038
- Spec source: R-038 acceptance
- Given: A scratch git repo built by cli-runner, with the forge shims named in the test
- When: branches.py preflight runs as a real process; see the transcript
- Then: The assertions in the test hold: exit code, JSON keys, sample results, notes, and an unchanged tree
- Result: pass
- Test: `tests/cli-0/preflight.verify-cli.test.mjs:37`

```
$ cd /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/cwd-4
$ python3 /Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/branches.py preflight --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-3 --mode pr
exit: 0 (120 ms)
--- stdout
{"ok": true, "command": "preflight", "format": "feature/{name}", "args": {"repo": "/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-3", "mode": "pr", "branch": null}, "given": true, "derived": false, "suggestion": "", "forge": "", "rules": [], "samples": [{"kind": "slice", "name": "feature/S-001", "result": "unchecked", "rule": null}, {"kind": "state", "name": "feature/state-20261009220921", "result": "unchecked", "rule": null}, {"kind": "e2e", "name": "feature/M-1-e2e", "result": "unchecked", "rule": null}], "notes": []}
--- stderr

--- tree /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/cwd-4 (unchanged)
--- tree /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-3 (unchanged)
$ cd /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/cwd-6
$ python3 /Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/branches.py preflight --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-5 --mode pr
exit: 0 (126 ms)
--- stdout
{"ok": true, "command": "preflight", "format": "sdlc/{name}", "args": {"repo": "/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-5", "mode": "pr", "branch": null}, "given": false, "derived": false, "suggestion": "", "forge": "", "rules": [], "samples": [{"kind": "slice", "name": "sdlc/S-001", "result": "unchecked", "rule": null}, {"kind": "state", "name": "sdlc/state-20261009220921", "result": "unchecked", "rule": null}, {"kind": "e2e", "name": "sdlc/M-1-e2e", "result": "unchecked", "rule": null}], "notes": []}
--- stderr

--- tree /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/cwd-6 (unchanged)
--- tree /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-5 (unchanged)
```

## TC-cli-3 (VS-1): VS-1 empty config format counts as none; broken config with no flag exits 2

- Requirements: R-038
- Spec source: R-038 acceptance
- Given: A scratch git repo built by cli-runner, with the forge shims named in the test
- When: branches.py preflight runs as a real process; see the transcript
- Then: The assertions in the test hold: exit code, JSON keys, sample results, notes, and an unchanged tree
- Result: pass
- Test: `tests/cli-0/preflight.verify-cli.test.mjs:49`

```
$ cd /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/cwd-8
$ python3 /Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/branches.py preflight --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-7 --mode pr
exit: 0 (117 ms)
--- stdout
{"ok": true, "command": "preflight", "format": "sdlc/{name}", "args": {"repo": "/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-7", "mode": "pr", "branch": null}, "given": false, "derived": false, "suggestion": "", "forge": "", "rules": [], "samples": [{"kind": "slice", "name": "sdlc/S-001", "result": "unchecked", "rule": null}, {"kind": "state", "name": "sdlc/state-20261009220921", "result": "unchecked", "rule": null}, {"kind": "e2e", "name": "sdlc/M-1-e2e", "result": "unchecked", "rule": null}], "notes": []}
--- stderr

--- tree /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/cwd-8 (unchanged)
--- tree /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-7 (unchanged)
$ cd /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/cwd-10
$ python3 /Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/branches.py preflight --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-9 --mode pr
exit: 2 (40 ms)
--- stdout
{"ok": false, "error": "/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-9/.sdlc/config.json is not valid JSON: JSONDecodeError: Expecting property name enclosed in double quotes: line 1 column 3 (char 2)"}
--- stderr

--- tree /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/cwd-10 (unchanged)
--- tree /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-9 (unchanged)
```

## TC-cli-4 (VS-1): VS-1 invalid formats exit 2 with one JSON object

- Requirements: R-038
- Spec source: R-038 acceptance
- Given: A scratch git repo built by cli-runner, with the forge shims named in the test
- When: branches.py preflight runs as a real process; see the transcript
- Then: The assertions in the test hold: exit code, JSON keys, sample results, notes, and an unchanged tree
- Result: pass
- Test: `tests/cli-0/preflight.verify-cli.test.mjs:61`

```
see .sdlc/slices/S-015/verification/r0/logs/cli-0-TC-cli-4-transcript.txt
```

## TC-cli-5 (VS-1): VS-1 valid unusual formats

- Requirements: R-038
- Spec source: R-038 acceptance
- Given: A scratch git repo built by cli-runner, with the forge shims named in the test
- When: branches.py preflight runs as a real process; see the transcript
- Then: The assertions in the test hold: exit code, JSON keys, sample results, notes, and an unchanged tree
- Result: pass
- Test: `tests/cli-0/preflight.verify-cli.test.mjs:76`

```
$ cd /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/cwd-24
$ python3 /Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/branches.py preflight --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-23 --mode pr --format '{name:lower}'
exit: 0 (137 ms)
--- stdout
{"ok": true, "command": "preflight", "format": "{name:lower}", "args": {"repo": "/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-23", "mode": "pr", "branch": null}, "given": true, "derived": false, "suggestion": "", "forge": "", "rules": [], "samples": [{"kind": "slice", "name": "s-001", "result": "unchecked", "rule": null}, {"kind": "state", "name": "state-20261009220923", "result": "unchecked", "rule": null}, {"kind": "e2e", "name": "m-1-e2e", "result": "unchecked", "rule": null}], "notes": []}
--- stderr

--- tree /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/cwd-24 (unchanged)
--- tree /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-23 (unchanged)
$ cd /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/cwd-25
$ python3 /Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/branches.py preflight --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-23 --mode pr --format $'é/{name}'
exit: 0 (115 ms)
--- stdout
{"ok": true, "command": "preflight", "format": "\u00e9/{name}", "args": {"repo": "/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-23", "mode": "pr", "branch": null}, "given": true, "derived": false, "suggestion": "", "forge": "", "rules": [], "samples": [{"kind": "slice", "name": "\u00e9/S-001", "result": "unchecked", "rule": null}, {"kind": "state", "name": "\u00e9/state-20261009220923", "result": "unchecked", "rule": null}, {"kind": "e2e", "name": "\u00e9/M-1-e2e", "result": "unchecked", "rule": null}], "notes": []}
--- stderr

--- tree /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/cwd-25 (unchanged)
--- tree /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-23 (unchanged)
$ cd /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/cwd-26
$ python3 /Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/branches.py preflight --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-23 --mode pr --format 'feature/PROJ-123-{name}'
exit: 0 (124 ms)
--- stdout
{"ok": true, "command": "preflight", "format": "feature/PROJ-123-{name}", "args": {"repo": "/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-23", "mode": "pr", "branch": null}, "given": true, "derived": false, "suggestion": "", "forge": "", "rules": [], "samples": [{"kind": "slice", "name": "feature/PROJ-123-S-001", "result": "unchecked", "rule": null}, {"kind": "state", "name": "feature/PROJ-123-state-20261009220923", "result": "unchecked", "rule": null}, {"kind": "e2e", "name": "feature/PROJ-123-M-1-e2e", "result": "unchecked", "rule": null}], "notes": []}
--- stderr

--- tree /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/cwd-26 (unchanged)
--- tree /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-23 (unchanged)
$ cd /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/cwd-27
$ python3 /Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/branches.py preflight --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-23 --mode pr --format 'x/{name:lower}-y'
exit: 0 (117 ms)
--- stdout
{"ok": true, "command": "preflight", "format": "x/{name:lower}-y", "args": {"repo": "/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-23", "mode": "pr", "branch": null}, "given": true, "derived": false, "suggestion": "", "forge": "", "rules": [], "samples": [{"kind": "slice", "name": "x/s-001-y", "result": "unchecked", "rule": null}, {"kind": "state", "name": "x/state-20261009220924-y", "result": "unchecked", "rule": null}, {"kind": "e2e", "name": "x/m-1-e2e-y", "result": "unchecked", "rule": null}], "notes": []}
--- stderr

--- tree /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/cwd-27 (unchanged)
--- tree /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-23 (unchanged)
```

## TC-cli-6 (VS-2): VS-2 pr samples

- Requirements: R-039
- Spec source: R-039 acceptance
- Given: A scratch git repo built by cli-runner, with the forge shims named in the test
- When: branches.py preflight runs as a real process; see the transcript
- Then: The assertions in the test hold: exit code, JSON keys, sample results, notes, and an unchanged tree
- Result: pass
- Test: `tests/cli-0/preflight.verify-cli.test.mjs:91`

```
$ cd /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/cwd-29
$ python3 /Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/branches.py preflight --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-28 --mode pr
exit: 0 (127 ms)
--- stdout
{"ok": true, "command": "preflight", "format": "sdlc/{name}", "args": {"repo": "/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-28", "mode": "pr", "branch": null}, "given": false, "derived": false, "suggestion": "", "forge": "", "rules": [], "samples": [{"kind": "slice", "name": "sdlc/S-001", "result": "unchecked", "rule": null}, {"kind": "state", "name": "sdlc/state-20261009220924", "result": "unchecked", "rule": null}, {"kind": "e2e", "name": "sdlc/M-1-e2e", "result": "unchecked", "rule": null}], "notes": []}
--- stderr

--- tree /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/cwd-29 (unchanged)
--- tree /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-28 (unchanged)
```

## TC-cli-7 (VS-2): VS-2 stack samples

- Requirements: R-039
- Spec source: R-039 acceptance
- Given: A scratch git repo built by cli-runner, with the forge shims named in the test
- When: branches.py preflight runs as a real process; see the transcript
- Then: The assertions in the test hold: exit code, JSON keys, sample results, notes, and an unchanged tree
- Result: pass
- Test: `tests/cli-0/preflight.verify-cli.test.mjs:101`

```
$ cd /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/cwd-31
$ python3 /Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/branches.py preflight --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-30 --mode stack
exit: 0 (117 ms)
--- stdout
{"ok": true, "command": "preflight", "format": "sdlc/{name}", "args": {"repo": "/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-30", "mode": "stack", "branch": null}, "given": false, "derived": false, "suggestion": "", "forge": "", "rules": [], "samples": [{"kind": "run", "name": "sdlc/run-1", "result": "unchecked", "rule": null}, {"kind": "milestone", "name": "sdlc/M-1", "result": "unchecked", "rule": null}, {"kind": "slice", "name": "sdlc/S-001", "result": "unchecked", "rule": null}], "notes": []}
--- stderr

--- tree /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/cwd-31 (unchanged)
--- tree /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-30 (unchanged)
```

## TC-cli-8 (VS-2): VS-2 mr and direct give none

- Requirements: R-039
- Spec source: R-039 acceptance
- Given: A scratch git repo built by cli-runner, with the forge shims named in the test
- When: branches.py preflight runs as a real process; see the transcript
- Then: The assertions in the test hold: exit code, JSON keys, sample results, notes, and an unchanged tree
- Result: pass
- Test: `tests/cli-0/preflight.verify-cli.test.mjs:109`

```
$ cd /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/cwd-33
$ python3 /Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/branches.py preflight --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-32 --mode mr
exit: 0 (66 ms)
--- stdout
{"ok": true, "command": "preflight", "format": "sdlc/{name}", "args": {"repo": "/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-32", "mode": "mr", "branch": null}, "given": false, "derived": false, "suggestion": "", "forge": "", "rules": [], "samples": [], "notes": []}
--- stderr

--- tree /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/cwd-33 (unchanged)
--- tree /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-32 (unchanged)
$ cd /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/cwd-34
$ python3 /Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/branches.py preflight --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-32 --mode direct
exit: 0 (61 ms)
--- stdout
{"ok": true, "command": "preflight", "format": "sdlc/{name}", "args": {"repo": "/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-32", "mode": "direct", "branch": null}, "given": false, "derived": false, "suggestion": "", "forge": "", "rules": [], "samples": [], "notes": []}
--- stderr

--- tree /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/cwd-34 (unchanged)
--- tree /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-32 (unchanged)
```

## TC-cli-9 (VS-2): VS-2 names follow prefix and lowercase transform

- Requirements: R-039
- Spec source: R-039 acceptance
- Given: A scratch git repo built by cli-runner, with the forge shims named in the test
- When: branches.py preflight runs as a real process; see the transcript
- Then: The assertions in the test hold: exit code, JSON keys, sample results, notes, and an unchanged tree
- Result: pass
- Test: `tests/cli-0/preflight.verify-cli.test.mjs:120`

```
$ cd /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/cwd-36
$ python3 /Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/branches.py preflight --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-35 --mode pr --format 'Feat/PROJ-{name:lower}'
exit: 0 (116 ms)
--- stdout
{"ok": true, "command": "preflight", "format": "Feat/PROJ-{name:lower}", "args": {"repo": "/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-35", "mode": "pr", "branch": null}, "given": true, "derived": false, "suggestion": "", "forge": "", "rules": [], "samples": [{"kind": "slice", "name": "Feat/PROJ-s-001", "result": "unchecked", "rule": null}, {"kind": "state", "name": "Feat/PROJ-state-20261009220925", "result": "unchecked", "rule": null}, {"kind": "e2e", "name": "Feat/PROJ-m-1-e2e", "result": "unchecked", "rule": null}], "notes": []}
--- stderr

--- tree /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/cwd-36 (unchanged)
--- tree /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-35 (unchanged)
$ cd /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/cwd-37
$ python3 /Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/branches.py preflight --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-35 --mode stack --format 'feature/{name:lower}'
exit: 0 (121 ms)
--- stdout
{"ok": true, "command": "preflight", "format": "feature/{name:lower}", "args": {"repo": "/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-35", "mode": "stack", "branch": null}, "given": true, "derived": false, "suggestion": "", "forge": "", "rules": [], "samples": [{"kind": "run", "name": "feature/run-1", "result": "unchecked", "rule": null}, {"kind": "milestone", "name": "feature/m-1", "result": "unchecked", "rule": null}, {"kind": "slice", "name": "feature/s-001", "result": "unchecked", "rule": null}], "notes": []}
--- stderr

--- tree /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/cwd-37 (unchanged)
--- tree /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-35 (unchanged)
```

## TC-cli-10 (VS-2): VS-2 unknown mode and missing mode exit 2

- Requirements: R-039
- Spec source: R-039 acceptance
- Given: A scratch git repo built by cli-runner, with the forge shims named in the test
- When: branches.py preflight runs as a real process; see the transcript
- Then: The assertions in the test hold: exit code, JSON keys, sample results, notes, and an unchanged tree
- Result: pass
- Test: `tests/cli-0/preflight.verify-cli.test.mjs:131`

```
see .sdlc/slices/S-015/verification/r0/logs/cli-0-TC-cli-10-transcript.txt
```

## TC-cli-11 (VS-3): VS-3 mr adds working sample last; modes ignore it

- Requirements: R-040
- Spec source: R-040 acceptance
- Given: A scratch git repo built by cli-runner, with the forge shims named in the test
- When: branches.py preflight runs as a real process; see the transcript
- Then: The assertions in the test hold: exit code, JSON keys, sample results, notes, and an unchanged tree
- Result: pass
- Test: `tests/cli-0/preflight.verify-cli.test.mjs:142`

```
see .sdlc/slices/S-015/verification/r0/logs/cli-0-TC-cli-11-transcript.txt
```

## TC-cli-12 (VS-3): VS-3 working name is judged as given under gitlab regex

- Requirements: R-040
- Spec source: R-040 acceptance
- Given: A scratch git repo built by cli-runner, with the forge shims named in the test
- When: branches.py preflight runs as a real process; see the transcript
- Then: The assertions in the test hold: exit code, JSON keys, sample results, notes, and an unchanged tree
- Result: pass
- Test: `tests/cli-0/preflight.verify-cli.test.mjs:155`

```
$ cd /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/cwd-54
$ PATH='/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/stub-bin-z4LDLy:/Users/omar.ragab/.opencode/bin:/Users/omar.ragab/.local/bin:/Users/omar.ragab/.bun/bin:/Users/omar.ragab/.local/bin:/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/System/Cryptexes/App/usr/bin:/usr/bin:/bin:/usr/sbin:/sbin:/var/run/com.apple.security.cryptexd/codex.system/bootstrap/usr/local/bin:/var/run/com.apple.security.cryptexd/codex.system/bootstrap/usr/bin:/var/run/com.apple.security.cryptexd/codex.system/bootstrap/usr/appleinternal/bin:/pkg/env/global/bin:/opt/homebrew/bin:/Users/omar.ragab/.opencode/bin:/Users/omar.ragab/.local/bin:/Users/omar.ragab/.bun/bin:/opt/homebrew/sbin:/Applications/Ghostty.app/Contents/MacOS:/Users/omar.ragab/Library/Application Support/JetBrains/Toolbox/scripts:/Users/omar.ragab/Library/Application Support/JetBrains/Toolbox/scripts' python3 /Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/branches.py preflight --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-53 --mode mr --branch bad-name
exit: 1 (198 ms)
--- stdout
{"ok": false, "command": "preflight", "format": "sdlc/{name}", "args": {"repo": "/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-53", "mode": "mr", "branch": "bad-name"}, "given": false, "derived": false, "suggestion": "", "forge": "gitlab", "rules": [{"source": "gitlab", "kind": "regex", "pattern": "^feat/", "negate": false, "label": "push rule"}], "samples": [{"kind": "working", "name": "bad-name", "result": "fail", "rule": "push rule"}], "notes": []}
--- stderr

--- tree /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/cwd-54 (unchanged)
--- tree /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-53 (unchanged)
$ cd /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/cwd-55
$ PATH='/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/stub-bin-z4LDLy:/Users/omar.ragab/.opencode/bin:/Users/omar.ragab/.local/bin:/Users/omar.ragab/.bun/bin:/Users/omar.ragab/.local/bin:/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/System/Cryptexes/App/usr/bin:/usr/bin:/bin:/usr/sbin:/sbin:/var/run/com.apple.security.cryptexd/codex.system/bootstrap/usr/local/bin:/var/run/com.apple.security.cryptexd/codex.system/bootstrap/usr/bin:/var/run/com.apple.security.cryptexd/codex.system/bootstrap/usr/appleinternal/bin:/pkg/env/global/bin:/opt/homebrew/bin:/Users/omar.ragab/.opencode/bin:/Users/omar.ragab/.local/bin:/Users/omar.ragab/.bun/bin:/opt/homebrew/sbin:/Applications/Ghostty.app/Contents/MacOS:/Users/omar.ragab/Library/Application Support/JetBrains/Toolbox/scripts:/Users/omar.ragab/Library/Application Support/JetBrains/Toolbox/scripts' python3 /Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/branches.py preflight --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-53 --mode mr --branch feat/x
exit: 0 (107 ms)
--- stdout
{"ok": true, "command": "preflight", "format": "sdlc/{name}", "args": {"repo": "/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-53", "mode": "mr", "branch": "feat/x"}, "given": false, "derived": false, "suggestion": "", "forge": "gitlab", "rules": [{"source": "gitlab", "kind": "regex", "pattern": "^feat/", "negate": false, "label": "push rule"}], "samples": [{"kind": "working", "name": "feat/x", "result": "pass", "rule": null}], "notes": []}
--- stderr

--- tree /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/cwd-55 (unchanged)
--- tree /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-53 (unchanged)
$ cd /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/cwd-56
$ PATH='/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/stub-bin-z4LDLy:/Users/omar.ragab/.opencode/bin:/Users/omar.ragab/.local/bin:/Users/omar.ragab/.bun/bin:/Users/omar.ragab/.local/bin:/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/System/Cryptexes/App/usr/bin:/usr/bin:/bin:/usr/sbin:/sbin:/var/run/com.apple.security.cryptexd/codex.system/bootstrap/usr/local/bin:/var/run/com.apple.security.cryptexd/codex.system/bootstrap/usr/bin:/var/run/com.apple.security.cryptexd/codex.system/bootstrap/usr/appleinternal/bin:/pkg/env/global/bin:/opt/homebrew/bin:/Users/omar.ragab/.opencode/bin:/Users/omar.ragab/.local/bin:/Users/omar.ragab/.bun/bin:/opt/homebrew/sbin:/Applications/Ghostty.app/Contents/MacOS:/Users/omar.ragab/Library/Application Support/JetBrains/Toolbox/scripts:/Users/omar.ragab/Library/Application Support/JetBrains/Toolbox/scripts' python3 /Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/branches.py preflight --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-53 --mode mr --branch feat/X --format 'feat/{name:lower}'
exit: 0 (109 ms)
--- stdout
{"ok": true, "command": "preflight", "format": "feat/{name:lower}", "args": {"repo": "/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-53", "mode": "mr", "branch": "feat/X"}, "given": true, "derived": false, "suggestion": "", "forge": "gitlab", "rules": [{"source": "gitlab", "kind": "regex", "pattern": "^feat/", "negate": false, "label": "push rule"}], "samples": [{"kind": "working", "name": "feat/X", "result": "pass", "rule": null}], "notes": []}
--- stderr

--- tree /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/cwd-56 (unchanged)
--- tree /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-53 (unchanged)
```

## TC-cli-13 (VS-3): VS-3 working name equal to a slice name is not renamed

- Requirements: R-040
- Spec source: R-040 acceptance
- Given: A scratch git repo built by cli-runner, with the forge shims named in the test
- When: branches.py preflight runs as a real process; see the transcript
- Then: The assertions in the test hold: exit code, JSON keys, sample results, notes, and an unchanged tree
- Result: pass
- Test: `tests/cli-0/preflight.verify-cli.test.mjs:171`

```
$ cd /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/cwd-58
$ python3 /Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/branches.py preflight --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-57 --mode mr --branch S-001
exit: 0 (77 ms)
--- stdout
{"ok": true, "command": "preflight", "format": "feature/{name}", "args": {"repo": "/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-57", "mode": "mr", "branch": "S-001"}, "given": true, "derived": false, "suggestion": "", "forge": "", "rules": [], "samples": [{"kind": "working", "name": "S-001", "result": "unchecked", "rule": null}], "notes": []}
--- stderr

--- tree /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/cwd-58 (unchanged)
--- tree /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-57 (unchanged)
$ cd /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/cwd-59
$ python3 /Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/branches.py preflight --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-57 --mode mr --branch feature/S-001
exit: 0 (77 ms)
--- stdout
{"ok": true, "command": "preflight", "format": "feature/{name}", "args": {"repo": "/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-57", "mode": "mr", "branch": "feature/S-001"}, "given": true, "derived": false, "suggestion": "", "forge": "", "rules": [], "samples": [{"kind": "working", "name": "feature/S-001", "result": "unchecked", "rule": null}], "notes": []}
--- stderr

--- tree /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/cwd-59 (unchanged)
--- tree /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-57 (unchanged)
```

## TC-cli-14 (VS-3): VS-3 hostile working names

- Requirements: R-040
- Spec source: R-040 acceptance
- Given: A scratch git repo built by cli-runner, with the forge shims named in the test
- When: branches.py preflight runs as a real process; see the transcript
- Then: The assertions in the test hold: exit code, JSON keys, sample results, notes, and an unchanged tree
- Result: pass
- Test: `tests/cli-0/preflight.verify-cli.test.mjs:180`

```
see .sdlc/slices/S-015/verification/r0/logs/cli-0-TC-cli-14-transcript.txt
```

## TC-cli-15 (VS-3): VS-3 empty --branch value in mr mode

- Requirements: R-040
- Spec source: R-040 acceptance
- Given: A scratch git repo built by cli-runner, with the forge shims named in the test
- When: branches.py preflight runs as a real process; see the transcript
- Then: The assertions in the test hold: exit code, JSON keys, sample results, notes, and an unchanged tree
- Result: pass
- Test: `tests/cli-0/preflight.verify-cli.test.mjs:209`

```
$ cd /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/cwd-70
$ python3 /Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/branches.py preflight --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-69 --mode mr --branch ''
exit: 0 (63 ms)
--- stdout
{"ok": true, "command": "preflight", "format": "sdlc/{name}", "args": {"repo": "/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-69", "mode": "mr", "branch": ""}, "given": false, "derived": false, "suggestion": "", "forge": "", "rules": [], "samples": [], "notes": []}
--- stderr

--- tree /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/cwd-70 (unchanged)
--- tree /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-69 (unchanged)
```

## TC-cli-16 (VS-4): VS-4 no forge gives ok and unchecked

- Requirements: R-041, R-084
- Spec source: R-041 acceptance; R-084 acceptance
- Given: A scratch git repo built by cli-runner, with the forge shims named in the test
- When: branches.py preflight runs as a real process; see the transcript
- Then: The assertions in the test hold: exit code, JSON keys, sample results, notes, and an unchanged tree
- Result: pass
- Test: `tests/cli-0/preflight.verify-cli.test.mjs:217`

```
$ cd /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/cwd-74
$ python3 /Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/branches.py preflight --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-71 --mode pr
exit: 0 (113 ms)
--- stdout
{"ok": true, "command": "preflight", "format": "sdlc/{name}", "args": {"repo": "/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-71", "mode": "pr", "branch": null}, "given": false, "derived": false, "suggestion": "", "forge": "", "rules": [], "samples": [{"kind": "slice", "name": "sdlc/S-001", "result": "unchecked", "rule": null}, {"kind": "state", "name": "sdlc/state-20261009220930", "result": "unchecked", "rule": null}, {"kind": "e2e", "name": "sdlc/M-1-e2e", "result": "unchecked", "rule": null}], "notes": []}
--- stderr

--- tree /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/cwd-74 (unchanged)
--- tree /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-71 (unchanged)
```

## TC-cli-17 (VS-4): VS-4 matching rule passes; bad regex unevaluated; failing gh unchecked

- Requirements: R-041, R-084
- Spec source: R-041 acceptance; R-084 acceptance
- Given: A scratch git repo built by cli-runner, with the forge shims named in the test
- When: branches.py preflight runs as a real process; see the transcript
- Then: The assertions in the test hold: exit code, JSON keys, sample results, notes, and an unchanged tree
- Result: pass
- Test: `tests/cli-0/preflight.verify-cli.test.mjs:231`

```
$ cd /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/cwd-76
$ PATH='/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/stub-bin-1qlnPV:/Users/omar.ragab/.opencode/bin:/Users/omar.ragab/.local/bin:/Users/omar.ragab/.bun/bin:/Users/omar.ragab/.local/bin:/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/System/Cryptexes/App/usr/bin:/usr/bin:/bin:/usr/sbin:/sbin:/var/run/com.apple.security.cryptexd/codex.system/bootstrap/usr/local/bin:/var/run/com.apple.security.cryptexd/codex.system/bootstrap/usr/bin:/var/run/com.apple.security.cryptexd/codex.system/bootstrap/usr/appleinternal/bin:/pkg/env/global/bin:/opt/homebrew/bin:/Users/omar.ragab/.opencode/bin:/Users/omar.ragab/.local/bin:/Users/omar.ragab/.bun/bin:/opt/homebrew/sbin:/Applications/Ghostty.app/Contents/MacOS:/Users/omar.ragab/Library/Application Support/JetBrains/Toolbox/scripts:/Users/omar.ragab/Library/Application Support/JetBrains/Toolbox/scripts' python3 /Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/branches.py preflight --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-75 --mode pr
exit: 0 (288 ms)
--- stdout
{"ok": true, "command": "preflight", "format": "sdlc/{name}", "args": {"repo": "/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-75", "mode": "pr", "branch": null}, "given": false, "derived": false, "suggestion": "", "forge": "github", "rules": [{"source": "github", "kind": "starts_with", "pattern": "sdlc/", "negate": false, "label": "sdlc only"}], "samples": [{"kind": "slice", "name": "sdlc/S-001", "result": "pass", "rule": null}, {"kind": "state", "name": "sdlc/state-20261009220931", "result": "pass", "rule": null}, {"kind": "e2e", "name": "sdlc/M-1-e2e", "result": "pass", "rule": null}], "notes": []}
--- stderr

--- tree /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/cwd-76 (unchanged)
--- tree /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-75 (unchanged)
$ cd /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/cwd-77
$ PATH='/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/stub-bin-pa7sme:/Users/omar.ragab/.opencode/bin:/Users/omar.ragab/.local/bin:/Users/omar.ragab/.bun/bin:/Users/omar.ragab/.local/bin:/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/System/Cryptexes/App/usr/bin:/usr/bin:/bin:/usr/sbin:/sbin:/var/run/com.apple.security.cryptexd/codex.system/bootstrap/usr/local/bin:/var/run/com.apple.security.cryptexd/codex.system/bootstrap/usr/bin:/var/run/com.apple.security.cryptexd/codex.system/bootstrap/usr/appleinternal/bin:/pkg/env/global/bin:/opt/homebrew/bin:/Users/omar.ragab/.opencode/bin:/Users/omar.ragab/.local/bin:/Users/omar.ragab/.bun/bin:/opt/homebrew/sbin:/Applications/Ghostty.app/Contents/MacOS:/Users/omar.ragab/Library/Application Support/JetBrains/Toolbox/scripts:/Users/omar.ragab/Library/Application Support/JetBrains/Toolbox/scripts' python3 /Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/branches.py preflight --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-75 --mode pr
exit: 0 (276 ms)
--- stdout
{"ok": true, "command": "preflight", "format": "sdlc/{name}", "args": {"repo": "/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-75", "mode": "pr", "branch": null}, "given": false, "derived": false, "suggestion": "", "forge": "github", "rules": [{"source": "github", "kind": "regex", "pattern": "(unclosed", "negate": false, "label": "broken"}], "samples": [{"kind": "slice", "name": "sdlc/S-001", "result": "unevaluated", "rule": null}, {"kind": "state", "name": "sdlc/state-20261009220931", "result": "unevaluated", "rule": null}, {"kind": "e2e", "name": "sdlc/M-1-e2e", "result": "unevaluated", "rule": null}], "notes": ["cannot evaluate broken: missing ), unterminated subpattern at position 0"]}
--- stderr

--- tree /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/cwd-77 (unchanged)
--- tree /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-75 (unchanged)
$ cd /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/cwd-78
$ PATH='/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/stub-bin-hSvW8I:/Users/omar.ragab/.opencode/bin:/Users/omar.ragab/.local/bin:/Users/omar.ragab/.bun/bin:/Users/omar.ragab/.local/bin:/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/System/Cryptexes/App/usr/bin:/usr/bin:/bin:/usr/sbin:/sbin:/var/run/com.apple.security.cryptexd/codex.system/bootstrap/usr/local/bin:/var/run/com.apple.security.cryptexd/codex.system/bootstrap/usr/bin:/var/run/com.apple.security.cryptexd/codex.system/bootstrap/usr/appleinternal/bin:/pkg/env/global/bin:/opt/homebrew/bin:/Users/omar.ragab/.opencode/bin:/Users/omar.ragab/.local/bin:/Users/omar.ragab/.bun/bin:/opt/homebrew/sbin:/Applications/Ghostty.app/Contents/MacOS:/Users/omar.ragab/Library/Application Support/JetBrains/Toolbox/scripts:/Users/omar.ragab/Library/Application Support/JetBrains/Toolbox/scripts' python3 /Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/branches.py preflight --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-75 --mode pr
exit: 0 (235 ms)
--- stdout
{"ok": true, "command": "preflight", "format": "sdlc/{name}", "args": {"repo": "/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-75", "mode": "pr", "branch": null}, "given": false, "derived": false, "suggestion": "", "forge": "github", "rules": [], "samples": [{"kind": "slice", "name": "sdlc/S-001", "result": "unchecked", "rule": null}, {"kind": "state", "name": "sdlc/state-20261009220931", "result": "unchecked", "rule": null}, {"kind": "e2e", "name": "sdlc/M-1-e2e", "result": "unchecked", "rule": null}], "notes": ["rules unknown on github: HTTP 401: not signed in"]}
--- stderr

--- tree /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/cwd-78 (unchanged)
--- tree /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-75 (unchanged)
```

## TC-cli-18 (VS-4): VS-4 gh garbage, empty, non-list JSON, gh timeout-free failure variants never block

- Requirements: R-041, R-084
- Spec source: R-041 acceptance; R-084 acceptance
- Given: A scratch git repo built by cli-runner, with the forge shims named in the test
- When: branches.py preflight runs as a real process; see the transcript
- Then: The assertions in the test hold: exit code, JSON keys, sample results, notes, and an unchanged tree
- Result: pass
- Test: `tests/cli-0/preflight.verify-cli.test.mjs:253`

```
see .sdlc/slices/S-015/verification/r0/logs/cli-0-TC-cli-18-transcript.txt
```

## TC-cli-19 (VS-4): VS-4 gitlab null body, empty regex, glab failure

- Requirements: R-041, R-084
- Spec source: R-041 acceptance; R-084 acceptance
- Given: A scratch git repo built by cli-runner, with the forge shims named in the test
- When: branches.py preflight runs as a real process; see the transcript
- Then: The assertions in the test hold: exit code, JSON keys, sample results, notes, and an unchanged tree
- Result: pass
- Test: `tests/cli-0/preflight.verify-cli.test.mjs:280`

```
$ cd /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/cwd-90
$ PATH='/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/stub-bin-Y45fG0:/Users/omar.ragab/.opencode/bin:/Users/omar.ragab/.local/bin:/Users/omar.ragab/.bun/bin:/Users/omar.ragab/.local/bin:/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/System/Cryptexes/App/usr/bin:/usr/bin:/bin:/usr/sbin:/sbin:/var/run/com.apple.security.cryptexd/codex.system/bootstrap/usr/local/bin:/var/run/com.apple.security.cryptexd/codex.system/bootstrap/usr/bin:/var/run/com.apple.security.cryptexd/codex.system/bootstrap/usr/appleinternal/bin:/pkg/env/global/bin:/opt/homebrew/bin:/Users/omar.ragab/.opencode/bin:/Users/omar.ragab/.local/bin:/Users/omar.ragab/.bun/bin:/opt/homebrew/sbin:/Applications/Ghostty.app/Contents/MacOS:/Users/omar.ragab/Library/Application Support/JetBrains/Toolbox/scripts:/Users/omar.ragab/Library/Application Support/JetBrains/Toolbox/scripts' python3 /Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/branches.py preflight --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-89 --mode mr --branch work
exit: 0 (296 ms)
--- stdout
{"ok": true, "command": "preflight", "format": "sdlc/{name}", "args": {"repo": "/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-89", "mode": "mr", "branch": "work"}, "given": false, "derived": false, "suggestion": "", "forge": "gitlab", "rules": [], "samples": [{"kind": "working", "name": "work", "result": "pass", "rule": null}], "notes": []}
--- stderr

--- tree /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/cwd-90 (unchanged)
--- tree /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-89 (unchanged)
$ cd /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/cwd-91
$ PATH='/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/stub-bin-b47kmq:/Users/omar.ragab/.opencode/bin:/Users/omar.ragab/.local/bin:/Users/omar.ragab/.bun/bin:/Users/omar.ragab/.local/bin:/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/System/Cryptexes/App/usr/bin:/usr/bin:/bin:/usr/sbin:/sbin:/var/run/com.apple.security.cryptexd/codex.system/bootstrap/usr/local/bin:/var/run/com.apple.security.cryptexd/codex.system/bootstrap/usr/bin:/var/run/com.apple.security.cryptexd/codex.system/bootstrap/usr/appleinternal/bin:/pkg/env/global/bin:/opt/homebrew/bin:/Users/omar.ragab/.opencode/bin:/Users/omar.ragab/.local/bin:/Users/omar.ragab/.bun/bin:/opt/homebrew/sbin:/Applications/Ghostty.app/Contents/MacOS:/Users/omar.ragab/Library/Application Support/JetBrains/Toolbox/scripts:/Users/omar.ragab/Library/Application Support/JetBrains/Toolbox/scripts' python3 /Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/branches.py preflight --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-89 --mode mr --branch work
exit: 0 (234 ms)
--- stdout
{"ok": true, "command": "preflight", "format": "sdlc/{name}", "args": {"repo": "/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-89", "mode": "mr", "branch": "work"}, "given": false, "derived": false, "suggestion": "", "forge": "gitlab", "rules": [], "samples": [{"kind": "working", "name": "work", "result": "pass", "rule": null}], "notes": []}
--- stderr

--- tree /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/cwd-91 (unchanged)
--- tree /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-89 (unchanged)
$ cd /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/cwd-92
$ PATH='/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/stub-bin-dH8424:/Users/omar.ragab/.opencode/bin:/Users/omar.ragab/.local/bin:/Users/omar.ragab/.bun/bin:/Users/omar.ragab/.local/bin:/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/System/Cryptexes/App/usr/bin:/usr/bin:/bin:/usr/sbin:/sbin:/var/run/com.apple.security.cryptexd/codex.system/bootstrap/usr/local/bin:/var/run/com.apple.security.cryptexd/codex.system/bootstrap/usr/bin:/var/run/com.apple.security.cryptexd/codex.system/bootstrap/usr/appleinternal/bin:/pkg/env/global/bin:/opt/homebrew/bin:/Users/omar.ragab/.opencode/bin:/Users/omar.ragab/.local/bin:/Users/omar.ragab/.bun/bin:/opt/homebrew/sbin:/Applications/Ghostty.app/Contents/MacOS:/Users/omar.ragab/Library/Application Support/JetBrains/Toolbox/scripts:/Users/omar.ragab/Library/Application Support/JetBrains/Toolbox/scripts' python3 /Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/branches.py preflight --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-89 --mode mr --branch work
exit: 0 (189 ms)
--- stdout
{"ok": true, "command": "preflight", "format": "sdlc/{name}", "args": {"repo": "/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-89", "mode": "mr", "branch": "work"}, "given": false, "derived": false, "suggestion": "", "forge": "gitlab", "rules": [{"source": "gitlab", "kind": "regex", "pattern": "[", "negate": false, "label": "push rule"}], "samples": [{"kind": "working", "name": "work", "result": "unevaluated", "rule": null}], "notes": ["cannot evaluate push rule: unterminated character set at position 0"]}
--- stderr

--- tree /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/cwd-92 (unchanged)
--- tree /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-89 (unchanged)
$ cd /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/cwd-93
$ PATH='/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/stub-bin-uSzZUC:/Users/omar.ragab/.opencode/bin:/Users/omar.ragab/.local/bin:/Users/omar.ragab/.bun/bin:/Users/omar.ragab/.local/bin:/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/System/Cryptexes/App/usr/bin:/usr/bin:/bin:/usr/sbin:/sbin:/var/run/com.apple.security.cryptexd/codex.system/bootstrap/usr/local/bin:/var/run/com.apple.security.cryptexd/codex.system/bootstrap/usr/bin:/var/run/com.apple.security.cryptexd/codex.system/bootstrap/usr/appleinternal/bin:/pkg/env/global/bin:/opt/homebrew/bin:/Users/omar.ragab/.opencode/bin:/Users/omar.ragab/.local/bin:/Users/omar.ragab/.bun/bin:/opt/homebrew/sbin:/Applications/Ghostty.app/Contents/MacOS:/Users/omar.ragab/Library/Application Support/JetBrains/Toolbox/scripts:/Users/omar.ragab/Library/Application Support/JetBrains/Toolbox/scripts' python3 /Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/branches.py preflight --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-89 --mode mr --branch work
exit: 0 (204 ms)
--- stdout
{"ok": true, "command": "preflight", "format": "sdlc/{name}", "args": {"repo": "/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-89", "mode": "mr", "branch": "work"}, "given": false, "derived": false, "suggestion": "", "forge": "gitlab", "rules": [], "samples": [{"kind": "working", "name": "work", "result": "unchecked", "rule": null}], "notes": ["rules unknown on gitlab: 401 Unauthorized"]}
--- stderr

--- tree /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/cwd-93 (unchanged)
--- tree /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-89 (unchanged)
```

## TC-cli-20 (VS-5): VS-5 output keys, exit 1, one JSON object

- Requirements: R-044
- Spec source: R-044 acceptance
- Given: A scratch git repo built by cli-runner, with the forge shims named in the test
- When: branches.py preflight runs as a real process; see the transcript
- Then: The assertions in the test hold: exit code, JSON keys, sample results, notes, and an unchanged tree
- Result: pass
- Test: `tests/cli-0/preflight.verify-cli.test.mjs:296`

```
$ cd /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/cwd-95
$ PATH='/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/stub-bin-51NWXk:/Users/omar.ragab/.opencode/bin:/Users/omar.ragab/.local/bin:/Users/omar.ragab/.bun/bin:/Users/omar.ragab/.local/bin:/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/System/Cryptexes/App/usr/bin:/usr/bin:/bin:/usr/sbin:/sbin:/var/run/com.apple.security.cryptexd/codex.system/bootstrap/usr/local/bin:/var/run/com.apple.security.cryptexd/codex.system/bootstrap/usr/bin:/var/run/com.apple.security.cryptexd/codex.system/bootstrap/usr/appleinternal/bin:/pkg/env/global/bin:/opt/homebrew/bin:/Users/omar.ragab/.opencode/bin:/Users/omar.ragab/.local/bin:/Users/omar.ragab/.bun/bin:/opt/homebrew/sbin:/Applications/Ghostty.app/Contents/MacOS:/Users/omar.ragab/Library/Application Support/JetBrains/Toolbox/scripts:/Users/omar.ragab/Library/Application Support/JetBrains/Toolbox/scripts' python3 /Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/branches.py preflight --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-94 --mode pr
exit: 1 (245 ms)
--- stdout
{"ok": false, "command": "preflight", "format": "sdlc/{name}", "args": {"repo": "/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-94", "mode": "pr", "branch": null}, "given": false, "derived": false, "suggestion": "", "forge": "github", "rules": [{"source": "github", "kind": "starts_with", "pattern": "feature/", "negate": false, "label": "feature branches"}], "samples": [{"kind": "slice", "name": "sdlc/S-001", "result": "fail", "rule": "feature branches"}, {"kind": "state", "name": "sdlc/state-20261009220936", "result": "fail", "rule": "feature branches"}, {"kind": "e2e", "name": "sdlc/M-1-e2e", "result": "fail", "rule": "feature branches"}], "notes": []}
--- stderr

--- tree /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/cwd-95 (unchanged)
--- tree /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-94 (unchanged)
```

## TC-cli-21 (VS-5): VS-5 first failing rule label, later failing rules ignored; passing sample rule null

- Requirements: R-044
- Spec source: R-044 acceptance
- Given: A scratch git repo built by cli-runner, with the forge shims named in the test
- When: branches.py preflight runs as a real process; see the transcript
- Then: The assertions in the test hold: exit code, JSON keys, sample results, notes, and an unchanged tree
- Result: pass
- Test: `tests/cli-0/preflight.verify-cli.test.mjs:318`

```
$ cd /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/cwd-97
$ PATH='/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/stub-bin-AYHTIx:/Users/omar.ragab/.opencode/bin:/Users/omar.ragab/.local/bin:/Users/omar.ragab/.bun/bin:/Users/omar.ragab/.local/bin:/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/System/Cryptexes/App/usr/bin:/usr/bin:/bin:/usr/sbin:/sbin:/var/run/com.apple.security.cryptexd/codex.system/bootstrap/usr/local/bin:/var/run/com.apple.security.cryptexd/codex.system/bootstrap/usr/bin:/var/run/com.apple.security.cryptexd/codex.system/bootstrap/usr/appleinternal/bin:/pkg/env/global/bin:/opt/homebrew/bin:/Users/omar.ragab/.opencode/bin:/Users/omar.ragab/.local/bin:/Users/omar.ragab/.bun/bin:/opt/homebrew/sbin:/Applications/Ghostty.app/Contents/MacOS:/Users/omar.ragab/Library/Application Support/JetBrains/Toolbox/scripts:/Users/omar.ragab/Library/Application Support/JetBrains/Toolbox/scripts' python3 /Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/branches.py preflight --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-96 --mode pr
exit: 1 (259 ms)
--- stdout
{"ok": false, "command": "preflight", "format": "sdlc/{name}", "args": {"repo": "/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-96", "mode": "pr", "branch": null}, "given": false, "derived": false, "suggestion": "", "forge": "github", "rules": [{"source": "github", "kind": "starts_with", "pattern": "zzz/", "negate": false, "label": "first"}, {"source": "github", "kind": "ends_with", "pattern": "!!", "negate": false, "label": "second"}, {"source": "github", "kind": "starts_with", "pattern": "sdlc/", "negate": false, "label": "fine"}], "samples": [{"kind": "slice", "name": "sdlc/S-001", "result": "fail", "rule": "first"}, {"kind": "state", "name": "sdlc/state-20261009220937", "result": "pass", "rule": null}, {"kind": "e2e", "name": "sdlc/M-1-e2e", "result": "fail", "rule": "first"}], "notes": []}
--- stderr

--- tree /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/cwd-97 (unchanged)
--- tree /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-96 (unchanged)
```

## TC-cli-22 (VS-5): VS-5 negate rule and contains

- Requirements: R-044
- Spec source: R-044 acceptance
- Given: A scratch git repo built by cli-runner, with the forge shims named in the test
- When: branches.py preflight runs as a real process; see the transcript
- Then: The assertions in the test hold: exit code, JSON keys, sample results, notes, and an unchanged tree
- Result: pass
- Test: `tests/cli-0/preflight.verify-cli.test.mjs:330`

```
$ cd /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/cwd-99
$ PATH='/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/stub-bin-CuroBo:/Users/omar.ragab/.opencode/bin:/Users/omar.ragab/.local/bin:/Users/omar.ragab/.bun/bin:/Users/omar.ragab/.local/bin:/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/System/Cryptexes/App/usr/bin:/usr/bin:/bin:/usr/sbin:/sbin:/var/run/com.apple.security.cryptexd/codex.system/bootstrap/usr/local/bin:/var/run/com.apple.security.cryptexd/codex.system/bootstrap/usr/bin:/var/run/com.apple.security.cryptexd/codex.system/bootstrap/usr/appleinternal/bin:/pkg/env/global/bin:/opt/homebrew/bin:/Users/omar.ragab/.opencode/bin:/Users/omar.ragab/.local/bin:/Users/omar.ragab/.bun/bin:/opt/homebrew/sbin:/Applications/Ghostty.app/Contents/MacOS:/Users/omar.ragab/Library/Application Support/JetBrains/Toolbox/scripts:/Users/omar.ragab/Library/Application Support/JetBrains/Toolbox/scripts' python3 /Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/branches.py preflight --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-98 --mode stack
exit: 1 (242 ms)
--- stdout
{"ok": false, "command": "preflight", "format": "sdlc/{name}", "args": {"repo": "/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-98", "mode": "stack", "branch": null}, "given": false, "derived": false, "suggestion": "", "forge": "github", "rules": [{"source": "github", "kind": "contains", "pattern": "sdlc", "negate": true, "label": "no sdlc"}], "samples": [{"kind": "run", "name": "sdlc/run-1", "result": "fail", "rule": "no sdlc"}, {"kind": "milestone", "name": "sdlc/M-1", "result": "fail", "rule": "no sdlc"}, {"kind": "slice", "name": "sdlc/S-001", "result": "fail", "rule": "no sdlc"}], "notes": []}
--- stderr

--- tree /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/cwd-99 (unchanged)
--- tree /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-98 (unchanged)
```

## TC-cli-23 (VS-5): VS-5 exit codes 0, 1, 2 for the same repo

- Requirements: R-044
- Spec source: R-044 acceptance
- Given: A scratch git repo built by cli-runner, with the forge shims named in the test
- When: branches.py preflight runs as a real process; see the transcript
- Then: The assertions in the test hold: exit code, JSON keys, sample results, notes, and an unchanged tree
- Result: pass
- Test: `tests/cli-0/preflight.verify-cli.test.mjs:340`

```
$ cd /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/cwd-101
$ PATH='/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/stub-bin-oRrGt9:/Users/omar.ragab/.opencode/bin:/Users/omar.ragab/.local/bin:/Users/omar.ragab/.bun/bin:/Users/omar.ragab/.local/bin:/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/System/Cryptexes/App/usr/bin:/usr/bin:/bin:/usr/sbin:/sbin:/var/run/com.apple.security.cryptexd/codex.system/bootstrap/usr/local/bin:/var/run/com.apple.security.cryptexd/codex.system/bootstrap/usr/bin:/var/run/com.apple.security.cryptexd/codex.system/bootstrap/usr/appleinternal/bin:/pkg/env/global/bin:/opt/homebrew/bin:/Users/omar.ragab/.opencode/bin:/Users/omar.ragab/.local/bin:/Users/omar.ragab/.bun/bin:/opt/homebrew/sbin:/Applications/Ghostty.app/Contents/MacOS:/Users/omar.ragab/Library/Application Support/JetBrains/Toolbox/scripts:/Users/omar.ragab/Library/Application Support/JetBrains/Toolbox/scripts' python3 /Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/branches.py preflight --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-100 --mode pr
exit: 1 (248 ms)
--- stdout
{"ok": false, "command": "preflight", "format": "sdlc/{name}", "args": {"repo": "/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-100", "mode": "pr", "branch": null}, "given": false, "derived": false, "suggestion": "", "forge": "github", "rules": [{"source": "github", "kind": "starts_with", "pattern": "feature/", "negate": false, "label": "f"}], "samples": [{"kind": "slice", "name": "sdlc/S-001", "result": "fail", "rule": "f"}, {"kind": "state", "name": "sdlc/state-20261009220937", "result": "fail", "rule": "f"}, {"kind": "e2e", "name": "sdlc/M-1-e2e", "result": "fail", "rule": "f"}], "notes": []}
--- stderr

--- tree /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/cwd-101 (unchanged)
--- tree /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-100 (unchanged)
$ cd /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/cwd-102
$ PATH='/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/stub-bin-oRrGt9:/Users/omar.ragab/.opencode/bin:/Users/omar.ragab/.local/bin:/Users/omar.ragab/.bun/bin:/Users/omar.ragab/.local/bin:/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/System/Cryptexes/App/usr/bin:/usr/bin:/bin:/usr/sbin:/sbin:/var/run/com.apple.security.cryptexd/codex.system/bootstrap/usr/local/bin:/var/run/com.apple.security.cryptexd/codex.system/bootstrap/usr/bin:/var/run/com.apple.security.cryptexd/codex.system/bootstrap/usr/appleinternal/bin:/pkg/env/global/bin:/opt/homebrew/bin:/Users/omar.ragab/.opencode/bin:/Users/omar.ragab/.local/bin:/Users/omar.ragab/.bun/bin:/opt/homebrew/sbin:/Applications/Ghostty.app/Contents/MacOS:/Users/omar.ragab/Library/Application Support/JetBrains/Toolbox/scripts:/Users/omar.ragab/Library/Application Support/JetBrains/Toolbox/scripts' python3 /Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/branches.py preflight --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-100 --mode pr --format 'feature/{name}'
exit: 0 (192 ms)
--- stdout
{"ok": true, "command": "preflight", "format": "feature/{name}", "args": {"repo": "/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-100", "mode": "pr", "branch": null}, "given": true, "derived": false, "suggestion": "", "forge": "github", "rules": [{"source": "github", "kind": "starts_with", "pattern": "feature/", "negate": false, "label": "f"}], "samples": [{"kind": "slice", "name": "feature/S-001", "result": "pass", "rule": null}, {"kind": "state", "name": "feature/state-20261009220938", "result": "pass", "rule": null}, {"kind": "e2e", "name": "feature/M-1-e2e", "result": "pass", "rule": null}], "notes": []}
--- stderr

--- tree /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/cwd-102 (unchanged)
--- tree /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-100 (unchanged)
$ cd /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/cwd-103
$ PATH='/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/stub-bin-oRrGt9:/Users/omar.ragab/.opencode/bin:/Users/omar.ragab/.local/bin:/Users/omar.ragab/.bun/bin:/Users/omar.ragab/.local/bin:/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/System/Cryptexes/App/usr/bin:/usr/bin:/bin:/usr/sbin:/sbin:/var/run/com.apple.security.cryptexd/codex.system/bootstrap/usr/local/bin:/var/run/com.apple.security.cryptexd/codex.system/bootstrap/usr/bin:/var/run/com.apple.security.cryptexd/codex.system/bootstrap/usr/appleinternal/bin:/pkg/env/global/bin:/opt/homebrew/bin:/Users/omar.ragab/.opencode/bin:/Users/omar.ragab/.local/bin:/Users/omar.ragab/.bun/bin:/opt/homebrew/sbin:/Applications/Ghostty.app/Contents/MacOS:/Users/omar.ragab/Library/Application Support/JetBrains/Toolbox/scripts:/Users/omar.ragab/Library/Application Support/JetBrains/Toolbox/scripts' python3 /Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/branches.py preflight --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-100 --mode nope
exit: 2 (42 ms)
--- stdout
{"ok": false, "error": "--mode 'nope' is not one of pr, direct, mr, stack"}
--- stderr

--- tree /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/cwd-103 (unchanged)
--- tree /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-100 (unchanged)
```

## TC-cli-24 (VS-5): VS-5 exit 1 only from preflight; other commands exit 0 on ok:true

- Requirements: R-044
- Spec source: R-044 acceptance
- Given: A scratch git repo built by cli-runner, with the forge shims named in the test
- When: branches.py preflight runs as a real process; see the transcript
- Then: The assertions in the test hold: exit code, JSON keys, sample results, notes, and an unchanged tree
- Result: pass
- Test: `tests/cli-0/preflight.verify-cli.test.mjs:352`

```
$ cd /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/cwd-105
$ python3 /Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/branches.py name --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-104 --kind slice --id S-001
exit: 0 (61 ms)
--- stdout
{"ok": true, "command": "name", "format": "sdlc/{name}", "kind": "slice", "branch": "sdlc/S-001"}
--- stderr

--- tree /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/cwd-105 (unchanged)
--- tree /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-104 (unchanged)
$ cd /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/cwd-106
$ python3 /Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/branches.py parse --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-104 --branch zzz
exit: 0 (60 ms)
--- stdout
{"ok": true, "command": "parse", "format": "sdlc/{name}", "branch": "zzz", "kind": null}
--- stderr

--- tree /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/cwd-106 (unchanged)
--- tree /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-104 (unchanged)
$ cd /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/cwd-107
$ python3 /Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/branches.py list --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-104 --kind slice
exit: 0 (100 ms)
--- stdout
{"ok": true, "command": "list", "format": "sdlc/{name}", "kind": "slice", "branches": []}
--- stderr

--- tree /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/cwd-107 (unchanged)
--- tree /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-104 (unchanged)
```

## TC-cli-25 (VS-5): VS-5 repo path with space and unicode; missing repo; non-git dir

- Requirements: R-044
- Spec source: R-044 acceptance
- Given: A scratch git repo built by cli-runner, with the forge shims named in the test
- When: branches.py preflight runs as a real process; see the transcript
- Then: The assertions in the test hold: exit code, JSON keys, sample results, notes, and an unchanged tree
- Result: pass
- Test: `tests/cli-0/preflight.verify-cli.test.mjs:361`

```
$ cd /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/cwd-109
$ python3 /Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/branches.py preflight --repo $'/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/my répo ü-108' --mode pr
exit: 0 (116 ms)
--- stdout
{"ok": true, "command": "preflight", "format": "sdlc/{name}", "args": {"repo": "/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/my r\u00e9po \u00fc-108", "mode": "pr", "branch": null}, "given": false, "derived": false, "suggestion": "", "forge": "", "rules": [], "samples": [{"kind": "slice", "name": "sdlc/S-001", "result": "unchecked", "rule": null}, {"kind": "state", "name": "sdlc/state-20261009220939", "result": "unchecked", "rule": null}, {"kind": "e2e", "name": "sdlc/M-1-e2e", "result": "unchecked", "rule": null}], "notes": []}
--- stderr

--- tree /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/cwd-109 (unchanged)
--- tree /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/my répo ü-108 (unchanged)
$ cd /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/cwd-110
$ python3 /Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/branches.py preflight --repo /nonexistent/path/xyz --mode pr
exit: 2 (49 ms)
--- stdout
{"ok": false, "error": "--repo '/nonexistent/path/xyz' is not a directory"}
--- stderr

--- tree /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/cwd-110 (unchanged)
$ cd /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/cwd-112
$ python3 /Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/branches.py preflight --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/plain-111 --mode pr
exit: 0 (119 ms)
--- stdout
{"ok": true, "command": "preflight", "format": "sdlc/{name}", "args": {"repo": "/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/plain-111", "mode": "pr", "branch": null}, "given": false, "derived": false, "suggestion": "", "forge": "", "rules": [], "samples": [{"kind": "slice", "name": "sdlc/S-001", "result": "unchecked", "rule": null}, {"kind": "state", "name": "sdlc/state-20261009220939", "result": "unchecked", "rule": null}, {"kind": "e2e", "name": "sdlc/M-1-e2e", "result": "unchecked", "rule": null}], "notes": []}
--- stderr

--- tree /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/cwd-112 (unchanged)
--- tree /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/plain-111 (unchanged)
```

## TC-cli-26 (VS-5): VS-5 twice gives the same verdict and leaves tree unchanged

- Requirements: R-044
- Spec source: R-044 acceptance
- Given: A scratch git repo built by cli-runner, with the forge shims named in the test
- When: branches.py preflight runs as a real process; see the transcript
- Then: The assertions in the test hold: exit code, JSON keys, sample results, notes, and an unchanged tree
- Result: pass
- Test: `tests/cli-0/preflight.verify-cli.test.mjs:374`

```
$ cd /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/cwd-114
$ PATH='/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/stub-bin-pi3O5i:/Users/omar.ragab/.opencode/bin:/Users/omar.ragab/.local/bin:/Users/omar.ragab/.bun/bin:/Users/omar.ragab/.local/bin:/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/System/Cryptexes/App/usr/bin:/usr/bin:/bin:/usr/sbin:/sbin:/var/run/com.apple.security.cryptexd/codex.system/bootstrap/usr/local/bin:/var/run/com.apple.security.cryptexd/codex.system/bootstrap/usr/bin:/var/run/com.apple.security.cryptexd/codex.system/bootstrap/usr/appleinternal/bin:/pkg/env/global/bin:/opt/homebrew/bin:/Users/omar.ragab/.opencode/bin:/Users/omar.ragab/.local/bin:/Users/omar.ragab/.bun/bin:/opt/homebrew/sbin:/Applications/Ghostty.app/Contents/MacOS:/Users/omar.ragab/Library/Application Support/JetBrains/Toolbox/scripts:/Users/omar.ragab/Library/Application Support/JetBrains/Toolbox/scripts' python3 /Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/branches.py preflight --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-113 --mode mr --branch x
exit: 1 (194 ms)
--- stdout
{"ok": false, "command": "preflight", "format": "sdlc/{name}", "args": {"repo": "/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-113", "mode": "mr", "branch": "x"}, "given": false, "derived": false, "suggestion": "", "forge": "gitlab", "rules": [{"source": "gitlab", "kind": "regex", "pattern": "^feat/", "negate": false, "label": "push rule"}], "samples": [{"kind": "working", "name": "x", "result": "fail", "rule": "push rule"}], "notes": []}
--- stderr

--- tree /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/cwd-114 (unchanged)
--- tree /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-113 (unchanged)
$ cd /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/cwd-115
$ PATH='/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/stub-bin-pi3O5i:/Users/omar.ragab/.opencode/bin:/Users/omar.ragab/.local/bin:/Users/omar.ragab/.bun/bin:/Users/omar.ragab/.local/bin:/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/System/Cryptexes/App/usr/bin:/usr/bin:/bin:/usr/sbin:/sbin:/var/run/com.apple.security.cryptexd/codex.system/bootstrap/usr/local/bin:/var/run/com.apple.security.cryptexd/codex.system/bootstrap/usr/bin:/var/run/com.apple.security.cryptexd/codex.system/bootstrap/usr/appleinternal/bin:/pkg/env/global/bin:/opt/homebrew/bin:/Users/omar.ragab/.opencode/bin:/Users/omar.ragab/.local/bin:/Users/omar.ragab/.bun/bin:/opt/homebrew/sbin:/Applications/Ghostty.app/Contents/MacOS:/Users/omar.ragab/Library/Application Support/JetBrains/Toolbox/scripts:/Users/omar.ragab/Library/Application Support/JetBrains/Toolbox/scripts' python3 /Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/branches.py preflight --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-113 --mode mr --branch x
exit: 1 (88 ms)
--- stdout
{"ok": false, "command": "preflight", "format": "sdlc/{name}", "args": {"repo": "/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-113", "mode": "mr", "branch": "x"}, "given": false, "derived": false, "suggestion": "", "forge": "gitlab", "rules": [{"source": "gitlab", "kind": "regex", "pattern": "^feat/", "negate": false, "label": "push rule"}], "samples": [{"kind": "working", "name": "x", "result": "fail", "rule": "push rule"}], "notes": []}
--- stderr

--- tree /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/cwd-115 (unchanged)
--- tree /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-113 (unchanged)
```

## TC-cli-27 (VS-5): VS-5 CI env and no tty

- Requirements: R-044
- Spec source: R-044 acceptance
- Given: A scratch git repo built by cli-runner, with the forge shims named in the test
- When: branches.py preflight runs as a real process; see the transcript
- Then: The assertions in the test hold: exit code, JSON keys, sample results, notes, and an unchanged tree
- Result: pass
- Test: `tests/cli-0/preflight.verify-cli.test.mjs:384`

```
$ cd /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/cwd-117
$ CI=true LANG=C LC_ALL=C GH_PROMPT_DISABLED=<unset> python3 /Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/branches.py preflight --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-116 --mode pr
exit: 0 (114 ms)
--- stdout
{"ok": true, "command": "preflight", "format": "sdlc/{name}", "args": {"repo": "/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-116", "mode": "pr", "branch": null}, "given": false, "derived": false, "suggestion": "", "forge": "", "rules": [], "samples": [{"kind": "slice", "name": "sdlc/S-001", "result": "unchecked", "rule": null}, {"kind": "state", "name": "sdlc/state-20261009220940", "result": "unchecked", "rule": null}, {"kind": "e2e", "name": "sdlc/M-1-e2e", "result": "unchecked", "rule": null}], "notes": []}
--- stderr

--- tree /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/cwd-117 (unchanged)
--- tree /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-116 (unchanged)
```

## TC-cli-28 (VS-6): VS-6 a..b fails with git check-ref-format with no forge

- Requirements: R-044, R-040
- Spec source: R-044 quote and spec section 3 (git check-ref-format)
- Given: A scratch git repo built by cli-runner, with the forge shims named in the test
- When: branches.py preflight runs as a real process; see the transcript
- Then: The assertions in the test hold: exit code, JSON keys, sample results, notes, and an unchanged tree
- Result: pass
- Test: `tests/cli-0/preflight.verify-cli.test.mjs:391`

```
$ cd /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/cwd-119
$ python3 /Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/branches.py preflight --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-118 --mode mr --branch a..b
exit: 1 (79 ms)
--- stdout
{"ok": false, "command": "preflight", "format": "sdlc/{name}", "args": {"repo": "/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-118", "mode": "mr", "branch": "a..b"}, "given": false, "derived": false, "suggestion": "", "forge": "", "rules": [], "samples": [{"kind": "working", "name": "a..b", "result": "fail", "rule": "git check-ref-format"}], "notes": []}
--- stderr

--- tree /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/cwd-119 (unchanged)
--- tree /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-118 (unchanged)
```

## TC-cli-29 (VS-6): VS-6 a..b fails with rules present; other samples keep their result (stack has no working)

- Requirements: R-044, R-040
- Spec source: R-044 quote and spec section 3 (git check-ref-format)
- Given: A scratch git repo built by cli-runner, with the forge shims named in the test
- When: branches.py preflight runs as a real process; see the transcript
- Then: The assertions in the test hold: exit code, JSON keys, sample results, notes, and an unchanged tree
- Result: pass
- Test: `tests/cli-0/preflight.verify-cli.test.mjs:400`

```
$ cd /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/cwd-121
$ PATH='/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/stub-bin-85B5uV:/Users/omar.ragab/.opencode/bin:/Users/omar.ragab/.local/bin:/Users/omar.ragab/.bun/bin:/Users/omar.ragab/.local/bin:/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/System/Cryptexes/App/usr/bin:/usr/bin:/bin:/usr/sbin:/sbin:/var/run/com.apple.security.cryptexd/codex.system/bootstrap/usr/local/bin:/var/run/com.apple.security.cryptexd/codex.system/bootstrap/usr/bin:/var/run/com.apple.security.cryptexd/codex.system/bootstrap/usr/appleinternal/bin:/pkg/env/global/bin:/opt/homebrew/bin:/Users/omar.ragab/.opencode/bin:/Users/omar.ragab/.local/bin:/Users/omar.ragab/.bun/bin:/opt/homebrew/sbin:/Applications/Ghostty.app/Contents/MacOS:/Users/omar.ragab/Library/Application Support/JetBrains/Toolbox/scripts:/Users/omar.ragab/Library/Application Support/JetBrains/Toolbox/scripts' python3 /Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/branches.py preflight --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-120 --mode mr --branch a..b
exit: 1 (210 ms)
--- stdout
{"ok": false, "command": "preflight", "format": "sdlc/{name}", "args": {"repo": "/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-120", "mode": "mr", "branch": "a..b"}, "given": false, "derived": false, "suggestion": "", "forge": "gitlab", "rules": [{"source": "gitlab", "kind": "regex", "pattern": ".", "negate": false, "label": "push rule"}], "samples": [{"kind": "working", "name": "a..b", "result": "fail", "rule": "git check-ref-format"}], "notes": []}
--- stderr

--- tree /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/cwd-121 (unchanged)
--- tree /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-120 (unchanged)
$ cd /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/cwd-122
$ PATH='/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/stub-bin-85B5uV:/Users/omar.ragab/.opencode/bin:/Users/omar.ragab/.local/bin:/Users/omar.ragab/.bun/bin:/Users/omar.ragab/.local/bin:/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/System/Cryptexes/App/usr/bin:/usr/bin:/bin:/usr/sbin:/sbin:/var/run/com.apple.security.cryptexd/codex.system/bootstrap/usr/local/bin:/var/run/com.apple.security.cryptexd/codex.system/bootstrap/usr/bin:/var/run/com.apple.security.cryptexd/codex.system/bootstrap/usr/appleinternal/bin:/pkg/env/global/bin:/opt/homebrew/bin:/Users/omar.ragab/.opencode/bin:/Users/omar.ragab/.local/bin:/Users/omar.ragab/.bun/bin:/opt/homebrew/sbin:/Applications/Ghostty.app/Contents/MacOS:/Users/omar.ragab/Library/Application Support/JetBrains/Toolbox/scripts:/Users/omar.ragab/Library/Application Support/JetBrains/Toolbox/scripts' python3 /Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/branches.py preflight --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-120 --mode mr --branch fine
exit: 0 (105 ms)
--- stdout
{"ok": true, "command": "preflight", "format": "sdlc/{name}", "args": {"repo": "/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-120", "mode": "mr", "branch": "fine"}, "given": false, "derived": false, "suggestion": "", "forge": "gitlab", "rules": [{"source": "gitlab", "kind": "regex", "pattern": ".", "negate": false, "label": "push rule"}], "samples": [{"kind": "working", "name": "fine", "result": "pass", "rule": null}], "notes": []}
--- stderr

--- tree /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/cwd-122 (unchanged)
--- tree /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-120 (unchanged)
$ cd /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/cwd-124
$ PATH='/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/stub-bin-rOzxqv:/Users/omar.ragab/.opencode/bin:/Users/omar.ragab/.local/bin:/Users/omar.ragab/.bun/bin:/Users/omar.ragab/.local/bin:/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/System/Cryptexes/App/usr/bin:/usr/bin:/bin:/usr/sbin:/sbin:/var/run/com.apple.security.cryptexd/codex.system/bootstrap/usr/local/bin:/var/run/com.apple.security.cryptexd/codex.system/bootstrap/usr/bin:/var/run/com.apple.security.cryptexd/codex.system/bootstrap/usr/appleinternal/bin:/pkg/env/global/bin:/opt/homebrew/bin:/Users/omar.ragab/.opencode/bin:/Users/omar.ragab/.local/bin:/Users/omar.ragab/.bun/bin:/opt/homebrew/sbin:/Applications/Ghostty.app/Contents/MacOS:/Users/omar.ragab/Library/Application Support/JetBrains/Toolbox/scripts:/Users/omar.ragab/Library/Application Support/JetBrains/Toolbox/scripts' python3 /Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/branches.py preflight --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-123 --mode mr --branch a..b
exit: 1 (217 ms)
--- stdout
{"ok": false, "command": "preflight", "format": "sdlc/{name}", "args": {"repo": "/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-123", "mode": "mr", "branch": "a..b"}, "given": false, "derived": false, "suggestion": "", "forge": "github", "rules": [{"source": "github", "kind": "starts_with", "pattern": "a", "negate": false, "label": "starts a"}], "samples": [{"kind": "working", "name": "a..b", "result": "fail", "rule": "git check-ref-format"}], "notes": []}
--- stderr

--- tree /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/cwd-124 (unchanged)
--- tree /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-123 (unchanged)
```

## TC-cli-30 (VS-6): VS-6 a..b fails when rules unknown; with unevaluated rule

- Requirements: R-044, R-040
- Spec source: R-044 quote and spec section 3 (git check-ref-format)
- Given: A scratch git repo built by cli-runner, with the forge shims named in the test
- When: branches.py preflight runs as a real process; see the transcript
- Then: The assertions in the test hold: exit code, JSON keys, sample results, notes, and an unchanged tree
- Result: pass
- Test: `tests/cli-0/preflight.verify-cli.test.mjs:418`

```
$ cd /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/cwd-126
$ PATH='/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/stub-bin-Elh9GL:/Users/omar.ragab/.opencode/bin:/Users/omar.ragab/.local/bin:/Users/omar.ragab/.bun/bin:/Users/omar.ragab/.local/bin:/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/System/Cryptexes/App/usr/bin:/usr/bin:/bin:/usr/sbin:/sbin:/var/run/com.apple.security.cryptexd/codex.system/bootstrap/usr/local/bin:/var/run/com.apple.security.cryptexd/codex.system/bootstrap/usr/bin:/var/run/com.apple.security.cryptexd/codex.system/bootstrap/usr/appleinternal/bin:/pkg/env/global/bin:/opt/homebrew/bin:/Users/omar.ragab/.opencode/bin:/Users/omar.ragab/.local/bin:/Users/omar.ragab/.bun/bin:/opt/homebrew/sbin:/Applications/Ghostty.app/Contents/MacOS:/Users/omar.ragab/Library/Application Support/JetBrains/Toolbox/scripts:/Users/omar.ragab/Library/Application Support/JetBrains/Toolbox/scripts' python3 /Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/branches.py preflight --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-125 --mode mr --branch a..b
exit: 1 (227 ms)
--- stdout
{"ok": false, "command": "preflight", "format": "sdlc/{name}", "args": {"repo": "/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-125", "mode": "mr", "branch": "a..b"}, "given": false, "derived": false, "suggestion": "", "forge": "github", "rules": [], "samples": [{"kind": "working", "name": "a..b", "result": "fail", "rule": "git check-ref-format"}], "notes": ["rules unknown on github: HTTP 500"]}
--- stderr

--- tree /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/cwd-126 (unchanged)
--- tree /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-125 (unchanged)
$ cd /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/cwd-127
$ PATH='/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/stub-bin-lMEqRg:/Users/omar.ragab/.opencode/bin:/Users/omar.ragab/.local/bin:/Users/omar.ragab/.bun/bin:/Users/omar.ragab/.local/bin:/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/System/Cryptexes/App/usr/bin:/usr/bin:/bin:/usr/sbin:/sbin:/var/run/com.apple.security.cryptexd/codex.system/bootstrap/usr/local/bin:/var/run/com.apple.security.cryptexd/codex.system/bootstrap/usr/bin:/var/run/com.apple.security.cryptexd/codex.system/bootstrap/usr/appleinternal/bin:/pkg/env/global/bin:/opt/homebrew/bin:/Users/omar.ragab/.opencode/bin:/Users/omar.ragab/.local/bin:/Users/omar.ragab/.bun/bin:/opt/homebrew/sbin:/Applications/Ghostty.app/Contents/MacOS:/Users/omar.ragab/Library/Application Support/JetBrains/Toolbox/scripts:/Users/omar.ragab/Library/Application Support/JetBrains/Toolbox/scripts' python3 /Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/branches.py preflight --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-125 --mode mr --branch a..b
exit: 1 (199 ms)
--- stdout
{"ok": false, "command": "preflight", "format": "sdlc/{name}", "args": {"repo": "/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-125", "mode": "mr", "branch": "a..b"}, "given": false, "derived": false, "suggestion": "", "forge": "github", "rules": [{"source": "github", "kind": "regex", "pattern": "(", "negate": false, "label": "broken"}], "samples": [{"kind": "working", "name": "a..b", "result": "fail", "rule": "git check-ref-format"}], "notes": ["cannot evaluate broken: missing ), unterminated subpattern at position 0"]}
--- stderr

--- tree /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/cwd-127 (unchanged)
--- tree /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-125 (unchanged)
```

## TC-cli-31 (VS-6): VS-6 invalid ref names, no forge

- Requirements: R-044, R-040
- Spec source: R-044 quote and spec section 3 (git check-ref-format)
- Given: A scratch git repo built by cli-runner, with the forge shims named in the test
- When: branches.py preflight runs as a real process; see the transcript
- Then: The assertions in the test hold: exit code, JSON keys, sample results, notes, and an unchanged tree
- Result: pass
- Test: `tests/cli-0/preflight.verify-cli.test.mjs:434`

```
see .sdlc/slices/S-015/verification/r0/logs/cli-0-TC-cli-31-transcript.txt
```

## TC-cli-32 (VS-6): VS-6 loop-kind samples with a invalid literal format part fail validation (exit 2) rather than reach forge

- Requirements: R-044, R-040
- Spec source: R-044 quote and spec section 3 (git check-ref-format)
- Given: A scratch git repo built by cli-runner, with the forge shims named in the test
- When: branches.py preflight runs as a real process; see the transcript
- Then: The assertions in the test hold: exit code, JSON keys, sample results, notes, and an unchanged tree
- Result: pass
- Test: `tests/cli-0/preflight.verify-cli.test.mjs:448`

```
$ cd /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/cwd-151
$ PATH='/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/stub-bin-Pj5D5b:/Users/omar.ragab/.opencode/bin:/Users/omar.ragab/.local/bin:/Users/omar.ragab/.bun/bin:/Users/omar.ragab/.local/bin:/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/System/Cryptexes/App/usr/bin:/usr/bin:/bin:/usr/sbin:/sbin:/var/run/com.apple.security.cryptexd/codex.system/bootstrap/usr/local/bin:/var/run/com.apple.security.cryptexd/codex.system/bootstrap/usr/bin:/var/run/com.apple.security.cryptexd/codex.system/bootstrap/usr/appleinternal/bin:/pkg/env/global/bin:/opt/homebrew/bin:/Users/omar.ragab/.opencode/bin:/Users/omar.ragab/.local/bin:/Users/omar.ragab/.bun/bin:/opt/homebrew/sbin:/Applications/Ghostty.app/Contents/MacOS:/Users/omar.ragab/Library/Application Support/JetBrains/Toolbox/scripts:/Users/omar.ragab/Library/Application Support/JetBrains/Toolbox/scripts' python3 /Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/branches.py preflight --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-150 --mode pr --format 'a..b/{name}'
exit: 2 (61 ms)
--- stdout
{"ok": false, "error": "the branch format 'a..b/{name}' gives 'a..b/S-001', which git check-ref-format refuses: fatal: 'a..b/S-001' is not a valid branch name"}
--- stderr

--- tree /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/cwd-151 (unchanged)
--- tree /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-150 (unchanged)
```

## TC-cli-33 (VS-6): VS-6 working branch invalid in pr mode is ignored

- Requirements: R-044, R-040
- Spec source: R-044 quote and spec section 3 (git check-ref-format)
- Given: A scratch git repo built by cli-runner, with the forge shims named in the test
- When: branches.py preflight runs as a real process; see the transcript
- Then: The assertions in the test hold: exit code, JSON keys, sample results, notes, and an unchanged tree
- Result: pass
- Test: `tests/cli-0/preflight.verify-cli.test.mjs:457`

```
$ cd /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/cwd-153
$ python3 /Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/branches.py preflight --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-152 --mode pr --branch a..b
exit: 0 (123 ms)
--- stdout
{"ok": true, "command": "preflight", "format": "sdlc/{name}", "args": {"repo": "/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-152", "mode": "pr", "branch": "a..b"}, "given": false, "derived": false, "suggestion": "", "forge": "", "rules": [], "samples": [{"kind": "slice", "name": "sdlc/S-001", "result": "unchecked", "rule": null}, {"kind": "state", "name": "sdlc/state-20261009220945", "result": "unchecked", "rule": null}, {"kind": "e2e", "name": "sdlc/M-1-e2e", "result": "unchecked", "rule": null}], "notes": []}
--- stderr

--- tree /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/cwd-153 (unchanged)
--- tree /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-152 (unchanged)
```

## TC-cli-34 (VS-6): VS-6 gh path for hostile working name is one encoded argument

- Requirements: R-044, R-040
- Spec source: R-044 quote and spec section 3 (git check-ref-format)
- Given: A scratch git repo built by cli-runner, with the forge shims named in the test
- When: branches.py preflight runs as a real process; see the transcript
- Then: The assertions in the test hold: exit code, JSON keys, sample results, notes, and an unchanged tree
- Result: pass
- Test: `tests/cli-0/preflight.verify-cli.test.mjs:465`

```
$ cd /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/cwd-155
$ PATH='/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/stub-bin-fmQ3Cg:/Users/omar.ragab/.opencode/bin:/Users/omar.ragab/.local/bin:/Users/omar.ragab/.bun/bin:/Users/omar.ragab/.local/bin:/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/System/Cryptexes/App/usr/bin:/usr/bin:/bin:/usr/sbin:/sbin:/var/run/com.apple.security.cryptexd/codex.system/bootstrap/usr/local/bin:/var/run/com.apple.security.cryptexd/codex.system/bootstrap/usr/bin:/var/run/com.apple.security.cryptexd/codex.system/bootstrap/usr/appleinternal/bin:/pkg/env/global/bin:/opt/homebrew/bin:/Users/omar.ragab/.opencode/bin:/Users/omar.ragab/.local/bin:/Users/omar.ragab/.bun/bin:/opt/homebrew/sbin:/Applications/Ghostty.app/Contents/MacOS:/Users/omar.ragab/Library/Application Support/JetBrains/Toolbox/scripts:/Users/omar.ragab/Library/Application Support/JetBrains/Toolbox/scripts' python3 /Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/branches.py preflight --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-154 --mode mr --branch 'a b/../c;$(x)'
exit: 1 (220 ms)
--- stdout
{"ok": false, "command": "preflight", "format": "sdlc/{name}", "args": {"repo": "/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-154", "mode": "mr", "branch": "a b/../c;$(x)"}, "given": false, "derived": false, "suggestion": "", "forge": "github", "rules": [], "samples": [{"kind": "working", "name": "a b/../c;$(x)", "result": "fail", "rule": "git check-ref-format"}], "notes": []}
--- stderr

--- tree /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/cwd-155 (unchanged)
--- tree /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-154 (unchanged)
```

## TC-cli-35 (VS-4): VS-4 gh and glab absent from PATH

- Requirements: R-041, R-084
- Spec source: R-041 acceptance; R-084 acceptance
- Given: A scratch git repo built by cli-runner, with the forge shims named in the test
- When: branches.py preflight runs as a real process; see the transcript
- Then: The assertions in the test hold: exit code, JSON keys, sample results, notes, and an unchanged tree
- Result: pass
- Test: `tests/cli-0/preflight.verify-cli.test.mjs:479`

```
$ cd /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/cwd-158
$ PATH=/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/path-only-1UvyFu python3 /Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/branches.py preflight --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-156 --mode pr
exit: 0 (116 ms)
--- stdout
{"ok": true, "command": "preflight", "format": "sdlc/{name}", "args": {"repo": "/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-156", "mode": "pr", "branch": null}, "given": false, "derived": false, "suggestion": "", "forge": "github", "rules": [], "samples": [{"kind": "slice", "name": "sdlc/S-001", "result": "unchecked", "rule": null}, {"kind": "state", "name": "sdlc/state-20261009220946", "result": "unchecked", "rule": null}, {"kind": "e2e", "name": "sdlc/M-1-e2e", "result": "unchecked", "rule": null}], "notes": ["rules unknown on github: [Errno 2] No such file or directory: 'gh'"]}
--- stderr

--- tree /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/cwd-158 (unchanged)
--- tree /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-156 (unchanged)
$ cd /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/cwd-159
$ PATH=/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/path-only-1UvyFu python3 /Users/omar.ragab/projects/sdlc/.claude/worktrees/sdlc-run/skills/sdlc/branches.py preflight --repo /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-157 --mode mr --branch work
exit: 0 (84 ms)
--- stdout
{"ok": true, "command": "preflight", "format": "sdlc/{name}", "args": {"repo": "/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-157", "mode": "mr", "branch": "work"}, "given": false, "derived": false, "suggestion": "", "forge": "gitlab", "rules": [], "samples": [{"kind": "working", "name": "work", "result": "unchecked", "rule": null}], "notes": ["rules unknown on gitlab: [Errno 2] No such file or directory: 'glab'"]}
--- stderr

--- tree /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/cwd-159 (unchanged)
--- tree /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-5sAdzy/testkit-cli-FN2e6J/repo-157 (unchanged)
```

## Attacks

Hostile branch names and formats ran in TC-cli-4, TC-cli-14, TC-cli-31 and TC-cli-34. None crashed, and the tree stayed unchanged.

## Seeds

- testkit: stub-server answers by call order only. Per-sample GitHub tests depend on sample order.