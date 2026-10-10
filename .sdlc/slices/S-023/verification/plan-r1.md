# Verification plan S-023, round 0

Risk: medium. One script boundary changes, but every state-write branch path now takes its format from main.

| Id | Scenario | Requirements | Profiles |
|---|---|---|---|
| VS-1 | patch-slice names the slice branch from the configured format | R-059 | cli, contract |
| VS-2 | base-branch uses the same single format derivation | R-059 | cli, contract |
| VS-3 | slice_side_branches lists only the verify and attempt branches of one slice | R-083 | contract, security |
| VS-4 | verify and attempt names are matched only through branches.parse | R-083 | contract |

## Coverage
| Requirement | Scenarios |
|---|---|
| R-059 | VS-1, VS-2 |
| R-083 | VS-3, VS-4 |

## Tools
- cli-runner (exists): run the CLI in scratch repos.
- property (exists): call the functions through the public entry.
- attack-corpus (exists): hostile slice ids and branch names.

The limits profile is not tagged: the spec states no number.

## Changes since round 0
The review fix promoted verifier tests into scripts.test.mjs. It changed no product code.
This plan adds no scenario. All scenario ids stay the same.
