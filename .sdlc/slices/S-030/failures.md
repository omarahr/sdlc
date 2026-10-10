
## Implementation
No product change. The seven tests pass on the S-016 code.

## Fix round 1
- [review] T-R-126b duplicates T-R-042c. Both run the same five cases with the same expected values.
- Fix: delete T-R-126b. R-126 maps to T-R-042c in tests.md.

## Fix round 2
- [review] T-R-126a duplicates T-R-042a. Both run the same preflight with the same rule.
- Fix: delete T-R-126a. Add the `rule` null assertion to T-R-042a. R-126 maps to T-R-042a in tests.md.
