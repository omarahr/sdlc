# Verification plan S-020, round 2

Risk: medium. The loop script names verifier branches, and a mismatch with branches.py breaks verification plumbing.

## Scenarios
| Id | Title | Requirements | Profiles |
|---|---|---|---|
| VS-1 | The loop script reads the branch format from its arguments or falls back to sdlc/{name} | R-050, R-116 | contract |
| VS-2 | branchName substitutes the placeholder and lowercases the tail for {name:lower} | R-050, R-051 | contract, security |
| VS-3 | The loop script and branches.py name the verifier branch the same way | R-075, R-051 | cli, contract |
| VS-4 | verifyPhase builds the profile-agent and collector branches through the format | R-051 | contract |
| VS-5 | The env-detector receives branchFormat | R-052 | contract |

## Notes
- VS-1: Inputs: no branchFormat, empty string, a prefixed format. Empty string must fall back. INTERNALS must export BRANCH_FORMAT as a string and branchName as a function.
- VS-2: Inputs: plain, prefixed and lower formats; tails with uppercase, '$&', '$1', '$$', slash, unicode, empty tail; a format with no placeholder; a format with both placeholders. String.replace treats '$' patterns in the replacement, so a hostile tail must not alter the result.
- VS-3: Run branches.py name --kind verify for sdlc/{name}, feature/PROJ-1-{name} and feature/PROJ-1-{name:lower} with several ids, rounds, profiles and parts. Compare with rt.I.branchName on the tail <id>-v<round>-<profile>-<part>. Include a profile name with uppercase and a hyphen (http-api).
- VS-4: Run verifyPhase with a custom format and with the default. Check the branch passed to each profile agent and to the collector. The script source must hold no template literal that starts with sdlc/ followed by a substitution.
- VS-5: Inputs: no argument (null), an empty string (null), a format string. The input object must equal the five-key shape and carry the string unchanged.

## Tools
| Id | Profile | Purpose | Exists |
|---|---|---|---|
| property | contract | Generate tails and formats and call the loop functions | True |
| cli-runner | cli | Run branches.py name from a scratch project and compare with the loop output | True |
| attack-corpus | security | Hostile tails: dollar patterns, traversal, unicode, control characters | True |

## Coverage
| Requirement | Scenarios |
|---|---|
| R-050 | VS-1, VS-2 |
| R-051 | VS-2, VS-3, VS-4 |
| R-052 | VS-5 |
| R-075 | VS-3 |
| R-116 | VS-1 |

## Changes since the previous plan
The review fix changed only tests: it deleted a duplicate parse test and promoted the empty `branchFormat` test. It changed no observable behavior. This plan adds no scenario.
