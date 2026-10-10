# Verification plan S-032, round 0

Risk: low. The slice adds tests only for a small pure table lookup that S-016 already built.

## Scenarios
| Id | Title | Requirements | Profiles |
|---|---|---|---|
| VS-1 | The pr preflight samples a state branch and the stack preflight does not | R-136 | cli |
| VS-2 | The mr and direct preflights sample no state branch | R-136 | cli |
| VS-3 | The stack preflight samples run and milestone branches and the pr preflight does not | R-137 | cli |
| VS-4 | Only the pr preflight samples an e2e branch | R-137 | cli |
| VS-5 | No mode samples a kind that the loop never pushes | R-137 | cli, security |

## Notes
- VS-1: match the state name with `^sdlc/state-\d{14}$`. Try a custom branchFormat.
- VS-2: the mr mode adds a `working` sample with `--branch`. Check by kind.
- VS-3: names are `sdlc/run-1` and `sdlc/M-1`. Try a custom branchFormat.
- VS-4: the pr name is `sdlc/M-1-e2e`.
- VS-5: try hostile `--branch` values and a hostile branchFormat. The sampled kinds must not change.

## Tools
| Id | Profile | Purpose | Exists |
|---|---|---|---|
| cli-runner | cli | Run `branches.py preflight` from a scratch repo | yes |
| attack-corpus | security | Supply hostile `--branch` values | yes |

## Coverage
| Requirement | Scenarios |
|---|---|
| R-136 | VS-1, VS-2 |
| R-137 | VS-3, VS-4, VS-5 |

## Changes since the previous plan
Round 1 follows a review fix. The fix deleted the five duplicate tests and changed no observable behavior. All scenario ids stay. No scenario is added.
