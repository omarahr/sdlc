# S-005a review: architecture, round 0

Diff: `git diff sdlc/run-1...sdlc/S-005a`. The product change is two rows in `TAILS` in `skills/sdlc/branches.py`.

## Fit with the spec
- The `verify` row gives `<id>-v<round>-<profile>-<part>`. This matches the spec table in section 1.
- The `attempt` row gives `<id>-attempt-<n>`. This matches the spec table in section 1.
- `state` stays the S-003 row. The slice adds tests only for R-008.
- The rows use the shared `tail` check for required parts. No new code path exists.

## Unit boundaries
- The slice keeps to `branches.py` and `branches.test.mjs`. It does not take `push_guard.py` or S-005 verification files from attempt-2.

## Duplication
- The `utc` helper occurs twice in `branches.test.mjs`: in the state-tail test and in the new CLI state test. This is a nit. A shared helper at file scope can replace both.

## Check
- `node --test skills/sdlc/test/branches.test.mjs`: 33 tests pass, 0 fail.

## Result
No blocking findings. One non-blocking finding.
