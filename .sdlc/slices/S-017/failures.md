
## Fix round 1

- cli verifier TC-cli-18 (VS-5): a gh rule with a pattern that is not a string crashed preflight with a TypeError. Fixed in `_raw_result` and in the cannot-evaluate note. The test is promoted as T-R-100d.
- Seed, not fixed: preflight is quadratic in the rule count.
