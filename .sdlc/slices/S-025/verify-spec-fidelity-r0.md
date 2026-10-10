Verdict: HELD

Checked in a detached worktree of `sdlc/S-025` at commit ddbea4a. The worktree is removed.

## Requirement checks
| Requirement | Spec says | Checked how | Tests | Result |
|---|---|---|---|---|
| R-062 | "every branch the loop makes is named by one format, `config.branchFormat` (default `sdlc/{name}`). Never write such a name by hand." | Compared the bullet with spec §8 text. It matches word for word. All eight placeholder rows exist. The parse sentence exists. `ste-check.py` exits 0. | skills/sdlc/test/prompts.test.mjs:1000 | holds |
| R-089 | run branch row: `config.runBranch` in `stack` mode; otherwise `branches.py list --kind run`, its last entry | Read the row. It matches the quote. `list --kind run` runs and prints a branch list. | skills/sdlc/test/prompts.test.mjs:1025 | holds |
| R-090 | verify branch row: "the `branch` input your prompt carries" | Read the row. No `branches.py name --kind verify` text exists in `_common.md`. `name --kind verify --id S-001` is refused without a round. | skills/sdlc/test/prompts.test.mjs:1034 | holds |
| R-110 | `branches.py name --kind slice --id <sliceId>` | Read the row. The command prints `sdlc/S-001` and exits 0. | skills/sdlc/test/prompts.test.mjs:1020 | holds |
| R-117 | "`branches.py parse --repo . --branch <name>` prints its kind and ids, or `null` for a branch that is not the loop's." | Read the sentence. It matches the quote. `parse --branch main` prints `"kind": null`. A loop branch prints its kind and ids. | skills/sdlc/test/prompts.test.mjs:1040 | holds |

All table commands run with exit 0 and print the expected names. Run: prompts.test.mjs, 71 pass, 0 fail.

## Defects
None.

## Plan check
Every requirement has a scenario (VS-1 to VS-6). No gap found.
