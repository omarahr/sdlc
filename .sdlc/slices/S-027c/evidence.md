# Evidence S-027c: remaining prompts replace branch literals and a test guards the sweep

## R-063
The sweep replaces every loop branch literal in 22 prompt files and in SKILL.md. Each file now names its branches through placeholders such as `<run branch>`, `<slice branch>` and `<milestone branch>`. It asks `branches.py` for the real name. The ADRs for the extra literals (verify-toolsmith, test-reporter, state-reader, verify-collector, escalator spike, SKILL.md) are recorded in DECISIONS.md.
- T-R-063a and T-R-063b in `skills/sdlc/test/prompts.test.mjs`.
- One test for each prompt group listed in tests.md.
- Verification: cli and contract runs. All cases passed.

## R-080
A scan test fails when a prompt or SKILL.md holds a literal loop branch name. It skips `branches.py` output blocks and the `sdlc/{name` placeholder.
- T-R-080 in `skills/sdlc/test/prompts.test.mjs`.
- Fixture checks show that the scan finds a literal and accepts an output block.

## Gate
The full suite passed on commit 3990648 (`.sdlc/reports/S-027c/suite-receipt.json`). No benchmark applies to this slice.
