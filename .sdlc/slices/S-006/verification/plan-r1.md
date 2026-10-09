# S-006 verification plan, round 1

Risk: low. The slice adds tests only. Product code does not change.

This plan follows a review fix. It copies plan r0 and adds no scenario.

## What changed since plan r0
- The fix commit deleted test T-R-011b from `branches.test.mjs`. An existing test already asserts the same result.
- The fix changed no product code and no observable behavior. Existing tests cover the deleted case.
- Scenario VS-1 still covers the case that `{name}` keeps the case of the tail.

## Scenarios
| Id | Title | Requirements | Profiles |
|---|---|---|---|
| VS-1 | A lowercased format lowercases only the tail | R-011 | contract, cli |
| VS-2 | Every kind builds a valid branch that split reverses under three formats | R-068 | contract, cli |
| VS-3 | The CLI name agrees with the Python name for all 24 cases | R-068, R-011 | cli |
| VS-4 | No push or pull-request site names an e2e-area branch | R-120 | contract |
| VS-5 | A planted e2e-area push is reported by the scanner | R-120 | contract |

## Coverage
| Requirement | Scenarios |
|---|---|
| R-011 | VS-1, VS-3 |
| R-068 | VS-2, VS-3 |
| R-120 | VS-4, VS-5 |

## Tools
| Id | Profile | Purpose | Exists |
|---|---|---|---|
| cli-runner | cli | Run `branches.py name` from a scratch cwd and compare with the Python name | yes |
| property | contract | Call name and split in batch over generated parts and formats | yes |
