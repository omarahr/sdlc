# Tests: S-003

All tests are in `skills/sdlc/test/branches.test.mjs`.

- T-019 `tail builds the slice, state and e2e-area tails and fails on a missing part` — R-018 — fails now: `TAILS` has no `state` row ("no branch name is defined for kind 'state'") and no `e2e-area` row.
- T-020 `the state tail is the current UTC time` — R-018 — fails now: `TAILS` has no `state` row.
- T-021 `name without a required part exits 2 with one JSON error and no traceback` — R-099 — fails now: the interim `name` echo exits 0 and builds no name.
- T-022 `name takes the format from the flag, then the config, then the default` — R-015 — fails now: the `name` output has `args` and no `kind` or `branch`.
- T-023 `preflight reports the resolved format and whether it was given` — R-012, R-002 (clause 1, partial evidence) — fails now: the preflight output has no `given` field.
- T-006 `load_format returns the config value or the default` — R-002 (clause 1, partial evidence) — existing test, passes now.
- T-003 `every command runs and prints one JSON object` — adjusted: `name --kind verify` becomes `--kind slice`; all assertions stay; passes now and after S-003.
- git-modes test `a missing or malformed git-modes.json fails preflight ...` — adjusted: the `name --kind slice` call adds `--id S-001`; all assertions stay; passes now and after S-003.
- T-024 `the --format flag wins over a broken config in name and preflight` — R-015 — promoted in fix round 1 from `.sdlc/slices/S-003/verification/r0/tests/cli-0/branch-name.verify-cli.test.mjs` TC-cli-10 and TC-cli-18. It runs `name` and `preflight` with `--format` against five broken configs: invalid JSON, deep nesting, invalid UTF-8, a directory, and an unreadable file (skipped as root). It also checks that `preflight` without the flag still fails on each config.
