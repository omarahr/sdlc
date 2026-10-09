# S-012 verification plan, round 0

Risk: low. Two pure helper functions in one module: the only boundary is one git subprocess call, and a wrong result is easy to see.

## Scenarios

| Id | Title | Requirements | Profiles |
|---|---|---|---|
| VS-1 | A pattern Python cannot compile leaves the sample unevaluated and never blocks | R-035 | contract, security |
| VS-2 | Rule results combine into fail, pass or unevaluated | R-036 | contract |
| VS-3 | A sample with an invalid ref name fails with the rule git check-ref-format | R-037 | contract, security |
| VS-4 | Forge rule label wins over the git ref check | R-037, R-036 | contract |
| VS-5 | validate_format keeps its behavior after the refactor to ref_format_error | R-037 | contract |

## Notes

- VS-1: Risk: re.error leaks as an exception, or a bad pattern fails the sample. Try (, [a-, *, a{2,1}, (?P<, very deep nesting, a catastrophic pattern, negate true and false, bad pattern beside a passing rule. Note must read 'cannot evaluate <label>: <re.error text>' and equal regex_error. An unknown kind gives 'cannot evaluate <label>: unknown kind <kind>'. judge must return a dict and never raise. The preflight half belongs to S-015.
- VS-2: Boundary: one False among many fails and the label is the first failing rule. All True passes with rule null and no notes. Empty rule list passes. True plus None is unevaluated. None plus False is fail, because a failure beats None. Negate flips True and False but not None. Check the return shape has exactly result, rule, notes. Try many rules, duplicate labels and missing labels.
- VS-3: Inputs: bad..name, a~b, a^b, a:b, a?b, a*b, a[b, a\b, /lead, x.lock, trailing slash, trailing dot, empty string, space, control characters, NUL, a leading dash, @{-1}, @, non-string. Valid: sdlc/S-001, feature/PROJ-1-sdlc-foo. ref_format_error gives None for valid refs and a non-empty text otherwise. A sample must never be read as a git option. NUL or odd input must give Fail or a fail verdict, not a traceback. The call sets no cwd and must not depend on a repo or on repo state.
- VS-4: bad..name against a failing starts_with rule gives the forge rule label. A passing forge rule with bad..name gives git check-ref-format. A bad regex plus an invalid ref gives fail with git check-ref-format, because a failure beats unevaluated. With no rules the ref check still runs.
- VS-5: The existing validate_format messages and Fail cases must stay equal, for the refusal and for git that cannot run (git missing from PATH). Compare messages with main. Run the property check on validate_format with checkLoadFormat for no new exception outcome.

## Tools

| Id | Profile | Purpose | Exists |
|---|---|---|---|
| property | contract | Call judge, ref_format_error and validate_format in batch with generated rules and samples. Refuse exception outcomes. | True |
| attack-corpus | security | Feed flag-like, NUL, control character, unicode and oversized samples to judge and ref_format_error. | True |
| cli-runner | security | Run Python from a scratch cwd with a controlled PATH to check git missing and that the call needs no repo. | True |

## Coverage

| Requirement | Scenarios |
|---|---|
| R-035 | VS-1 |
| R-036 | VS-2, VS-4 |
| R-037 | VS-3, VS-4, VS-5 |

No command, endpoint or UI is added, so cli, http-api and ui do not apply. limits is not tagged because the spec states no number. Concern: a catastrophic regex could make Python re run long. The spec accepts this, and VS-1 notes it for the contract and security agents. The preflight half of R-035 (ok: true) belongs to S-015.
