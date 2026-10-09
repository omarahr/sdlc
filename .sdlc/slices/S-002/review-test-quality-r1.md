# Review: S-002, lens test-quality, round 1

Diff: `git diff origin/main...sdlc/S-002` at 1b90e38. The local `main` lags `origin/main`, so the review uses `origin/main` as the base.

## Summary

Fix round 1 adds T-018, "validate_format rejects Unicode whitespace that git accepts". It promotes the TC-contract-4 cases and records the promotion in tests.md. The round 0 blocking finding is closed.

I checked the cases with git. `git check-ref-format --branch` accepts U+00A0, U+3000 and U+2028, so the `\s` check is the only guard for them. The spec-fidelity verifier disabled the `\s` check and saw T-018 fail.

`node --test skills/sdlc/test/branches.test.mjs`: exit 0, 22 pass, 0 fail.

The tests assert behavior. They use no sleeps, no network and no timing assertions. No test runs the repo's test command. The diff holds no comments. No verifier test is left that pins behavior the committed tests do not cover.

## Findings

1. Non-blocking. The name of T-012 still promises a whitespace case that it does not test.
   - `sdlc/{ name }` holds no placeholder, so it fails at the placeholder count.
   - T-018 now pins the whitespace check, so only the name is wrong.
   - Fix: replace the case with `sdlc/ {name}`, or rename the test to say "a malformed placeholder".

2. Non-blocking. One T-018 case does not match the test name.
   - Git refuses the tab case `sdlc/\t{name}` (exit 128), but the name says "whitespace that git accepts".
   - Fix: drop the tab case, or rename the test to "rejects Unicode and control whitespace".
