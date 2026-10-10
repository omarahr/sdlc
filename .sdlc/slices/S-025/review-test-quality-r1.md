# Review S-025, lens test-quality, round 1

The slice adds six tests to `skills/sdlc/test/prompts.test.mjs`.

No findings. The tests read `_common.md` and assert on table rows. They are deterministic. They use no network, no sleep and no timing.
The promoted test runs the six `name` commands against `branches.py` in a temporary repo. It lists the promotion in tests.md.
The tests and the new code carry no comments.
The hostile-input loops of the verifier tests are not promoted. `branches.test.mjs` covers them.

needsVerify: false.
