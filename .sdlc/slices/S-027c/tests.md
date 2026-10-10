# Tests S-027c

All tests are in `skills/sdlc/test/prompts.test.mjs`.

- T-R-063a — R-063 — each prompt file still spells loop branch literals and lacks the placeholders of its row.
- T-R-063b — R-063 — the six extra literals (commit-state e2e and state lines, verify-toolsmith, test-reporter, state-reader, verify-collector, escalator spike, SKILL.md run and milestone names) are still present.
- T-R-080 — R-080 — the prompt scan finds literal loop branch names in prompts and SKILL.md.
- the skill documents the stack flag, its remote requirement and its resume path — R-063 — SKILL.md still names `sdlc/run-<n>`.
- the e2e harness cuts its branch from the milestone branch in stack mode, and names a base for every mode — R-063 — e2e-harness.md lacks `<e2e branch>` and `<milestone branch>`.
- the env-detector adopts the driver-created run branch, and numbers a fresh one the way the driver does — R-063 — env-detector.md lacks `<run branch>`.
- slice creation cuts from refs, and no prompt presents the default branch as a place to be — R-063 — commit-state.md lacks `<slice branch>`.
- the worktree returns to the run branch before every run-branch operation (ruling B) — R-063 — integrator.md and commit-state.md lack `<run branch>`.
- the integrator asks the code for the slice base branch instead of naming it in prose — R-063 — integrator.md lacks `<slice branch>`.
- the milestone-writer opens the milestone pull request and retargets the e2e merge — R-063 — milestone-writer.md lacks `<run branch>` and `<milestone branch>`.
- the escalator and force-park ask for the branch rather than naming it, and never the default branch — R-063 — escalator.md lacks `<slice branch>` and the scratch branch phrase.
- the escalator returns to the run branch in direct and pr mode, and never checks out the default branch — R-063 — escalator.md lacks `<run branch>`.
- profile agents write their tests as evidence in the main tree, and the collector only files and cleans — R-063 — verify-profile-common.md and verify-collector.md lack `<slice branch>`.
- the integrator trusts the gate receipt, regates after a product-code CI fix, and prunes bulk at merge — R-063 — integrator.md lacks the verify branch list phrase.
- the loop-end cleanup removes the worktree and the run branch, and reports a refusal — R-063 — SKILL.md still names `sdlc/run-<n>` in the cleanup command.
