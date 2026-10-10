# Verification plan r0 for S-fix-M-1-1a

Risk: low. The change is one pure parsing function with ASCII-only matching and no I/O boundary beyond a local command.

## Scenarios
| Id | Title | Requirements | Profiles |
|---|---|---|---|
| VS-1 | Look-alike unicode tails are no loop branch | R-022, R-024 | contract, cli |
| VS-2 | Lower mode ignores look-alike prefix, suffix and ids | R-024 | contract, cli |
| VS-3 | Valid ASCII tails keep their row order and kind | R-022 | contract, cli |
| VS-4 | A non-ASCII area stays an e2e-area | R-022 | contract |

## Notes per scenario
- VS-1: Risk: K sign U+212A, long s U+017F and Arabic-Indic digits read as ASCII. Try each in the slice, verify, attempt and run tails, in both name modes. Parse must return None. The CLI must show the same result and exit code.
- VS-2: Risk: lowering maps K sign to k. Try look-alike prefix, suffix and ledger ids. A look-alike id gives known false. A look-alike affix gives None.
- VS-3: Check S-fix-M-1-2 is a slice, M-1-e2e-api and M-1-e2e-a-b are e2e-area, S-001-v0-http-api-0 is verify. Results match the old results in both modes. Mixed-case ASCII still matches in lower mode.
- VS-4: M-1-e2e-é gives e2e-area with area é in both modes. Only the captured id must be ASCII.

## Tools
- cli-runner (cli): Run branches.py parse from a scratch repo and record status and stdout. Exists: True.
- property (contract): Generate hostile unicode tails and call parse through pycall. Exists: True.

## Coverage
| Requirement | Scenarios |
|---|---|
| R-022 | VS-1, VS-3, VS-4 |
| R-024 | VS-1, VS-2 |

Slice S-fix-M-1-1b owns name and active_branch, so do not test them here. The limits profile does not apply: the spec states no number.
