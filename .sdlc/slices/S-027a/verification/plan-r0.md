# Verification plan S-027a, round 0

Risk: medium. The slice edits three prompt files, and a wrong word misdirects one role at run time, but it adds no code path or I/O boundary.

## Scenarios
| Id | Title | Requirements | Profiles |
|---|---|---|---|
| VS-1 | env-detector takes the branchFormat input and writes the quoted rule | R-064 | contract, cli |
| VS-2 | env-detector does not read the forge's branch-name rules and keeps commit_message_regex | R-064 | contract |
| VS-3 | A fresh run records the default sdlc/{name} | R-002 | contract, cli |
| VS-4 | state-schema documents branchFormat, the slice branch and runBranch through the format | R-065 | contract |
| VS-5 | slicer writes the slice branch through the placeholder | R-061 | contract |
| VS-6 | No script reads a slice's branch field | R-061 | cli, security |

## Notes
- VS-1: Risk: the quoted sentence drifts, or the renumbered steps break a cross-reference. Check the Inputs line, the exact R-064 sentence, the step numbers cited elsewhere in prompts and tests, and that the config write step keeps an existing branchFormat. The text must pass ste-check.py.
- VS-2: Search the whole file for branch_name_regex, branch name rule and any push-rule read for branches. The commit-format step must still read commit_message_regex. Try near-miss wording.
- VS-3: Fallback order must be input, then existing config value, then sdlc/{name}. No branch of the rule may leave branchFormat unset or empty. With the cli runner, check load_format on a repo with no branchFormat returns sdlc/{name}.
- VS-4: The config block holds "branchFormat": "sdlc/{name}". The description holds the spec text word for word. The phrases 'the slice branch under `config.branchFormat`' and 'the run branch (`run` kind under `config.branchFormat`)' are present. No sdlc/run-<n> in the config section and no sdlc/S-001 in the slice example. The existing runBranch test must still find its line.
- VS-5: slicer.md holds branch: <slice branch> and no branch: sdlc/. Check no other prompt on the slicer path still tells the slicer to write sdlc/<id>.
- VS-6: Run next-action.py, state-write.py (a status update) and janitor.py on slices.json with garbage branch values, with the field removed, and with non-string values (null, number, list, huge string, newline, traversal text). Outputs and resulting state must match the original apart from the branch field. Also scan sdlc-loop.js for s.branch and slice.branch on loaded slices.

## Tools
| Id | Profile | Purpose | Exists |
|---|---|---|---|
| cli-runner | cli | Run next-action.py, state-write.py, janitor.py and ste-check.py from a scratch cwd with garbage and missing branch values | True |
| attack-corpus | security | Garbage branch values: control characters, traversal, oversized, unicode | True |
| property | contract | Call load_format on configs without branchFormat | True |

## Coverage
| Requirement | Scenarios |
|---|---|
| R-064 | VS-1, VS-2 |
| R-002 | VS-3 |
| R-065 | VS-4 |
| R-061 | VS-5, VS-6 |

Prompt text slice. Profiles read the files as the public contract. Only the branch-field scenario runs scripts. The sdlc/run-<n> literals in other env-detector steps stay for S-027c, so do not report them as defects.
