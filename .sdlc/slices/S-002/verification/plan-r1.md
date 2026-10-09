# S-002 verification plan, round 1

Risk: **medium**. `validate_format` starts git with operator text, so a wrong verdict admits a format whose branch names the forge refuses.

## Scenarios

| Id | Title | Requirements | Profiles |
|---|---|---|---|
| VS-1 | An operator sets a valid branch format and the loop accepts it unchanged | R-001, R-017 | contract, cli |
| VS-2 | An operator sets a structurally malformed format and the loop refuses it | R-001, R-017, R-071 | contract, cli, security |
| VS-3 | An operator sets a format whose sample name git refuses, and the error carries git's reason | R-017, R-071 | contract, cli, security |
| VS-4 | The loop checks a format on a machine where git is missing or broken | R-017 | contract, cli |
| VS-5 | A caller splits a format into its prefix, suffix and lower flag | R-020 | contract |
| VS-6 | A caller builds a slice branch name, and only the tail is lowercased | R-019 | contract |
| VS-7 | A caller asks for a name without the parts the kind needs, or for an unknown kind | R-019 | contract |
| VS-8 | A format from config.json that git refuses stops every branches.py command with one JSON error | R-017 | cli, security |

The JSON file holds the notes for each scenario: the risk, the inputs to try and the boundary checks.

## Coverage

| Requirement | Scenarios |
|---|---|
| R-001 | VS-1, VS-2 |
| R-017 | VS-1, VS-2, VS-3, VS-4, VS-8 |
| R-019 | VS-6, VS-7 (the parse-back clause closes in S-007) |
| R-020 | VS-5 |
| R-071 | VS-2, VS-3 |

## Tools

| Id | Profile | Purpose | Exists |
|---|---|---|---|
| property | contract | Generated formats and parts for the `validate_format`, `split` and `name` properties | yes |
| cli-runner | cli | Run `branches.py` in a scratch repo with a controlled env, PATH and config.json | yes |
| attack-corpus | security | Control characters, NUL, flag-like values, injection and unicode whitespace for the format | yes |

## Notes

- The diff against main also holds S-001, because S-001 is not yet on main. This plan covers only the S-002 changes in `skills/sdlc/branches.py`.
- The CLI `name` handler still echoes its arguments by design (ADR-20261009-034215). The CLI scenarios check the format verdict only.
- No requirement states a number. The plan does not tag `limits`. One git process per call is a cost concern, not a stated limit.

## Changes since round 0

- This round follows a review fix (fix round 1 in failures.md).
- Commit 1b90e38 adds one committed test in `skills/sdlc/test/branches.test.mjs`. The test pins the Unicode whitespace check in `validate_format`.
- The commit does not change product code. VS-2 already covers this behavior.
- Scenario ids stay the same. This round adds no scenarios.
