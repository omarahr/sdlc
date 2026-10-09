# Evidence: S-003

Slice: tail contract and format resolution order.
Kind: spec. Risk: medium.

The gate receipt covers commit a04f40b6. The full suite passed on that code in 70 seconds.
The receipt check printed `"valid": true` on the final branch tip.

## Requirements

| Requirement | Status | Tests |
|---|---|---|
| R-018 | done | `tail builds the slice, state and e2e-area tails and fails on a missing part`; `the state tail is the current UTC time` |
| R-099 | done | `name without a required part exits 2 with one JSON error and no traceback` |
| R-015 | done | `name takes the format from the flag, then the config, then the default`; `the --format flag wins over a broken config in name and preflight` |
| R-012 | done | `preflight reports the resolved format and whether it was given` |
| R-002 | in_progress | `load_format returns the config value or the default`; the default cases of `preflight reports the resolved format and whether it was given` (clause 1 only) |

The committed tests are in `skills/sdlc/test/branches.test.mjs`.
R-002 stays in progress. S-027 closes its fresh-run config clause (ADR-20261009-041833-decision-judge-S-003-7312).
The final verification round with cases is r0. All 59 of its cases passed (cli, contract, security).
Fix round 1 promoted TC-cli-10 and TC-cli-18 into the committed test `the --format flag wins over a broken config in name and preflight`.
Round r1 verified the fix with no new cases.

## Seeds

The slice records 24 non-blocking seeds in `barraiser.json`.
