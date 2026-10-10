# Verification: S-027a, security, round 0
Commit: a8e86bc. Verdict: pass (1 case, 4 attacks held).

Environment: Node test runner, `python3 -I`, scratch git repos.

## TC-security-1 (VS-6, R-061)
- Given: three slices with the branch field set to garbage, set to non-string values, or removed.
- When: `next-action.py`, `state-write.py` (`patch-slice`, `status`) and `janitor.py` run.
- Then: outputs, state, git refs, STATUS.md and files outside the repo equal the original run.
- Result: pass in 149 variants.
- Test: `.sdlc/slices/S-027a/verification/r0/tests/security-0/branch-field.verify-security.test.mjs`

## Attacks
- A-1 held: all corpus families as branch value.
- A-2 held: null, numbers, list, object, nested list, empty, 1 MB string.
- A-3 held: field removed.
- A-4 held: no read of a slice branch in `sdlc-loop.js` or the scripts.

## Seeds
None.
