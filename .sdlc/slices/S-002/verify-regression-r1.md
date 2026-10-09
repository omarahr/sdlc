Verdict: HELD

Worktree: detached worktree at `$TMPDIR/sdlc-S-002-regression-r1`, removed after the run.
Commit: `1b90e38a3a6aaf5be0e8a061eb9b06db68fa41e0` (`sdlc/S-002`). Scope: slice. Base: `main`.

## Mapping

`impact.py --base main --head sdlc/S-002` mapped the diff to package `.` and 26 test files. This lens ran the 22 suite files in `skills/sdlc/test/*.test.mjs` and `skills/sdlc/test/testkit/*.test.mjs`. The other 4 files are verification tests under `.sdlc/slices/S-002/verification/r0/tests/`. The profile verifiers own them.

The fix round adds one test to `branches.test.mjs`. It changes no product code.

## Suites

| Command | Result | Counts | Duration |
|---|---|---|---|
| `node --test skills/sdlc/test/*.test.mjs skills/sdlc/test/testkit/*.test.mjs` | exit 0, pass | 517 tests, 516 pass, 0 fail, 1 skip | 67.5 s |
| `python3 -m py_compile` on `branches.py`, `janitor.py`, `next-action.py`, `state-write.py`, `test/testkit/pycall.py` | exit 0, pass | 5 files | <1 s |

The config defines no `build` and no `typecheck` command. The py_compile step replaces them for the changed Python files.

The new test "validate_format rejects Unicode whitespace that git accepts" passed.

The one skip is "impact follows Go imports to reverse-dependent packages when a go.mod exists". It skips because Go is not installed on this host. This diff does not touch it.

## Done-requirement evidence

R-013, R-014, R-016, R-088 and R-098 list files in this diff. Their `evidence.tests` in `branches.test.mjs` and `git-modes.test.mjs` ran in the suite above, and all passed.

Their `TC-*` entries point to `.sdlc/slices/S-001/verification/r1/tests/`. Those files are not in the branch or in the main tree, so this lens could not run them. The committed tests that replace them passed.
