# Evidence S-028

## R-081
- Test: `_common.md defines every branch placeholder and env-detector records the format` in skills/sdlc/test/prompts.test.mjs.
- The test checks the eight branch placeholders in _common.md, the branchFormat match in env-detector.md, and the two SKILL.md matches.
- The gate ran the full suite on commit cbf0121. The receipt is valid.

## R-082
- Test: `every prompt file passes the STE linter, with no allowlist and no skips` in skills/sdlc/test/prompts.test.mjs.
- The test already existed. It lints every prompt file, so it covers each edited prompt. It passed in the gate.
