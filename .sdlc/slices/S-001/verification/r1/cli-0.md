# Verification: S-001, profile cli, part 0, round 1

- Slice: S-001
- Profile: cli
- Round: 1 (plan round 0)
- Commit: 4434d71
- Verdict: pass. Eight cases ran on VS-5. All eight pass.

Environment: macOS (Darwin 25.6), Python 3.14, Node v24, git; cli-runner scratch repos and copied skill directories; branches.py run as python3 <skill>/branches.py from the worktree of sdlc/S-001 at 4434d71.

Round 1 re-runs the VS-5 cases of round 0 (TC-cli-13 to TC-cli-16 and TC-cli-20). TC-cli-20 failed in round 0. It passes now. Three new cases check the area near the fix.

## TC-cli-13: An unknown --kind or --mode exits 2 with one JSON error

- Scenario: VS-5; requirements: R-014
- Given: A scratch git repo and the shipped skill directory.
- When: name and list run with --kind bogus, SLICE, '', 'slice ', Slice, e2e_area; preflight runs with --mode bogus, PR, '', 'pr ', Direct.
- Then: Each run exits 2 and prints one {ok:false, error} line, empty stderr, no usage text.
- Expected: Exit 2 with the JSON error object.
- Actual: As expected for all 17 runs.
- Result: pass
- Spec source: R-014 quote; spec §1 kinds
- Test: `.sdlc/slices/S-001/verification/r1/tests/cli-0/branches.verify-cli.test.mjs:62`
- Command: `cd .sdlc/slices/S-001/verification/r1/tests/cli-0 && node --test --test-name-pattern 'TC-cli-13:' branches.verify-cli.test.mjs`

Transcript (re-run of r0 case):

```
$ python3 <skill>/branches.py list --repo <repo> --kind SLICE
exit: 2
--- stdout
{"ok": false, "error": "--kind 'SLICE' is not one of run, slice, milestone, e2e, e2e-area, state, verify, attempt"}
--- stderr
(empty)
```

Full transcripts with tree diffs: `.sdlc/slices/S-001/verification/r1/logs/cli-0-transcripts.txt`.

## TC-cli-14: All eight kinds and all four git modes pass

- Scenario: VS-5; requirements: R-014
- Given: A scratch git repo.
- When: name and list run with each of the eight kinds; preflight runs with pr, direct, mr and stack.
- Then: Each run exits 0 with one {ok:true} object and empty stderr.
- Expected: Exit 0.
- Actual: As expected for all 20 runs.
- Result: pass
- Spec source: spec §1 kind table; git-modes.json
- Test: `.sdlc/slices/S-001/verification/r1/tests/cli-0/branches.verify-cli.test.mjs:72`
- Command: `cd .sdlc/slices/S-001/verification/r1/tests/cli-0 && node --test --test-name-pattern 'TC-cli-14:' branches.verify-cli.test.mjs`

Transcript (re-run of r0 case):

```
$ python3 <skill>/branches.py preflight --repo <repo> --mode stack
exit: 0
--- stdout
{"ok": true, "command": "preflight", "format": "sdlc/{name}", "args": {...}}
```

Full transcripts with tree diffs: `.sdlc/slices/S-001/verification/r1/logs/cli-0-transcripts.txt`.

## TC-cli-15: A --repo that is not a directory exits 2; a symlink to a directory and a path with .. pass

- Scenario: VS-5; requirements: R-014
- Given: A missing path, a regular file, a dangling symlink, an empty string, a symlink to the repo and a path with '..'.
- When: All four commands run with each bad --repo; parse runs with the symlink and the '..' path.
- Then: Bad paths exit 2 with one JSON error; the symlink and '..' paths exit 0.
- Expected: As stated.
- Actual: As expected for all 18 runs.
- Result: pass
- Spec source: R-014 quote
- Test: `.sdlc/slices/S-001/verification/r1/tests/cli-0/branches.verify-cli.test.mjs:82`
- Command: `cd .sdlc/slices/S-001/verification/r1/tests/cli-0 && node --test --test-name-pattern 'TC-cli-15:' branches.verify-cli.test.mjs`

Transcript (re-run of r0 case):

```
$ python3 <skill>/branches.py preflight --repo <base>/missing --mode pr
exit: 2
--- stdout
{"ok": false, "error": "--repo '<base>/missing' is not a directory"}
```

Full transcripts with tree diffs: `.sdlc/slices/S-001/verification/r1/logs/cli-0-transcripts.txt`.

## TC-cli-16: A missing or malformed git-modes.json fails preflight with one JSON error; the other commands still run

- Scenario: VS-5; requirements: R-014
- Given: Eight copied skill directories: git-modes.json absent, invalid JSON, empty list, wrong key, top-level list, string value, non-string entry, invalid UTF-8.
- When: preflight, name, parse and list run with each copy.
- Then: preflight exits 2 with one JSON error; the other three exit 0.
- Expected: As stated.
- Actual: As expected for all eight shapes.
- Result: pass
- Spec source: R-014 quote; ADR-20261009-024048 (no exit 1)
- Test: `.sdlc/slices/S-001/verification/r1/tests/cli-0/branches.verify-cli.test.mjs:100`
- Command: `cd .sdlc/slices/S-001/verification/r1/tests/cli-0 && node --test --test-name-pattern 'TC-cli-16:' branches.verify-cli.test.mjs`

Transcript (re-run of r0 case):

```
$ python3 <skill-copy>/branches.py preflight --repo <repo> --mode pr   (git-modes.json absent)
exit: 2
--- stdout
{"ok": false, "error": "<skill-copy>/git-modes.json is missing: restore it from git"}
```

Full transcripts with tree diffs: `.sdlc/slices/S-001/verification/r1/logs/cli-0-transcripts.txt`.

## TC-cli-20: A git-modes.json that cannot be read fails preflight with one JSON error and exit 2, not exit 1

- Scenario: VS-5; requirements: R-014
- Given: Two copied skill directories: git-modes.json is a directory; git-modes.json has mode 000.
- When: preflight --mode pr runs with each copy; parse, name and list run with each copy.
- Then: preflight exits 2 with one {ok:false, error} line and empty stderr; the other commands exit 0.
- Expected: Exit 2 with {ok:false, error}; no traceback.
- Actual: Exit 2 for both shapes. The error reads 'cannot read <path>: [Errno 21] Is a directory' and '[Errno 13] Permission denied'. Stderr is empty. The other three commands exit 0. The r0 failure is fixed by 4434d71.
- Result: pass
- Spec source: ADR-20261009-024048 (no exit 1); R-014 quote
- Test: `.sdlc/slices/S-001/verification/r1/tests/cli-0/branches.verify-cli.test.mjs:120`
- Command: `cd .sdlc/slices/S-001/verification/r1/tests/cli-0 && node --test --test-name-pattern 'TC-cli-20:' branches.verify-cli.test.mjs`

Transcript (r0 failure re-run):

```
$ python3 <skill-98>/branches.py preflight --repo <plain-1> --mode pr
exit: 2 (40 ms)
--- stdout
{"ok": false, "error": "cannot read <skill-98>/git-modes.json: [Errno 21] Is a directory: '<skill-98>/git-modes.json'"}
--- stderr
(empty)
--- tree <cwd-100> (unchanged)
--- tree <plain-1> (unchanged)
```

Full transcripts with tree diffs: `.sdlc/slices/S-001/verification/r1/logs/cli-0-transcripts.txt`.

## TC-cli-21: Other git-modes.json shapes near the fix fail preflight with one JSON error and exit 2

- Scenario: VS-5; requirements: R-014
- Given: Eight copied skill directories: 100000-deep nested list, a symlink loop, a dangling symlink, an empty file, UTF-16 with BOM, top-level null, gitModes as an object, an empty-string mode.
- When: preflight runs with --mode pr and --mode bogus on each copy; name and list run on each copy.
- Then: Both preflight runs exit 2 with one JSON error and empty stderr; name and list exit 0.
- Expected: As stated.
- Actual: As expected for all eight shapes. The symlink loop gives '[Errno 62] Too many levels of symbolic links' through the new OSError branch. The deep list parses and fails the shape check.
- Result: pass
- Spec source: R-014 quote; ADR-20261009-024048 (no exit 1)
- Test: `.sdlc/slices/S-001/verification/r1/tests/cli-0/branches.verify-cli.test.mjs:138`
- Command: `cd .sdlc/slices/S-001/verification/r1/tests/cli-0 && node --test --test-name-pattern 'TC-cli-21:' branches.verify-cli.test.mjs`

Transcript (fix-adjacent shapes):

```
$ python3 <skill-113>/branches.py preflight --repo <repo> --mode pr   (symlink loop)
exit: 2
--- stdout
{"ok": false, "error": "cannot read <skill-113>/git-modes.json: [Errno 62] Too many levels of symbolic links: ..."}
$ ... (utf16)
exit: 2
{"ok": false, "error": "<skill-128>/git-modes.json must hold {\"gitModes\": [...]}: 'utf-8' codec can't decode byte 0xff in position 0: invalid start byte"}
```

Full transcripts with tree diffs: `.sdlc/slices/S-001/verification/r1/logs/cli-0-transcripts.txt`.

## TC-cli-22: A bad --repo beside a bad --kind, --mode or git-modes.json still gives one JSON error and exit 2

- Scenario: VS-5; requirements: R-014
- Given: A missing --repo path and a skill copy whose git-modes.json is a directory.
- When: name, list and preflight run with two bad inputs at once.
- Then: Each run exits 2 with one JSON error and empty stderr.
- Expected: As stated.
- Actual: As expected for all five runs.
- Result: pass
- Spec source: R-014 quote
- Test: `.sdlc/slices/S-001/verification/r1/tests/cli-0/branches.verify-cli.test.mjs:160`
- Command: `cd .sdlc/slices/S-001/verification/r1/tests/cli-0 && node --test --test-name-pattern 'TC-cli-22:' branches.verify-cli.test.mjs`

Transcript (combined bad inputs):

```
$ python3 <skill-copy>/branches.py preflight --repo <combo>/missing --mode pr
exit: 2
--- stdout
{"ok": false, "error": "--repo '<combo>/missing' is not a directory"}
```

Full transcripts with tree diffs: `.sdlc/slices/S-001/verification/r1/logs/cli-0-transcripts.txt`.

## TC-cli-23: A --repo directory that cannot be read, a FIFO and a non-git directory give exit 0 or a JSON error, never a traceback

- Scenario: VS-5; requirements: R-014
- Given: A directory with mode 000, a FIFO and a plain directory with no .git.
- When: parse and preflight run on the FIFO; name and preflight run on the plain directory; parse and list run on the mode-000 directory with and without --format.
- Then: The FIFO exits 2. The plain directory exits 0. The mode-000 directory gives one JSON object with exit 0 or 2.
- Expected: No traceback; one JSON object.
- Actual: FIFO: exit 2, not a directory. Plain directory: exit 0. Mode 000 without --format: exit 2, 'cannot read <repo>/.sdlc/config.json: [Errno 13] Permission denied'. Mode 000 with --format: exit 0. Bad --kind on it: exit 2.
- Result: pass
- Spec source: R-014 quote
- Test: `.sdlc/slices/S-001/verification/r1/tests/cli-0/branches.verify-cli.test.mjs:171`
- Command: `cd .sdlc/slices/S-001/verification/r1/tests/cli-0 && node --test --test-name-pattern 'TC-cli-23:' branches.verify-cli.test.mjs`

Transcript (repo permission shapes):

```
$ python3 <skill>/branches.py parse --repo <repo-perm>/locked --branch x
exit: 2 (43 ms)
--- stdout
{"ok": false, "error": "cannot read <repo-perm>/locked/.sdlc/config.json: [Errno 13] Permission denied: ..."}
--- stderr
(empty)
$ ... parse --repo <repo-perm>/locked --branch x --format 'sdlc/{name}'
exit: 0 (40 ms)
```

Full transcripts with tree diffs: `.sdlc/slices/S-001/verification/r1/logs/cli-0-transcripts.txt`.

## Attacks

None in this profile.

## Seeds

- **A --repo directory that cannot be read passes when --format is given** (`skills/sdlc/branches.py`): With mode 000 on --repo, parse exits 2 without --format (config.json read fails) but exits 0 with --format, because _repo checks only os.path.isdir (TC-cli-23). Later slices that run git in --repo will meet the error there. Consider an os.access(repo, R_OK | X_OK) check in _repo.
- **GIT_MODES_PATH still uses abspath, not realpath** (`skills/sdlc/branches.py`): The fix made the three scripts resolve their directory through realpath. branches.py builds GIT_MODES_PATH from os.path.abspath(__file__). A branches.py run through a symlink in another directory reads git-modes.json beside the symlink, or reports it missing. Not tested here; out of VS-5 scope.
