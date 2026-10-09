# S-002 verify-cli, part 0, round 0

- Slice: S-002
- Profile: cli
- Round: 0
- Commit: 8138c9f
- Verdict: not refuted (13 cases, 13 pass)

## Environment

macOS Darwin 25.6, git 2.50.1 (Apple Git-155), Python 3.14.7, Node 24.19.0; branches.py run as python3 <worktree>/skills/sdlc/branches.py through the testkit cli-runner in scratch git repos

Test file: `.sdlc/slices/S-002/verification/r0/tests/cli-0/branches.verify-cli.test.mjs`. Run it with `VERIFY_TREE=<slice worktree> node --test .sdlc/slices/S-002/verification/r0/tests/cli-0/branches.verify-cli.test.mjs`.

## TC-cli-1 (VS-1, R-001, R-017): A valid --format exits 0 on every command and echoes the exact format

- Given: A scratch git repo with branch sdlc/S-001 and no config.json
- When: Run name, parse, list and preflight with --format set to sdlc/{name}, sdlc/{name:lower}, feature/PROJ-1-{name}, {name}, a/b/c-{name}-x, ünïcode/{name} and Ärger-{name:lower}
- Then: Each run exits 0 with one JSON object, ok true, format equal to the input byte for byte, empty stderr, no tree change
- Expected: 28 runs: exit 0, format echoed unchanged
- Actual: 28 runs: exit 0, format echoed unchanged, stderr empty, trees unchanged
- Result: **pass**
- Spec source: R-017 quote and acceptance (accepts sdlc/{name}, feature/PROJ-1-{name}); R-001 acceptance (accepts sdlc/{name:lower})
- Test: `.sdlc/slices/S-002/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:66`

```
$ python3 branches.py name --repo $REPO --kind slice --id S-001 --format 'sdlc/{name:lower}'
exit: 0
--- stdout
{"ok": true, "command": "name", "format": "sdlc/{name:lower}", "args": {...}}
--- stderr
(empty)
--- tree (unchanged)
```

All transcripts: `.sdlc/slices/S-002/verification/r0/logs/cli-0-cli-1.txt`. Every transcript in the log ends with '--- tree <dir> (unchanged)' for the cwd and the --repo dir, git refs included.

## TC-cli-2 (VS-1, R-001, R-017): A valid config.json branchFormat exits 0 on every command

- Given: Seven scratch repos, each with .sdlc/config.json branchFormat set to one valid format of TC-cli-1
- When: Run the four commands without --format
- Then: Exit 0, one JSON object, format equal to the configured string
- Expected: 28 runs exit 0 with the configured format
- Actual: 28 runs exit 0 with the configured format, trees unchanged
- Result: **pass**
- Spec source: R-017 quote
- Test: `.sdlc/slices/S-002/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:78`

```
$ python3 branches.py name --repo $REPO --kind slice --id S-001  (config.json branchFormat sdlc/{name:lower})
exit: 0
--- stdout
{"ok": true, "command": "name", "format": "sdlc/{name:lower}", "args": {...}}
--- stderr
(empty)
--- tree (unchanged)
```

All transcripts: `.sdlc/slices/S-002/verification/r0/logs/cli-0-cli-2.txt`. Every transcript in the log ends with '--- tree <dir> (unchanged)' for the cwd and the --repo dir, git refs included.

## TC-cli-3 (VS-1, R-017): A valid format does not depend on the cwd, a non-repo --repo or GIT_DIR

- Given: A plain directory that is not a git repo, a non-repo cwd, and GIT_DIR set to a missing path
- When: Run the four commands with feature/PROJ-1-{name} (non-repo cwd) and sdlc/{name:lower} (bogus GIT_DIR)
- Then: Exit 0 in every case
- Expected: Exit 0
- Actual: 8 runs exit 0 with the format echoed
- Result: **pass**
- Spec source: R-017 quote (git check-ref-format --branch checks a name, not a repo)
- Test: `.sdlc/slices/S-002/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:90`

```
$ python3 branches.py name --repo $REPO --kind slice --id S-001 --format 'sdlc/{name:lower}'
exit: 0
--- stdout
{"ok": true, "command": "name", "format": "sdlc/{name:lower}", "args": {...}}
--- stderr
(empty)
--- tree (unchanged)
```

All transcripts: `.sdlc/slices/S-002/verification/r0/logs/cli-0-cli-3.txt`. Every transcript in the log ends with '--- tree <dir> (unchanged)' for the cwd and the --repo dir, git refs included.

## TC-cli-4 (VS-2, R-001, R-017, R-071): A structurally malformed --format exits 2 with one JSON object on every command

- Given: A scratch git repo
- When: Run the four commands with --format=<f> for sdlc/, {name}{name}, {name}{name:lower}, {{name}, {name}}, {}, sdlc/{ name }, a tab, a newline, U+00A0, U+3000, {NAME} and {name:upper}
- Then: Exit 2, exactly one JSON line on stdout, ok false, a non-empty error string, empty stderr, no traceback
- Expected: 52 runs exit 2 with one JSON error
- Actual: 52 runs exit 2 with one JSON error object, stderr empty, trees unchanged
- Result: **pass**
- Spec source: R-001 acceptance (rejects no placeholder, two placeholders, stray brace, whitespace); R-017 acceptance; R-071
- Test: `.sdlc/slices/S-002/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:102`

```
$ python3 branches.py name ... '--format={name}{name}'
exit: 2
--- stdout
{"ok": false, "error": "the branch format '{name}{name}' must hold exactly one {name} or {name:lower}, found 2"}
--- stderr
(empty)
```

All transcripts: `.sdlc/slices/S-002/verification/r0/logs/cli-0-cli-4.txt`. Every transcript in the log ends with '--- tree <dir> (unchanged)' for the cwd and the --repo dir, git refs included.

## TC-cli-5 (VS-2, R-017): A zero-width character in the format follows the git verdict

- Given: Formats a\u200bb/{name}, \ufeffa/{name} and a/{name}\u200d
- When: Run name with each format and compare with git check-ref-format --branch on the sample name
- Then: The CLI verdict equals the direct git verdict
- Expected: git accepts all three, so the CLI must exit 0
- Actual: All three exit 0, the same as git. The structural whitespace check does not match zero-width characters; git alone decides (see seed).
- Result: **pass**
- Spec source: R-017 quote (the git check decides names that pass the structural checks)
- Test: `.sdlc/slices/S-002/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:114`

```
$ python3 branches.py name ... --format $'a\u200bb/{name}'
exit: 0
--- stdout
{"ok": true, "command": "name", "format": "a\u200bb/{name}", ...}
```

All transcripts: `.sdlc/slices/S-002/verification/r0/logs/cli-0-cli-5.txt`. Every transcript in the log ends with '--- tree <dir> (unchanged)' for the cwd and the --repo dir, git refs included.

## TC-cli-6 (VS-3, R-017, R-071): The CLI verdict on each git-unsafe format equals git, and a refusal carries the reason of git

- Given: A scratch git repo
- When: Run the four commands with --format=<f> for sdlc/{name}.., sdlc/{name}.lock, -{name}, --help{name}, /{name}, {name}/, a//{name}, a~/{name}, a^/{name}, a:/{name}, a?/{name}, a*/{name}, a[/{name}, a\/{name}, @/{name}, a/.b/{name}, \x01, \x1f, DEL and a@{-1}{name}; run git check-ref-format --branch on each sample
- Then: A git refusal gives exit 2, one JSON error that holds check-ref-format, 'is not a valid branch name' and the exact stderr of git. A git acceptance gives exit 0.
- Expected: 80 runs agree with git
- Actual: All 80 runs agree. 18 formats exit 2 with git's own fatal line in the error. @/{name} exits 0, because git accepts @/S-001. \x1f is refused earlier as whitespace (Python \s). a@{-1}{name} is refused earlier as a stray brace. -{name} and --help{name} reach git as a name, not an option.
- Result: **pass**
- Spec source: R-017 acceptance (the invalid-ref rejection carries the reason of git check-ref-format)
- Test: `.sdlc/slices/S-002/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:127`

```
$ python3 branches.py name ... '--format=sdlc/{name}..'
exit: 2
--- stdout
{"ok": false, "error": "the branch format 'sdlc/{name}..' gives 'sdlc/S-001..', which git check-ref-format refuses: fatal: 'sdlc/S-001..' is not a valid branch name"}
--- stderr
(empty)

$ python3 branches.py name ... '--format=--help{name}'
exit: 2
{"ok": false, "error": "... gives '--helpS-001', which git check-ref-format refuses: fatal: '--helpS-001' is not a valid branch name"}
```

All transcripts: `.sdlc/slices/S-002/verification/r0/logs/cli-0-cli-6.txt`. Every transcript in the log ends with '--- tree <dir> (unchanged)' for the cwd and the --repo dir, git refs included.

## TC-cli-7 (VS-3, R-017): A NUL in config.json branchFormat exits 2 with one JSON object

- Given: Scratch repos with branchFormat sdlc/{name}\u0000 and \u0000{name} in config.json (argv cannot carry a NUL)
- When: Run the four commands without --format
- Then: Exit 2, one JSON error that names check-ref-format, no traceback
- Expected: 8 runs exit 2
- Actual: 8 runs exit 2: 'cannot check the branch format ... with git check-ref-format: embedded null byte'
- Result: **pass**
- Spec source: R-017 quote (raises Fail; the CLI maps Fail to exit 2)
- Test: `.sdlc/slices/S-002/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:153`

```
$ python3 branches.py name --repo $REPO --kind slice --id S-001   (config branchFormat "sdlc/{name}\u0000")
exit: 2
--- stdout
{"ok": false, "error": "cannot check the branch format 'sdlc/{name}\\x00' with git check-ref-format: embedded null byte"}
--- stderr
(empty)
```

All transcripts: `.sdlc/slices/S-002/verification/r0/logs/cli-0-cli-7.txt`. Every transcript in the log ends with '--- tree <dir> (unchanged)' for the cwd and the --repo dir, git refs included.

## TC-cli-8 (VS-3, R-017): Shell metacharacters in the format reach git as one argv item and run nothing

- Given: A trap executable touch_pwned first on PATH; it writes a marker file when it runs
- When: Run the four commands with `touch_pwned`/{name}, ;touch_pwned;{name}, $(touch_pwned)/{name}, |touch_pwned|{name} and &&touch_pwned&&{name}
- Then: The verdict equals direct git; the trap never runs; trees unchanged
- Expected: git accepts all five samples, so exit 0 and no marker
- Actual: 20 runs exit 0, the format echoed unchanged, no marker file, trees unchanged
- Result: **pass**
- Spec source: R-017 quote (git check-ref-format --branch on the name)
- Test: `.sdlc/slices/S-002/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:166`

```
$ PATH=$BIN:... python3 branches.py name ... --format '$(touch_pwned)/{name}'
exit: 0
{"ok": true, "command": "name", "format": "$(touch_pwned)/{name}", ...}
marker file: absent
```

All transcripts: `.sdlc/slices/S-002/verification/r0/logs/cli-0-cli-8.txt`. Every transcript in the log ends with '--- tree <dir> (unchanged)' for the cwd and the --repo dir, git refs included.

## TC-cli-9 (VS-4, R-017): git missing from PATH exits 2 with one JSON object that names git

- Given: PATH set to an empty directory; python3 started by its absolute path
- When: Run the four commands with --format sdlc/{name}
- Then: Exit 2, one JSON error that names git, empty stderr
- Expected: 4 runs exit 2
- Actual: 4 runs exit 2: "cannot check the branch format 'sdlc/{name}' with git check-ref-format: [Errno 2] No such file or directory: 'git'"
- Result: **pass**
- Spec source: R-017 quote (raises Fail unless the name passes git check-ref-format)
- Test: `.sdlc/slices/S-002/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:187`

```
$ PATH=$EMPTY /opt/homebrew/bin/python3 branches.py name ... --format 'sdlc/{name}'
exit: 2
--- stdout
{"ok": false, "error": "cannot check the branch format 'sdlc/{name}' with git check-ref-format: [Errno 2] No such file or directory: 'git'"}
--- stderr
(empty)
```

All transcripts: `.sdlc/slices/S-002/verification/r0/logs/cli-0-cli-9.txt`. Every transcript in the log ends with '--- tree <dir> (unchanged)' for the cwd and the --repo dir, git refs included.

## TC-cli-10 (VS-4, R-017): A fake git that exits 1 with empty stderr gives exit 2 and an exit-code reason

- Given: PATH holds only a fake git that exits 1 and writes nothing
- When: Run the four commands with --format sdlc/{name}
- Then: Exit 2, one JSON error with 'exit 1'
- Expected: 4 runs exit 2
- Actual: 4 runs exit 2: "... which git check-ref-format refuses: exit 1"
- Result: **pass**
- Spec source: R-017 quote
- Test: `.sdlc/slices/S-002/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:199`

```
$ PATH=$FAKE1 python3 branches.py name ... --format 'sdlc/{name}'
exit: 2
{"ok": false, "error": "the branch format 'sdlc/{name}' gives 'sdlc/S-001', which git check-ref-format refuses: exit 1"}
```

All transcripts: `.sdlc/slices/S-002/verification/r0/logs/cli-0-cli-10.txt`. Every transcript in the log ends with '--- tree <dir> (unchanged)' for the cwd and the --repo dir, git refs included.

## TC-cli-11 (VS-4, R-017): A fake git that exits 0 decides the verdict

- Given: PATH holds only a fake git that exits 0
- When: Run name with --format sdlc/{name}..
- Then: The plan notes say the git on PATH decides; the CLI exits 0
- Expected: Exit 0
- Actual: Exit 0; the refused format is admitted (see seed)
- Result: **pass**
- Spec source: VS-4 notes (shadowed git decides; seed, not a defect)
- Test: `.sdlc/slices/S-002/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:212`

```
$ PATH=$FAKE0 python3 branches.py name ... --format 'sdlc/{name}..'
exit: 0
{"ok": true, "command": "name", "format": "sdlc/{name}..", ...}
```

All transcripts: `.sdlc/slices/S-002/verification/r0/logs/cli-0-cli-11.txt`. Every transcript in the log ends with '--- tree <dir> (unchanged)' for the cwd and the --repo dir, git refs included.

## TC-cli-12 (VS-8, R-017): A config.json format that git refuses stops every command with one JSON error and changes nothing

- Given: A scratch repo with branches sdlc/S-001 and feature/x and config.json branchFormat sdlc/{name}..
- When: Run name, parse, list and preflight without --format, twice each
- Then: Exit 2, one JSON object, ok false, error holds 'is not a valid branch name' and check-ref-format; repo tree and refs unchanged; the second run is the same
- Expected: 8 runs exit 2, no change
- Actual: 8 runs exit 2 with the same error; tree and refs unchanged
- Result: **pass**
- Spec source: R-017 quote and acceptance (sdlc/{name}.. is rejected with the reason of git)
- Test: `.sdlc/slices/S-002/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:222`

```
$ python3 branches.py preflight --repo $REPO --mode pr
exit: 2
--- stdout
{"ok": false, "error": "the branch format 'sdlc/{name}..' gives 'sdlc/S-001..', which git check-ref-format refuses: fatal: 'sdlc/S-001..' is not a valid branch name"}
--- stderr
(empty)
--- tree $REPO (unchanged, refs included)
```

All transcripts: `.sdlc/slices/S-002/verification/r0/logs/cli-0-cli-12.txt`. Every transcript in the log ends with '--- tree <dir> (unchanged)' for the cwd and the --repo dir, git refs included.

## TC-cli-13 (VS-8, R-017): --format overrides config.json in both directions

- Given: One repo with valid config feature/{name}; one repo with invalid config sdlc/{name}.lock
- When: Run the four commands with --format sdlc/{name}.. on the valid repo, and --format sdlc/{name} on the invalid repo
- Then: Invalid --format over valid config exits 2 with the git reason; valid --format over invalid config exits 0 and echoes sdlc/{name}
- Expected: 4 exits of 2 and 4 exits of 0
- Actual: As expected; trees unchanged
- Result: **pass**
- Spec source: R-017 quote
- Test: `.sdlc/slices/S-002/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:237`

```
$ python3 branches.py list --repo $BADREPO --kind slice --format 'sdlc/{name}'
exit: 0
{"ok": true, "command": "list", "format": "sdlc/{name}", ...}
```

All transcripts: `.sdlc/slices/S-002/verification/r0/logs/cli-0-cli-13.txt`. Every transcript in the log ends with '--- tree <dir> (unchanged)' for the cwd and the --repo dir, git refs included.

## Attacks

None. The security profile covers the attack corpus for this slice.

## Seeds

- **A git binary on PATH decides the format verdict** (`skills/sdlc/branches.py`): validate_format runs the first git on PATH. A fake git that exits 0 admits sdlc/{name}.. (TC-cli-11). The spec does not pin the git binary. A caller that controls PATH controls the verdict.
- **Zero-width characters pass validate_format** (`skills/sdlc/branches.py`): U+200B, U+200D and U+FEFF are not matched by Python \s, and git accepts them, so a\u200bb/{name} is valid (TC-cli-5). The branch names then look the same as names without them. The spec forbids only whitespace.
- **Control characters U+001C to U+001F are reported as whitespace** (`skills/sdlc/branches.py`): Python \s matches U+001C to U+001F, so a\x1f/{name} fails with 'holds whitespace', not with the git reason. The verdict is correct; the message names the wrong cause.
- **testkit: cli-runner has no option for an absolute python path per run** (`skills/sdlc/test/testkit/cli-runner.mjs`): PATH tests must build a second runner with cliRunner({ python: <abs path> }), because the default python3 lookup uses the child PATH. A run option would make PATH-isolation cases shorter.
