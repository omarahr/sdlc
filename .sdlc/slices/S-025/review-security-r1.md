# Review S-025, lens security, round 1

The slice adds a Branch names bullet to `skills/sdlc/prompts/_common.md`. It adds tests in `prompts.test.mjs`.

No findings. The round 0 fix adds a test that runs the table commands. The test passes arguments as an array, so no shell parses them. It uses a temporary repo and fixed sample ids. It adds no secret handling and no network access.

needsVerify: false. The slice rating fits.
