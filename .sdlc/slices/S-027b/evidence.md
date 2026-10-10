# Evidence S-027b: integrator deletes attempt branches found through branches.py list

## R-093
Clean up step 2 of integrator.md finds the slice's attempt branches with `branches.py list --kind attempt`. It keeps the entries whose id matches the slice, ignoring case. It deletes each one locally with `git branch -D`. In `pr`, `mr` and `stack` modes it also deletes each one on `origin` with `git push origin --delete`. The step works under a custom `branchFormat` too.
- T-R-093a, T-R-093b, T-R-093c in `skills/sdlc/test/prompts.test.mjs`.
- The characterization test on the Clean up heading, `splitInto` and the never-delete sentence still passes.
- Verification: cli, contract and security runs. All 24 cases passed.
- Limit: `list` reads local branches only. An attempt branch that exists only on `origin` stays.

## Gate
The full suite passed on commit 2094ebb (`.sdlc/reports/S-027b/suite-receipt.json`). No benchmark applies to this slice.
