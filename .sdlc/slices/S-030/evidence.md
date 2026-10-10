# Evidence for S-030

S-016 already built `derive`. This slice adds tests that pin the acceptance values.

## R-123
A starts_with `feature/` rule derives `feature/sdlc/{name}`.
- T-R-123a checks the format and the names of all three kinds.

## R-124
An ends_with `-dev` rule derives `sdlc/{name}-dev`.
- T-R-124a checks the format.

## R-125
A contains `team-a` rule derives `sdlc/team-a/{name}`.
- T-R-125a checks the format.

## R-126
Preflight reports a derived format as a suggestion and as the setup it used.
- T-R-042a and T-R-042c run the same preflight cases. The slice removed its own duplicates.

## R-141
`derive` returns a format only for one simple rule. It returns None for a regex rule, a negated rule or two rules.
- T-R-141a checks the three non-negated operators.
- T-R-141b checks the None cases.

The verifier cases in `verification/r0` all passed. The full suite passed on commit 1a8d797 (suite receipt valid).
