# Verification plan r0: S-024

Risk: high. The janitor deletes git branches, and a wrong parse can delete work the loop needs.

## Scenarios
| Id | Title | Requirements | Profiles |
|---|---|---|---|
| VS-1 | Janitor deletes verify branches of done, rejected and unknown slices under the default format | R-060 | cli, security |
| VS-2 | Janitor keeps every non-verify kind and unparseable names | R-060 | cli, security |
| VS-3 | Janitor sweeps verify branches under a custom format and spares run and attempt branches | R-060, R-079 | cli, security |
| VS-4 | Janitor leaves old-format verify branches when the format is derived | R-085 | cli, security, contract |
| VS-5 | Janitor resolves lowercased ids through the ledger | R-060, R-086 | cli, contract |
| VS-6 | Janitor reports an unusable format or ledger as a note and deletes nothing | R-060 | cli, security |
| VS-7 | Janitor source holds no V_BRANCH or V_ID and loads the format through branches.load_format | R-060, R-079 | contract |

## Tools
| Id | Profile | Purpose | Exists |
|---|---|---|---|
| cli-runner | cli | run janitor.py in scratch git repos and record exit code, notes and tree diff | True |
| attack-corpus | security | hostile branch names and format strings | True |
| property | contract | call branches.parse and load_format with generated formats and names | True |

## Coverage
| Requirement | Scenarios |
|---|---|
| R-060 | VS-1, VS-2, VS-3, VS-5, VS-6, VS-7 |
| R-079 | VS-3, VS-7 |
| R-085 | VS-4 |
| R-086 | VS-5 |

## Notes
Profiles are tagged most important first: cli, security, contract. No numeric limits in the spec, so no limits profile.
