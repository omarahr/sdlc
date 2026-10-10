# Review S-037, lens architecture, round 0

The slice adds four tests to `skills/sdlc/test/prompts.test.mjs`. It edits no prompt. The tests fit the file's layout and reuse its helpers.

## Findings
- Blocking: T-R-146 duplicates T-R-063a. Row by row, T-R-063a already asserts no `LOOP_BRANCH_LITERAL` and the `<slice branch>` placeholder for the same 12 files plus `verify-collector`. The regex also covers `sdlc/<id>`. Delete T-R-146, or reduce it to the count check only if that adds value.
- Non-blocking: T-R-134 and T-R-149 repeat the `sdlc/S-001` and `sdlc/run-<n>` absence that T-R-063a pins for `state-schema`. Keep the unique clauses only: the `runBranch` text, the `stack` bullet and `sdlc/M-<n>`.
- Non-blocking: T-R-135 repeats the `sdlc/state-` check of T-R-063b. The `date -u` and `_common.md` link checks are new and stay.
- Non-blocking: T-R-146 builds its file list as `[...SLICE_BRANCH_FILES, 'verify-collector']`. Name that list once, so T-R-063a and T-R-146 cannot drift.
