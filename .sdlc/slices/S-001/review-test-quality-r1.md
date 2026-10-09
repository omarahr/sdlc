# Review: S-001, lens test-quality, round 1

Diff: `git diff main...sdlc/S-001` at 4434d71.

## Summary

The tests check behavior through the CLI and through probes that load the module by path. The names are honest. The tests use no sleeps, no network and no timing assertions. The code and the tests carry no comments. The `# noqa: E402` lines are linter suppressions. No test runs the repo's test command. The three round-0 refutations have promoted tests with a record in tests.md.

## Findings

1. Blocking. Promote verifier test TC-cli-16.
   - Path: `.sdlc/slices/S-001/verification/r1/tests/cli-0/branches.verify-cli.test.mjs` (TC-cli-16, line 100).
   - No committed test pins how `branches.py preflight` acts on a missing or malformed `git-modes.json`. The cases are an absent file, invalid JSON, `{"gitModes": []}`, a missing `gitModes` key, a non-list and a non-string mode.
   - No committed test pins that `name`, `parse` and `list` still run when that file is bad. The plan requires this: the module reads the file only in `preflight`.
   - `git-modes.test.mjs` covers only `next-action.py` and `state-write.py`. The promoted test at `branches.test.mjs:189` covers only a directory and an unreadable file, and checks `preflight` only.
   - Fix: promote TC-cli-16 into `skills/sdlc/test/branches.test.mjs`. Use a copied skill directory, as the test at line 189 does. Record the promotion in tests.md.

2. Non-blocking. T-009 adds almost nothing beside T-010.
   - T-009 (`branches.test.mjs:233`) runs each script with `--help` from a scratch working directory and asserts exit 0.
   - T-010 (`:266`) runs each script from a scratch working directory with a real command and asserts exit 0 and the result.
   - ADR-20261009-024047 keeps T-009, so this finding does not block. Fold it into T-010 when a later slice touches the file.

3. Non-blocking. T-003 does not check the `format` value.
   - T-003 (`branches.test.mjs:95`) passes `--format` on every command but asserts only a non-empty string.
   - Assert that `format` equals the value that the call passes. A handler that echoes the default format would then fail the test.

4. Non-blocking. No test accepts `{name:lower}`.
   - Every passing case uses `{name}`. A `validate_format` that rejects `{name:lower}` would pass the whole suite.
   - S-002 owns R-017. Add one positive case there, or add `--format sdlc/{name:lower}` to T-007.
