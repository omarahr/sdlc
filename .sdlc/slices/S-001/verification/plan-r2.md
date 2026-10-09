# Verification plan: S-001, round 2

Slice: branches.py skeleton: importable CLI, JSON contract, load_format.
Requirements: R-013, R-098, R-014, R-088, R-016.

Risk: **medium**. The slice adds one CLI boundary whose JSON and exit-code contract every later slice and three scripts depend on. It moves no data and has no side effects.

## Scenarios

| Id | Title | Requirements | Profiles |
|---|---|---|---|
| VS-1 | A developer runs each of the four commands with every flag its spec line names and reads one JSON object | R-088, R-014, R-013 | cli, contract |
| VS-2 | A caller passes a flag that the command does not name, or leaves out a required flag | R-088, R-014 | cli, security |
| VS-3 | A caller passes a non-integer or odd value to --n, --round or --part | R-014, R-088 | cli, security |
| VS-4 | A caller passes an invalid --format to each command | R-014 | cli, contract, security |
| VS-5 | A caller passes an unknown --kind, an unknown --mode or a --repo that is not a directory | R-014 | cli, security |
| VS-6 | load_format resolves the branch format from the repo config or falls back to the default | R-016 | contract, cli |
| VS-7 | A command without --format uses the config format, and --format wins over the config | R-016, R-014 | cli, contract |
| VS-8 | A probe imports branches.py by path and finds a stdlib-only module with its public functions | R-013 | contract, cli |
| VS-9 | The three scripts import branches from their own directory when run from another directory | R-098 | cli, contract, security |
| VS-10 | Branch recognition in the three scripts gives the same result after the import lands | R-098 | cli |

The notes for each scenario are in `plan-r0.json`. They list the inputs to try and what must be true at the boundary.

## Coverage

| Requirement | Scenarios |
|---|---|
| R-013 | VS-1, VS-8 |
| R-098 | VS-9, VS-10 |
| R-014 | VS-1, VS-2, VS-3, VS-4, VS-5, VS-7 |
| R-088 | VS-1, VS-2, VS-3 |
| R-016 | VS-6, VS-7 |

## Tools

| Id | Profile | Purpose | Exists |
|---|---|---|---|
| cli-runner | cli | Run the skill scripts from a scratch cwd against a scratch git repo. Record the transcript and the file tree. | yes |
| property | contract | Generate formats and config shapes. Call validate_format and load_format through the module loaded by path. | yes |
| attack-corpus | security | Supply hostile CLI inputs and decoy branches.py modules. | yes |

## Notes

- Profiles in priority order: cli, contract, security.
- The slice has no HTTP, async, database or UI boundary. Those profiles do not apply.
- No scenario has a stated number, so limits is not tagged.
- Do not test git check-ref-format refusals. S-002 owns R-017.
- Do not assert the final result fields of the commands. ADR-20261009-024048 and ADR-20261009-024229 make the success body an interim echo under `args`.
- Watch two likely seeds. Argparse `allow_abbrev` accepts flag prefixes that the spec does not name. `int()` accepts unicode digits for `--n`, `--round` and `--part`.

## Changes since round 0

- This round follows a review fix. Commit 90d3251 promotes verifier test TC-cli-16 into `skills/sdlc/test/branches.test.mjs`.
- The commit changes no product code. It adds a test, and it updates tests.md and failures.md.
- No observable behavior changed. So this plan adds no scenario, and no scenario runs this round.
- The round-1 fixes stay covered. VS-5 covers an unreadable git-modes.json. VS-6 covers a deeply nested config.json. VS-9 covers a script run through a symlink.
- The three tools now exist in `.sdlc/testkit.json`, each with a self-test.
