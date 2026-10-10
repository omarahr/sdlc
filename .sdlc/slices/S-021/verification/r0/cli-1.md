# Verification: S-021, profile cli, part 1, round 0

Commit: fecc565. Verdict: verified (3 cases, 3 pass). Scenario: VS-7.

Environment: Python 3, Node, git. A prs file replaces gh. A worktree of main (8450221) is the baseline.

## TC-cli-1: the full suite passes with no branchFormat (R-077)
- Given: branch sdlc/S-021 at fecc565, no branchFormat.
- When: run `npm test`.
- Then: 683 tests, 682 pass, 0 fail, 1 skipped. The next-action file alone: 39 pass.
- Result: pass.

## TC-cli-2: decisions equal main (R-077)
- Given: 195 fixtures in pr, stack and direct mode, each run with the key absent, empty and null.
- When: run next-action.py from main and from the branch.
- Then: 585 comparisons, 0 differences in exit code and stdout.
- Test: `.sdlc/slices/S-021/verification/r0/tests/cli-1/default-format.verify-cli.test.mjs:49`
- Result: pass.

## TC-cli-3: milestone branch is not a slice branch
- Given: branches sdlc/S-fix-M-1-1 and sdlc/M-1, both with an in-progress entry.
- Then: the branch picks sdlc/S-fix-M-1-1. Main picked sdlc/M-1.
- Result: pass. This change is a seed only.

## Seeds
- Default-format decision differs from main for a milestone branch with an in-progress entry. The state never writes such an entry. The change is harmless.
