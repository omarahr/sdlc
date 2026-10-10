# Verification plan for S-031, round 0

Risk: **low**. The slice adds tests only for existing local command-line code, and a wrong result is easy to see and cheap to fix.

## Scenarios

| Id | Title | Requirements | Profiles |
|---|---|---|---|
| VS-1 | A regex rule matches anywhere in the sample | R-127 | cli, contract |
| VS-2 | A GitLab forge reads only the project push rule | R-140 | cli, contract |
| VS-3 | A literal prefix with a ticket key names the slice branch | R-142 | cli, contract |
| VS-4 | A format with an invalid ref is refused at pre-flight | R-150 | cli, security |
| VS-5 | A repo with no format and no rules keeps the default | R-151 | cli |

## Notes

- VS-1: Risk: anchoring added by mistake. Try feature in x/feature/y (True), ^feature/ in sdlc/S-001 (False), ^feature/ in feature/S-001 (True), an invalid pattern, an empty pattern. At the boundary, preflight in pr mode with a regex rule and a derivable format passes. The same rule with the default format fails the slice sample.
- VS-2: Risk: a group endpoint call or an extra glab call. Run preflight in pr and stack modes with the glab stub. Check the recorded argv list holds exactly one call, api projects/:fullpath/push_rule, with no group path. Try an empty body, a branch_name_regex body and a glab failure. The verdict lists one rule with source gitlab and label push rule.
- VS-3: Inputs: feature/PROJ-123-{name} with slice S-001, then other ids and the milestone kind. name prints feature/PROJ-123-S-001. validate_format returns without Fail. Preflight prints ok true, given true and the slice sample feature/PROJ-123-S-001. Compare the literal digits and the hyphen. Try format variants with one trailing slash.
- VS-4: Input: sdlc/{name}.. Expect exit 2, one JSON object, ok false, and an error that names check-ref-format and not a valid branch name. Try other invalid parts: a space, a tilde, a colon, a trailing dot, a trailing .lock, a leading dash, control characters. The attack-corpus families flag-like-values and control-chars apply. The tool must never run the format as a command, and the tree must stay unchanged.
- VS-5: Run preflight in pr, stack, mr and direct modes on a repo with no config format and no forge. Expect ok true, format sdlc/{name}, derived false and empty rules. Repeat with a GitHub shim that returns an empty list. Every sample result must be pass or unchecked. The state sample holds a timestamp, so check only its prefix.

## Tools

| Id | Profile | Purpose | Exists |
|---|---|---|---|
| cli-runner | cli | Run branches.py from a scratch cwd, record argv, exit code, stdout and tree changes | True |
| glab-stub | cli | Record every glab argv and return a push rule body | True |
| property | contract | Call evaluate, validate_format and name with generated input | True |
| attack-corpus | security | Supply hostile format values for the invalid ref scenario | True |

## Coverage

| Requirement | Scenarios |
|---|---|
| R-127 | VS-1 |
| R-140 | VS-2 |
| R-142 | VS-3 |
| R-150 | VS-4 |
| R-151 | VS-5 |

## Notes on the plan

All five requirements have characterization tests, so the code probably stays unchanged. The gh shim lives in the test file, so profile agents build their own stub if they need one. Limits is not tagged because the spec states no number.
