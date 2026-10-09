# Evidence for S-012: sample verdicts, bad patterns and check-ref-format

Code: `skills/sdlc/branches.py` (judge). Tests: `skills/sdlc/test/branches.test.mjs`.

| Requirement | Tests |
|---|---|
| R-035: judge gives pass or fail for a sample, and the note names a pattern that cannot run | T-R-035a to T-R-035g |
| R-036: judge names the first failing rule | T-R-036a to T-R-036e |
| R-037: judge also applies git check-ref-format to the sample | T-R-037a to T-R-037c |

Decision tests follow ADR-8681 (S-015 owns the preflight half of R-035) and ADR-f284 (a forge rule label wins over git check-ref-format).

The gate receipt covers commit cc4c80b and shows build, lint, test and typecheck passed.
The slice is not an improvement slice, so it has no benchmark numbers.
