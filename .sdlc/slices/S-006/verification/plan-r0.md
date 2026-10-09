# S-006 verification plan, round 0

Risk: low. The slice adds tests only; product code does not change, and a wrong result is easy to see and cheap to fix.

Two profiles cover all five scenarios. The slice row says medium, but no I/O boundary changes and no product code moves. Cap for low is 2 profiles: contract first (covers VS-1, VS-2, VS-4, VS-5), then cli (VS-1, VS-2, VS-3).

## Scenarios

| Id | Title | Requirements | Profiles |
|---|---|---|---|
| VS-1 | A lowercased format lowercases only the tail | R-011 | contract, cli |
| VS-2 | Every kind builds a valid branch that split reverses under three formats | R-068 | contract, cli |
| VS-3 | The CLI name agrees with the Python name for all 24 cases | R-068, R-011 | cli |
| VS-4 | No push or pull-request site names an e2e-area branch | R-120 | contract |
| VS-5 | A planted e2e-area push is reported by the scanner | R-120 | contract |

## Notes

- VS-1: Risk: lower handling spreads to the prefix or suffix, or to the literal text. Try feature/PROJ-1-{name:lower}, Feat/PROJ-{name:lower}-X, uppercase ids, mixed-case area and profile parts. The literal text keeps its case. {name} keeps the case of the tail. The CLI prints the same branch as the Python name.
- VS-2: Eight kinds times sdlc/{name}, feature/PROJ-1-{name}, feature/PROJ-1-{name:lower}. The branch starts with the prefix, ends with the suffix, and the middle equals the tail (lowercased where asked). Each branch passes git check-ref-format. Try edge parts: area api-v2, state ts, verify round 0 part 0. The parse half joins in S-007, so R-068 stays partial.
- VS-3: Run branches.py name with --format, --kind and parts from a scratch cwd. The branch field equals mod.name. Exit code is 0. A bad kind or format exits non-zero with no stack trace.
- VS-4: Source check over six files. The scan finds at least one real push site, so it cannot pass on an empty match. Try a push that spans more than 4 lines, a push in a comment, and a variable-built branch. Record the limit that the scan names the kind, not the parsed kind.
- VS-5: Run the scanner on git(repo, "push", "-u", "origin", name(fmt, "e2e-area", ...)) and on a pr create line. Each gives a violation. A comment line gives none. Mutation check: the test fails when a scratch copy of state-write.py gets an e2e-area push.

## Tools

| Id | Profile | Purpose | Exists |
|---|---|---|---|
| cli-runner | cli | Run branches.py name from a scratch cwd and compare with the Python name | True |
| property | contract | Call name and split in batch over generated parts and formats | True |

## Coverage

| Requirement | Scenarios |
|---|---|
| R-011 | VS-1, VS-3 |
| R-068 | VS-2, VS-3 |
| R-120 | VS-4, VS-5 |
