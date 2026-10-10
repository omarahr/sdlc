# Evidence S-021

The slice makes next-action.py recognize branches through branches.parse.

- R-053: test "active slice branch is found by parse under a custom format". Final-round cases pass.
- R-054: tests for state, e2e, slice and milestone heads under a custom format, the lowercased head, TC-security-2 and TC-security-3.
- R-055: test "a missing or empty branchFormat falls back to sdlc/{name}".
- R-076: test "the active slice branch, slice PR heads, the state PR, the e2e PR and the stack milestone hold are recognized under a custom format".
- R-077: the existing next-action tests and `npm test` with no branchFormat pass.

Files changed: skills/sdlc/next-action.py, skills/sdlc/test/next-action.test.mjs.
The full suite passed on the final commit 0b4a280: receipt valid.
