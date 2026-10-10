# Verification plan r0: S-fix-M-1-2

Risk: medium. One boundary, the forge CLI call in `branches.py`, with a secret-leak concern.

## Scenarios
| Id | Title | Requirements | Profiles |
|---|---|---|---|
| VS-1 | A failing gh rules read gives one bounded note without the token | R-029, R-084 | cli, security |
| VS-2 | A failing glab rules read gives one bounded note without the token | R-031, R-084 | cli, security |
| VS-3 | A gh failure with 10 MB of stderr finishes with a short note | R-029 | cli, security, limits |
| VS-4 | A missing tool or a timeout gives a one-line note of at most 200 characters | R-084, R-029, R-031 | cli, security, contract |
| VS-5 | The failure text reads the exit status and the HTTP code only | R-029, R-031 | contract, security |

## Tools
| Id | Profile | Purpose | Exists |
|---|---|---|---|
| cli-runner | cli | Run preflight with shims in a scratch repo | yes |
| glab-stub | cli | Fake glab with chosen stderr | yes |
| attack-corpus | security | Token-shaped stderr payloads | yes |
| property | contract | Call `_forge_failure` and `_bounded` | yes |
| measure | limits | Measure note size, stdout size and time | no |

## Coverage
| Requirement | Scenarios |
|---|---|
| R-029 | VS-1, VS-3, VS-4, VS-5 |
| R-031 | VS-2, VS-4, VS-5 |
| R-084 | VS-1, VS-2, VS-4 |

The `limits` numbers (200 characters, 20000 characters) come from the slice plan, not from the spec.
