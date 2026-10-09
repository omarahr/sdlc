# Evidence: S-002

Slice: validate_format, split and name.
Kind: spec. Risk: medium.

The gate receipt covers commit e1324807. The full suite passed on that code in 66 seconds.
The receipt check printed `"valid": true` on the final branch tip.

## Requirements

| Requirement | Tests |
|---|---|
| R-001 | `validate_format accepts one placeholder with a valid literal part`; `validate_format rejects two placeholders, none, whitespace and an invalid ref` |
| R-017 | `validate_format accepts one placeholder with a valid literal part`; `validate_format rejects two placeholders, none, whitespace and an invalid ref`; `validate_format rejects the literal parts that git refuses`; `an invalid-ref format is bad input on the CLI`; `validate_format without git is a Fail, not a crash`; `validate_format rejects Unicode whitespace that git accepts` |
| R-019 | `branches.py imports from its path and exposes the public functions`; `name puts the tail in the placeholder and lowercases only the tail` (the name half; S-007 closes the parse-back clause) |
| R-020 | `branches.py imports from its path and exposes the public functions`; `split returns the prefix, the suffix and the lower flag` |
| R-071 | `validate_format rejects two placeholders, none, whitespace and an invalid ref` |

The committed tests are in `skills/sdlc/test/branches.test.mjs`.
The final verification round with cases is r0. All 41 of its cases passed (cli, contract, security).
Fix round 1 promoted TC-contract-4 into the committed test `validate_format rejects Unicode whitespace that git accepts`.
Round r1 verified the fix with no new cases.

## Seeds

The slice records 26 non-blocking seeds in `barraiser.json`.
