# Review: S-002, lens architecture, round 1

Diff: `1c50a02..sdlc/S-002`. The local `main` is behind `origin/main`, so `main...sdlc/S-002` also shows S-001 work. This review covers only the S-002 commits. Round 1 adds one commit, `1b90e38`.

## Verdict

No blocking findings.

## Round 1 change

- `1b90e38` adds one test, T-018, to `skills/sdlc/test/branches.test.mjs`. It uses the existing `assertFails` helper. It adds no new helper and no product code.
- tests.md records the promotion from TC-contract-4. The fix round does not touch `branches.py`.

## Fit with the spec

- `validate_format`, `split`, `name` and `tail` keep the signatures of spec section 2, lines 79 to 82.
- `split` is the one owner of the placeholder search. `validate_format` and `name` both call it.
- The git call uses an argument list, not a shell. `OSError` and `ValueError` become `Fail`.
- `tail` reads one table keyed by kind (`TAILS`). Later slices add rows without a change to the function.
- `npm test` passes: 0 failures, 1 skipped.

## Non-blocking findings (carried from round 0)

1. `KINDS` and `TAILS` both list the branch kinds. `_kind` accepts a kind that `tail` refuses until S-004 to S-006 add all rows. Fix: when the table is complete, derive `KINDS` from `TAILS`, or assert in a test that the two sets are equal.
2. `TAILS` sits between `validate_format` and `tail`. The module keeps its other constants at the top. Fix: move `TAILS` next to `KINDS` and `PLACEHOLDERS`.
