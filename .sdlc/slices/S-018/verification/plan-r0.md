# Verification plan S-018, round 0

Risk: low. The slice edits one instruction file and its tests, and crosses no I/O boundary.

## Scenarios
| id | title | requirements | profiles |
|---|---|---|---|
| VS-1 | The Commands line and flag bullet document --branch-format | R-045 | contract, cli |
| VS-2 | The Branch format bullet replaces the old Branch name bullet | R-046, R-097 | contract, cli |
| VS-3 | A resume takes the format from config.json without the flag | R-097 | contract |
| VS-4 | A different branchFormat in the worktree ends the run with both values | R-048 | contract, cli |
| VS-5 | The Launch args pass branchFormat on every launch | R-049 | contract |
| VS-6 | The rest of SKILL.md and the existing suites stay intact | R-046 | contract |

## Notes per scenario
- VS-1: Check order: after --commit-format, before the next option. The bullet names {name}, the default and the config.json fallback. Try a mutated SKILL.md with the flag missing, or placed before --commit-format.
- VS-2: The bullet follows Git mode and precedes the STOP removal. It holds the preflight and parse commands, the ok false path, the derived report, the working-sample rename and the first run only wording. The old Branch name bullet, branch_name_regex and push_rule must be gone. Check that the preflight command in the text runs against branches.py with the flags the text names.
- VS-3: The text must say a resume reads branchFormat from config.json and gets the same FMT. Check for a derived format that the user is told about.
- VS-4: The mismatch bullet follows the Branch format bullet, so FMT exists. It reports both values, ends, and says a run in progress keeps its names.
- VS-5: branchFormat sits between commitFormat and maxIterations, with value $FMT. The text says to always pass it. Check that the Launch args stay valid in shape.
- VS-6: Only the stale first run only assertion changed. The full prompts, bootstrap and hub suites stay green. No other pre-flight bullet loses text.

## Tools
- cli-runner (cli, exists True): Run branches.py preflight and parse from a scratch repo to check the commands that SKILL.md names
- property (contract, exists True): Check SKILL.md text against the required wording and order

## Coverage
| requirement | scenarios |
|---|---|
| R-045 | VS-1 |
| R-046 | VS-2, VS-6 |
| R-048 | VS-4 |
| R-049 | VS-5 |
| R-097 | VS-2, VS-3 |

Tag contract and cli only, because the low cap is 2. The limits, security and ui profiles cannot observe a text edit.
