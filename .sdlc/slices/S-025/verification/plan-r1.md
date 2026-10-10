# Verification plan S-025 round 0

Risk: low. The slice changes prompt text and its tests only; it crosses no I/O boundary and a wrong table row is easy to see and fix.

## Scenarios
| Id | Title | Requirements | Profiles |
|---|---|---|---|
| VS-1 | The table lists all eight placeholders, each with a command | R-062 | cli, contract |
| VS-2 | The slice branch row maps to the slice command | R-110 | cli, contract |
| VS-3 | The run branch row follows the git mode | R-089 | cli, contract |
| VS-4 | The verify branch row comes from the prompt input | R-090 | contract |
| VS-5 | The section tells the reader to classify a branch with parse | R-117 | cli, security |
| VS-6 | The edited prompt keeps the STE style and the other prompts still match | R-062 | contract |

## Notes
- VS-1: Risk: a missing or misspelled row misleads every agent. Check each row of the table in _common.md. Run every branches.py name command in a scratch repo with sample ids and confirm exit 0 and a printed name. Confirm the argument names (--kind, --id, --area, --n) match what branches.py accepts.
- VS-2: The row must hold branches.py name --kind slice --id <sliceId>. Run it in a scratch repo with a custom branchFormat and confirm it prints the formatted name.
- VS-3: The row must name config.runBranch in stack mode and the last entry of branches.py list --kind run otherwise. Run list --kind run in a repo with several run branches and confirm the last entry is the newest. Try a repo with none.
- VS-4: The row must name the branch input. No text in _common.md may call branches.py name --kind verify. Also check that branches.py name refuses --kind verify or the section does not offer it.
- VS-5: Run branches.py parse --repo . --branch <name> on a loop branch, a foreign branch and hostile names from the attack corpus (flag-like, traversal, NUL, unicode). A foreign branch must print null. Hostile input must not crash or print a loop kind.
- VS-6: Run ste-check.py on _common.md and confirm exit 0. Confirm the Long commands bullet and later bullets are unchanged and still parse as bullets.

## Tools
| Id | Profile | Purpose | Exists |
|---|---|---|---|
| cli-runner | cli | Run the branches.py commands from the table in a scratch repo and record exit code and output | yes |
| attack-corpus | security | Feed hostile branch names to branches.py parse | yes |
| property | contract | Call branches.py functions through the Python bridge | yes |

## Coverage
| Requirement | Scenarios |
|---|---|
| R-062 | VS-1, VS-6 |
| R-089 | VS-3 |
| R-090 | VS-4 |
| R-110 | VS-2 |
| R-117 | VS-5 |


## Changes since the previous plan

None. Commit 9e397af only added a test to prompts.test.mjs and updated failures.md and tests.md. It changed no observable behavior. No scenario is added. Every scenario id is unchanged.
