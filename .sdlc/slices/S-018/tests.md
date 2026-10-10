# Tests S-018

All tests live in `skills/sdlc/test/prompts.test.mjs`.

- the skill documents the stack flag, its remote requirement and its resume path — R-045 — the assertion now pins the Branch format bullet, which does not exist yet.
- T-R-045 — R-045 — SKILL.md has no `--branch-format` flag in the Commands line and no flag bullet.
- T-R-046a — R-046 — SKILL.md has no `**Branch format:**` bullet after the Git mode bullet.
- T-R-046b — R-046 — SKILL.md still holds the Branch name bullet and the push rule text.
- T-R-097 — R-097 — the Branch format bullet does not exist, so it cannot describe a derived format or a resume.
- T-R-048 — R-048 — no bullet after the Branch format bullet reports a format mismatch.
- T-R-049 — R-049 — the Launch args do not hold `branchFormat`.
