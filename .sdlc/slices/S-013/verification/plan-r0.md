# S-013 verification plan, round 0

Risk: medium. One external boundary (the gh subprocess) with ordinary failure modes; no money, data loss or auth change, and the function has no caller yet.

## Scenarios

| id | title | requirements | profiles |
|---|---|---|---|
| VS-1 | read_rules makes one gh call per sample with every slash encoded as %2F | R-027 | contract, security |
| VS-2 | only branch_name_pattern objects become rules, with the five-key shape and field mapping | R-028 | contract |
| VS-3 | rules stay with their own sample and the union has no duplicates | R-028 | contract |
| VS-4 | a failing gh gives one note and unchecked samples | R-029 | contract, security |
| VS-5 | gh absent from PATH does not crash the read | R-084 | contract |
| VS-6 | config problems keep one message and the old format loader still works | R-027 | contract |

## Notes per scenario

- VS-1: Samples sdlc/S-001, M-1-e2e, and odd ones (space, %, ?, #, .., unicode, leading dash). Path must be one segment after branches/, argv a list, never a shell string. cwd equals repo. Forge other than github makes no call.
- VS-2: Mixed rule types; missing parameters; non-dict items; negate absent, true, non-bool; label falls back name, ruleset id, branch_name_pattern; empty name. Every rule has exactly source, kind, pattern, negate, label.
- VS-3: Two or more samples with different, overlapping and empty bodies. by_sample keys equal the samples. Rules for one sample never appear under another. Duplicate sample names.
- VS-4: Exit 1 with stderr, exit 1 with empty stderr, non-JSON output, JSON object not list, huge or deeply nested JSON, hung gh (timeout), failure on the second sample. First failure ends the read: one call logged, no partial rules, one note starting rules unknown on github:. Stderr with control characters or very long text.
- VS-5: PATH holds python3 and git only. Result has one note and unchecked, and read_rules does not raise. Preflight half is out of scope (S-015).
- VS-6: forge absent, empty, wrong type, invalid JSON, directory, unreadable config, missing .sdlc. Config errors raise Fail with the same text as before for branchFormat. load_format results unchanged.

## Tools

| id | profile | purpose | exists |
|---|---|---|---|
| cli-runner | security | Run python3 against a scratch git repo with a gh shim first on PATH; record argv, cwd and tree changes. | True |
| property | contract | Generate odd samples and config shapes and call read_rules in batches through pycall. | True |
| attack-corpus | security | Feed hostile sample strings (traversal, injection, flag-like, control chars, NUL, unicode) to read_rules. | True |
| stub-server | security | Shell gh shim that logs argv and cwd and returns canned JSON, exit codes and stderr. | False |

## Coverage

| requirement | scenarios |
|---|---|
| R-027 | VS-1, VS-6 |
| R-028 | VS-2, VS-3 |
| R-029 | VS-4 |
| R-084 | VS-5 |

## Notes

Python function only; no command until S-015. Profile order puts contract first, then security. Limits is not tagged: the spec states no number (the 60 second timeout is a plan choice). The hung-gh case sits in VS-4 notes.
