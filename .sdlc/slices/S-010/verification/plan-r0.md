# S-010 verification plan, round 0

Risk: medium. list is one command that crosses the git boundary, and its order feeds run-branch numbering in later slices.

## Scenarios

| Id | Title | Requirements | Profiles |
|---|---|---|---|
| VS-1 | An operator lists slice branches and sees only slices, sorted by name | R-025 | cli, contract |
| VS-2 | Run and attempt branches sort by n as integers | R-025, R-094 | cli, contract |
| VS-3 | Foreign branches, remote refs and tags never appear | R-025 | cli, security |
| VS-4 | The branch format changes what list returns | R-025 | cli, contract |
| VS-5 | An empty repo or a non-git directory gives a clear result | R-025 | cli, security |
| VS-6 | Hostile branch names and arguments do not break or fool list | R-025, R-094 | security, contract |
| VS-7 | Each kind returns its parts in the list output | R-025 | contract, cli |

## Scenario notes

- VS-1: Risk: a wrong kind filter, or a sort that is not by name. Try a repo with slice, milestone, run, state, verify, attempt, e2e and foreign branches. The CLI list --kind slice must return only slice branches, each with kind, id and the parts parse gives. Compare the CLI output with list_kind called through the public entry point.
- VS-2: Risk: a string sort puts run-10 and attempt-10 before run-2 and attempt-2. Try 1, 2, 10, 100, and creation order that differs from sort order. Equal n across slices must sort by full branch name. n must be a JSON integer, not a string. Run numbering in later slices depends on this order.
- VS-3: Risk: for-each-ref short names can clash with a tag of the same name, and a remote-tracking ref can leak in. Try refs/remotes/origin/sdlc/S-009, a tag sdlc/S-008, a tag with the same name as a branch, a detached HEAD, and non-sdlc branches such as main. None may appear, and a clashing tag must not hide or change a real branch.
- VS-4: Risk: list ignores the format. --format must override config.branchFormat. Without --format the repo config applies. Try feature/PROJ-1-{name} and {name:lower}. Branches of the default format must be absent under another format. An invalid format must fail with the existing error and exit code.
- VS-5: Risk: a traceback, or exit 0 for a non-git directory. A repo with no commit must give branches [] and exit 0. A directory that is not a repo, a missing path, a file path and a bare repo must give a defined result. Non-git must give exit 2, JSON with ok false and the message not a git repository, and no traceback. Unknown --kind must still give exit 2. The scanned tree must be unchanged after the call.
- VS-6: Risk: names that parse oddly. Try attempt-0, attempt-007, attempt with unicode digits, a huge n, names with spaces, unicode confusables, leading dashes, and --repo or --kind values that look like flags. A name that parse refuses must drop out, not crash list. Output must stay one JSON object. The attack-corpus families unicode-digits, huge-integers, flag-like-values and traversal apply.
- VS-7: Risk: missing or renamed parts. Check milestone, run, state (ts), verify (round, profile, part), attempt (n), e2e and e2e-area. Later slices read branches[].branch and branches[].id, so these two keys must hold for every kind. known is null without ids. The output keys are ok, command, format, kind, branches.

## Tools

| Id | Profile | Purpose | Exists |
|---|---|---|---|
| cli-runner | cli | Run branches.py list in fixture repos, record exit code, stdout, stderr and tree changes | True |
| attack-corpus | security | Hostile values for --repo, --kind and --format, and unicode and huge-integer names | True |
| property | contract | Call list_kind through the public entry point and compare with the CLI | True |

## Coverage

| Requirement | Scenarios |
|---|---|
| R-025 | VS-1, VS-2, VS-3, VS-4, VS-5, VS-6, VS-7 |
| R-094 | VS-2, VS-6 |

## Notes

Three profiles are tagged, under the medium cap of 4. No profile is tagged for limits: the spec gives no number for list. A very large branch count is a concern for the cli profile to note as a seed. The ui, http-api, async, concurrency, data and i18n profiles cannot observe this slice.
