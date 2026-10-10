# Verification plan S-036, round 0

Risk: low. The slice adds only tests that read four prompt files. A wrong result is easy to see and cheap to fix.

## Scenarios
| Id | Title | Requirements | Profiles |
|---|---|---|---|
| VS-1 | scenario-runner prompt creates the area worktree through placeholders | R-132 | contract, cli |
| VS-2 | env-detector prompt reads the run branch through the placeholder and the parsed kind | R-133 | contract, cli |
| VS-3 | milestone-writer prompt names e2e area, e2e and milestone branches through placeholders | R-144 | contract |
| VS-4 | e2e-harness prompt names e2e and milestone branches through placeholders | R-148 | contract |
| VS-5 | the branch literal guard fails on a bad sample and ignores allowed text | R-132, R-133, R-144, R-148 | contract, cli |

## Coverage
| Requirement | Scenarios |
|---|---|
| R-132 | VS-1, VS-5 |
| R-133 | VS-2, VS-5 |
| R-144 | VS-3, VS-5 |
| R-148 | VS-4, VS-5 |

## Tools
| Id | Profile | Purpose | Exists |
|---|---|---|---|
| cli-runner | cli | run branches.py parse and node --test in a scratch repo | yes |

## Notes
The profiles run in priority order: contract, then cli. Other profiles cannot observe prompt text. The default format `sdlc/{name}` stays allowed in env-detector.md.
