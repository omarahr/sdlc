# S-005a verification plan, round 0

Risk: medium. One CLI boundary with two new table rows. A wrong tail gives wrong verify and attempt branch names. That breaks later recognition and sweeps.

## Scenarios

| Id | Title | Requirements | Profiles |
|---|---|---|---|
| VS-1 | The loop asks for a state branch with no timestamp and gets sdlc/state- plus 14 UTC digits | R-008 | cli, contract |
| VS-2 | A caller gives an explicit state timestamp and it is used as given | R-008 | contract, cli |
| VS-3 | The loop names a verify branch for a round, profile and part, round 0 and part 0 included | R-009 | cli, contract |
| VS-4 | A verify branch request with a missing or malformed part is refused cleanly | R-009 | cli, security, contract |
| VS-5 | The loop names an attempt branch for a slice and attempt number | R-010 | cli, contract |
| VS-6 | An attempt branch request with a missing or malformed number is refused cleanly | R-010 | cli, security, contract |
| VS-7 | A team with a custom branch format gets verify and attempt branches inside that format | R-009, R-010 | cli, contract |

The scenario notes in `plan-r0.json` give the inputs to try and the boundary checks.

## Coverage

| Requirement | Scenarios |
|---|---|
| R-008 | VS-1, VS-2 |
| R-009 | VS-3, VS-4, VS-7 |
| R-010 | VS-5, VS-6, VS-7 |

## Tools

| Id | Profile | Purpose | Exists |
|---|---|---|---|
| cli-runner | cli | Run branches.py name in a scratch git repo with a controlled env and TZ. Capture JSON, exit code, stderr and tree diff. | yes |
| property | contract | Call tail and name through the Python API with generated parts and formats. | yes |
| attack-corpus | security | Feed hostile ids, profiles, rounds, parts and n values to the CLI and the API. | yes |

## Notes

- S-005a is split from S-005. VS-1 to VS-7 match the S-005 scenarios for R-008, R-009 and R-010.
- The R-119 push-guard scenarios belong to S-005b. Do not test `push_guard.py` here.
- Parse and list for verify and attempt names belong to later slices. Record findings there as seeds, not refutations.
- The spec states no number for these kinds. So the plan does not tag `limits`.
