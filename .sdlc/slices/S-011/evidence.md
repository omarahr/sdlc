# Evidence for S-011: evaluate applies one rule to a sample

Code: `skills/sdlc/branches.py` (evaluate, regex_error). Tests: `skills/sdlc/test/branches.test.mjs`.

| Requirement | Tests |
|---|---|
| R-033: each operator applies to the sample; regex uses re.search | T-R-033a, T-R-033b, T-R-033c |
| R-095: ends_with and contains are case-sensitive | T-R-095a, T-R-095b |
| R-034: negate flips True and False; None stays None | T-R-034a, T-R-034b |
| R-072: operators, negate flip, and None for a bad regex | T-R-072a |

Decision tests: T-U-001 (unknown kind gives None, ADR-6e23) and T-U-002 (regex_error, ADR-b582).

The gate receipt covers commit ca10f39 and shows build, lint, test and typecheck passed.
The slice is not an improvement slice, so it has no benchmark numbers.
