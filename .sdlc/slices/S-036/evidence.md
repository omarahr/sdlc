# Evidence S-036

Slice kind: spec. The gate receipt is valid for the final code.

- R-132: T-R-132 checks that scenario-runner.md names its worktree branches through placeholders. T-R-063a and T-R-080 reject loop branch literals.
- R-133: T-R-133 checks that env-detector.md reads the run branch through placeholders and the parsed kind. T-R-063a and T-R-080 reject literals.
- R-144: T-R-063a and T-R-080 check the milestone-writer prompt.
- R-148: T-R-063a and T-R-080 check the e2e-harness prompt.

All tests are in skills/sdlc/test/prompts.test.mjs. The verifiers' cases TC-cli-1 and TC-contract-1 also passed.
