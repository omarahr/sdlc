# Review S-027c, lens test-quality, round 0

Blocking:
- The env-detector test lost its numbering assertion. It pinned "(count of branches) + 1" and the refs/heads pattern. The edit kept only a doesNotMatch on the old literal. Add an assertion for the sentence "(count of branches of kind `run`) + 1" in skills/sdlc/test/prompts.test.mjs.

Not blocking:
- stripBranchesOutput removes a whole fenced block that only mentions branches.py. A hand-written literal inside such a block passes the scan. Remove only the output lines, or add a negative fixture.
- tests.md describes each test by its failing state ("still spells"). Describe what each test checks now.
- T-R-063a partly repeats the per-file assertions. The spec requires the row test, so keep both.
- No comments found in the new test code or the prompt diff.
