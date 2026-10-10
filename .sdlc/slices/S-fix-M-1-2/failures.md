## Fix round 1

- [review] Promote the verifier tests for `_forge_failure` HTTP parsing into `skills/sdlc/test/branches.test.mjs`. Done as T-R-029-http-code and T-R-029-unicode-digits.
- The promoted unicode test failed on the first run: `_forge_failure` copied non-ASCII digits into the note. Restrict the match to ASCII digits.
- The promoted unicode test failed on the first run: `_forge_failure` copied non-ASCII digits into the note. Restrict the match to ASCII digits.
