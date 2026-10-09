## Fix round 1

- [review] No committed test pins the whitespace check for Unicode whitespace. `git check-ref-format --branch` accepts U+00A0 and U+3000, so the `\s` check in `validate_format` is the only guard for them. Promote the TC-contract-4 cases (`.sdlc/slices/S-002/verification/r0/tests/contract-0/branches.verify-contract.test.mjs:149`) into `skills/sdlc/test/branches.test.mjs`. Assert that each case raises Fail with "holds whitespace". Record the promotion in tests.md.
