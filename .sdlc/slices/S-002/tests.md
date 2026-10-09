# Tests: S-002

All tests are in `skills/sdlc/test/branches.test.mjs`.

- T-001 `branches.py imports from its path and exposes the public functions` — R-019, R-020 — fails because `split`, `name` and `tail` do not exist in `branches.py`.
- T-011 `validate_format accepts one placeholder with a valid literal part` — R-001, R-017 — passes now; it pins that the git step accepts valid formats.
- T-012 `validate_format rejects two placeholders, none, whitespace and an invalid ref` — R-071, R-017, R-001 — fails because `validate_format("sdlc/{name}..")` returns its input; no `check-ref-format` step exists.
- T-013 `validate_format rejects the literal parts that git refuses` — R-017 — fails because `validate_format("-{name}")` and the other git-refused formats return their input.
- T-014 `an invalid-ref format is bad input on the CLI` — R-017 — fails because `name` with `--format "sdlc/{name}.."` exits 0, not 2.
- T-015 `split returns the prefix, the suffix and the lower flag` — R-020 — fails because `split` does not exist ("split is missing").
- T-016 `name puts the tail in the placeholder and lowercases only the tail` — R-019 (partial; parse-back closes in S-007) — fails because `name` does not exist (AttributeError names `name`).
- T-017 `validate_format without git is a Fail, not a crash` — R-017 — fails because `validate_format` does not run git, so it returns its input with an empty PATH.
- T-018 `validate_format rejects Unicode whitespace that git accepts` — R-017 — promoted in fix round 1 from TC-contract-4 (`.sdlc/slices/S-002/verification/r0/tests/contract-0/branches.verify-contract.test.mjs`). It pins the whitespace check for U+00A0, U+3000, U+2028 and a tab. Each case must raise Fail with "holds whitespace".
