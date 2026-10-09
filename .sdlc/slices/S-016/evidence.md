# Evidence for S-016: preflight derives a format from one simple rule

## R-042

A single `starts_with feature/` rule with no format given derives `feature/sdlc/{name}`, sets `derived: true`, and exits 0 when the samples pass under it. The three operators map per the table. A given format, a negated rule, a regex rule, or more than one rule never derives.

Tests:
- T-R-042a
- T-R-042b
- T-R-042c
- T-R-042d
- T-R-042e
- T-R-042f
- T-R-042g
- T-R-042h
- T-R-042i
- T-R-087a
- T-R-043a
- T-R-043b
- T-R-043c
- T-R-043d
- T-R-043e
- T-R-043f
- T-R-043g
- T-R-043h
- T-R-122a
- T-R-122b
- T-R-122c
- T-R-073b
- .sdlc/slices/S-016/verification/r1/tests/security-0/branch-derive.verify-security.test.mjs:138
- .sdlc/slices/S-016/verification/r1/tests/security-0/branch-derive.verify-security.test.mjs:137


## R-043

A failing verdict prints `ok: false` and exits 1, and carries a suggestion. A regex failure's suggestion names `--branch-format` and quotes the pattern. A `working` failure's suggestion names the rename.

Tests:
- T-R-042a
- T-R-042b
- T-R-042c
- T-R-042d
- T-R-042e
- T-R-042f
- T-R-042g
- T-R-042h
- T-R-042i
- T-R-087a
- T-R-043a
- T-R-043b
- T-R-043c
- T-R-043d
- T-R-043e
- T-R-043f
- T-R-043g
- T-R-043h
- T-R-122a
- T-R-122b
- T-R-122c
- T-R-073b
- .sdlc/slices/S-016/verification/r1/tests/security-0/branch-derive.verify-security.test.mjs:138
- .sdlc/slices/S-016/verification/r1/tests/security-0/branch-derive.verify-security.test.mjs:137


## R-073

The branches test asserts the three derived formats and the three refusals.

Tests:
- T-R-042a
- T-R-042b
- T-R-042c
- T-R-042d
- T-R-042e
- T-R-042f
- T-R-042g
- T-R-042h
- T-R-042i
- T-R-087a
- T-R-043a
- T-R-043b
- T-R-043c
- T-R-043d
- T-R-043e
- T-R-043f
- T-R-043g
- T-R-043h
- T-R-122a
- T-R-122b
- T-R-122c
- T-R-073b
- .sdlc/slices/S-016/verification/r1/tests/security-0/branch-derive.verify-security.test.mjs:138
- .sdlc/slices/S-016/verification/r1/tests/security-0/branch-derive.verify-security.test.mjs:137


## R-087

One simple rule, no format given, the derivation applied, and the samples still fail under the derived format: the verdict prints `ok: false` and `suggestion` is the derived format string.

Tests:
- T-R-042a
- T-R-042b
- T-R-042c
- T-R-042d
- T-R-042e
- T-R-042f
- T-R-042g
- T-R-042h
- T-R-042i
- T-R-087a
- T-R-043a
- T-R-043b
- T-R-043c
- T-R-043d
- T-R-043e
- T-R-043f
- T-R-043g
- T-R-043h
- T-R-122a
- T-R-122b
- T-R-122c
- T-R-073b
- .sdlc/slices/S-016/verification/r1/tests/security-0/branch-derive.verify-security.test.mjs:138
- .sdlc/slices/S-016/verification/r1/tests/security-0/branch-derive.verify-security.test.mjs:137


## R-122

A regex rule the default format fails, no format given: the suggestion carries a `--branch-format` line of the shape `<literal>/{name}`. Substituting the tail `S-001` into the literal gives a name that passes the failing regex rule.

Tests:
- T-R-042a
- T-R-042b
- T-R-042c
- T-R-042d
- T-R-042e
- T-R-042f
- T-R-042g
- T-R-042h
- T-R-042i
- T-R-087a
- T-R-043a
- T-R-043b
- T-R-043c
- T-R-043d
- T-R-043e
- T-R-043f
- T-R-043g
- T-R-043h
- T-R-122a
- T-R-122b
- T-R-122c
- T-R-073b
- .sdlc/slices/S-016/verification/r1/tests/security-0/branch-derive.verify-security.test.mjs:138
- .sdlc/slices/S-016/verification/r1/tests/security-0/branch-derive.verify-security.test.mjs:137


The full suite passed on the final commit (receipt valid): 644 passed, 0 failed, 1 skipped.
