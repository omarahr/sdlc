# S-005 verification plan, round 1

Risk: **medium**. The change crosses one boundary, the `branches.py name` command. A wrong tail gives wrong state, verify and attempt branch names. These names later break recognition and sweeps.

## Changes since round 0
- Round 0 passed verification. Review then found that T-R-119 missed a verify push built on an earlier line or split over lines.
- Commit f2d3ce2 rewrote T-R-119. It joins continuation lines and pins the exact list of push and create sites. No product code changed.
- VS-9 is new. It re-proves the stronger guard and looks for push forms that its site regex still misses. Only VS-9 runs this round.
- VS-1 to VS-8 keep their ids, titles and notes.

## Scenarios
| Id | Title | Requirements | Profiles |
|---|---|---|---|
| VS-1 | The loop asks for a state branch with no timestamp and gets `sdlc/state-` plus 14 UTC digits | R-008 | cli, contract |
| VS-2 | A caller gives an explicit state timestamp and it is used as given | R-008 | contract, security |
| VS-3 | The loop names a verify branch for a round, profile and part, round 0 and part 0 included | R-009 | cli, contract |
| VS-4 | A verify branch request with a missing or malformed part is refused cleanly | R-009 | cli, security, contract |
| VS-5 | The loop names an attempt branch for a slice and attempt number | R-010 | cli, contract |
| VS-6 | An attempt branch request with a missing or malformed number is refused cleanly | R-010 | cli, security, contract |
| VS-7 | A team with a custom branch format gets verify and attempt branches inside that format | R-009, R-010 | cli, contract |
| VS-8 | A verify branch never leaves the machine: no script pushes it or opens a request for it | R-119 | security, cli |
| VS-9 | A verify branch push written in a form the line scan missed is caught by the guard test | R-119 | security, cli |

The full notes for each scenario are in `plan-r1.json`.

## Coverage
| Requirement | Scenarios |
|---|---|
| R-008 | VS-1, VS-2 |
| R-009 | VS-3, VS-4, VS-7 |
| R-010 | VS-5, VS-6, VS-7 |
| R-119 | VS-8, VS-9 |
| R-093 | none: ADR-20261009-053059-decision-judge-S-005-23a9 moves it to S-027 |

## Tools
| Id | Profile | Purpose | Exists |
|---|---|---|---|
| cli-runner | cli | Run `branches.py name` and the guard test on a skill copy in a scratch repo. | yes |
| property | contract | Call `tail` and `name` through the Python API with generated parts. | yes |
| attack-corpus | security | Feed hostile id, profile, round, part and n values. | yes |

## Notes
- The loop still hard-codes the verify branch builder with the `sdlc/` prefix. VS-3 compares it with the default format only. A later slice wires the loop to `branches.py`.
- No spec number applies to these scenarios. The plan does not tag `limits`.
- The `name` command does not check its output with `git check-ref-format`. Hostile parts can give ref-unsafe names. VS-2, VS-4 and VS-6 record this as a seed.
