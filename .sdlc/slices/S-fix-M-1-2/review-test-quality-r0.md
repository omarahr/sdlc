# Review: S-fix-M-1-2, lens test-quality, round 0

## Blocking
- The HTTP code parser has no committed test for its edge cases. Promote the test `verify security: VS-5 _forge_failure reads status and one HTTP code only` from `.sdlc/slices/S-fix-M-1-2/verification/r0/tests/security-0/forge-failure.verify-security.test.mjs`. It pins the `HTTP/2 404` form, the rejection of `HTTP 4031`, the first code only, and the rejection of a code inside a token. Also promote `VS-5 unicode digits never reach the note`. Add a record in tests.md.

## Not blocking
- Code and tests carry no comments.
- Tests are deterministic and assert behavior.
- No committed test covers the timeout branch of the new bounded error. T-R-031d only covers the failure.
