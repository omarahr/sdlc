# S-015 verification plan, round 0

Risk: medium. Preflight gates launch at one command boundary; a wrong ok lets a push hit a forge rejection that the push reports.

## Scenarios

| Id | Title | Requirements | Profiles |
|---|---|---|---|
| VS-1 | Format resolves from flag, config or default | R-038 | cli, contract |
| VS-2 | Samples follow the mode | R-039 | cli, contract |
| VS-3 | The mr working branch is judged as given | R-040 | cli, security |
| VS-4 | Passing, unevaluated and unchecked samples never block | R-041 | cli, security |
| VS-5 | A failing sample blocks and names its rule | R-044 | cli, contract, security |
| VS-6 | An invalid git ref name fails even without forge rules | R-044, R-040 | cli, security |
| VS-7 | Missing gh or glab does not crash or block | R-084, R-041 | cli, security |
| VS-8 | Notes merge without duplicates in first-seen order | R-041, R-044 | cli, contract |
| VS-9 | Each sample is judged against its own rules | R-044, R-041 | cli, contract |

## Notes

- VS-1: Flag beats a broken config; config alone gives given true; neither gives given false and sdlc/{name}; invalid format exits 2 with ok false and an error. Try {name:lower}, empty, braces, unicode.
- VS-2: pr gives slice, state, e2e; stack gives run, milestone, slice; mr and direct give none. The state name has 14 digits. Names follow the format transform. Try a format with a prefix and a lowercase transform.
- VS-3: Only mr mode adds a working sample, last in the list. Other modes ignore --branch. The name is never renamed. Try a name equal to a slice name, option-like names, spaces, empty value.
- VS-4: No forge gives ok true and unchecked samples. A matching rule gives pass. An uncompilable regex gives unevaluated and a cannot evaluate note. A failing gh gives unchecked and a rules unknown note. Exit 0 in all cases.
- VS-5: Exit codes 0, 1, 2. Output keys ok, format, derived, forge, rules, samples, notes, suggestion. Sample keys kind, name, result, rule. The rule is the label of the first failing rule. One JSON object only on exit 1.
- VS-6: The name a..b gives fail with rule git check-ref-format with no forge, with rules, and with rules unknown. Other samples stay unchecked or pass. Try trailing dot, .lock, control characters, lone @.
- VS-7: PATH holds python3 and git only. Github and gitlab repos give ok true, one rules unknown note, every sample unchecked. Try a signed-out tool and a tool that prints garbage.
- VS-8: Same bad regex on two samples gives one cannot evaluate note. A read_rules note comes before judge notes. Try many samples and distinct bad rules.
- VS-9: A rule that applies to one sample name must not fail another. The working sample with the same name as a slice shares one rule entry and keeps its own row. Try overlapping rules and a duplicate name.

## Tools

| Id | Profile | Purpose | Exists |
|---|---|---|---|
| cli-runner | cli | Run preflight in scratch repos with a controlled env and PATH | True |
| stub-server | cli | Serve forge rule responses for gh and glab shims | True |
| glab-stub | cli | Stub glab output for the gitlab cases | True |
| attack-corpus | security | Supply hostile branch names and formats | True |
| property | contract | Generate formats, modes and branch names; check the output shape | True |

## Coverage

| Requirement | Scenarios |
|---|---|
| R-038 | VS-1 |
| R-039 | VS-2 |
| R-040 | VS-3, VS-6 |
| R-041 | VS-4, VS-7, VS-8, VS-9 |
| R-044 | VS-5, VS-6, VS-8, VS-9 |
| R-084 | VS-7 |

Tag order is cli, contract, security. The medium cap of 4 profiles keeps all three. The limits profile does not apply because the spec states no number. A gh shim on PATH comes from cli-runner and the existing tests.
