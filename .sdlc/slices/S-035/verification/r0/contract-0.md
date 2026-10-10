# Verification: S-035, profile contract, round 0
Commit 5040928. Verdict: pass (4 scenarios, 4 cases, 0 failures).

Environment: Node 24, python3, scratch git repos. Command: `cd <repo> && VERIFY_WT=<worktree of sdlc/S-035> TESTKIT_SEED=35001 node --test .sdlc/slices/S-035/verification/r0/tests/contract-0/prompt-branch.verify-contract.test.mjs`

## TC-contract-1 (VS-1, R-131)
Given a scratch repo with attempt branches of S-1, S-10, S-100 and s-1. When branches.py list --kind attempt runs and the filter applies. Then only S-1 and s-1 remain. Result: pass. Real-file mutations (glob added, kind changed, prefix filter) make T-R-131 fail. Log: `logs/contract-0-run.txt`, `logs/contract-0-mutation.txt`.

## TC-contract-2 (VS-2, R-143)
Seed 35001, 1200 runs of injected literal variants (code span, table cell, quotes, refs/heads, origin/) on integrator.md. All 1099 non-skipped injections were caught. 300 safe strings (.sdlc/, sdlc/STOP, sdlc/tracker) gave no false positive. Result: pass.

## TC-contract-3 (VS-3, R-145)
Same property on escalator.md. T-R-145 fails when sdlc/run-3 is added. Result: pass.

## TC-contract-4 (VS-4, R-147)
Same property on state-writer.md. T-R-147 fails on an added literal and passes with .sdlc/ paths. Result: pass.

## Seeds
- stripBranchesOutput removes any fenced block that holds the word branches.py. A literal inside such a block is not seen. No shipped block hides one.
