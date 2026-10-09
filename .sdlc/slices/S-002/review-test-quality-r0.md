# Review: S-002, lens test-quality, round 0

Diff: `git diff origin/main...sdlc/S-002` at 8138c9f. The local `main` lags `origin/main`, so the review uses `origin/main` as the base.

## Summary

The slice adds T-011 to T-017 and extends T-001 in `skills/sdlc/test/branches.test.mjs`. The tests call `validate_format`, `split` and `name` through a Python probe and compare JSON. T-014 checks the CLI exit code and the error text. T-017 empties PATH and checks for a `Fail` that names git.

The tests assert behavior, not implementation. They use no sleeps, no network and no timing assertions. No test runs the repo's test command. The diff holds no comments.

## Findings

1. Blocking. No committed test pins the whitespace check for Unicode whitespace.
   - `git check-ref-format --branch` accepts U+00A0 and U+3000. For those characters, the `\s` check in `validate_format` (`branches.py:41`) is the only guard.
   - The S-001 CLI case `sdlc/ {name}` uses an ASCII space, and git refuses that too. If someone removes the `\s` check, every committed test still passes.
   - The T-012 case `sdlc/{ name }` does not reach the whitespace check. It fails at the placeholder count.
   - Verifier test TC-contract-4 pins the check: `.sdlc/slices/S-002/verification/r0/tests/contract-0/branches.verify-contract.test.mjs:149` (cases `sdlc/ {name}`, `sdlc/　{name}`, `sdlc/ {name}`).
   - Fix: promote these cases into `branches.test.mjs` and record the promotion in tests.md. Assert that each one raises `Fail` with the message `holds whitespace`.

2. Non-blocking. The name of T-012 promises a whitespace case that it does not test.
   - `sdlc/{ name }` holds no placeholder, so it tests the count check a second time.
   - Fix: replace it with `sdlc/ {name}`, or rename the case to say it is a malformed placeholder.
