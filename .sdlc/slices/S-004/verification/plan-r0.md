# Verification plan: S-004, round 0

Slice: tails for run, slice, milestone, e2e, e2e-area.
Risk: **medium**. One CLI and Python boundary adds three table rows. A wrong tail gives wrong pushed branch names, but the change is small and easy to see.

## Scenarios

| Id | Title | Requirements | Profiles |
|---|---|---|---|
| VS-1 | An operator names the run, slice, milestone, e2e and e2e-area branches under the default format | R-003, R-004, R-005, R-006, R-007 | cli, contract |
| VS-2 | A team format with a prefix or a lowercase placeholder applies to the run, milestone and e2e branches | R-003, R-005, R-006 | cli, contract |
| VS-3 | A caller leaves out the part a run, milestone, e2e or e2e-area branch needs | R-003, R-005, R-006, R-007 | cli, security, contract |
| VS-4 | A run counter arrives in an edge form | R-003 | cli, security, contract |
| VS-5 | Hostile text arrives in the milestone id or the e2e area | R-005, R-006, R-007 | security, cli |
| VS-6 | The new rows leave the existing slice, state and e2e-area tails and the unknown kinds unchanged | R-004, R-007 | contract, cli |

The full notes for each scenario are in `plan-r0.json`.

## Coverage

| Requirement | Scenarios |
|---|---|
| R-003 (run) | VS-1, VS-2, VS-3, VS-4 |
| R-004 (slice) | VS-1, VS-6 |
| R-005 (milestone) | VS-1, VS-2, VS-3, VS-5 |
| R-006 (e2e) | VS-1, VS-2, VS-3, VS-5 |
| R-007 (e2e-area) | VS-1, VS-3, VS-5, VS-6 |

## Tools

| Id | Profile | Purpose | Exists |
|---|---|---|---|
| cli-runner | cli | Run `branches.py name` in scratch git repos. Record the exit code, JSON stdout, stderr and the tree diff. | yes |
| property | contract | Call `tail` and `name` with generated formats and parts. Check the prefix + tail + suffix property and the Fail-only contract. | yes |
| attack-corpus | security | Supply hostile `--id`, `--area` and `--n` values and a planted decoy module. | yes |

## Notes

- The product diff adds the `run`, `milestone` and `e2e` rows to `TAILS` in `skills/sdlc/branches.py`. `cmd_name` does not change.
- The slice crosses no HTTP, async, data, UI or i18n boundary. Those profiles are not tagged.
- The spec gives no number for these scenarios. The `limits` profile is not tagged.
- ADR-20261009-045048 accepts a malformed id and a negative `n`. Do not refute them. Record a branch that git refuses as a seed. S-007 owns the parse round trip.
