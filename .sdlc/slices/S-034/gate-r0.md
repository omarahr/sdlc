Verdict: REFUTED

Worktree: `.claude/worktrees/sdlc-run`. Commit: a673f4198b3a7c5e8cde742d86f31b6013d331cb.

## Suites

| Command | Result | Counts | Duration |
|---|---|---|---|
| `npm test` | exit 0 | 773 passed, 0 failed, 1 skipped (774 tests) | 207 s, repeat run 212 s |
| lint | not set | none | none |
| typecheck | not set | none | none |
| build | not set | none | none |
| e2e | not set | none | none |

## Test-time budget

- The stored baseline for main was 88 s and valid.
- The machine load was high (load average above 20), so main ran again on the same machine: 113 s, 678 tests, all green.
- The branch takes 207 s and 212 s in two runs. It adds about 95 s, over the limit of max(60 s, 20 %).
- The branch adds 96 tests. The slowest are subprocess tests in `skills/sdlc/test/scripts.test.mjs` and `skills/sdlc/test/branches.test.mjs` (1 s to 12 s each).

Receipt: written with `--result fail` on a673f4198b3a7c5e8cde742d86f31b6013d331cb. Reason: the test-time budget.
