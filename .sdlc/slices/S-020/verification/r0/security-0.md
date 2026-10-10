# S-020 verify-security r0 (part 0)
Commit b07ace1. Verdict: REFUTED (VS-2).

Environment: Node test runner via harness loadInternals; branches.py for comparison.

## TC-security-1 (fail) R-051 acceptance
branchName with tails `$&`, `$$`, `$\``, `$'` returns a changed name under all three formats. `String.replace` expands the dollar patterns in the replacement text.
Expected `sdlc/$&`. Actual `sdlc/{name}`. branches.py keeps the tail literal (`sdlc/S-$&-v0-http-api-0`), so the two disagree.
Test: `.sdlc/slices/S-020/verification/r0/tests/security-0/branch-name.verify-security.test.mjs:21`. Log: `.sdlc/slices/S-020/verification/r0/logs/security-0-run.txt`.

## TC-security-2 (pass) R-050
Slash, traversal, unicode, bidi, empty and placeholder-text tails stay literal. Formats with no or two placeholders do not throw. Empty branchFormat falls back to `sdlc/{name}`.

## Attacks
A-1 broke, A-2 to A-5 held. See the JSON file.

## Seeds
Reach is low: the tail comes from the slice id and a fixed profile list. Fix: pass a replacer function to `replace`.
