# Verification plan S-019, round 0

Risk: medium. The rename check blocks a first run on a false match, or misses a collision and breaks resume.

## Scenarios
| Id | Title | Requirements | Profiles |
|---|---|---|---|
| VS-1 | A first run names the run branch from the list count | R-047 | cli, contract, security |
| VS-2 | A relaunch puts the worktree back on the last listed run branch | R-121 | cli, contract |
| VS-3 | A user branch outside the loop kinds asks no rename | R-101 | cli, security |
| VS-4 | A user branch that parses as a slice asks for a rename | R-118 | cli, contract, security |
| VS-5 | SKILL.md orders the bullets so WT and FMT exist before use | R-047, R-121 | contract |

## Scenario notes
- VS-1: Run branches.py list --kind run on repos with 0, 1 and 3 run branches under the default and a custom format. Check name --kind run --n <count+1> prints JSON with a branch value that matches the format. Check a run branch from an older format is not counted. Hostile --format values (flag-like, traversal, NUL) must fail with a clear error and no tree change.
- VS-2: With several run branches, the last list entry must be the highest n, also for n above 9 (order must be numeric, not text). The name for that entry equals the existing branch. No new branch is created. Check list on a repo with no run branch returns an empty list.
- VS-3: parse with sdlc/{name} and sdlc/feature-x prints no kind. Try near misses: sdlc/S-002x, sdlc/run-, sdlc/feature-S-002, case changes, unicode digits and trailing slash. None may parse as a loop kind by accident.
- VS-4: parse feature/PROJ-1-{name} with feature/PROJ-1-S-002 prints kind slice and id S-002. feature/PROJ-1-foo prints no kind. Try a prefix that holds regex characters, and a branch with the prefix repeated. Exit codes and stderr must stay stable.
- VS-5: In SKILL.md, the Worktree path bullet comes before the Git mode and Branch format bullets. The Run worktree and specPath bullets come after the Branch format bullet and before the STOP removal. The Run worktree bullet holds RUN_BRANCH, the first-run and relaunch rules, the checkout of RUN_BRANCH and the format mismatch sentence. The literal sdlc/run-<n> must not remain in that bullet. Quoted commands in the bullet must run as written against a scratch repo.

## Tools
| Id | Profile | Purpose | Exists |
|---|---|---|---|
| cli-runner | cli | Run branches.py list, name and parse from a scratch cwd with a tree diff. | True |
| attack-corpus | security | Feed hostile branch and format values to branches.py. | True |
| property | contract | Call parse and name through the module entry point for generated names. | True |

## Coverage
| Requirement | Scenarios |
|---|---|
| R-047 | VS-1, VS-5 |
| R-121 | VS-2, VS-5 |
| R-101 | VS-3 |
| R-118 | VS-4 |

## Notes
The slice edits prose in SKILL.md and adds parse tests. No server, database or UI is involved. The limits profile does not apply: the spec states no number for these scenarios.
