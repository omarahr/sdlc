# Verification plan S-003, round 1

Risk: **medium**. The format resolution order decides every future branch name, and a wrong order or a local-time state stamp silently renames branches, but the change crosses only one boundary, the branches.py CLI.

## Scenarios

| Id | Title | Requirements | Profiles |
|---|---|---|---|
| VS-1 | a caller builds the slice tail through the Python API | R-018 | contract |
| VS-2 | the state tail takes the current UTC time when no ts is given | R-018 | contract, cli |
| VS-3 | the e2e-area tail joins milestone and area, and a missing part fails with its name | R-018 | contract |
| VS-4 | an operator runs name without a required part and gets one JSON error | R-099 | cli, security |
| VS-5 | name takes the format from the flag, then the config, then the default | R-015, R-002 | cli, contract |
| VS-6 | the name output carries exactly the resolved format, kind and branch | R-015, R-018 | cli |
| VS-7 | preflight reports the given format and given true | R-012 | cli |
| VS-8 | preflight falls back to the default when no format is given | R-012, R-002 | cli, contract |
| VS-9 | hostile part values reach name through the CLI | R-099, R-018 | security, cli |
| VS-10 | a zero-valued numeric part is kept, not dropped as absent | R-018, R-099 | contract, cli |

## Scenario notes

- **VS-1**: tail("slice", id="S-001") must return "S-001" exactly, as a str. Try a missing id, id="", id=None and an extra unknown part. A missing or empty id must raise Fail, never KeyError or TypeError. Extra parts must not change the tail. Call through the module by path with the property tool (callPython), from a scratch cwd.
- **VS-2**: Risk: local time instead of UTC, or a wrong strftime order. tail("state") must match ^state-\d{14}$ and the 14 digits must sit between UTC before and after the call. Run under TZ=Pacific/Kiritimati (UTC+14) and TZ=Etc/GMT+12 so a local-time result is off by hours. tail("state", ts="20261008101500") is "state-20261008101500". ts="" must act as absent. ts=None must act as absent. CLI: name --kind state gives branch sdlc/state- plus 14 UTC digits. The name CLI has no --ts flag; confirm it rejects --ts with one JSON error and exit 2. Check that the result parses back as a valid date (month 01-12, day 01-31).
- **VS-3**: tail("e2e-area", id="M-1", area="api") is "M-1-e2e-api". Each of id and area absent, empty or None must raise Fail whose message names that part. When both are missing, the message must name at least one of them and must not crash. The order of keyword arguments must not matter. Check that the Fail is the module's Fail class, not a subclass of a built-in error that the CLI would miss.
- **VS-4**: branches.py name --repo R --kind e2e-area --id M-1 (no --area) must exit 2, print exactly one JSON object on stdout with ok false and a non-empty error that names area, and print no Traceback on stderr. Repeat for --area "", for --kind slice with no --id, and for --kind slice --id "". Prove no side effect: the cli-runner tree diff of the repo and cwd must be empty, git refs included. Also run kinds without a TAILS row yet (run, milestone, e2e, verify, attempt): they must also exit 2 with one JSON error and no traceback (ADR-20261009-041711). Do not assert these as final behavior; they change in S-004 to S-006.
- **VS-5**: Repo with branchFormat feature/PROJ-1-{name}: --format sdlc/{name} gives sdlc/S-001; no flag gives feature/PROJ-1-S-001. No .sdlc/config.json and no flag gives sdlc/S-001. Also try: config with branchFormat "", null, a number, a list, an object, or no key (all must fall back to sdlc/{name}); a config that is a JSON array or string (fallback); invalid JSON, deeply nested JSON and an unreadable file (exit 2, one JSON error, no traceback); --format "" given explicitly (must fail validation, not fall back to the config). With --format given and an invalid config, record whether name still succeeds. The flag wins in the spec order, so name should not need to read the config. Check {name:lower} in the config lowercases the tail (feature/{name:lower} gives feature/s-001). load_format(repo) on each config shape must agree with the CLI format field.
- **VS-6**: Each successful name call prints one JSON object whose key set is exactly ok, command, format, kind, branch (ADR-20261009-041713). No args, tail or part keys. Check for slice, state and e2e-area, with and without --format. Extra unused flags (--n 0, --part 0, --round 0, --profile x) must not change the branch for slice or e2e-area and must not crash. stdout must hold one line of JSON and nothing else; stderr must be empty. Exit code is 0.
- **VS-7**: preflight --repo R --mode pr --format team/{name} on a repo whose config holds feature/{name} gives format team/{name} and given true. No flag with config feature/{name} gives feature/{name}, given true. Config exactly sdlc/{name} gives given true (a resume must not derive). Run each mode that git-modes.json lists. given must be a JSON boolean, not a string or null. Check --format equal to the default also gives given true. Risk: cmd_preflight computes given by reading the config even when --format is given. Run --format team/{name} on a repo whose config.json is invalid JSON or unreadable. Compare with name, which skips the config when the flag is given. Record the result against R-012.
- **VS-8**: No flag and config with branchFormat "", absent key, null, a non-string value, or no .sdlc/config.json at all: format sdlc/{name}, given false, exit 0, one JSON object. given must agree with the format field: given false must never come with a non-default format. A config that is invalid JSON must give exit 2 with one JSON error, not given false. load_format(repo) returns sdlc/{name} for the same repos (R-002 clause 1 only; clause 2 closes in S-027 per ADR-20261009-041833, so do not test the fresh-run config write here).
- **VS-9**: Feed --id and --area from the attack corpus: flag-like values (--area=--format), traversal (../x), control characters, unicode whitespace and confusables, format strings ({name}, {0}, %s), injection strings, oversized values. Feed --n, --round and --part with unicode digits, huge integers and non-integers: argparse must refuse non-integers with one JSON error and exit 2. Guarantee in scope: every command prints one JSON object and exits 0 or 2, never a traceback; a placeholder inside a part is literal text, never re-expanded. Out of scope as a blocker: whether a part with git-unsafe characters gives a git-valid branch; the spec validates only the format, so record such results as seeds. Prove no side effect with the tree diff and no git ref created. Use plantDecoy to confirm branches.py does not import a module from the cwd.
- **VS-10**: The CLI part filter must test is not None, not truthiness. No S-003 kind consumes n, round or part yet, so observe it through the contract: call tail with a zero part and confirm no Fail; and through the CLI: --n 0 --part 0 --round 0 with --kind slice must succeed. Note for S-004 to S-006: the verify and attempt rows will consume these parts; a seed here is fine if the filter is wrong but no current kind shows it.

## Coverage

| Requirement | Scenarios |
|---|---|
| R-018 | VS-1, VS-2, VS-3, VS-6, VS-9, VS-10 |
| R-099 | VS-4, VS-9, VS-10 |
| R-015 | VS-5, VS-6 |
| R-012 | VS-7, VS-8 |
| R-002 | VS-5, VS-8 |

## Tools

| Id | Profile | Purpose | Exists |
|---|---|---|---|
| property | contract | Call tail and load_format by module path in batches, with generated parts and config shapes (arb.configShape). | yes |
| cli-runner | cli | Run branches.py name and preflight in scratch git repos with controlled TZ and env, capture stdout, stderr, exit code and the tree diff. | yes |
| attack-corpus | security | Hostile values for --id, --area and the integer flags, and the decoy-module check. | yes |

## Notes

Profiles in priority order: contract, cli, security. limits is not tagged: the spec states no number for this slice. The 14-digit stamp is a format, not a limit. No fake-clock is needed: the UTC check brackets the call with real UTC time under an extreme TZ. Concern for later slices: name does not run git check-ref-format on the full name, so a hostile part can give a git-invalid branch; record it as a seed, not a blocker. R-002 is partial here (clause 1); S-027 closes clause 2.

## Changes since round 0

- This round follows a review fix. The fix commit is 1921d70.
- The fix adds test T-024 to `skills/sdlc/test/branches.test.mjs` and one line to tests.md.
- The fix changes no product code. Thus no observable behavior changed.
- The plan adds no scenario. All scenario ids stay the same.
- VS-5 and VS-7 already cover the `--format` flag over a broken config.
