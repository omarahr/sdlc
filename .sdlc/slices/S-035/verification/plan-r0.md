# Verification plan r0 for S-035

Risk: medium. Prompt text steers agents that delete and push branches, but the slice adds only tests and one boundary.

## Scenarios
| Id | Title | Requirements | Profiles |
|---|---|---|---|
| VS-1 | The integrator finds attempt branches through branches.py, filtered to the slice | R-131 | cli, contract, security |
| VS-2 | integrator.md holds no branch literal and uses placeholders | R-143 | contract, security |
| VS-3 | escalator.md holds no sdlc/ literal and holds three placeholders | R-145 | contract |
| VS-4 | state-writer.md holds no sdlc/ literal and holds two placeholders | R-147 | contract |

## Coverage
| Requirement | Scenarios |
|---|---|
| R-131 | VS-1 |
| R-143 | VS-2 |
| R-145 | VS-3 |
| R-147 | VS-4 |

## Tools
| Id | Profile | Purpose | Exists |
|---|---|---|---|
| cli-runner | cli | Scratch repo with attempt branches; run branches.py list --kind attempt | yes |
| property | contract | Literal variants and mutated prompt text | yes |
| attack-corpus | security | Branch names that could trick the filter | yes |

## Notes
- The slice adds four tests to skills/sdlc/test/prompts.test.mjs. It changes no script or prompt.
- The tests pass at once. Mutation checks (add a literal, expect failure) carry the proof.
- No limits scenario: the spec states no number.
- The diff against main holds earlier slices. Judge S-035 by commit 0f73ac3 only.
