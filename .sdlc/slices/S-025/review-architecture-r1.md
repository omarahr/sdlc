# Review S-025, lens architecture, round 1

The slice adds one bullet and one table to `skills/sdlc/prompts/_common.md`. It adds six tests to `prompts.test.mjs`.

No blocking findings.

- The bullet matches the Git bullet in style and sits next to it. The table is the single source for all eight placeholders.
- The new tests reuse `cliRunner` and the `commonBranchNames` helper. They duplicate no existing test.
- Non-blocking: the promoted test has no `T-R-089b` prefix in its title. Other tests in the file carry the id.
- Non-blocking: the T-R-062 pattern `branches\.py` parse accepts two spellings. Pin one spelling.

needsVerify: false.
