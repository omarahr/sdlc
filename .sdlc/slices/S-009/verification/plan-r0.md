# S-009 verification plan, round 0

Risk: medium. Row order decides how scripts classify state, verify and slice branches, so a wrong order makes them sweep or resume the wrong branch.

## Scenarios

| Id | Title | Requirements | Profiles |
|---|---|---|---|
| VS-1 | A state branch with exactly 14 digits is classified as state | R-106 | contract, cli |
| VS-2 | A verify branch splits into id, round, profile and part | R-107 | contract, cli, security |
| VS-3 | A verify tail wins over the slice row | R-107, R-109 | contract, cli |
| VS-4 | An attempt branch gives id and an integer n | R-108 | contract, cli |
| VS-5 | A slice branch gives kind slice and keeps the full id | R-109 | contract, cli |
| VS-6 | Rows 5 to 8 classify the same under prefixed and suffixed formats | R-106, R-107, R-108, R-109 | contract, cli |
| VS-7 | The ledger flag known follows the id on rows 6 to 8 | R-107, R-108, R-109 | contract, cli |

## Notes per scenario

- VS-1: Try sdlc/state-20261008101500 through parse and the CLI. ts must stay a string. Try 13 and 15 digits, an empty tail, a letter among the digits, and a trailing letter. All of these must give null. Try a trailing newline and non-ASCII digits: report them as seeds, S-007 left them open.
- VS-2: Try S-001-v0-http-api-0 and S-001-v12-cli-3: round and part are integers. Profile a-b-c keeps its full text. Missing part digit, missing round or empty profile must not give verify. Hostile input: huge round digits, flag-like and control-character ids, NUL, oversized tails. Parse must return a value or null and never raise.
- VS-3: S-001-v0-http-api-0 also fits the slice regex. It must give kind verify. S-fix-M-1-2-v1-cli-0 gives id S-fix-M-1-2. Check the same order with prefix and suffix formats.
- VS-4: Try S-001-attempt-2 and S-005b-attempt-10. Missing number, letter number and trailing hyphen must not give attempt. Check that attempt wins over the slice row, and that a verify-shaped tail still gives verify before attempt.
- VS-5: Try S-001, S-fix-M-1-2 and S-005b. sdlc/S-, sdlc/X-001 and sdlc/S-001/x give null. sdlc/s-001 is null under the default format and slice under {name:lower}.
- VS-6: Run one branch per row under feature/PROJ-1-{name} and {name}-wip. The suffix must not leak into the verify part or the attempt n. A branch with a wrong prefix or suffix gives null.
- VS-7: With ids [S-001], slice, attempt and verify branches of S-001 give known true. S-002 gives false. A state branch gives null. Under {name:lower}, a mixed-case id still matches and returns the ledger spelling.

## Tools

| Id | Profile | Purpose | Exists |
|---|---|---|---|
| property | contract | Call parse through the Python probe for each row, including seeded generated tails, and check that it never raises. | True |
| cli-runner | cli | Run branches.py parse from a scratch repo and compare kind and parts with the contract result. | True |
| attack-corpus | security | Feed unicode-digits, huge-integers, nul, oversized, control-chars and flag-like-values tails into the verify, attempt and state rows. | True |

## Coverage

| Requirement | Scenarios |
|---|---|
| R-106 | VS-1, VS-6 |
| R-107 | VS-2, VS-3, VS-6, VS-7 |
| R-108 | VS-4, VS-6, VS-7 |
| R-109 | VS-3, VS-5, VS-6, VS-7 |

## Notes

Slice adds tests only. S-007 built the rows. Tagged contract first, then cli, then security, within the medium cap of 4. The limits profile is not tagged: the spec states no number. Huge digit runs and trailing newline stay as seeds from S-007.
