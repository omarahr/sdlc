# Evidence S-027a: env-detector, state-schema and slicer name branches through the format

## R-064
env-detector.md takes the `branchFormat` input. It holds the quoted sentence once. It does not read the forge's branch-name rules, and it still reads `commit_message_regex`.
- T-R-064a, T-R-064b in `skills/sdlc/test/prompts.test.mjs`.
- T-R-002c: the `sdlc/{name}` fallback is in the same rule (R-002, clause 2; the slice list does not carry R-002 yet).
- Verification: cli (`prompts-and-format`), contract (`branch-format`): all cases passed.

## R-065
state-schema.md holds `"branchFormat": "sdlc/{name}"` in the config.json block with the spec text. The slice `branch` field and `runBranch` go through the format.
- T-R-065a, T-R-065b.
- Verification: contract case on state-schema.md passed.

## R-061
slicer.md writes `branch: <slice branch>`. No script reads a slice's branch field.
- T-R-061, T-R-061b, T-R-061c.
- Verification: security run, 149 of 149 variants identical; cli and contract cases passed.

## Gate
The full suite passed on commit 74f5c70 (`.sdlc/reports/S-027a/suite-receipt.json`). No benchmark applies to this slice.
