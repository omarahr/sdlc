# Review: S-003, lens architecture, round 0

Diff: `c5d105d..sdlc/S-003` (the S-003 commits on top of S-002). The local `main` is behind `origin/main`, so `main...sdlc/S-003` also shows S-001 and S-002 work. This review covers only the S-003 commits.

## Verdict

No blocking findings.

## Fit with the spec

- `tail` keeps one table, `TAILS`. The slice adds only the `state` and `e2e-area` rows, as ADR-20261009-041711 says.
- The `state` row makes the timestamp in UTC with `%Y%m%d%H%M%S`, as spec section 1 says.
- `load_format` keeps its spec contract. It now calls the new helper `_config_format`, and its `Fail` paths do not change.
- `cmd_name` prints `{ok, command, format, kind, branch}`, as ADR-20261009-041713 says. A missing part goes through `Fail`, so `main` prints one JSON error and exits 2.
- `cmd_preflight` sets `given` from the flag or the config, as spec section 4 step 1 says. A config value equal to the default counts as given.
- The two changed calls in the existing tests keep their assertions.

## Non-blocking findings

1. `cmd_preflight` reads `.sdlc/config.json` two times. `_format` reads it through `load_format`, and `given` reads it again through `_config_format`. Fix: read `_config_format(repo)` one time in `cmd_preflight`, and get `fmt` and `given` from that one value.
2. `NAME_PARTS` repeats the part flags of the `name` sub-parser. A new part flag must change two places. Fix: keep the list next to the `name` sub-parser, or build the sub-parser flags from the list.
3. `TAILS` mixes a named builder (`_state_tail`) with inline lambdas. Three more rows come in S-004 to S-006. Fix: choose one style when those rows land.
4. `tail("state", ts=...)` accepts any `ts`. A `ts` that is not 14 digits gives a name that `parse` does not classify as `state`. The CLI has no `--ts` flag, so only API callers can do this. Fix: when `parse` lands, check that `ts` is 14 digits, or record that callers own it.
