# Review: S-003, lens architecture, round 1

Diff: `c5d105d..sdlc/S-003`. The local `main` is behind, so `main...sdlc/S-003` also shows S-001 and S-002 work. This review covers only the S-003 commits.

## Verdict

No blocking findings.

## What changed since round 0

- Fix commit `1921d70` adds only T-024 and the `brokenConfigRepos` fixture to `skills/sdlc/test/branches.test.mjs`. It records the promotion in tests.md.
- `skills/sdlc/branches.py` has no change since round 0. The round 0 fit checks still hold.

## Fit with the spec

- `TAILS` stays one table. The slice adds only the `state` and `e2e-area` rows (ADR-20261009-041711).
- `_config_format` keeps the `Fail` paths of `load_format`. `load_format` keeps its contract.
- `cmd_name` prints exactly `ok`, `command`, `format`, `kind` and `branch` (ADR-20261009-041713).
- `cmd_preflight` adds `given`. T-024 now pins the flag-first order of its two operands.

## Non-blocking findings

1. `cmd_preflight` reads `.sdlc/config.json` two times, and `given` depends on operand order. Fix: read `_config_format(repo)` one time only when `--format` is absent. Derive `fmt` and `given` from that one value. This removes the order trap that T-024 now guards.
2. `NAME_PARTS` repeats the part flags of the `name` sub-parser. Fix: build the sub-parser part flags from `NAME_PARTS`, or keep the two side by side.
3. `brokenConfigRepos` builds broken configs that overlap the fixtures of the deep-nesting test and the `withConfig` helper. Fix: when a later slice needs broken configs again, reuse `brokenConfigRepos` instead of a new fixture.
