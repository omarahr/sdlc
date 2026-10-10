# Verification plan for S-030, round 0

Risk: low. The slice adds characterization tests only and changes no product code in a small pure function plus one command.

## Scenarios

| Id | Title | Requirements | Profiles |
|---|---|---|---|
| VS-1 | A starts_with rule gives a prefixed format | R-123, R-141 | cli, contract |
| VS-2 | An ends_with rule gives a suffixed format | R-124, R-141 | cli, contract |
| VS-3 | A contains rule gives an infix format | R-125, R-141 | cli, contract |
| VS-4 | A derived format that passes every sample is reported clean | R-126 | cli |
| VS-5 | Derivation does not apply, so no format is derived | R-126, R-141 | cli, contract |

## Tools

| Id | Profile | Purpose | Exists |
|---|---|---|---|
| cli-runner | cli | Run branches.py in a scratch repo and read stdout, JSON and exit code | yes |
| stub-server | cli | Return the branch-name rules through the gh shim | yes |
| property | contract | Call derive through pycall.py | yes |

## Coverage

| Requirement | Scenarios |
|---|---|
| R-123 | VS-1 |
| R-124 | VS-2 |
| R-125 | VS-3 |
| R-126 | VS-4, VS-5 |
| R-141 | VS-1, VS-2, VS-3, VS-5 |

## Notes

Security and limits are not tagged. The slice adds no new input path and states no number.
