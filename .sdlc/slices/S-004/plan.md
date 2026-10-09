# Plan: S-004 tails: run, slice, milestone, e2e, e2e-area

Requirements: R-003, R-004, R-005, R-006, R-007.

## Approach

S-002 built `tail(kind, **parts)` in `skills/sdlc/branches.py` on one `TAILS` table (ADR-20261009-034220). S-003 added the `state` and `e2e-area` rows and made the CLI `name` command print the real name (ADR-20261009-041711, ADR-20261009-041713). This slice adds three rows to the same table, as spec section 1 gives them:

- `run` requires `n` and gives `run-<n>`;
- `milestone` requires `id` and gives `<id>`;
- `e2e` requires `id` and gives `<id>-e2e`.

The `slice` and `e2e-area` rows already exist, so R-004 and R-007 need only CLI evidence under the default format. The `cmd_name` handler does not change: it already collects the non-`None` parts, calls `name`, and prints `{ok, command, format, kind, branch}`. A missing or empty part keeps the existing `Fail` path, so the CLI exits 2 with one JSON error that names the part. The `verify` and `attempt` rows stay with S-005, as ADR-20261009-041711 says. This slice adds no stub row.

## Files

- Modify `skills/sdlc/branches.py`: add the `run`, `milestone` and `e2e` rows to `TAILS`. The builders return strings; the `run` builder formats `n` with an f-string, so the integer from `--n` works. No other function changes.
- Modify `skills/sdlc/test/branches.test.mjs`: add T-025 to T-027 below. No existing test or assertion changes.

## Tests

All tests are in `skills/sdlc/test/branches.test.mjs` and run under `npm test`. They use the existing `run`, `oneObject`, `gitRepo`, `probe` and `CALL` helpers. No test asserts that `verify` or `attempt` fails (ADR-20261009-041711).

- T-025 (R-003, R-004, R-005, R-006, R-007) `name prints the default branch for the run, slice, milestone, e2e and e2e-area kinds`: on a git repo with no `.sdlc/config.json` and no `--format`, run `branches.py name` once per case. Each run exits 0 and prints one JSON object with key set exactly `ok`, `command`, `format`, `kind`, `branch`; `ok: true`, `command: "name"`, `format: "sdlc/{name}"`, and `kind` equal to the case kind. The `branch` values:
  - R-003: `--kind run --n 1` gives `sdlc/run-1`;
  - R-004: `--kind slice --id S-001` gives `sdlc/S-001`;
  - R-005: `--kind milestone --id M-1` gives `sdlc/M-1`;
  - R-006: `--kind e2e --id M-1` gives `sdlc/M-1-e2e`;
  - R-007: `--kind e2e-area --id M-1 --area api` gives `sdlc/M-1-e2e-api`.
- T-026 (R-003, R-005, R-006) `tail builds the run, milestone and e2e tails and fails on a missing part`: through the Python API from a scratch cwd:
  - `tail("run", n=1)` is `run-1`; `tail("run", n=12)` is `run-12`; `tail("run", n=0)` is `run-0` (0 is a value, not a missing part);
  - `tail("milestone", id="M-1")` is `M-1`;
  - `tail("e2e", id="M-1")` is `M-1-e2e`;
  - `tail("run")` raises `Fail` that names `n`; `tail("milestone")` and `tail("milestone", id="")` raise `Fail` that names `id`; `tail("e2e")` raises `Fail` that names `id`.
- T-027 (R-003, R-005, R-006) `name for the run, milestone and e2e kinds follows a prefixed and a lowercased format and fails without its part`:
  - `name("feature/PROJ-1-{name}", "milestone", id="M-1")` is `feature/PROJ-1-M-1`; `name("feature/PROJ-1-{name:lower}", "e2e", id="M-1")` is `feature/PROJ-1-m-1-e2e`; `name("feature/PROJ-1-{name:lower}", "run", n=1)` is `feature/PROJ-1-run-1`;
  - on the CLI, `name --kind run` with no `--n`, and `name --kind milestone` and `name --kind e2e` with no `--id`, each exit 2 with one JSON object, `ok: false`, an error that names the missing part, and no `Traceback` on stderr.

T-025 holds the acceptance evidence for all five requirements. Its slice and e2e-area cases pass before this slice's code change, because S-003 added those rows. Its run, milestone and e2e cases fail first with "no branch name is defined for kind". T-026 and T-027 fail first for the same reason.

## Steps

1. Add T-025 to T-027. Run `npm test` and confirm the run, milestone and e2e cases fail with "no branch name is defined for kind", and the slice and e2e-area cases pass.
2. Add the three rows to `TAILS` in `skills/sdlc/branches.py`, between the existing rows in the section 1 table order: `run`, `slice`, `milestone`, `e2e`, `e2e-area`, `state`.
3. Run `npm test`. Every test passes, including the S-001 to S-003 tests and the testkit self-tests.

## Risks

- `--n` is an `int`. `0` is not `None`, so `tail("run", n=0)` must give `run-0`. The existing required-part check tests `None` and `""` only; T-026 pins this.
- The `e2e` and `e2e-area` tails share the `<id>-e2e` stem. The rows are separate keys, so no prefix match can mix them. Parse precedence (row 3 before row 4) belongs to S-007.
- The `milestone` and `e2e` rows do not check the id shape (`M-<n>`), and the `run` row does not check `n >= 0`. ADR-20261009-045048-decision-judge-S-004-7815 settles this. Known gap: these inputs do not round-trip through parse. The loop passes only ledger ids and run counters from 1. S-007 proves the round trip with real ledger ids.
- `verify` and `attempt` still exit 2 with "no branch name is defined for kind" until S-005. No consumer calls the CLI for them before then.
- Scope is about 6 product lines and about 90 test lines in one unit, well under the limits.

## Critique responses

- ADR-20261009-045048-decision-judge-S-004-7815 (Option 1): the plan keeps the run, milestone and e2e rows with a Fail only for a missing or empty part. Step 2 adds no regex and no sign check. No test in T-025 to T-027 pins a malformed id or a negative n. `tail("run", n=0)` in T-026 is a present value, not a sign check. The Risks section records the round-trip gap, and S-007 owns the round-trip proof.
