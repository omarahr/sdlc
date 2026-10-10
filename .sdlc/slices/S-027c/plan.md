# Plan S-027c (revision 2)

## Approach
Replace every loop branch literal in the prompt files and SKILL.md with the placeholders that `_common.md` defines. Use the file table in spec section 8. The table misses six literals, which this plan covers in Files. Add one test to `test/prompts.test.mjs` that scans every prompt file and SKILL.md for the literal pattern. Edit the existing tests that assert the old literals, so they assert the placeholders. Keep the edited prompts inside the STE linter (`ste-check.py`). The sweep touches prompt text only; no script changes.

The scan pattern is `(?<![.\w])sdlc/(?!tracker|STOP|\{name)`. The last term skips the default format text `sdlc/{name}`. Spec sections 5 and 8 and the passing tests T-R-062, T-R-064a and T-R-065a require that text. ADR-20261010-074453-decision-judge-S-027c-1782 and SPEC-PROPOSALS entry P-20261010-074453 record this.

## Files
Modify, prompts (all under `skills/sdlc/prompts/` unless noted). Each file swaps the listed literals for placeholders:
- `commit-state.md`: `<slice branch>`, `<run branch>` (4 places), `<milestone branch>`, `<e2e branch>` (replaces `sdlc/<milestoneId>-e2e` on line 5), `<state branch>` (replaces `sdlc/state-$(date ...)` on line 16; the command `branches.py name --kind state` makes the timestamp). On line 12, `sdlc/state-*` becomes "state pull requests" with `<state branch>`.
- `integrator.md`: `<slice branch>` (9 places), `<run branch>` (3 places). Step "Clean up" 1: replace `sdlc/<id>-v*` with "the slice's verify branches (`branches.py list --kind verify`, filtered to this slice)" and the `git branch --list 'sdlc/*'` pattern with that list command. The attempt half is already done in S-027b.
- `milestone-writer.md`: `<e2e area branch>`, `<e2e branch>`, `<milestone branch>` (6 places).
- `escalator.md`: `<slice branch>` (3 places), `<attempt branch>` (2 places), `<run branch>`. The scratch spike branch `sdlc/<id>-spike` becomes "a scratch branch named like `<slice branch>` with `-spike` added".
- `env-detector.md`: `<run branch>` (3 places); `sdlc/run-*` becomes "a branch that parses as kind `run`". Keep the `branchFormat` line with `sdlc/{name}`.
- `implementer.md`, `test-writer.md`, `test-checker.md`, `planner.md`, `verifier.md`, `verify-planner.md`, `verify-toolsmith.md`, `test-reporter.md`, `gate.md`, `finding-refuter.md`, `verify-profile-common.md`, `state-reader.md`: `sdlc/<id>` becomes `<slice branch>`.
- `state-reader.md` also names `sdlc/state-*` and `sdlc/M-*-e2e`: say "the ready state and e2e pull requests" using `<state branch>` and `<e2e branch>`.
- `verify-collector.md`: the `branches` input description says "one `<verify branch>` per profile agent". Line 3 says "You fold nothing into the `<slice branch>`." The file then carries `<verify branch>` for the input (ADR-20261010-074457-decision-judge-S-027c-44f1) and `<slice branch>` for its section 8 row.
- `state-writer.md`: `<slice branch>`, `<attempt branch>`.
- `e2e-harness.md`: `<e2e branch>`, `<milestone branch>`.
- `scenario-runner.md`: `-b <e2e area branch> <e2e branch>`.
- `slicer.md`: already done in S-027a; confirm only.
- `state-schema.md`: line 220 `sdlc/<id>` becomes `<slice branch>`. Other literals are done in S-027a.
- `skills/sdlc/SKILL.md`: lines 14, 31 and 67 name `sdlc/run-<n>` and `sdlc/M-<n>`; use "the run branch" and "the milestone branch" in words, or `$RUN_BRANCH`. Lines 16 and 43 keep `sdlc/{name}` (default format).

Modify, tests:
- `skills/sdlc/test/prompts.test.mjs`: new sweep tests; update the old literal assertions listed in Tests.

No file is created.

## Tests
All in `skills/sdlc/test/prompts.test.mjs`.
- `T-R-063a` (R-063): one subtest per row of the section 8 table. For each file, assert it has no literal from its row and contains each mapped placeholder at least once. Rows (commit-state also pins `<e2e branch>` and `<state branch>`): commit-state, integrator, milestone-writer, escalator, env-detector, the `<slice branch>` row (12 files plus `verify-collector.md`, which also pins `<verify branch>`), state-writer, e2e-harness, scenario-runner, slicer, state-schema.
- `T-R-063b` (R-063): the six extra literals are gone. Assert the commit-state e2e line (contains `<e2e branch>`, no `sdlc/<milestoneId>-e2e`), and the verify-toolsmith, test-reporter, state-reader, verify-collector and escalator spike lines carry no literal, and that SKILL.md has no `sdlc/run-` or `sdlc/M-`.
- `T-R-080` (R-080): `no prompt spells a loop branch literally`. Read every `.md` under `prompts/` and `SKILL.md`. Remove fenced blocks whose text quotes `branches.py` output. Assert no match of `(?<![.\w])sdlc/(?!tracker|STOP|\{name)`. Also assert the helper finds more than 20 files, so an empty scan cannot pass. Add a negative check: a fixture string with `git checkout sdlc/S-001` matches, a fixture with `.sdlc/slices` does not.
- Updated assertions (old literal to placeholder): lines 65, 85-98, 110-120, 179, 206-215, 297, 355, 367, 384-393, 451-461, 486, 545, 559, 667, 814, 1004. Keep each test's intent. Where a test asserted the absence of a literal, it keeps passing. Where it asserted a literal, assert the placeholder in the same sentence.
- Line 667 (`sdlc/<id>-v*`) asserts the verify sweep; change it to assert the verify-branch list phrase.
- Run `ste-check.py` through the existing STE test (line 836). It must pass for every edited prompt.

## Steps
1. Write the failing tests first: T-R-063a, T-R-063b, T-R-080.
2. Edit the prompts one file at a time, in table order. Run `node --test skills/sdlc/test/prompts.test.mjs` after each group.
3. Edit SKILL.md.
4. Update the old literal assertions. Do not weaken them: each must still check the same sentence.
5. Run the STE linter on every edited prompt. Shorten sentences that grow past 20 words.
6. Run the full `npm test`.

## Risks
- A wrong placeholder misdirects a role at run time. Mitigation: T-R-063a pins each row; review each diff against the table.
- A placeholder inside a shell command (`git worktree add ... <slice branch>`) leaves the role to resolve it. `_common.md` tells every role how. Keep one placeholder per command argument.
- `verify-profile-common.md` builds a worktree path from the branch with `/` replaced by `-`. Keep that rule; it does not depend on the literal.
- STE sentence limits: longer placeholder phrases can break the linter. Check after each file.
- The scan skips `sdlc/{name`. A later literal such as `sdlc/{name}-x` would pass. Accepted: the default format text must stay.

## Critique responses
- Scan skips the `sdlc/{name` placeholder (ADR-20261010-074536-decision-judge-S-027c-a719): the scan regex is now `(?<![.\w])sdlc/(?!tracker|STOP|\{name)`, in Approach and in T-R-080. No test or required text changes.
- "Resolved by pending: pending": the critique names no defect, so no plan change follows.
- Spike branch (ADR-20261010-074458-decision-judge-S-027c-6e34): in `escalator.md`, replace `sdlc/<id>-spike` with the phrase "a scratch branch named like <slice branch> with -spike added". Add no kind, placeholder or spec row. T-R-063b asserts the phrase.
- [spec-fidelity] `commit-state.md` line 5 `sdlc/<milestoneId>-e2e`: added to Files with `<e2e branch>`, and `sdlc/state-*` on line 12 with `<state branch>`. T-R-063a pins both placeholders in the commit-state row; T-R-063b asserts the e2e line. Approach now says six literals.
- [architecture] No refutation. The implementer matches test edits by assertion text, not line number; the line numbers in Tests are hints only.
- [spec-fidelity] `verify-collector.md` versus the `<slice branch>` row: option (a). Files adds `<slice branch>` to line 3 beside `<verify branch>` in the input. T-R-063a pins both placeholders for that file, so the test and the edit agree.
- [architecture] The "13-file" label was wrong. The row text now names 12 files plus `verify-collector.md`.
