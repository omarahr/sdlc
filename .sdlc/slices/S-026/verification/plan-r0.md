# Verification plan S-026, round 0

Risk: low. The slice adds five string-match tests and may leave `_common.md` unchanged. No runtime code changes.

## Scenarios
| Id | Title | Requirements | Profiles |
|---|---|---|---|
| VS-1 | The milestone branch row gives the milestone name command | R-111 | contract, cli |
| VS-2 | The e2e branch row takes the milestone id and no area | R-112 | contract, cli |
| VS-3 | The e2e area branch row takes a milestone id and an area id | R-113 | contract, cli |
| VS-4 | The state branch row takes no id and makes the timestamp | R-114 | contract, cli |
| VS-5 | The attempt branch row takes a slice id and an attempt number | R-115 | contract, cli |
| VS-6 | Every row of the placeholder table is complete and runs | R-111 to R-115 | cli, contract |

## Tools
| Id | Profile | Purpose | Exists |
|---|---|---|---|
| cli-runner | cli | Run branches.py name for each kind in a scratch repo | yes |
| property | contract | Call the name function with generated ids and numbers | yes |

## Coverage
| Requirement | Scenarios |
|---|---|
| R-111 | VS-1, VS-6 |
| R-112 | VS-2, VS-6 |
| R-113 | VS-3, VS-6 |
| R-114 | VS-4, VS-6 |
| R-115 | VS-5, VS-6 |

## Notes
Other profiles cannot observe a markdown table. The security profile is not tagged: this slice adds no input path.
