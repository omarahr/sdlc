# verify-security S-016 round 1, part 0

- Slice: S-016
- Profile: security
- Round: 1
- Commit: 35e4a69
- Verdict: PASS (VS-4)

## Environment
Python 3.14.7, Node test runner, gh shim on PATH (testkit stub-server). One scratch git repo per case. Worktree of `sdlc/S-016` at 35e4a69.

## Charter
Explore the failed-derivation path with git-unsafe affixes to find a leaked second verdict, exit 2 or a derived format that `validate_format` rejects (R-087, R-042, ADR b19f). Trusted: the repo admin who sets forge rules. Nothing else reaches this CLI.

## TC-security-3 (pass): failed derivation keeps the first verdict
- Given: one rule, 44 affixes, three operators, no format given.
- When: preflight runs.
- Then: exit 1, derived false, original format, suggestion equals the derived `--branch-format` line, first-verdict samples and rules. No write. Read-only gh calls.
- Actual: all 132 pairs held.
- Test: `.sdlc/slices/S-016/verification/r1/tests/security-0/branch-derive.verify-security.test.mjs:138`

## TC-security-4 (pass): a derived ok true format passes validate_format
- This case failed in round 0 for 21 affixes (`{`, `}`, NBSP, U+0085, U+2003, U+3000).
- Actual: 0 derived formats rejected by `branches.py name --format`. The fix in 35e4a69 holds.
- Test: `.sdlc/slices/S-016/verification/r1/tests/security-0/branch-derive.verify-security.test.mjs:137`

## Attacks
96 attacks: 96 held, 0 broke. See `security-0.json` and `logs/security-0-attacks.json`.

## Seeds
None new. The round 0 seeds stand.
