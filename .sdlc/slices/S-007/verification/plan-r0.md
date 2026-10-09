# S-007 verification plan, round 0

Risk: medium. parse decides what counts as a loop branch; a wrong null hides an active slice from the loop.

## Scenarios
| Id | Title | Requirements | Profiles |
|---|---|---|---|
| VS-1 | A foreign branch gives null | R-021, R-069 | contract, cli |
| VS-2 | A branch that passes prefix and suffix but matches no row gives null | R-021 | contract, cli, security |
| VS-3 | Each tail is classified by the first matching row | R-022 | contract, cli |
| VS-4 | Case-insensitive matching applies only under {name:lower} | R-022, R-024 | contract, cli |
| VS-5 | The result holds the parts that apply | R-023 | contract, cli |
| VS-6 | ids resolve the ledger spelling and set known | R-024, R-069 | contract |
| VS-7 | Hostile and odd input does not crash or misclassify | R-021, R-022, R-023 | security, contract |
| VS-8 | The parse command prints one flat JSON object | R-023, R-021 | cli |

## Notes per scenario
- VS-1: Inputs: main under the default; feature/PROJ-1-foo under feature/PROJ-1-{name}; sdlc/feature-x under the default. The CLI must print kind null with no part keys and exit 0. Branch shorter than prefix plus suffix must not slice wrongly.
- VS-2: Inputs: sdlc/, sdlc/run-, sdlc/run-x, and suffix format {name}-wip with S-001 and S-001-wip. Prefix and suffix may overlap in a short branch. Check that the empty tail gives null.
- VS-3: One branch per row 1 to 8. S-fix-M-1-2 is a slice. M-1-e2e-api is e2e-area. M-1-e2e is e2e. S-001-v0-http-api-0 is verify with profile http-api. M-1-e2e-a-b gives area a-b. Try tails that match two rows, such as S-001-attempt-3 and S-001-v0-x-0.
- VS-4: feature/PROJ-1-s-001, m-1-e2e-api and run-2 classify under the lower format and give null under the plain format. The prefix and suffix compare without case under lower only. Try mixed-case prefix.
- VS-5: run gives n; state gives ts; verify gives id, round, profile, part; e2e-area gives id and area; attempt gives id and n. n, round and part are integers. tail is always present. No key outside the table appears. The CLI prints the same parts.
- VS-6: feature/proj-1-s-001 with ids [S-001] gives S-001 and known true. Absent id gives known false and keeps the parsed id. No ids gives known null. run and state give known null even with ids. Iterator and tuple work as ids. Duplicate ids that differ in case: the first one wins. Exact match under non-lower formats.
- VS-7: Inputs: non-string branch, trailing newline in the branch (the $ anchor matches before a final newline), NUL, non-ASCII digits in run-N and in the round and part of a verify tail, very long tails (regex backtracking on the lazy profile group), unicode case folding under lower, and a ledger id list holding non-strings. Record any case where parse raises or accepts a branch that the spec rejects.
- VS-8: Keys ok, command, format, branch, kind, then the parts. Foreign branch: kind null, exit 0. A missing --branch argument or an invalid format must keep the existing error contract. The working tree and refs stay unchanged.

## Tools
| Id | Profile | Purpose | Exists |
|---|---|---|---|
| cli-runner | cli | Run branches.py parse in a scratch repo and record argv, output and tree diff | True |
| property | contract | Call parse in batch through pycall with generated formats and branches | True |
| attack-corpus | security | Hostile branch strings for parse | True |

## Coverage
| Requirement | Scenarios |
|---|---|
| R-021 | VS-1, VS-2, VS-7, VS-8 |
| R-022 | VS-3, VS-4, VS-7 |
| R-023 | VS-5, VS-7, VS-8 |
| R-024 | VS-4, VS-6 |
| R-069 | VS-1, VS-6 |

The implementation is on the branch already. Limits is not tagged: the spec states no number. The cap for medium is 4 profiles; this plan tags 3. The trailing-newline and non-ASCII digit cases follow from the spec regexes with re.search and no ASCII flag; report them as observations.
