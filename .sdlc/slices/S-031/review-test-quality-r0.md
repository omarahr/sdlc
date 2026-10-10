# Review of S-031, lens test-quality, round 0

## Blocking

- T-R-150a duplicates coverage. The test "an invalid-ref format is bad input on the CLI" already runs `preflight --mode pr --format 'sdlc/{name}..'`. It pins exit 2, one JSON object, `ok` false and `not a valid branch name`. The test "validate_format rejects two placeholders, none, whitespace and an invalid ref" already pins `check-ref-format`. Delete T-R-150a and its line in tests.md. Record the existing tests as the pin for R-150.

## Not blocking

- T-R-127a repeats cases that exist near line 1441. Those cases pin `S-001` as an unanchored match and `^S-001` as no match. Keep it only if the unanchored literal from the acceptance text is wanted.
- The new tests carry no comments. They use no sleeps, no network and no order dependence. Names match what the tests check.
- The verification tests under `.sdlc/slices/S-031/verification/r0/tests` found no defect. None needs promotion.
