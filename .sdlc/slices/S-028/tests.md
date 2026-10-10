# Tests S-028

- `_common.md defines every branch placeholder and env-detector records the format` (skills/sdlc/test/prompts.test.mjs) — R-081 — characterization: it passes now, because S-018 to S-020 already added the placeholders and matches. It fails if one is removed.
- `every prompt file passes the STE linter, with no allowlist and no skips` (skills/sdlc/test/prompts.test.mjs) — R-082 — existing test, passes now. No new test is needed.
