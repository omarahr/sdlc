# Review: S-001, lens test-quality, round 2

Diff: `git diff main...sdlc/S-001` at 90d3251.

## Summary

Fix round 2 adds one test to `skills/sdlc/test/branches.test.mjs` (line 217). It promotes cli-0 TC-cli-16 from round 1. tests.md records the promotion. No product code changed.

The new test copies `branches.py` into a fresh scratch skill directory for each of eight `git-modes.json` shapes. It asserts that `preflight` exits 2 with exactly the keys `ok` and `error` and no traceback. It asserts that `name`, `parse` and `list` exit 0, print one object with the right `command`, and write nothing to stderr. The shapes match TC-cli-16 one for one.

The test checks behavior through the CLI. Its name is honest. It uses no sleeps, no network and no timing assertions. It does not duplicate the test at line 189, which covers a directory and an unreadable file. The diff holds no comments. No test runs the repo's test command.

Round-1 finding 1 is fixed. Round-1 findings 2, 3 and 4 were non-blocking and stay open as seeds.

## Findings

1. Non-blocking. No committed test pins the RecursionError catch in `load_git_modes`.
   - Fix round 1 added `RecursionError` to the `except` in `load_git_modes` (`branches.py:56`).
   - The committed deep-nesting test (line 257) covers `config.json` only. Verifier test TC-cli-21 in `.sdlc/slices/S-001/verification/r1/tests/cli-0/branches.verify-cli.test.mjs` covers a deeply nested `git-modes.json`, an empty-string mode, a `null` top level and a dangling symlink.
   - The skill ships `git-modes.json`, so a hostile shape there is unlikely. This does not block.
   - Fix: when a later slice touches `preflight`, add the deep-nesting and empty-string-mode shapes to the test at line 217.
