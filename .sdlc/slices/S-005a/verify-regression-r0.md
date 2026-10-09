Verdict: HELD

Worktree: `$TMPDIR/sdlc-S-005a-regression-r0` (detached, now removed). Commit: `de9cf46` (`sdlc/S-005a`).

The slice code diff is `skills/sdlc/branches.py` (+5) and `skills/sdlc/test/branches.test.mjs`. `impact.py` mapped the diff against `main` to the full `skills/sdlc/test/*.test.mjs` set, because `main` does not yet hold the earlier slices. That set is the whole `npm test` suite, so the run covers every mapped file. `config.commands` defines no build, lint or typecheck.

## Suites

| Command | Result | Counts | Duration |
|---|---|---|---|
| `npm test` | exit 0 | 510 tests, 509 pass, 0 fail, 1 skipped | 72 s |
| `node --test skills/sdlc/test/testkit/*.test.mjs` | exit 0 | 18 tests, 18 pass, 0 fail | 2.7 s |
| `node --test skills/sdlc/test/branches.test.mjs` | exit 0 | 33 tests, 33 pass, 0 fail | 11 s |
| `node --test .sdlc/slices/S-005/verification/r0/tests/contract-0/tails.verify-contract.test.mjs` | exit 0 | 18 tests, 18 pass, 0 fail | <1 s |
| `node --test .sdlc/slices/S-005/verification/r0/tests/security-0/tails.verify-security.test.mjs` | exit 1 (out of scope) | 13 tests, 12 pass, 1 fail (VS-8, push guard T-R-119) | <1 s |
| `node --test .sdlc/slices/S-005/verification/r0/tests/cli-0/branches.verify-cli.test.mjs` | exit 1 (out of scope) | 13 tests, 11 pass, 2 fail (TC-cli-10, TC-cli-11, push guard) | <1 s |

## Notes

- The three S-005 verification failures test `push_guard.py` and `push-guard.test.mjs`. Slice S-005b owns the push guard. Neither file exists on `sdlc/S-005a`. They do not block this slice.
- Done requirements whose `evidence.files` touch `branches.py` cite verification tests under `.sdlc/slices/S-001..S-004/verification/*/tests/`. These files are not in the branch or the main tree, so they could not run. Their `branches.test.mjs` and `git-modes.test.mjs` evidence ran green inside `npm test`.
- Evidence names T-025, T-026 and T-027 point at the old test titles. This slice renamed those tests to add the verify and attempt kinds. The renamed tests pass.
