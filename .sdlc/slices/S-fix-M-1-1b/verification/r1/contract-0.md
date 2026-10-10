# verify-contract r1: S-fix-M-1-1b

- Slice: S-fix-M-1-1b
- Profile: contract, part 0, round 1
- Commit: e979556
- Verdict: verified (VS-7)

Environment: python3 -I from a scratch cwd, Node test runner, worktree of `sdlc/S-fix-M-1-1b`.

Surface: `branches.py` exports `name(fmt, kind, **parts)`, `parse(fmt, branch, ids=None)`, `tail`, `split`, `validate_format`, `load_format` and `Fail`. No signature changed.

Run: `VERIFY_WORKTREE=<worktree> node --test .sdlc/slices/S-fix-M-1-1b/verification/r1/tests/contract-0/branches-name.verify-contract.test.mjs`. All tests pass.

## TC-contract-7 (VS-7): state names keep the given ts and build one when absent
- Given: state kind with no ts, empty ts, a valid ts and bad ts values.
- When: call `name` for each.
- Then: a missing ts builds a 14-digit UTC stamp near now. A given ts is used as given. Every bad ts raises `Fail`.
- Actual: pass. The r0 counterexample ts `20261011101010\n` now raises `Fail`. LF, CR, CRLF, NUL, U+2028, spaces, short, long, letters and non-ASCII digits raise `Fail`. Integer ts 20261011101010 returns `sdlc/state-20261011101010`.
- Test: `branches-name.verify-contract.test.mjs:177` and the r1 test at the end of the file.

## TC-contract-8 (VS-7): property, any name output parses back
- property-run: seed 20261011, 3000 runs, 641 returned, 2359 raised `Fail`, 0 exceptions, 0 violations.

## TC-contract-9 (VS-7): property, valid parts round-trip
- property-run: seed 20261012, 2000 runs, 0 violations.

Attacks: none. Seeds: none.
