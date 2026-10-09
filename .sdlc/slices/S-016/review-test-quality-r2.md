# Review S-016, lens test-quality, round 2

- Scope: the diff of `skills/sdlc/test/branches.test.mjs` from 03a9a0f to ea15f87.
- Verdict: one blocking finding.

## Checked
- The tests and `branches.py` carry no comments.
- No test uses a sleep, a clock or the network. No test runs the repo test command.
- T-R-073a is deleted. T-R-073b has a promotion record in tests.md.
- The verifier tests under `verification/` hold no keep-worthy case that is not already pinned.

## Blocking
- T-R-043a duplicates T-R-087a. Both run the same `ends_with .lock` rule. T-R-087a asserts the full suggestion text, so T-R-043a pins nothing more. Delete T-R-043a and its line in tests.md.

## Non-blocking
- T-R-042i and T-R-042e use the same `a..b` rule and the same suggestion assertion. Merge the sample and rule checks of T-R-042i into T-R-042e.
- T-R-042h replaces `mod.verdict` with a fake. It pins the call count, which is an implementation detail. The guard has a behavior test in T-R-042g.
