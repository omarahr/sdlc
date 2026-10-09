# Review: S-002, lens architecture, round 0

Diff: `1c50a02..sdlc/S-002` (the S-002 commits on top of S-001). The local `main` is behind `origin/main`, so `main...sdlc/S-002` also shows S-001 work. This review covers only the S-002 commits.

## Verdict

No blocking findings.

## Fit with the spec

- `validate_format`, `split`, `name` and `tail` keep the signatures of spec section 2.
- `validate_format` checks the placeholder count, stray braces, whitespace, then `git check-ref-format --branch` on `name(fmt, "slice", id="S-001")`. This is the spec order and the spec sample.
- The git call uses an argument list, not a shell. `OSError` and `ValueError` become `Fail`.
- `split` is the one owner of the placeholder search. `validate_format` and `name` both call it, so the placeholder count is not duplicated.
- `tail` reads one table keyed by kind (`TAILS`), as ADR-20261009-034220 says. Later slices add rows without a change to the function.
- The CLI handlers stay unchanged, per ADR-20261009-034215.

## Non-blocking findings

1. `KINDS` and `TAILS` both list the branch kinds. They will disagree until S-004 to S-006 add all rows. `_kind` accepts a kind that `tail` refuses. Fix: when the table is complete, derive `KINDS` from `TAILS`, or assert that the two sets are equal in a test.
2. `TAILS` sits between `validate_format` and `tail`. The module keeps its other constants at the top. Fix: move `TAILS` next to `KINDS` and `PLACEHOLDERS`.
3. `validate_format` reports `{ name }` as "found 0" placeholders, not as whitespace. The `Fail` contract holds, but the message points at the wrong cause. Fix: none needed now; optionally check whitespace before the placeholder count.
