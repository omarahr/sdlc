# Review S-008, lens test-quality, round 1

Scope: skills/sdlc/branches.py and skills/sdlc/test/branches.test.mjs.
No comments found in code or tests. Tests are deterministic. No nested suite run. No timing assertion.

## Blocking

- Duplicate coverage: T-R-069a repeats T-R-021a. Both assert null for `main`, `feature/PROJ-1-foo` and `sdlc/feature-x`. Both also check `known` and `id` resolution that T-R-024a pins. Delete T-R-069a.
- Duplicate coverage: T-R-070a repeats T-R-022a. Both assert slice `S-fix-M-1-2`, e2e-area `M-1-e2e-api` and verify `S-001-v0-http-api-0`, with the same part checks. Delete T-R-070a.
- Duplicate coverage: T-R-105c repeats the kind checks of T-R-102a, T-R-103a, T-R-104a and T-R-105a for the default format. Keep only the prefixed and suffixed cases.
- Duplicate coverage: T-R-023b repeats the field checks of T-R-023a through the CLI. T-R-102a and T-R-105a already check the CLI output. Reduce T-R-023b to the envelope keys and integer types.
- Verifier test without promotion record: T-R-102b came from the cli verifier (`verification/r0/tests/cli-0/parse-precedence.verify-cli.test.mjs:107`). tests.md has no promotion record. Add one line to tests.md.
- Verifier test without promotion record: T-R-120a and T-R-120b have no entry in tests.md. Add the records.

## Non-blocking

- tests.md lists 8 tests. The diff adds many more. List each test with its requirement.
- T-R-120a scans source text with a regex. It pins an implementation shape, not behavior. Keep it only while R-120 has no behavior test.
- T-R-102b checks one run number. Add `attempt-<5000 digits>` to pin the same limit for the attempt row.
