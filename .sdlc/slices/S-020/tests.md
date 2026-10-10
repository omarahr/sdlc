# Tests S-020

- T-R-050a `branches.test.mjs` — R-050 — `BRANCH_FORMAT` is undefined: the loop script does not define it yet.
- T-R-050b `branches.test.mjs` — R-050 — `branchName` is not a function: the loop script does not define it yet.
- T-R-116a `branches.test.mjs` — R-116 — `INTERNALS` does not export `branchName` or `BRANCH_FORMAT`.
- T-R-051a `verify.test.mjs` — R-051 — `verifyPhase` still builds the branch with the `sdlc/` literal.
- T-R-051b `branches.test.mjs` — R-051 — the script source still holds a template literal that starts with `sdlc/${`.
- T-R-052a `bootstrap.test.mjs` — R-052 — the env-detector inputs have no `branchFormat` key.
- T-R-075a `branches.test.mjs` — R-075 — `rt.I.branchName` is not a function: the loop script does not define it yet.
- Updated pins in `bootstrap.test.mjs` — R-052 — the env-detector inputs lack `branchFormat: null`.
