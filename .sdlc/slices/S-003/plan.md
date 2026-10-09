# Plan: S-003 tail contract and format resolution order

Requirements: R-018, R-099, R-015, R-012, R-002.

## Approach

S-002 built `tail(kind, **parts)` in `skills/sdlc/branches.py` as a table with one `slice` row (ADR-20261009-034220). This slice adds two rows to the same `TAILS` table, the rows that the R-018 acceptance names. The `state` row requires no part: it gives `state-<ts>`, and without a `ts` part (absent or empty) it makes `ts` from the current UTC time in `%Y%m%d%H%M%S`. The `e2e-area` row requires `id` and `area` and gives `<id>-e2e-<area>`. A missing or empty part keeps the S-002 `Fail` path, and its message names the part. The rows for `run`, `milestone`, `e2e`, `verify` and `attempt` stay with S-004 to S-006, as ADR-20261009-034220 says.

R-099 and R-015 need the CLI `name` command to build a real name, so this slice replaces the interim echo in `cmd_name` (ADR-20261009-034215 names this change as its reversal). The handler collects the parts the flags give (`id`, `n`, `area`, `round`, `profile`, `part`, only those not `None`), calls `name(fmt, ns.kind, **parts)`, and prints `{"ok": true, "command": "name", "format": <resolved format>, "kind": <kind>, "branch": <the name>}`. A missing part raises `Fail`, so `main` prints one JSON error and exits 2, with no traceback. The format comes from the existing `_format`: `--format`, else `config.branchFormat`, else `sdlc/{name}`.

R-012 needs the preflight to report where its format came from. A new private helper `_config_format(repo)` returns the non-empty `branchFormat` string of `.sdlc/config.json`, or `None`; `load_format` becomes `_config_format(repo) or DEFAULT_FORMAT` with the same `Fail` paths. `cmd_preflight` sets `given` to true when `--format` is given or `_config_format` returns a value, and it adds `given` to its interim output beside `format`. A config whose `branchFormat` is exactly `sdlc/{name}` counts as given, so a resume never derives. The rules, samples and derivation stay with S-015 to S-017; with no format given, this slice reports the default (the fallback half of R-012).

R-002 is split across two slices (ADR-20261009-041833). This slice proves only its first clause: `load_format` returns `sdlc/{name}` when the config has no `branchFormat`. T-006 already proves it, and the T-023 default cases add the CLI evidence. The second clause, "a fresh run records `branchFormat: "sdlc/{name}"`", closes in S-027 with R-064. This slice does not mark R-002 done. The integrator sets R-002 to `in_progress`, keeps T-006 and the T-023 default cases as partial evidence, and writes the note "fresh-run config clause closes in S-027". The state-writer adds R-002 to the S-027 requirements beside R-064.

## Files

- Modify `skills/sdlc/branches.py`:
  - add `from datetime import datetime, timezone`;
  - add the `state` and `e2e-area` rows to `TAILS`; the `state` builder reads `ts` and makes the UTC timestamp when it is absent or empty;
  - add `_config_format(repo)` and rebuild `load_format` on it, with no change in behavior;
  - replace the body of `cmd_name` with the real name output;
  - add `given` to the `cmd_preflight` output.
- Modify `skills/sdlc/test/branches.test.mjs`: add T-019 to T-023 below, and adjust two existing calls that the new `name` handler changes (see Risks). No assertion is removed or relaxed.

## Tests

All tests are in `skills/sdlc/test/branches.test.mjs` and run under `npm test`. Python API tests use the existing `CALL`/`probe` helpers from a scratch working directory. No S-003 test asserts that a kind without a `TAILS` row fails (ADR-20261009-041711).

- T-019 (R-018) `tail builds the slice, state and e2e-area tails and fails on a missing part`:
  - `tail("slice", id="S-001")` is `S-001`;
  - `tail("state")` matches `^state-\d{14}$`;
  - `tail("state", ts="20261008101500")` is `state-20261008101500`;
  - `tail("e2e-area", id="M-1", area="api")` is `M-1-e2e-api`;
  - `tail("e2e-area", id="M-1")` and `tail("e2e-area", id="M-1", area="")` raise `Fail`, and the message names `area`;
  - `tail("e2e-area", area="api")` raises `Fail` that names `id`.
- T-020 (R-018) `the state tail is the current UTC time`: run the probe with `TZ=Pacific/Kiritimati` (UTC+14). Take the UTC time in the test before and after the call, formatted `%Y%m%d%H%M%S`. The 14 digits of `tail("state")` must fall between them (inclusive). A local-time timestamp is 14 hours off and fails.
- T-021 (R-099) `name without a required part exits 2 with one JSON error and no traceback`: `name --repo R --kind e2e-area --id M-1` exits 2; stdout is one JSON object with `ok: false` and a non-empty `error` that names `area`; stderr holds no `Traceback`. The same holds for `name --kind slice` with no `--id`.
- T-022 (R-015) `name takes the format from the flag, then the config, then the default`:
  - a repo with `branchFormat: "feature/PROJ-1-{name}"` and `--format "sdlc/{name}"` gives `branch` `sdlc/S-001`;
  - the same repo without `--format` gives `feature/PROJ-1-S-001`;
  - a repo with no `.sdlc/config.json` and no `--format` gives `sdlc/S-001`;
  - each output has `ok: true`, `command: "name"`, `kind: "slice"`, the resolved `format` and `branch`;
  - the key set of each output is exactly `ok`, `command`, `format`, `kind` and `branch`: no `args`, no `tail`, no parts.
  - It also checks `name --kind e2e-area --id M-1 --area api` gives `sdlc/M-1-e2e-api`, and `name --kind state` gives `sdlc/state-` and 14 digits.
- T-023 (R-012, R-002) `preflight reports the resolved format and whether it was given`:
  - `--format "team/{name}"` on a repo whose config holds `feature/{name}` gives `format` `team/{name}` and `given: true`;
  - no flag and a config with `branchFormat: "feature/{name}"` gives `feature/{name}`, `given: true`;
  - no flag and a config with `branchFormat: "sdlc/{name}"` gives `given: true`;
  - no flag and a config with `branchFormat: ""` or no key gives `sdlc/{name}`, `given: false`;
  - no flag and no `.sdlc/config.json` gives `sdlc/{name}`, `given: false`;
  - every case exits 0 with one JSON object.
- R-002 clause 1 only (partial evidence, ADR-20261009-041833): the existing T-006 `load_format returns the config value or the default` stays as evidence. T-023's two default cases (empty or absent key, and no config file) add the CLI evidence. This slice adds no test for clause 2. S-027 adds that check: env-detector with a null `branchFormat` input and no existing `config.branchFormat` writes `branchFormat: "sdlc/{name}"` to `config.json`.

## Steps

1. Add the T-019 to T-023 tests and adjust the two existing calls in Risks; run `npm test` and confirm the new tests fail for the expected reasons (no `state` or `e2e-area` row, the `name` echo has no `branch`, the preflight has no `given`).
2. Add the `datetime` import and the `state` and `e2e-area` rows to `TAILS`. Treat an empty `ts` as absent in the `state` builder.
3. Add `_config_format(repo)`; make `load_format` call it. Keep the existing `Fail` messages for invalid JSON, deep nesting and an unreadable file.
4. Replace the `cmd_name` body: resolve and validate the format, check the kind, collect the non-`None` parts, call `name`, and return the new object.
5. In `cmd_preflight`, compute `given` and add it to the result beside `format`.
6. Run `npm test`. Every test passes, including the S-001 and S-002 tests and the testkit self-tests.

## Risks

- Two existing interim calls change because `name` now builds a real name. T-003 `every command runs and prints one JSON object` runs `name --kind verify`, which has no `TAILS` row until S-006; change that call to `--kind slice` and keep the other flags and all assertions (the reversal path in ADR-20261009-034215). The git-modes test `a missing or malformed git-modes.json fails preflight ... and name, parse and list still run` runs `name --kind slice` with no `--id`, which now exits 2 by contract (R-099); add `--id S-001`. Both tests keep their intent: every command runs and prints one object.
- Until S-004 to S-006 land, `name --kind run|milestone|e2e|verify|attempt` exits 2 with "no branch name is defined for kind". No consumer calls the CLI before those slices.
- The state timestamp must be UTC. `datetime.now()` without a zone gives local time; T-020 catches it with a +14 hours TZ.
- `--n 0` and `--part 0` are `0`, not `None`; the part filter must test `is not None`, not truthiness.
- `given` must count a config value equal to the default as given, or a resume with the default would derive a new format.
- R-002 must not be marked done at S-003 integration. Its fresh-run clause has no evidence until S-027. The integrator follows ADR-20261009-041833: status `in_progress`, partial evidence, and the S-027 note. The final audit must treat R-002 in S-003 and S-027 as intended.
- Later consumers read the `branch` field of the `name` object, not raw stdout: the `RUN_BRANCH` capture at spec line 157 and the `branchName` comparison at spec line 265 (ADR-20261009-041713). S-003 has no such consumer; the slices that add them must parse the JSON.

## Critique responses

- ADR-20261009-041704 (state tail): the plan already matches. `tail("state")` returns `state-` plus 14 UTC digits in `%Y%m%d%H%M%S` order, and `tail("state", ts=X)` returns `state-X`. T-019 asserts `^state-\d{14}$` and the `ts` case. T-020 checks the 14 digits after `state-` against UTC time. This plan does not edit `requirements.json`; P-20261009-041704 carries the R-018 text fix.
- ADR-20261009-041711 (TAILS rows): the plan adds only the `state` and `e2e-area` rows. The `run`, `milestone`, `e2e`, `verify` and `attempt` rows stay with S-004 to S-006, with no stub rows. Until then, `name` for those kinds exits 2 with one JSON error and no traceback. T-003 changes `--kind verify` to `--kind slice`; it already passes `--id S-001` and keeps every assertion. The git-modes test adds `--id S-001` to its bare `name --kind slice` call. No test asserts that another kind fails; the Tests section now says so.
- ADR-20261009-041713 (name output): `cmd_name` prints exactly `{"ok": true, "command": "name", "format", "kind", "branch"}` and exits 0. Bad input or a missing part prints `{"ok": false, "error"}` and exits 2 with no traceback (T-021). T-022 now asserts all five fields and that the key set holds no other key. The Risks section records that later consumers read the `branch` field.
- ADR-20261009-041833 (R-002 split): S-003 proves only clause 1 of R-002, with T-006 and the T-023 default cases. The Approach, Tests and Risks sections now say so. S-003 does not mark R-002 done. The integrator sets R-002 to `in_progress`, keeps that partial evidence, and writes the note "fresh-run config clause closes in S-027". The state-writer adds R-002 to S-027 beside R-064. S-027 adds the env-detector check for clause 2 and closes R-002. No product code or test in this plan changes; the earlier reference to "the ambiguities" is gone.
