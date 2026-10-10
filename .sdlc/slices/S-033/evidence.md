# Evidence S-033

Product files changed: skills/sdlc/state-write.py, skills/sdlc/test/scripts.test.mjs.

## R-138
branch_run and the milestone prune classify branches with parse.
- The prune treats only branches that parse to milestone as milestone branches under a custom format.
- branch_run takes a run branch only when it parses to kind run.
- A foreign branch is not taken as the run branch.
- Non-string runBranch values (5, null, list, object, true) give no run.

## R-139
janitor.py takes its format from load_format.
- A repo whose config holds feature/PROJ-1-{name} makes the janitor sweep under that format.
- A repo with no branchFormat makes the janitor sweep under sdlc/{name}.
- janitor.py takes its format from load_format.

## Verification
The verifiers passed rounds 0 and 1 with no refutation. The full suite receipt is valid for commit 62874300b0973d2248e0cca3d019b83c73983ab4.
