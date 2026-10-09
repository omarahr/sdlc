Verdict: HELD

Worktree: `$TMPDIR/sdlc-S-004-spec-fidelity-r0` (detached, now removed). Commit: `2b1960c0bbf2e25a072aac7e1581886625100faf` (`sdlc/S-004`).
Diff checked: `177c66a..2b1960c`. The product change adds the `run`, `milestone` and `e2e` rows to `TAILS` in `skills/sdlc/branches.py`.

## Requirement checks

| Requirement | Spec says | Checked how | Tests | Result |
|---|---|---|---|---|
| R-003 | "\| `run` \| `run-<n>` \| `sdlc/run-1` \| stack \|" | Read the `run` row. Ran `name --kind run --n 1` and `--n 7` under the default format: `sdlc/run-1`, `sdlc/run-7`. Ran `--format 'feat/{name:lower}-x' --n 2`: `feat/run-2-x`. | skills/sdlc/test/branches.test.mjs:578, :600, :625 | holds |
| R-004 | "\| `slice` \| `<sliceId>` \| `sdlc/S-001` \| pr, stack \|" | Ran `name --kind slice --id S-001` and `--id S-042`: `sdlc/S-001`, `sdlc/S-042`. The row is unchanged from S-002. | skills/sdlc/test/branches.test.mjs:578 | holds |
| R-005 | "\| `milestone` \| `<milestoneId>` \| `sdlc/M-1` \| stack \|" | Read the row. Ran `--id M-1` and `--id M-12`: `sdlc/M-1`, `sdlc/M-12`. A config `branchFormat` of `team/{name}` gives `team/M-1`. | skills/sdlc/test/branches.test.mjs:578, :600, :625 | holds |
| R-006 | "\| `e2e` \| `<milestoneId>-e2e` \| `sdlc/M-1-e2e` \| pr \|" | Read the row. Ran `--id M-1` and `--id M-3`: `sdlc/M-1-e2e`, `sdlc/M-3-e2e`. An empty `--id` exits 2 with one JSON error. | skills/sdlc/test/branches.test.mjs:578, :600, :625 | holds |
| R-007 | "\| `e2e-area` \| `<milestoneId>-e2e-<area>` \| `sdlc/M-1-e2e-api` \| never \|" | Ran `--id M-1 --area api` and `--id M-2 --area ui`: `sdlc/M-1-e2e-api`, `sdlc/M-2-e2e-ui`. The row is unchanged from S-003. | skills/sdlc/test/branches.test.mjs:578 | holds |

Other checks:
- `node --test skills/sdlc/test/branches.test.mjs`: 31 pass, 0 fail.
- Falsification: with the parent commit's `branches.py`, T-025, T-026 and T-027 fail, and the 28 other tests pass. The tests assert the requirements.
- No hardcoding: inputs that the tests do not use give the correct tails.
- ADR-20261009-045048 accepts a malformed id and a negative `n`. This check does not refute them.
- Verification plan r0: each of R-003 to R-007 has a scenario. Each scenario has the `cli` or `contract` profile that can falsify it.

## Defects

None.
