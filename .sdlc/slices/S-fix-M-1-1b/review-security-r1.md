# Security review, round 1, slice S-fix-M-1-1b

Result: clean. No finding.

- `name` now parses its own output and refuses a name that reads back as another kind or part. This closes the injection of a slice id such as `S-001-attempt-2` into another branch kind.
- Every parse pattern ends in `\Z`. A trailing line feed no longer passes a check.
- Lowering uses ASCII rules only. The Kelvin sign and similar characters no longer alias an ASCII id.
- `next-action.py` uses the same ASCII rule, so the branch match agrees with `branches.py`.
- The patterns for slice, milestone and e2e ids allow only ASCII letters, digits and hyphen. Only the e2e area allows other characters. That behavior existed before this slice.
- The testkit and the tests run local Python with no network and no secrets.
