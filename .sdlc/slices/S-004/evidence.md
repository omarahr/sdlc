# Evidence: S-004 tails: run, slice, milestone, e2e, e2e-area

The slice adds the `run`, `milestone` and `e2e` rows to `TAILS` in `skills/sdlc/branches.py`.
The `slice` and `e2e-area` rows came from S-003. This slice checks them through the CLI.
The gate receipt covers commit `c0be01d`. The full suite passed in 71 seconds.

## Requirements and tests

| Requirement | Acceptance | Tests |
|---|---|---|
| R-003 | `name --kind run --n 1` prints `sdlc/run-1` | T-025, T-026, T-027 |
| R-004 | `name --kind slice --id S-001` prints `sdlc/S-001` | T-025 |
| R-005 | `name --kind milestone --id M-1` prints `sdlc/M-1` | T-025, T-026, T-027 |
| R-006 | `name --kind e2e --id M-1` prints `sdlc/M-1-e2e` | T-025, T-026, T-027 |
| R-007 | `name --kind e2e-area --id M-1 --area api` prints `sdlc/M-1-e2e-api` | T-025 |

All tests are in `skills/sdlc/test/branches.test.mjs`.

## Verification round 0

- The cli profile passed 14 of 14 cases.
- The contract profile passed 13 of 13 cases.
- The security profile passed 7 of 7 cases.
- The spec-fidelity and regression lenses verified the slice.

## Decisions

- `ADR-20261009-045048-decision-judge-S-004-7815`: the tail rows check only for a missing or empty part.
- `ADR-20261009-041711-decision-judge-S-003-4882`: S-003 added only the state and e2e-area rows.
- `ADR-20261009-041713-decision-judge-S-003-c3ba`: the CLI `name` prints `{ok, command, format, kind, branch}`.
- `ADR-20261009-034215-decision-judge-S-002-feb0`: S-002 kept the interim echo in the CLI `name` handler.

## Known gaps

The bar raiser receives 14 non-blocking seeds. The main gap is this: a hostile milestone id or e2e area gives a branch that `git check-ref-format` refuses. ADR-20261009-045048 accepts this gap for now.
