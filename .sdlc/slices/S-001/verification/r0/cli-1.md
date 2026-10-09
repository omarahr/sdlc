# Verification: S-001, profile cli, part 1, round 0

- Slice: S-001
- Profile: cli
- Round: 0
- Commit: de3dd5c
- Verdict: pass (17 cases, 17 pass, 0 fail, 0 blocked)

## Environment

macOS (darwin 25.6), Python 3.14.7, Node 24.19.0, git; scratch repos from the testkit cli-runner with a scratch HOME, TZ=UTC, PYTHONUTF8=1; baseline skill from git archive main.

Test run: `VERIFY_REPO=<worktree> VERIFY_LOG=<log> node --test .sdlc/slices/S-001/verification/r0/tests/cli-1/*.verify-cli.test.mjs` gave 16 pass, 0 fail. A mutant of the three scripts without the `sys.path.insert` line fails TC-cli-11 and TC-cli-13.

## TC-cli-1 (VS-7, R-016, R-014): A command without --format prints the config format

- Given: A scratch git repo with .sdlc/config.json {gitMode: pr, branchFormat: feature/{name}}
- When: name, parse, list and preflight run from a scratch cwd without --format
- Then: Each prints one JSON object with format feature/{name}
- Expected: exit 0, one JSON object, ok true, format feature/{name}, empty stderr, repo and cwd trees unchanged
- Actual: All four commands: exit 0, format feature/{name}, stderr empty, trees unchanged
- Result: **pass**
- Spec source: R-016 quote; R-014 acceptance
- Test: `.sdlc/slices/S-001/verification/r0/tests/cli-1/format.verify-cli.test.mjs:60`
- Command: `VERIFY_REPO=<worktree> VERIFY_LOG=<log> node --test .sdlc/slices/S-001/verification/r0/tests/cli-1/format.verify-cli.test.mjs`

transcript: parse without --format
```
$ python3 branches.py parse --repo <scratch>/repo --branch feature/S-1
exit: 0
--- stdout
{"ok": true, "command": "parse", "format": "feature/{name}", "args": {...}}
--- stderr
(empty)
```

transcript: all four commands
See `.sdlc/slices/S-001/verification/r0/logs/cli-1-transcripts.txt`.

file-tree: repo and cwd
```
unchanged after each run (cli-runner snapshot, git refs included)
```

## TC-cli-2 (VS-7, R-016, R-014): --format wins over the config format

- Given: Config branchFormat feature/{name}
- When: Each command runs with --format sdlc/{name}, with --format=sdlc/{name:lower}, and with --format before the other flags
- Then: format is the --format value
- Expected: exit 0 and format sdlc/{name} or sdlc/{name:lower}, never feature/{name}
- Actual: 9 runs: exit 0, format equals the --format value in each
- Result: **pass**
- Spec source: R-016 quote (config is the fallback); R-014 acceptance (documented flags)
- Test: `.sdlc/slices/S-001/verification/r0/tests/cli-1/format.verify-cli.test.mjs:65`
- Command: `VERIFY_REPO=<worktree> VERIFY_LOG=<log> node --test .sdlc/slices/S-001/verification/r0/tests/cli-1/format.verify-cli.test.mjs`

transcript: override runs
See `.sdlc/slices/S-001/verification/r0/logs/cli-1-transcripts.txt`.

file-tree: repo and cwd
```
unchanged
```

## TC-cli-3 (VS-7, R-016, R-014): An invalid config format fails without --format, and a valid --format overrides it

- Given: Config branchFormat in: feature/x, 'a {name}', {name}{name}, x/{name}}, x/{id}, x/{name}+TAB
- When: Each command runs without --format, then with --format sdlc/{name}
- Then: Without --format exit 2 with one {ok:false,error}; with --format exit 0
- Expected: exit 2, stdout exactly {ok:false,error:<non-empty>}, no traceback; then exit 0
- Actual: 48 runs as expected. Example: exit 2, {"ok": false, "error": "the branch format 'feature/x' must hold exactly one {name} or {name:lower}, found 0"}
- Result: **pass**
- Spec source: R-014 quote (exit 2 on bad input); ADR-20261009-024036 (structural checks in S-001)
- Test: `.sdlc/slices/S-001/verification/r0/tests/cli-1/format.verify-cli.test.mjs:73`
- Command: `VERIFY_REPO=<worktree> VERIFY_LOG=<log> node --test .sdlc/slices/S-001/verification/r0/tests/cli-1/format.verify-cli.test.mjs`

transcript: config feature/x, name without --format
```
$ python3 branches.py name --repo <scratch>/repo --kind slice --id S-1
exit: 2
--- stdout
{"ok": false, "error": "the branch format 'feature/x' must hold exactly one {name} or {name:lower}, found 0"}
--- stderr
(empty)
```

transcript: all runs
See `.sdlc/slices/S-001/verification/r0/logs/cli-1-transcripts.txt`.

file-tree: repo and cwd
```
unchanged
```

## TC-cli-4 (VS-7, R-016, R-014): Malformed config JSON fails without --format; with --format the config is not read

- Given: config.json holds '{not json', a trailing comma object, or a UTF-8 BOM before valid JSON
- When: Each command runs without --format, then with --format sdlc/{name}
- Then: Without --format: exit 2 with one JSON error. With --format: recorded only
- Expected: exit 2 and one {ok:false,error} for invalid JSON
- Actual: Invalid JSON: exit 2 with one JSON error. BOM: exit 2 ('Unexpected UTF-8 BOM'), recorded as a seed. With --format: exit 0 for all three files, because load_format is not called
- Result: **pass**
- Spec source: R-014 quote; spec silent on malformed config with --format (recorded)
- Test: `.sdlc/slices/S-001/verification/r0/tests/cli-1/format.verify-cli.test.mjs:81`
- Command: `VERIFY_REPO=<worktree> VERIFY_LOG=<log> node --test .sdlc/slices/S-001/verification/r0/tests/cli-1/format.verify-cli.test.mjs`

transcript: malformed config with --format
```
$ python3 branches.py parse --repo <scratch>/repo --branch feature/S-1 --format 'sdlc/{name}'
exit: 0
--- stdout
{"ok": true, "command": "parse", "format": "sdlc/{name}", ...}
```

transcript: all runs
See `.sdlc/slices/S-001/verification/r0/logs/cli-1-transcripts.txt`.

## TC-cli-5 (VS-7, R-016): An empty, missing or non-string config value falls back to sdlc/{name}

- Given: No config, {}, branchFormat '', null, 7, a list, top-level list, top-level string, and a repo without .sdlc
- When: Each command runs without --format
- Then: format is sdlc/{name}
- Expected: exit 0, format sdlc/{name}
- Actual: 33 runs: exit 0, format sdlc/{name}
- Result: **pass**
- Spec source: R-016 quote and acceptance
- Test: `.sdlc/slices/S-001/verification/r0/tests/cli-1/format.verify-cli.test.mjs:101`
- Command: `VERIFY_REPO=<worktree> VERIFY_LOG=<log> node --test .sdlc/slices/S-001/verification/r0/tests/cli-1/format.verify-cli.test.mjs`

transcript: fallback runs
See `.sdlc/slices/S-001/verification/r0/logs/cli-1-transcripts.txt`.

file-tree: repo and cwd
```
unchanged
```

## TC-cli-6 (VS-7, R-014): An empty --format is refused, not replaced by the config format

- Given: Config branchFormat feature/{name}
- When: Each command runs with --format '' and --format=
- Then: exit 2 with one JSON error
- Expected: exit 2, {ok:false,error}
- Actual: 8 runs: exit 2, error "the branch format '' must hold exactly one {name} or {name:lower}, found 0"
- Result: **pass**
- Spec source: R-014 quote; ADR-20261009-024036
- Test: `.sdlc/slices/S-001/verification/r0/tests/cli-1/format.verify-cli.test.mjs:111`
- Command: `VERIFY_REPO=<worktree> VERIFY_LOG=<log> node --test .sdlc/slices/S-001/verification/r0/tests/cli-1/format.verify-cli.test.mjs`

transcript: empty --format
```
$ python3 branches.py name --repo <scratch>/repo --kind slice --id S-1 --format ''
exit: 2
--- stdout
{"ok": false, "error": "the branch format '' must hold exactly one {name} or {name:lower}, found 0"}
```

## TC-cli-7 (VS-7, R-014, R-016): An unreadable config or a directory in its place gives one JSON error

- Given: config.json is a directory, or a file with mode 000
- When: Each command runs without --format
- Then: exit 2 with one JSON error, no traceback
- Expected: exit 2, {ok:false,error}
- Actual: 8 runs: exit 2 with 'cannot read ...' JSON error, stderr empty
- Result: **pass**
- Spec source: R-014 quote
- Test: `.sdlc/slices/S-001/verification/r0/tests/cli-1/format.verify-cli.test.mjs:117`
- Command: `VERIFY_REPO=<worktree> VERIFY_LOG=<log> node --test .sdlc/slices/S-001/verification/r0/tests/cli-1/format.verify-cli.test.mjs`

transcript: unreadable config runs
See `.sdlc/slices/S-001/verification/r0/logs/cli-1-transcripts.txt`.

## TC-cli-8 (VS-8, R-013): python3 branches.py <command> runs from a scratch cwd under -I, and with spaces and unicode in paths

- Given: Scratch repo with config feature/{name}; empty PYTHONPATH
- When: python3 -I branches.py <cmd> from a scratch cwd; then parse with cwd 'with space é' and repo 'repo ü x'
- Then: Each prints one JSON object with exit 0
- Expected: exit 0, format feature/{name}, empty stderr
- Actual: 5 runs: exit 0, one JSON object, format feature/{name}
- Result: **pass**
- Spec source: R-013 acceptance ('python3 branches.py <command> runs')
- Test: `.sdlc/slices/S-001/verification/r0/tests/cli-1/format.verify-cli.test.mjs:129`
- Command: `VERIFY_REPO=<worktree> VERIFY_LOG=<log> node --test .sdlc/slices/S-001/verification/r0/tests/cli-1/format.verify-cli.test.mjs`

transcript: -I runs
See `.sdlc/slices/S-001/verification/r0/logs/cli-1-transcripts.txt`.

## TC-cli-9 (VS-8, R-013): Import by path: no side effect, public functions present, stdlib only, main returns a code

- Given: A copy of the skill directory, bytecode writing on, open() and subprocess spied
- When: A probe under python3 -I from a scratch cwd loads branches.py via spec_from_file_location, parses its imports with ast, and calls main() with 8 argv lists
- Then: No stdout, no file open, no subprocess at import; Fail subclasses Exception; load_format, validate_format, main callable; all imports in sys.stdlib_module_names; main returns 0 or 2 for every command input
- Expected: As stated
- Actual: Import stdout empty; no open; no subprocess; Fail is an Exception; all three callable; nonStdlib []; only __pycache__ added. main returns 0 for valid parse and name, 2 for 'name', [], 'bogus' and a bad --format. main(['--help']) and main(['parse','-h']) raise SystemExit(0) after printing usage (spec does not define --help; seed)
- Result: **pass**
- Spec source: R-013 acceptance
- Test: `.sdlc/slices/S-001/verification/r0/tests/cli-1/format.verify-cli.test.mjs:197`
- Command: `VERIFY_REPO=<worktree> VERIFY_LOG=<log> node --test .sdlc/slices/S-001/verification/r0/tests/cli-1/format.verify-cli.test.mjs`

transcript: probe run and main() outcomes
See `.sdlc/slices/S-001/verification/r0/logs/cli-1-transcripts.txt`.

file-tree: skill copy, cwd, repo
```
+ __pycache__/branches.cpython-314.pyc only
```

## TC-cli-10 (VS-8, R-013): The module imports and parse runs without git-modes.json and without git

- Given: A skill copy without git-modes.json; PATH starts with a fake git that records each call
- When: Load the module by path and call load_format and validate_format; run parse and preflight
- Then: Import and parse succeed; git is never called; preflight fails with one JSON error
- Expected: stdout 'feature/{name} sdlc/{name}'; parse exit 0; preflight exit 2 JSON
- Actual: As expected; the fake git marker file was never written
- Result: **pass**
- Spec source: R-013 acceptance (importable, runnable)
- Test: `.sdlc/slices/S-001/verification/r0/tests/cli-1/format.verify-cli.test.mjs:223`
- Command: `VERIFY_REPO=<worktree> VERIFY_LOG=<log> node --test .sdlc/slices/S-001/verification/r0/tests/cli-1/format.verify-cli.test.mjs`

transcript: no git-modes, fake git
See `.sdlc/slices/S-001/verification/r0/logs/cli-1-transcripts.txt`.

file-tree: fake git dir
```
unchanged: git was not called
```

## TC-cli-11 (VS-9, R-098): A decoy branches.py in the cwd does not shadow the real module

- Given: A scratch cwd that holds a decoy branches.py which records its import and exits 97
- When: Each script runs --help from that cwd, and is loaded by path through importlib from that cwd
- Then: --help exits 0; mod.branches.__file__ is the skill's branches.py; the decoy never runs
- Expected: exit 0 and the real path
- Actual: All three scripts: exit 0, real path, decoy marker absent. A mutant without the sys.path.insert line fails this case
- Result: **pass**
- Spec source: R-098 acceptance (import resolves through the script directory)
- Test: `.sdlc/slices/S-001/verification/r0/tests/cli-1/import.verify-cli.test.mjs:32`
- Command: `VERIFY_REPO=<worktree> VERIFY_LOG=<log> node --test .sdlc/slices/S-001/verification/r0/tests/cli-1/import.verify-cli.test.mjs`

transcript: decoy cwd runs
See `.sdlc/slices/S-001/verification/r0/logs/cli-1-transcripts.txt`.

## TC-cli-12 (VS-9, R-098): A decoy branches module on PYTHONPATH does not shadow the real module

- Given: PYTHONPATH names a dir with an exiting decoy, a shadowing decoy, or a branches package that exits 97
- When: Each script runs --help
- Then: exit 0, usage printed, decoy never imported
- Expected: exit 0
- Actual: 9 runs: exit 0, decoy marker absent
- Result: **pass**
- Spec source: R-098 acceptance
- Test: `.sdlc/slices/S-001/verification/r0/tests/cli-1/import.verify-cli.test.mjs:45`
- Command: `VERIFY_REPO=<worktree> VERIFY_LOG=<log> node --test .sdlc/slices/S-001/verification/r0/tests/cli-1/import.verify-cli.test.mjs`

transcript: PYTHONPATH decoy runs
See `.sdlc/slices/S-001/verification/r0/logs/cli-1-transcripts.txt`.

## TC-cli-13 (VS-9, R-098): Each script runs through a symlink, a relative path and python3 -I

- Given: A symlink to each script in another directory; a scratch cwd
- When: python3 <symlink> --help; python3 <relative path> --help; python3 -I <script> --help
- Then: exit 0 each
- Expected: exit 0
- Actual: 9 runs: exit 0. A mutant without the sys.path.insert line fails the -I run
- Result: **pass**
- Spec source: R-098 acceptance (runs with the cwd outside the skill directory)
- Test: `.sdlc/slices/S-001/verification/r0/tests/cli-1/import.verify-cli.test.mjs:59`
- Command: `VERIFY_REPO=<worktree> VERIFY_LOG=<log> node --test .sdlc/slices/S-001/verification/r0/tests/cli-1/import.verify-cli.test.mjs`

transcript: symlink, relative and -I runs
See `.sdlc/slices/S-001/verification/r0/logs/cli-1-transcripts.txt`.

## TC-cli-14 (VS-10, R-098): next-action.py finds an in-progress slice on its own branch, same as on main

- Given: A ledger repo on main; branch sdlc/S-1 marks S-1 in_progress at phase implement
- When: next-action.py --repo <repo> --bar-raiser-rounds 0 from a scratch cwd, with the slice skill and with the skill from main
- Then: next.action slice, checkout sdlc/S-1, and output identical to main
- Expected: identical decisions
- Actual: Both: action slice, slice S-1, checkout sdlc/S-1; whole JSON equal after the repo path is masked
- Result: **pass**
- Spec source: ADR-20261009-024047 (no-regression reading of R-098)
- Test: `.sdlc/slices/S-001/verification/r0/tests/cli-1/import.verify-cli.test.mjs:111`
- Command: `VERIFY_REPO=<worktree> VERIFY_LOG=<log> node --test .sdlc/slices/S-001/verification/r0/tests/cli-1/import.verify-cli.test.mjs`

transcript: next-action slice vs main
See `.sdlc/slices/S-001/verification/r0/logs/cli-1-transcripts.txt`.

## TC-cli-15 (VS-10, R-098): state-write.py base-branch names the awaiting-merge dependency branch, same as on main

- Given: Stack mode: S-1 awaiting-merge with branch sdlc/S-1 at its own commit, S-2 depends on S-1; plus a direct-mode repo
- When: state-write.py base-branch --repo <repo> --slice S-2, slice skill and main skill
- Then: Stack: {ok:true, branch:sdlc/S-1}; both outputs equal main
- Expected: identical
- Actual: Stack: {"ok": true, "slice": "S-2", "branch": "sdlc/S-1"} on both; direct mode equal on both
- Result: **pass**
- Spec source: ADR-20261009-024047
- Test: `.sdlc/slices/S-001/verification/r0/tests/cli-1/import.verify-cli.test.mjs:128`
- Command: `VERIFY_REPO=<worktree> VERIFY_LOG=<log> node --test .sdlc/slices/S-001/verification/r0/tests/cli-1/import.verify-cli.test.mjs`

transcript: base-branch slice
```
$ python3 state-write.py base-branch --repo <scratch>/ledger --slice S-2
exit: 0
--- stdout
{"ok": true, "slice": "S-2", "branch": "sdlc/S-1"}
```

## TC-cli-16 (VS-10, R-098): janitor.py removes v-branches of a done and an unknown slice and keeps live branches, same as on main

- Given: S-1 done, S-2 in_progress; branches sdlc/S-1-v1, sdlc/S-1, sdlc/S-2-v1, sdlc/S-9-v3, sdlc/run-1
- When: janitor.py --repo <repo> --days 36500, slice skill and main skill
- Then: removedBranches [sdlc/S-1-v1, sdlc/S-9-v3]; sdlc/S-1 kept; same as main
- Expected: identical sweep
- Actual: Both remove sdlc/S-1-v1 and sdlc/S-9-v3; left: main, sdlc/S-1, sdlc/S-2-v1, sdlc/run-1; notes []
- Result: **pass**
- Spec source: ADR-20261009-024047
- Test: `.sdlc/slices/S-001/verification/r0/tests/cli-1/import.verify-cli.test.mjs:147`
- Command: `VERIFY_REPO=<worktree> VERIFY_LOG=<log> node --test .sdlc/slices/S-001/verification/r0/tests/cli-1/import.verify-cli.test.mjs`

transcript: janitor slice
```
$ python3 janitor.py --repo <scratch>/ledger --days 36500
exit: 0
--- stdout
{"removedDirs": 0, "removedBranches": ["sdlc/S-1-v1", "sdlc/S-9-v3"], "notes": []}
```

file-tree: ledger refs
```
- ref:refs/heads/sdlc/S-1-v1
- ref:refs/heads/sdlc/S-9-v3
```

## TC-cli-17 (VS-10, R-098): The existing next-action, scripts, git-modes and branches suites pass, with no assertion changed

- Given: Branch sdlc/S-001 at de3dd5c
- When: Run the four suites; diff the suite files against main
- Then: All pass; next-action and scripts suites unchanged; git-modes change is fixture setup only
- Expected: 0 failures
- Actual: 110 tests: 109 pass, 1 skipped (go not installed), 0 fail. next-action.test.mjs and scripts.test.mjs have no diff. git-modes.test.mjs adds only a BRANCHES_PATH constant and two copyFileSync fixture lines
- Result: **pass**
- Spec source: ADR-20261009-024047 (existing suites unchanged)
- Test: `manual` (manual)
- Command: `cd <worktree> && node --test skills/sdlc/test/next-action.test.mjs skills/sdlc/test/scripts.test.mjs skills/sdlc/test/git-modes.test.mjs skills/sdlc/test/branches.test.mjs`

log: suite summary
See `.sdlc/slices/S-001/verification/r0/logs/cli-1-suites.txt`.

log: git-modes.test.mjs diff
```
+const BRANCHES_PATH = join(SKILL_DIR, 'branches.py')
+    copyFileSync(BRANCHES_PATH, join(dir, 'branches.py'))
+      copyFileSync(BRANCHES_PATH, join(dir, 'branches.py'))
```

## Attacks

None in this part. The security profile covers the attack corpus.

## Seeds

- **branches.py --help and -h exit through SystemExit in main()** (`skills/sdlc/branches.py`): main(['--help']) and main(['parse','-h']) print argparse usage text on stdout and raise SystemExit(0). An in-process caller of main() gets an exception instead of a return code, and the CLI prints usage text, not one JSON object. The spec does not define --help, so this does not refute.
- **A UTF-8 BOM in .sdlc/config.json makes every command without --format exit 2** (`skills/sdlc/branches.py`): load_format opens config.json with encoding utf-8, so a BOM gives 'Unexpected UTF-8 BOM'. Some Windows editors write a BOM. utf-8-sig would accept it. The spec does not name this case.
- **A valid --format hides a malformed config.json** (`skills/sdlc/branches.py`): With --format given, load_format is not called, so a command exits 0 while config.json is invalid JSON. Later slices that read other config keys may need to read the config anyway.
- **A decoy branches.py beside a symlink to a script shadows the real module** (`skills/sdlc/janitor.py`): The scripts insert os.path.dirname(os.path.abspath(__file__)) into sys.path. abspath does not resolve symlinks, so when janitor.py runs through a symlink in a directory that also holds branches.py, that file is imported (manual probe: exit 97 from the decoy). os.path.realpath would close this. The spec names no symlink case.
