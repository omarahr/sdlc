# S-008 verification plan, round 0

Risk: medium. The slice adds tests only, but a precedence mistake in parse would misclassify milestone and e2e branches in the loop.

S-007 built all parse rows, so the slice changes no product code. Verification probes the existing rows at their boundaries. Limits, data, async and i18n do not apply.

## Scenarios

| Id | Title | Requirements | Profiles |
|---|---|---|---|
| VS-1 | A run branch is classified as run with an integer n | R-102 | contract, cli |
| VS-2 | A milestone branch is classified as milestone and never swallows e2e tails | R-103 | contract, cli |
| VS-3 | An e2e branch is classified as e2e and an e2e-area tail is not | R-104 | contract, cli |
| VS-4 | An e2e-area branch keeps a dashed area whole | R-105 | contract, cli |
| VS-5 | First-match order holds under prefixed and suffixed formats | R-102, R-103, R-104, R-105 | contract, cli |
| VS-6 | Slice, e2e-area and verify branches keep the table's precedence in one call | R-070 | contract |
| VS-7 | Hostile branch tails are refused or classified without crashes | R-102, R-103, R-104, R-105 | security, cli |

## Notes

- VS-1: Try run-3, run-0, run-12, run-007. Try run-x, run-, run-3-x, run--1. n must be an integer and the row gives no id. The CLI must print the same kind and n.
- VS-2: M-2 is milestone. M-, M-x are null. M-2-e2e and M-2-e2e-api must not be milestone. m-2 is null by default and milestone under {name:lower}.
- VS-3: M-2-e2e is e2e with id M-2. M-2-e2e-api must not be e2e. M-2-e2e- is null. Check the end anchor with trailing text.
- VS-4: M-2-e2e-api-v2 gives area api-v2. Try areas a, 0, e2e, v2-api-3, and long areas. The CLI must print the same id and area.
- VS-5: Run rows 1 to 4 under feature/PROJ-1-{name} and {name}-wip. M-2-e2e-api-wip gives area api. A tail that fits rows 2, 3 and 4 in turn must go to the first matching row.
- VS-6: S-fix-M-1-2 is slice. M-1-e2e-api is e2e-area. S-001-v0-http-api-0 is verify with profile http-api, round 0, part 0. Assert all three under the default format.
- VS-7: Python $ matches before a trailing newline, so try M-2\n, run-3\n and M-2-e2e\n. Try unicode digits in run-N and M-N, NUL, control characters, flag-like values, and slashes inside an area (M-2-e2e-a/b). Parse must never raise, and a hostile tail must not gain a kind that a clean tail would not get. Slash in an area keeps the S-007 behavior per ADR-20261009-173303-decision-judge-S-008-a88a, so note it and do not fail on it.

## Tools

| Id | Profile | Purpose | Exists |
|---|---|---|---|
| property | contract | Call parse in batch through pycall.py with generated tails and formats. | True |
| cli-runner | cli | Run branches.py parse in a scratch repo and compare kind, n, id and area with the function result. | True |
| attack-corpus | security | Feed hostile tails (newline, unicode digits, NUL, flag-like values) to parse. | True |

## Coverage

| Requirement | Scenarios |
|---|---|
| R-070 | VS-6 |
| R-102 | VS-1, VS-5, VS-7 |
| R-103 | VS-2, VS-5, VS-7 |
| R-104 | VS-3, VS-5, VS-7 |
| R-105 | VS-4, VS-5, VS-7 |
