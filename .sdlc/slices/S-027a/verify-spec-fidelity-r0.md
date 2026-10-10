Verdict: HELD

Worktree: `$TMPDIR/sdlc-S-027a-sf-r0` (removed after the check). Commit: a8e86bc.

## Requirement checks
| Requirement | Spec says | Checked how | Tests | Result |
|---|---|---|---|---|
| R-064 | env-detector gains input `branchFormat` and the quoted config line; commit-format step keeps `commit_message_regex` | Read diff. Inputs line names `branchFormat`. Step 4 holds the exact sentence. No `branch_name_regex`. Step 5 keeps `commit_message_regex`. `ste-check.py` exit 0. | skills/sdlc/test/prompts.test.mjs:1098, :1107 | holds |
| R-002 | The default is `sdlc/{name}`. A fresh run records it in config.json | Fallback order is input, existing value, `sdlc/{name}`. Step 7 keeps an existing `branchFormat`. Clause 1 stays with S-003 (ADR-20261010-064552). | skills/sdlc/test/prompts.test.mjs:1115 | holds |
| R-065 | state-schema documents `"branchFormat": "sdlc/{name}"` with the quoted text; slice branch and runBranch through the format | Config block and bullet hold the text word for word. Slice `branch` bullet and `runBranch` bullet hold the required phrases. No `sdlc/run-` in the config section. Example is `<slice branch>` (ADR-20261010-144554). | skills/sdlc/test/prompts.test.mjs:1123, :1136 | holds |
| R-061 | slicer writes `branch: <slice branch>`; no script reads the field | slicer.md line changed. Grep of scripts finds no read of a slice branch field. | skills/sdlc/test/prompts.test.mjs:1145, :1195, :1221 | holds |

`npm test`: 740 tests, 739 pass, 0 fail, 1 skipped.

## Defects
None. Other `sdlc/<id>` and `sdlc/run-<n>` literals in other prompts belong to S-027b and S-027c, so they are not defects here.
