# Verification: S-001, profile cli, part 0, round 0

- Commit: de3dd5c
- Verdict: **refuted** (1 of 20 cases fails: TC-cli-20)
- Environment: macOS (Darwin 25.6), Python 3.14.7, Node v24.19.0, git; cli-runner scratch repos and copied skill directories; branches.py run as python3 <skill>/branches.py
- Tests: `.sdlc/slices/S-001/verification/r0/tests/cli-0/branches.verify-cli.test.mjs`
- Run: `cd .sdlc/slices/S-001/verification/r0/tests/cli-0 && node --test branches.verify-cli.test.mjs`

## TC-cli-1 (VS-1, R-088, R-013, R-014): name with every spec flag prints one JSON object, twice, from a repo path with a space and unicode

- Given: A scratch git repo at a path with a space and 'ünï'.
- When: python3 branches.py name --repo <repo> --kind verify --id S-001 --n 1 --area api --round 0 --profile http-api --part 0 --format feature/{name}, run twice.
- Then: Exit 0, stdout is one JSON line with ok true, command name, format feature/{name}; stderr empty; repo and cwd tree unchanged; both runs equal.
- Expected: One JSON object, exit 0, no stderr, no file change, same output twice.
- Actual: As expected. args echoes every flag with ints for n, round, part.
- Result: **pass**
- Spec source: R-088 acceptance; R-014 quote
- Test: `.sdlc/slices/S-001/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:64`
- Command: `cd .sdlc/slices/S-001/verification/r0/tests/cli-0 && node --test --test-name-pattern 'TC-cli-1:' branches.verify-cli.test.mjs`

transcript: name with all flags
```
### TC-cli-1
$ cd /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-yPZFGX/testkit-cli-KtDNh0/cwd-3
$ python3 /private/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-S-001-v0-cli-0/skills/sdlc/branches.py name --repo $'/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-yPZFGX/testkit-cli-KtDNh0/repo with space ünï-1' --kind verify --id S-001 --n 1 --area api --round 0 --profile http-api --part 0 --format 'feature/{name}'
exit: 0 (45 ms)
--- stdout
{"ok": true, "command": "name", "format": "feature/{name}", "args": {"repo": "/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-yPZFGX/testkit-cli-KtDNh0/repo with space \u00fcn\u00ef-1", "kind": "verify", "id": "S-001", "n": 1, "area": "api", "round": 0, "profile": "http-api", "part": 0}}
--- stderr

--- tree /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-yPZFGX/testkit-cli-KtDNh0/cwd-3 (unchanged)
--- tree /var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdlc-test-yPZFGX/testkit-cli-KtDNh0/repo with space ünï-1 (unchanged)
```

file-tree: repo and cwd tree
```
tree <cwd> (unchanged)
tree <repo with space ünï> (unchanged)
```

## TC-cli-2 (VS-1, R-088, R-014): parse, list, preflight and name with every flag, in other orders and with --flag=value

- Given: A scratch git repo.
- When: Run each command with all its flags in spec order, then in reverse order with --flag=value syntax; run each twice.
- Then: Exit 0, one JSON object, ok true, matching command, empty stderr, unchanged tree, same output twice.
- Expected: All seven argv shapes pass.
- Actual: As expected for all 14 runs.
- Result: **pass**
- Spec source: R-088 acceptance
- Test: `.sdlc/slices/S-001/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:72`
- Command: `cd .sdlc/slices/S-001/verification/r0/tests/cli-0 && node --test --test-name-pattern 'TC-cli-2:' branches.verify-cli.test.mjs`

transcript: TC-cli-2 runs
See `.sdlc/slices/S-001/verification/r0/logs/cli-0-transcripts.txt`.

## TC-cli-3 (VS-1, R-088): Each command with its optional flags left out

- Given: A scratch git repo.
- When: name --kind slice; parse --branch only; list --kind run; preflight --mode pr with and without --branch; name --kind attempt --id --n.
- Then: Exit 0 and one JSON object each.
- Expected: Exit 0, one JSON object, ok true.
- Actual: As expected.
- Result: **pass**
- Spec source: R-088 acceptance
- Test: `.sdlc/slices/S-001/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:88`
- Command: `cd .sdlc/slices/S-001/verification/r0/tests/cli-0 && node --test --test-name-pattern 'TC-cli-3:' branches.verify-cli.test.mjs`

transcript: TC-cli-3 runs
See `.sdlc/slices/S-001/verification/r0/logs/cli-0-transcripts.txt`.

## TC-cli-4 (VS-2, R-088, R-014): A flag that the command does not name exits 2 with one JSON error

- Given: A scratch git repo.
- When: parse --kind; list --branch; preflight --kind; name --branch; list --id; parse --mode; preflight --n; name --bogus.
- Then: Exit 2; stdout is exactly {ok:false, error:<non-empty string>}; no usage text on stdout.
- Expected: Exit 2 with the JSON error object.
- Actual: All eight exit 2 with 'unrecognized arguments: ...'; stderr empty.
- Result: **pass**
- Spec source: R-088 acceptance ("accepts the flags its line names"); R-014 quote
- Test: `.sdlc/slices/S-001/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:97`
- Command: `cd .sdlc/slices/S-001/verification/r0/tests/cli-0 && node --test --test-name-pattern 'TC-cli-4:' branches.verify-cli.test.mjs`

transcript: TC-cli-4 runs
See `.sdlc/slices/S-001/verification/r0/logs/cli-0-transcripts.txt`.

## TC-cli-5 (VS-2, R-014, R-088): Missing required flag, no command, unknown command

- Given: A scratch git repo.
- When: parse/name/preflight/list without their required --branch/--kind/--mode; each command without --repo; no argument; 'bogus'; '--repo X' with no command.
- Then: Exit 2 with one JSON error object each.
- Expected: Exit 2 with the JSON error object.
- Actual: As expected for all eleven; stderr empty.
- Result: **pass**
- Spec source: R-014 quote
- Test: `.sdlc/slices/S-001/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:111`
- Command: `cd .sdlc/slices/S-001/verification/r0/tests/cli-0 && node --test --test-name-pattern 'TC-cli-5:' branches.verify-cli.test.mjs`

transcript: TC-cli-5 runs
See `.sdlc/slices/S-001/verification/r0/logs/cli-0-transcripts.txt`.

## TC-cli-6 (VS-2, R-014): A flag given twice and an extra positional argument

- Given: A scratch git repo.
- When: parse --branch a --branch b; parse --branch a extra; name extra --repo R --kind slice.
- Then: One JSON object each; the positional extra exits 2.
- Expected: Duplicate flag: one JSON object. Positional extra: exit 2 JSON error.
- Actual: Duplicate --branch exits 0 and keeps the last value ('b'). Both extra-positional runs exit 2 with 'unrecognized arguments: extra'.
- Result: **pass**
- Spec source: R-014 quote
- Test: `.sdlc/slices/S-001/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:128`
- Command: `cd .sdlc/slices/S-001/verification/r0/tests/cli-0 && node --test --test-name-pattern 'TC-cli-6:' branches.verify-cli.test.mjs`

transcript: TC-cli-6 runs
See `.sdlc/slices/S-001/verification/r0/logs/cli-0-transcripts.txt`.

## TC-cli-7 (VS-2, R-088): Flag prefixes (allow_abbrev) are recorded

- Given: A scratch git repo.
- When: parse with --r/--re/--rep for --repo and --f/--fo/--for/--form/--forma for --format.
- Then: One JSON object each; behavior recorded.
- Expected: Record only: the spec does not name prefixes.
- Actual: All eight prefixes exit 0 and act as the full flag. Reported as a seed.
- Result: **pass**
- Spec source: R-014 quote (one JSON object)
- Test: `.sdlc/slices/S-001/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:137`
- Command: `cd .sdlc/slices/S-001/verification/r0/tests/cli-0 && node --test --test-name-pattern 'TC-cli-7:' branches.verify-cli.test.mjs`

transcript: prefix outcomes
```
{"--r":0,"--re":0,"--rep":0,"--f":0,"--fo":0,"--for":0,"--form":0,"--forma":0}
```

## TC-cli-8 (VS-2, R-014): -h and --help are recorded

- Given: None.
- When: branches.py --help; -h; name --help; preflight -h.
- Then: Behavior recorded; the spec does not define help.
- Expected: Record only.
- Actual: Each prints argparse usage text on stdout and exits 0, not JSON. Reported as a seed.
- Result: **pass**
- Spec source: none (record only; plan.md Risks accepts this)
- Test: `.sdlc/slices/S-001/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:151`
- Command: `cd .sdlc/slices/S-001/verification/r0/tests/cli-0 && node --test --test-name-pattern 'TC-cli-8:' branches.verify-cli.test.mjs`

transcript: TC-cli-8 runs
See `.sdlc/slices/S-001/verification/r0/logs/cli-0-transcripts.txt`.

## TC-cli-9 (VS-3, R-014, R-088): A non-integer --n, --round or --part exits 2 with one JSON error

- Given: A scratch git repo.
- When: name --kind verify with --n two, 1.5, '', --round 0x1, 1e3, --part one, --n '٣x', both as two argv items and as --flag=value.
- Then: Exit 2 with one JSON error object each.
- Expected: Exit 2 with the JSON error object.
- Actual: As expected for all 14 runs ('argument --n: invalid int value: ...').
- Result: **pass**
- Spec source: R-014 quote
- Test: `.sdlc/slices/S-001/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:158`
- Command: `cd .sdlc/slices/S-001/verification/r0/tests/cli-0 && node --test --test-name-pattern 'TC-cli-9:' branches.verify-cli.test.mjs`

transcript: TC-cli-9 runs
See `.sdlc/slices/S-001/verification/r0/logs/cli-0-transcripts.txt`.

## TC-cli-10 (VS-3, R-014): Odd integer values for --n, --round and --part are recorded

- Given: A scratch git repo.
- When: --part=-1, --n=99999999999999999999, --n=' 3', --n=٣ (Arabic-Indic 3), --round=0003, --n=1_000, --n=+4.
- Then: One JSON object each; behavior recorded.
- Expected: Record only in this slice.
- Actual: All exit 0. Parsed values: -1, 100000000000000000000, 3, 3, 3, 1000, 4. Reported as a seed for the slices that build tails.
- Result: **pass**
- Spec source: R-014 quote (one JSON object)
- Test: `.sdlc/slices/S-001/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:166`
- Command: `cd .sdlc/slices/S-001/verification/r0/tests/cli-0 && node --test --test-name-pattern 'TC-cli-10:' branches.verify-cli.test.mjs`

transcript: odd integer outcomes
```
{"--part=-1":-1,"--n=99999999999999999999":100000000000000000000,"--n= 3":3,"--n=٣":3,"--round=0003":3,"--n=1_000":1000,"--n=+4":4}
```

## TC-cli-11 (VS-4, R-014): An invalid --format exits 2 with one JSON error on every command

- Given: A scratch git repo.
- When: 19 formats on name, parse, list and preflight: no placeholder, two placeholders, stray { or }, {id}, {NAME}, {name:upper}, space, tab, newline, CR, U+00A0, U+3000, and ''.
- Then: Exit 2 with one JSON error object on all 76 runs.
- Expected: Exit 2 with the JSON error object.
- Actual: As expected; '' is refused and does not fall back to config.
- Result: **pass**
- Spec source: R-014 acceptance (invalid --format exits 2); spec §2 validate_format
- Test: `.sdlc/slices/S-001/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:184`
- Command: `cd .sdlc/slices/S-001/verification/r0/tests/cli-0 && node --test --test-name-pattern 'TC-cli-11:' branches.verify-cli.test.mjs`

transcript: TC-cli-11 runs
See `.sdlc/slices/S-001/verification/r0/logs/cli-0-transcripts.txt`.

## TC-cli-12 (VS-4, R-014): Valid --format controls pass on every command

- Given: A scratch git repo.
- When: sdlc/{name}, sdlc/{name:lower}, feature/{name}-x, feature/PROJ-123-{name}, {name} on all four commands.
- Then: Exit 0, one JSON object, format equals the input.
- Expected: Exit 0 and format echoed.
- Actual: As expected for all 20 runs.
- Result: **pass**
- Spec source: spec §1 format; R-014
- Test: `.sdlc/slices/S-001/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:193`
- Command: `cd .sdlc/slices/S-001/verification/r0/tests/cli-0 && node --test --test-name-pattern 'TC-cli-12:' branches.verify-cli.test.mjs`

transcript: TC-cli-12 runs
See `.sdlc/slices/S-001/verification/r0/logs/cli-0-transcripts.txt`.

## TC-cli-13 (VS-5, R-014): An unknown --kind or --mode exits 2

- Given: A scratch git repo.
- When: --kind bogus, SLICE, '', 'slice ', Slice, e2e_area on name and list; --mode bogus, PR, '', 'pr ', Direct on preflight.
- Then: Exit 2 with one JSON error object each.
- Expected: Exit 2 with the JSON error object.
- Actual: As expected for all 17 runs.
- Result: **pass**
- Spec source: R-014 quote; spec §1 kinds
- Test: `.sdlc/slices/S-001/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:202`
- Command: `cd .sdlc/slices/S-001/verification/r0/tests/cli-0 && node --test --test-name-pattern 'TC-cli-13:' branches.verify-cli.test.mjs`

transcript: TC-cli-13 runs
See `.sdlc/slices/S-001/verification/r0/logs/cli-0-transcripts.txt`.

## TC-cli-14 (VS-5, R-014, R-088): All eight kinds and all four git modes pass

- Given: A scratch git repo.
- When: name and list with each of run, slice, milestone, e2e, e2e-area, state, verify, attempt; preflight with pr, direct, mr, stack.
- Then: Exit 0 and one JSON object each.
- Expected: Exit 0.
- Actual: As expected for all 20 runs.
- Result: **pass**
- Spec source: spec §1 kind table; git-modes.json
- Test: `.sdlc/slices/S-001/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:212`
- Command: `cd .sdlc/slices/S-001/verification/r0/tests/cli-0 && node --test --test-name-pattern 'TC-cli-14:' branches.verify-cli.test.mjs`

transcript: TC-cli-14 runs
See `.sdlc/slices/S-001/verification/r0/logs/cli-0-transcripts.txt`.

## TC-cli-15 (VS-5, R-014): A --repo that is not a directory exits 2; a symlink to a directory and a path with .. pass

- Given: A missing path, a regular file, a broken symlink, '', a symlink to a repo, and '<repo>/../<repo name>'.
- When: Each of the four commands with each bad --repo; parse with the symlink and the .. path.
- Then: Bad --repo exits 2 with one JSON error; symlink and .. exit 0.
- Expected: As expected.
- Actual: As expected for all 18 runs.
- Result: **pass**
- Spec source: R-014 quote
- Test: `.sdlc/slices/S-001/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:222`
- Command: `cd .sdlc/slices/S-001/verification/r0/tests/cli-0 && node --test --test-name-pattern 'TC-cli-15:' branches.verify-cli.test.mjs`

transcript: TC-cli-15 runs
See `.sdlc/slices/S-001/verification/r0/logs/cli-0-transcripts.txt`.

## TC-cli-16 (VS-5, R-014): A missing or malformed git-modes.json fails preflight with one JSON error; the other commands still run

- Given: A copied skill directory with git-modes.json removed, invalid JSON, an empty list, the wrong key, a top-level list, a string, a non-string entry, or invalid UTF-8.
- When: preflight --mode pr, then name, parse and list, from the copied skill.
- Then: preflight exits 2 with one JSON error; name, parse and list exit 0.
- Expected: As expected.
- Actual: As expected for all eight shapes.
- Result: **pass**
- Spec source: R-014 quote; ADR-20261009-024048 (no exit 1)
- Test: `.sdlc/slices/S-001/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:240`
- Command: `cd .sdlc/slices/S-001/verification/r0/tests/cli-0 && node --test --test-name-pattern 'TC-cli-16:' branches.verify-cli.test.mjs`

transcript: TC-cli-16 runs
See `.sdlc/slices/S-001/verification/r0/logs/cli-0-transcripts.txt`.

## TC-cli-17 (VS-6, R-016): parse and list without --format print the config format or the default

- Given: Scratch repos whose config holds feature/{name}, x/{name:lower}, no key, '', null, 7, a list; a top-level list or string; no config.json; no .sdlc.
- When: parse --branch x and list --kind slice with no --format.
- Then: format is the config value when it is a non-empty string, else sdlc/{name}.
- Expected: Config value for the two string cases; sdlc/{name} for the other nine.
- Actual: As expected for all 11 states.
- Result: **pass**
- Spec source: R-016 quote and acceptance
- Test: `.sdlc/slices/S-001/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:270`
- Command: `cd .sdlc/slices/S-001/verification/r0/tests/cli-0 && node --test --test-name-pattern 'TC-cli-17:' branches.verify-cli.test.mjs`

transcript: TC-cli-17 runs
See `.sdlc/slices/S-001/verification/r0/logs/cli-0-transcripts.txt`.

## TC-cli-18 (VS-6, R-016, R-014): An unreadable or malformed config exits 2 with one JSON error, not a traceback

- Given: Config is truncated JSON, a directory, invalid UTF-8, or mode 000.
- When: parse --branch x with no --format.
- Then: Exit 2 with one JSON error object; no traceback.
- Expected: As expected.
- Actual: As expected for all four states.
- Result: **pass**
- Spec source: R-014 quote; ADR-20261009-024048 (no exit 1)
- Test: `.sdlc/slices/S-001/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:292`
- Command: `cd .sdlc/slices/S-001/verification/r0/tests/cli-0 && node --test --test-name-pattern 'TC-cli-18:' branches.verify-cli.test.mjs`

transcript: TC-cli-18 runs
See `.sdlc/slices/S-001/verification/r0/logs/cli-0-transcripts.txt`.

## TC-cli-19 (VS-6, R-016): A config with a UTF-8 BOM is recorded

- Given: Config holds a UTF-8 BOM, then {"branchFormat":"feature/{name}"}.
- When: parse --branch x with no --format.
- Then: One JSON object; behavior recorded.
- Expected: Record only.
- Actual: Exit 2: 'is not valid JSON: Unexpected UTF-8 BOM'. Reported as a seed.
- Result: **pass**
- Spec source: R-014 quote (one JSON object)
- Test: `.sdlc/slices/S-001/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:312`
- Command: `cd .sdlc/slices/S-001/verification/r0/tests/cli-0 && node --test --test-name-pattern 'TC-cli-19:' branches.verify-cli.test.mjs`

transcript: TC-cli-19 run
See `.sdlc/slices/S-001/verification/r0/logs/cli-0-transcripts.txt`.

## TC-cli-20 (VS-5, R-014): A git-modes.json that cannot be read fails preflight with exit 1 and a traceback

- Given: A copied skill directory where git-modes.json is a directory, or a file with mode 000.
- When: python3 <copy>/branches.py preflight --repo <repo> --mode pr.
- Then: Exit 2 with one JSON error object, like the missing-file and invalid-JSON cases; no traceback.
- Expected: Exit 2 with {ok:false, error}.
- Actual: Exit 1, empty stdout, Python traceback on stderr: IsADirectoryError (directory) and PermissionError (mode 000). load_git_modes catches FileNotFoundError, ValueError, KeyError and TypeError, but no other OSError.
- Result: **fail**
- Spec source: ADR-20261009-024048 (option 1: 'no exit 1'; plan.md critique response: 'No path exits 1'); R-014 quote ('Every command prints one JSON object')
- Test: `.sdlc/slices/S-001/verification/r0/tests/cli-0/branches.verify-cli.test.mjs:319`
- Command: `cd .sdlc/slices/S-001/verification/r0/tests/cli-0 && node --test --test-name-pattern 'TC-cli-20:' branches.verify-cli.test.mjs`

transcript: preflight with git-modes.json as a directory and as mode 000
See `.sdlc/slices/S-001/verification/r0/logs/cli-0-tc20.txt`.

log: source
```
skills/sdlc/branches.py:50-58 load_git_modes
    except FileNotFoundError: ...
    except (ValueError, KeyError, TypeError) as e: ...
(no except OSError, unlike load_format at line 27)
```

## Attacks

None in this profile.

## Seeds

- **argparse accepts flag prefixes** (`skills/sdlc/branches.py`): allow_abbrev is on. parse accepts --r, --re, --rep for --repo and --f to --forma for --format, exit 0. The spec names full flags only. Set allow_abbrev=False on the parser and each subparser if the contract must be exact (TC-cli-7).
- **--n, --round and --part accept negative, huge, padded, underscore and non-ASCII digit values** (`skills/sdlc/branches.py`): type=int accepts -1, 99999999999999999999, ' 3', '٣', '0003', '1_000' and '+4' (TC-cli-10). The tails in spec §1 need non-negative ASCII integers; a run-<n> or attempt-<n> name from '-1' or '٣' would be odd. The slices that build name() should reject these.
- **A flag given twice keeps the last value silently** (`skills/sdlc/branches.py`): parse --branch a --branch b exits 0 with branch b (TC-cli-6). Consider refusing duplicates as bad input.
- **--help prints argparse usage and exits 0, not JSON** (`skills/sdlc/branches.py`): branches.py --help, -h and '<command> --help' print usage text on stdout with exit 0 (TC-cli-8). The plan accepts this; a caller that parses stdout as JSON breaks on it.
- **A config.json with a UTF-8 BOM is refused** (`skills/sdlc/branches.py`): load_format opens with encoding utf-8, so a BOM gives 'Unexpected UTF-8 BOM' and exit 2 (TC-cli-19). Windows editors write a BOM. Reading with utf-8-sig would accept it.
- **testkit: copySkill cannot turn an existing file into a directory** (`skills/sdlc/test/testkit/cli-runner.mjs`): copySkill({files: {'git-modes.json': null}}) throws EEXIST because writeFiles calls mkdirSync on the existing file. Callers must add the path to omit too.
