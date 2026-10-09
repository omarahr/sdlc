# S-001 verification: security, part 0, round 1

- Slice: S-001
- Profile: security
- Round: 1 (plan round 0)
- Commit: 4434d71
- Scenarios: VS-9
- Verdict: **verified**. All 8 cases pass. The round 0 failure TC-security-20 is fixed.

## Environment

macOS (Darwin 25.6), Python 3.14.7, Node 24.19.0; local CLI only; testkit cli-runner and attack-corpus (plantDecoy) from skills/sdlc/test/testkit at 4434d71; worktree of sdlc/S-001 at 4434d71

## Charter

Explore the branches import in next-action.py, state-write.py and janitor.py with decoy modules in the cwd, on PYTHONPATH and beside symlinks, to find a start path where a module other than skills/sdlc/branches.py binds, which breaks R-098 ('The branches import resolves through the script directory on sys.path').

## Threat model boundary

The spec states no threat model. Trusted: the files inside the skill directory and the Python interpreter. Untrusted: the cwd, PYTHONPATH and the path (symlink, relative path) through which a caller starts or loads a script. Attacks that need a write into the skill directory or control of the caller's own process are out of scope.

## Discrimination check

The same test file ran against de3dd5c, the commit before the fix. TC-security-20, 23, 24 and 26 failed there with exit 97 or a decoy bind. They pass at 4434d71. The run log is in `logs/security-0-run.txt`.

## TC-security-17: A decoy branches.py in the cwd or on PYTHONPATH never wins

- Given: A decoy branches.py (exits 97) in the cwd and one on PYTHONPATH; a shadow decoy on PYTHONPATH with PYTHONSAFEPATH=1.
- When: Run each of next-action.py, state-write.py and janitor.py with --help by absolute path, by a relative path, and with python3 -I.
- Then: Exit 0, no traceback, and no decoy import recorded.
- Expected: Exit 0, no traceback, and no decoy import recorded.
- Actual: All 12 runs exit 0. No decoy marker file exists.
- Result: **pass**
- Spec source: R-098 quote ('insert the script directory into sys.path and import it') and acceptance ('The branches import resolves through the script directory on sys.path')
- Test: `.sdlc/slices/S-001/verification/r1/tests/security-0/import.verify-security.test.mjs:31`
- Command: `SDLC_VERIFY_REPO=<worktree of sdlc/S-001 at 4434d71> node --test --test-name-pattern="VS-9 a decoy branches.py in the cwd" .sdlc/slices/S-001/verification/r1/tests/security-0/import.verify-security.test.mjs`

Evidence (attack): decoy in cwd and on PYTHONPATH — `.sdlc/slices/S-001/verification/r1/logs/security-0-transcripts.txt`

Evidence (file-tree): decoy markers

```
decoyFired(cwd decoy) = null
decoyFired(PYTHONPATH decoy) = null
decoyFired(shadow decoy) = null
```

## TC-security-18: A script loaded by path through importlib from a decoy cwd binds the real module

- Given: A decoy branches.py in the cwd and on PYTHONPATH.
- When: python3 -c loads each script with spec_from_file_location and prints mod.branches.__file__.
- Then: The printed path is skills/sdlc/branches.py; no decoy import.
- Expected: The printed path is skills/sdlc/branches.py; no decoy import.
- Actual: All three print skills/sdlc/branches.py. No decoy marker exists.
- Result: **pass**
- Spec source: R-098 quote ('insert the script directory into sys.path and import it') and acceptance ('The branches import resolves through the script directory on sys.path')
- Test: `.sdlc/slices/S-001/verification/r1/tests/security-0/import.verify-security.test.mjs:54`
- Command: `SDLC_VERIFY_REPO=<worktree of sdlc/S-001 at 4434d71> node --test --test-name-pattern="VS-9 a script loaded by path through importlib from a decoy cwd" .sdlc/slices/S-001/verification/r1/tests/security-0/import.verify-security.test.mjs`

Evidence (attack): importlib from a decoy cwd — `.sdlc/slices/S-001/verification/r1/logs/security-0-transcripts.txt`

## TC-security-19: A script run through a symlink without a decoy still runs

- Given: A symlink to each script in a scratch directory.
- When: Run python3 <link> --help.
- Then: Exit 0.
- Expected: Exit 0.
- Actual: All three exit 0 and print their usage.
- Result: **pass**
- Spec source: R-098 quote ('insert the script directory into sys.path and import it') and acceptance ('The branches import resolves through the script directory on sys.path')
- Test: `.sdlc/slices/S-001/verification/r1/tests/security-0/import.verify-security.test.mjs:67`
- Command: `SDLC_VERIFY_REPO=<worktree of sdlc/S-001 at 4434d71> node --test --test-name-pattern="VS-9 a script run through a symlink without" .sdlc/slices/S-001/verification/r1/tests/security-0/import.verify-security.test.mjs`

Evidence (attack): clean symlink — `.sdlc/slices/S-001/verification/r1/logs/security-0-transcripts.txt`

## TC-security-20: A script run through a symlink imports branches from the script directory, not the symlink directory

- Given: A directory that holds a symlink to the script and a decoy branches.py (exits 97).
- When: Run python3 <dir>/<script> --help for next-action.py, state-write.py and janitor.py.
- Then: Exit 0; no decoy import.
- Expected: Exit 0; no decoy import.
- Actual: All three exit 0 and print their usage. No decoy marker exists. Round 0 failed here with exit 97; the fix in 4434d71 inserts os.path.dirname(os.path.realpath(__file__)).
- Result: **pass**
- Spec source: R-098 quote ('insert the script directory into sys.path and import it') and acceptance ('The branches import resolves through the script directory on sys.path')
- Test: `.sdlc/slices/S-001/verification/r1/tests/security-0/import.verify-security.test.mjs:77`
- Command: `SDLC_VERIFY_REPO=<worktree of sdlc/S-001 at 4434d71> node --test --test-name-pattern="VS-9 a script run through a symlink imports" .sdlc/slices/S-001/verification/r1/tests/security-0/import.verify-security.test.mjs`

Evidence (attack): symlink with a decoy beside the link — `.sdlc/slices/S-001/verification/r1/logs/security-0-transcripts.txt`

```
$ python3 <scratch>/link-decoy-22/next-action.py --help
exit: 0 (50 ms)
--- stdout
usage: next-action.py [-h] --repo REPO [--main-root MAIN_ROOT] [--spec SPEC] ...
--- tree <scratch>/cwd-23 (unchanged)
```

Evidence (file-tree): decoy marker

```
decoyFired(link-decoy decoy) = null for all three scripts
```

## TC-security-23: A chain of two symlinks with a decoy beside each link resolves to the real script directory

- Given: Directory a holds a link to b/<script>; directory b holds a link to the real script. Each directory holds a decoy branches.py. The cwd is a.
- When: Run python3 a/<script> --help.
- Then: Exit 0; neither decoy is imported.
- Expected: Exit 0; neither decoy is imported.
- Actual: All three exit 0. Neither decoy marker exists.
- Result: **pass**
- Spec source: R-098 quote ('insert the script directory into sys.path and import it') and acceptance ('The branches import resolves through the script directory on sys.path')
- Test: `.sdlc/slices/S-001/verification/r1/tests/security-0/import.verify-security.test.mjs:90`
- Command: `SDLC_VERIFY_REPO=<worktree of sdlc/S-001 at 4434d71> node --test --test-name-pattern="VS-9 a chain of symlinks" .sdlc/slices/S-001/verification/r1/tests/security-0/import.verify-security.test.mjs`

Evidence (attack): symlink chain — `.sdlc/slices/S-001/verification/r1/logs/security-0-transcripts.txt`

## TC-security-24: A relative symlink run by a relative path from a decoy cwd resolves to the real module

- Given: The cwd holds a relative symlink to the script and a decoy branches.py. PYTHONPATH holds a decoy branches package (__init__.py exits 97).
- When: Run python3 ./<script> --help from that cwd.
- Then: Exit 0; neither decoy is imported.
- Expected: Exit 0; neither decoy is imported.
- Actual: All three exit 0. Neither decoy marker exists.
- Result: **pass**
- Spec source: R-098 quote ('insert the script directory into sys.path and import it') and acceptance ('The branches import resolves through the script directory on sys.path')
- Test: `.sdlc/slices/S-001/verification/r1/tests/security-0/import.verify-security.test.mjs:104`
- Command: `SDLC_VERIFY_REPO=<worktree of sdlc/S-001 at 4434d71> node --test --test-name-pattern="VS-9 a relative symlink" .sdlc/slices/S-001/verification/r1/tests/security-0/import.verify-security.test.mjs`

Evidence (attack): relative symlink, decoy module and decoy package — `.sdlc/slices/S-001/verification/r1/logs/security-0-transcripts.txt`

## TC-security-25: A script reached through a symlinked skill directory binds the real module

- Given: A directory holds a symlink to the whole skill directory and a decoy branches.py.
- When: Load each script through the linked directory with importlib and print mod.branches.__file__; also run it with --help.
- Then: The bound file resolves to skills/sdlc/branches.py; exit 0; no decoy import.
- Expected: The bound file resolves to skills/sdlc/branches.py; exit 0; no decoy import.
- Actual: All three bind the real branches.py and exit 0. No decoy marker exists.
- Result: **pass**
- Spec source: R-098 quote ('insert the script directory into sys.path and import it') and acceptance ('The branches import resolves through the script directory on sys.path')
- Test: `.sdlc/slices/S-001/verification/r1/tests/security-0/import.verify-security.test.mjs:117`
- Command: `SDLC_VERIFY_REPO=<worktree of sdlc/S-001 at 4434d71> node --test --test-name-pattern="VS-9 a script reached through a symlinked skill directory" .sdlc/slices/S-001/verification/r1/tests/security-0/import.verify-security.test.mjs`

Evidence (attack): symlinked skill directory — `.sdlc/slices/S-001/verification/r1/logs/security-0-transcripts.txt`

## TC-security-26: A script loaded through importlib by a symlink path with a decoy beside the link binds the real module

- Given: A directory holds a symlink to the script and a decoy branches.py; the cwd and PYTHONPATH are that directory.
- When: python3 -c loads <dir>/<script> with spec_from_file_location and prints mod.branches.__file__.
- Then: The bound file resolves to skills/sdlc/branches.py; no decoy import.
- Expected: The bound file resolves to skills/sdlc/branches.py; no decoy import.
- Actual: All three bind the real branches.py. No decoy marker exists.
- Result: **pass**
- Spec source: R-098 quote ('insert the script directory into sys.path and import it') and acceptance ('The branches import resolves through the script directory on sys.path')
- Test: `.sdlc/slices/S-001/verification/r1/tests/security-0/import.verify-security.test.mjs:133`
- Command: `SDLC_VERIFY_REPO=<worktree of sdlc/S-001 at 4434d71> node --test --test-name-pattern="VS-9 a script loaded through importlib by a symlink path" .sdlc/slices/S-001/verification/r1/tests/security-0/import.verify-security.test.mjs`

Evidence (attack): importlib through a symlink — `.sdlc/slices/S-001/verification/r1/logs/security-0-transcripts.txt`

## Attacks

| id | charter | input | expected | observed | result | test |
|---|---|---|---|---|---|---|
| A-23 | VS-9 re-run of TC-security-17: decoy in cwd, on PYTHONPATH, shadow with PYTHONSAFEPATH, python -I | decoy branches.py (exit 97 and shadow) | real module wins | exit 0, no decoy import | held | .sdlc/slices/S-001/verification/r1/tests/security-0/import.verify-security.test.mjs:31 |
| A-24 | VS-9 re-run of TC-security-18: importlib load from a decoy cwd | decoy branches.py in cwd and on PYTHONPATH | mod.branches is the real file | real file bound | held | .sdlc/slices/S-001/verification/r1/tests/security-0/import.verify-security.test.mjs:54 |
| A-25 | VS-9 re-run of TC-security-20: decoy beside a symlink to the script | <dir>/branches.py decoy, <dir>/<script> symlink | real module wins | exit 0, no decoy import (round 0: exit 97) | held | .sdlc/slices/S-001/verification/r1/tests/security-0/import.verify-security.test.mjs:77 |
| A-26 | VS-9 chain of two symlinks with decoys beside each link | a/<script> -> b/<script> -> skills/sdlc/<script> | real module wins | exit 0, no decoy import | held | .sdlc/slices/S-001/verification/r1/tests/security-0/import.verify-security.test.mjs:90 |
| A-27 | VS-9 relative symlink run as ./<script>, decoy module in cwd, decoy package on PYTHONPATH | ./<script> (relative link), branches.py, branches/__init__.py | real module wins | exit 0, no decoy import | held | .sdlc/slices/S-001/verification/r1/tests/security-0/import.verify-security.test.mjs:104 |
| A-28 | VS-9 symlinked skill directory with decoy beside the link | <dir>/skill -> skills/sdlc | real module wins | real file bound, exit 0 | held | .sdlc/slices/S-001/verification/r1/tests/security-0/import.verify-security.test.mjs:117 |
| A-29 | VS-9 importlib load through a symlink path with decoy beside the link and on PYTHONPATH | spec_from_file_location(<dir>/<script>) | real module wins | real file bound | held | .sdlc/slices/S-001/verification/r1/tests/security-0/import.verify-security.test.mjs:133 |
| A-30 | VS-9 hard link to a script with a decoy beside it | <dir>/<script> hard link, <dir>/branches.py decoy | none stated: a hard link is a second directory entry, and its directory is the script directory | all three exit 97; the decoy beside the hard link is imported | out-of-scope | .sdlc/slices/S-001/verification/r1/tests/security-0/import.verify-security.test.mjs:145 |
| A-31 | VS-9 a process that already imported another branches module loads a script by path | import branches (shadow decoy from PYTHONPATH), then importlib load of the script | none stated: the caller controls its own process | exit 0; mod.branches is the preloaded decoy from sys.modules | out-of-scope | .sdlc/slices/S-001/verification/r1/tests/security-0/import.verify-security.test.mjs:164 |

## Seeds

- **An in-process caller with a cached branches module binds it, not the skill's module** (`skills/sdlc/next-action.py`): When a process already holds sys.modules['branches'], a script loaded through importlib binds that cached module and ignores the sys.path line (A-31). A test harness that imports a fixture or an older branches.py and then loads next-action.py in the same process tests the wrong module. Callers in the repo load each script in a new process, so nothing breaks today. Keep that rule for later probes.
