# Evidence: S-001

Slice: branches.py skeleton: importable CLI, JSON contract, load_format.
Kind: spec. Risk: medium.

The gate receipt covers commit 658b4195. The full suite passed on that code in 69 seconds.
The receipt check printed `"valid": true` on the final branch tip.

## Requirements

| Requirement | Tests |
|---|---|
| R-013 | `branches.py imports from its path and exposes the public functions`; `branches.py imports only standard library modules`; `every command runs and prints one JSON object` |
| R-014 | `bad input exits 2 with one JSON error object`; `a git-modes.json that cannot be read fails preflight with one JSON error`; `a missing or malformed git-modes.json fails preflight with one JSON error, and name, parse and list still run`; `a deeply nested config.json is bad input, not a crash` |
| R-016 | `load_format returns the config value or the default`; `a command without --format uses the config format`; `a deeply nested config.json is bad input, not a crash` |
| R-088 | `every command runs and prints one JSON object`; `a flag that a command does not name is bad input` |
| R-098 | `the three scripts import branches from their own directory`; `the three scripts run with the working directory outside the skill directory`; `branch recognition in the three scripts still resolves from a scratch working directory`; `a script run through a symlink imports branches from its real directory`; two tests in `git-modes.test.mjs` |

The committed tests are in `skills/sdlc/test/branches.test.mjs` and `skills/sdlc/test/git-modes.test.mjs`.
The final verification round with cases is r1. All 23 of its cases passed (cli, contract, security).
Round r2 verified the fix with no new cases.

## Seeds

The slice records 41 non-blocking seeds in `barraiser.json`.
