# Review S-036, lens architecture, round 0

The slice adds four tests to `skills/sdlc/test/prompts.test.mjs`. No product file changes. The four tests pass.

Findings (all non-blocking):
- The `noLoopLiteral` helper repeats the `sdlc/M-1` guard sample on every call. One test already pins the sample for the whole scan. Keep it as is or move the sample to a single test.
- T-R-080 scans every prompt for loop literals. The four per-file literal checks repeat that coverage. The plan accepts this to give each requirement its own id.
