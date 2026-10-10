Verdict: HELD

Checked in a scratch worktree of `sdlc/S-037` at commit 0e58a38.

## Requirement checks
| Requirement | Spec says | Checked how | Tests | Result |
|---|---|---|---|---|
| R-134 | `runBranch` "the run branch (`run` kind under `config.branchFormat`)" | Read state-schema.md lines 37 and 96. Grep for literals found none. | skills/sdlc/test/prompts.test.mjs:1506 | holds |
| R-135 | commit-state.md uses the four placeholders; state branch name comes from `branches.py name --kind state` | Grep found all four placeholders, no `date -u`, no `sdlc/state-`. `_common.md` line 26 maps `<state branch>` to the command. | skills/sdlc/test/prompts.test.mjs:1514 | holds |
| R-146 | Each of the 13 listed files holds no `sdlc/<id>` literal and uses `<slice branch>` | Counted both patterns in each of the 13 files: placeholder present, no literal. | skills/sdlc/test/prompts.test.mjs:1524 | holds |
| R-149 | state-schema.md holds no `sdlc/S-001`, `sdlc/run-<n>` or `sdlc/M-<n>` literal; fields described by kind | Grep found none. The `stack` bullet says "one branch per milestone". | skills/sdlc/test/prompts.test.mjs:1536 | holds |

## Defects
None.

## Commands
- `node --test test/prompts.test.mjs`: 110 pass, 0 fail.
- Mutation check in a scratch worktree (reverted a placeholder in gate.md, commit-state.md, state-schema.md): the four new tests and four sweep tests fail. The tests are not vacuous.
