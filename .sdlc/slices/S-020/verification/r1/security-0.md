# verify-security S-020 r1

- Slice: S-020
- Profile: security, part 0
- Round: 1
- Commit: e6e0dd5
- Verdict: verified

Environment: Node test runner against `sdlc-loop.js` through the harness `loadInternals`. `branches.py` serves as the comparison. No network.

## TC-security-1: dollar patterns stay literal (pass)
- Given: formats `sdlc/{name}`, `feature/PROJ-1-{name}`, `feature/PROJ-1-{name:lower}`.
- When: `branchName` gets the tails `$&`, `$$`, `` $` ``, `$'`, `$0`, `$1`, `$10`, `$<n>`.
- Then: the result holds the tail unchanged, lowercased for the lower format.
- Expected and actual agree. The replacer function from the fix round holds.
- Spec source: R-051 acceptance.
- Test: `.sdlc/slices/S-020/verification/r1/tests/security-0/branch-name.verify-security.test.mjs:21`
- Log: `.sdlc/slices/S-020/verification/r1/logs/security-0-run.txt` (49 pass, 0 fail).

## TC-security-2: other hostile tails and odd formats (pass)
Uppercase, slash, traversal, unicode, bidi, empty and placeholder-text tails stay literal. A format with no placeholder, a format with both placeholders and an empty format do not throw. Repeated calls leak no state.
- Spec source: R-050 acceptance.

## Attacks
- A-1 held: dollar patterns. The r0 break is fixed.
- A-2 held: group patterns.
- A-3 held: traversal, slash, unicode, bidi, empty tail.
- A-4 held: placeholder text in the tail, odd formats.
- A-5 held: empty `branchFormat`.

## Seeds
None. The r0 seed is fixed.
