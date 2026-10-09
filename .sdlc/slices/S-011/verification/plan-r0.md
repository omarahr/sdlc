# Verification plan r0 for S-011

Risk: medium. evaluate feeds the pre-flight verdict, so a wrong True launches names a rule rejects, but it is a pure function with one boundary.

## Scenarios
| Id | Title | Requirements | Profiles |
|---|---|---|---|
| VS-1 | Each text operator follows its definition and is case-sensitive | R-033, R-095 | contract |
| VS-2 | A regex rule uses search and an uncompilable pattern gives None | R-033, R-072 | contract, security |
| VS-3 | Negate flips True and False and keeps None | R-034, R-072 | contract |
| VS-4 | An unknown or malformed rule never raises and gives None | R-033, R-034 | contract, security |
| VS-5 | regex_error reports the compile error text or None | R-072 | contract |

## Coverage
| Requirement | Scenarios |
|---|---|
| R-033 | VS-1, VS-2, VS-4 |
| R-095 | VS-1 |
| R-034 | VS-3, VS-4 |
| R-072 | VS-2, VS-3, VS-5 |

## Tools
- `property` (contract): exists.
- `attack-corpus` (security): exists.

## Notes
`limits` is not tagged. The spec states no number for evaluate. A pattern that backtracks without end is a concern for the security profile.
