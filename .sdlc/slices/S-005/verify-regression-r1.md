Verdict: HELD

Worktree: detached worktree at $TMPDIR/sdlc-S-005-regression-r1 (removed after the run).
Commit: 112b45bfe8373410b89d0dc20933f538965373e5 (sdlc/S-005). Base: main. Scope: slice.

## Impact map

`impact.py --base main --head sdlc/S-005` ran. It mapped the diff to 23 suite test files in package `.`.
It also named 8 verification test files. The profile verifiers own those files, so this lens did not run them.
The product diff touches skills/sdlc/branches.py, janitor.py, next-action.py, state-write.py, the push guard and the testkit.

## Suites

| Command | Result | Counts | Duration |
|---|---|---|---|
| `node --test` on the 23 mapped suite files | exit 0 | 533 tests, 532 pass, 0 fail, 0 cancelled, 1 skipped | 66 s |
| `python3 -m py_compile` on branches.py, janitor.py, next-action.py, state-write.py, test/push_guard.py, test/testkit/pycall.py | exit 0 | 6 files compile | under 1 s |

The skipped test is "impact follows Go imports to reverse-dependent packages when a go.mod exists". It skips because Go is not installed.

`config.commands` defines no build, lint or typecheck command. Those steps do not apply.

## Requirement evidence

19 `done` requirements have `evidence.files` that intersect this diff (R-001, R-003 to R-007, R-012 to R-020, R-071, R-088, R-098, R-099).
Their suite evidence tests are in branches.test.mjs and git-modes.test.mjs. Both files ran in the table above and passed.
Their other evidence tests are verification files of slices S-001 to S-004. Those files are not in the branch or the working tree, so this lens could not run them.
