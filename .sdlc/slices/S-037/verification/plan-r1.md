# Verification plan S-037, round 0

Risk: medium. Prompt text steers agents that commit and push branches, but this slice mostly adds tests over text that is already in place.

## Scenarios
| Id | Title | Requirements | Profiles |
|---|---|---|---|
| VS-1 | state-schema.md describes runBranch and the slice branch field by kind | R-134 | contract |
| VS-2 | commit-state.md uses the four branch placeholders | R-135 | contract |
| VS-3 | The state branch name comes from branches.py, not date -u | R-135 | contract, cli |
| VS-4 | Each of the 13 slice prompts uses <slice branch> and no sdlc/<id> literal | R-146 | contract |
| VS-5 | state-schema.md names the milestone branch by kind and holds no loop literal | R-149 | contract |
| VS-6 | The new tests fail when a literal or placeholder is reverted | R-134, R-135, R-146, R-149 | contract |

## Coverage
| Requirement | Scenarios |
|---|---|
| R-134 | VS-1, VS-6 |
| R-135 | VS-2, VS-3, VS-6 |
| R-146 | VS-4, VS-6 |
| R-149 | VS-5, VS-6 |

## Tools
| Id | Profile | Purpose | Exists |
|---|---|---|---|
| cli-runner | cli | Run branches.py name --kind state in a scratch repo | yes |
| property | contract | Scan the prompt files for forbidden literals and required placeholders | yes |


## Round 1 changes
The review fix deleted the duplicate test T-R-134. It changed no product behavior. No scenario is added. R-134 stays covered by VS-1 and T-R-065b, T-R-063a.
