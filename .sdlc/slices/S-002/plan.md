# Plan: S-002 validate_format, split and name

Requirements: R-017, R-001, R-019, R-020, R-071.

## Approach

S-001 built `validate_format(fmt)` in `skills/sdlc/branches.py` with the placeholder, brace and whitespace checks (ADR-20261009-024036). This slice adds the last check of spec §2 inside the same function. `validate_format` builds `name(fmt, "slice", id="S-001")` and runs `git check-ref-format --branch <that name>`. A non-zero exit raises `Fail`, and the message carries the stripped stderr of git as the reason. The function keeps its signature and its `Fail` contract, and it still returns `fmt`.

The slice adds three Python functions: `split(fmt)`, `name(fmt, kind, **parts)` and `tail(kind, **parts)`. `split` finds the one placeholder and returns `(prefix, suffix, lower)`. `name` returns `prefix + tail + suffix`, with the tail lowercased when `lower` is true. The literal text keeps its case. `tail` gets its final signature and `Fail` contract now (ADR-20261009-034220). It reads one table keyed by kind. Each row gives the parts the kind requires and a builder. The table holds only the `slice` row: `tail("slice", id=X)` is `X`. A missing or empty `id` raises `Fail`, and a kind not in the table raises `Fail`. S-003 owns the R-018 contract tests and the `state` timestamp default. S-004 to S-006 add rows to the same table.

The four CLI handlers stay as they are (ADR-20261009-024048, ADR-20261009-034215). Each one already calls `validate_format`, so an invalid-ref format now exits 2 through the CLI with one JSON error. The `name` handler keeps the interim echo `{ok, command, format, args}`. This slice proves R-019 through the Python `name` only. S-004 replaces the handler body under R-003 and prints the real name for every kind.

R-019 does not close in this slice (ADR-20261009-034229). T-016 checks the literal example, the strip half through `split`, and that `{name:lower}` lowercases only the tail. The parse-back clause closes in S-007, when `parse` exists. This slice adds no `parse` stub.

The git call uses an argument list, never a shell. A missing `git` binary (`OSError`) and a NUL in the format (`ValueError` from `subprocess`) raise `Fail`, not a traceback. This also closes the S-001 seeds about a leading dash and control characters, because `git check-ref-format` rejects both.

## Files

- Modify `skills/sdlc/branches.py`:
  - add `import subprocess`;
  - add `TAILS`, a table keyed by kind; each row holds the required part names and a builder; only the `slice` row exists;
  - add `tail(kind, **parts)`, which reads `TAILS` and raises `Fail` for a kind not in the table or a missing or empty part;
  - add `split(fmt)`, which raises `Fail` unless the format holds exactly one placeholder;
  - add `name(fmt, kind, **parts)` on top of `split` and `tail`;
  - extend `validate_format(fmt)` with the `git check-ref-format --branch` step after the structural checks.
- Modify `skills/sdlc/test/branches.test.mjs`: extend T-001 with the new public functions and add T-011 to T-016 below. No existing assertion is removed or relaxed.

## Tests

All tests are in `skills/sdlc/test/branches.test.mjs` and run under `npm test`. The Python API tests use the existing `probe` and `LOAD` helpers from a scratch working directory. Each probe prints JSON, and the test compares it.

- T-001 (extended, R-019, R-020) `branches.py imports from its path and exposes the public functions`: the expected object gains `split: true`, `name: true` and `tail: true`. The test checks only that each one is callable.
- T-011 (R-001, R-017) `validate_format accepts one placeholder with a valid literal part`: `validate_format` returns its input for `sdlc/{name}`, `sdlc/{name:lower}` and `feature/PROJ-1-{name}`.
- T-012 (R-071, R-017, R-001) `validate_format rejects two placeholders, none, whitespace and an invalid ref`: each case raises `Fail`, never another exception. The cases are:
  - `{name}{name}` (two placeholders);
  - `sdlc/` (no placeholder);
  - `sdlc/{ name }` (whitespace);
  - `sdlc/{name}..` (invalid ref);
  - `sdlc/{name}}` and `sdlc/{{name}` (a stray `}` or `{`, R-001).

  The `sdlc/{name}..` message contains `check-ref-format` and git's reason text `is not a valid branch name`.
- T-013 (R-017) `validate_format rejects the literal parts that git refuses`: each of `-{name}`, `a\x01/{name}`, `sdlc/{name}.lock`, `/{name}`, `a~/{name}` and `sdlc/{name}\x00` raises `Fail`, never another exception. The NUL case runs in the probe, because argv cannot carry a NUL.
- T-014 (R-017) `an invalid-ref format is bad input on the CLI`: `name --kind slice --id S-001 --format "sdlc/{name}.."` and `preflight --mode pr --format "sdlc/{name}.."` each exit 2 with one JSON object, `ok: false`, and an `error` that contains `is not a valid branch name`. The check uses `assertBadInput`.
- T-015 (R-020) `split returns the prefix, the suffix and the lower flag`: `split("a/{name}.x")` is `["a/", ".x", false]`. `split("a/{name:lower}")` is `["a/", "", true]`. `split("{name}")` is `["", "", false]`. `split("sdlc/")` raises `Fail`.
- T-016 (R-019) `name puts the tail in the placeholder and lowercases only the tail`: `name("sdlc/{name}", "slice", id="S-001")` is `sdlc/S-001`. `name("feature/PROJ-1-{name}", "slice", id="S-001")` is `feature/PROJ-1-S-001`. `name("feature/PROJ-1-{name:lower}", "slice", id="S-001")` is `feature/PROJ-1-s-001`. For each of the three formats, the probe takes `split(fmt)` and strips the prefix and the suffix from the name. The rest equals the tail, lowercased under `{name:lower}`. `name("sdlc/{name}", "slice")` without `id` and `name("sdlc/{name}", "slice", id="")` each raise `Fail`. No test calls `tail` or `name` with a kind other than `slice` (ADR-20261009-034220). This test is partial evidence for R-019; the parse-back clause closes in S-007 (ADR-20261009-034229).
- T-017 (R-017) `validate_format without git is a Fail, not a crash`: the probe sets `os.environ["PATH"]` to an empty scratch directory and calls `validate_format("sdlc/{name}")`. The call raises `Fail`, and the message names `git`.

No performance items apply.

## Steps

1. Add T-011 to T-017 and extend T-001 in `branches.test.mjs`. Run `npm test`. Confirm that T-001, T-012 (the `..` case), T-013, T-014, T-015, T-016 and T-017 fail, and that T-011 passes.
2. Add `import subprocess` to `branches.py`.
3. Add the `TAILS` table with one row: `"slice": (("id",), lambda p: p["id"])`. Add `tail(kind, **parts)`. Look up the row; raise `Fail` when the kind is not in the table. Raise `Fail` when a required part is missing, is `None` or is an empty string. Otherwise return the builder's result as a string.
4. Add `split(fmt)`. Count `{name}` and `{name:lower}`. Raise `Fail` unless the total is one. Return the text before the placeholder, the text after it, and whether it is `{name:lower}`.
5. Add `name(fmt, kind, **parts)`. Call `split`, then `tail`. Lowercase the tail when `lower` is true. Return `prefix + tail + suffix`.
6. Extend `validate_format`. After the structural checks, build `candidate = name(fmt, "slice", id="S-001")`. Run `subprocess.run(["git", "check-ref-format", "--branch", candidate], capture_output=True, text=True, errors="replace")`. Catch `OSError` and `ValueError` and raise `Fail` with the cause. On a non-zero exit, raise `Fail` with the format, the candidate name and `git check-ref-format: <stderr stripped>`.
7. Run `npm test`. Confirm that every test passes, and that S-001 tests T-003 and T-005 still pass.

## Risks

- `git check-ref-format --branch` expands `@{-N}` forms. The structural checks reject every brace outside the placeholder before git runs, so this form cannot reach git.
- The git reason text can change between git versions. The tests assert only the stable part `is not a valid branch name` and the name `check-ref-format`.
- Every command now starts one `git` process. The cost is a few milliseconds per call. The existing suites call `branches.py` a small number of times.
- `tail` holds only the `slice` row in this slice. A caller that names another kind gets `Fail` until S-004 to S-006 add rows. No caller outside `validate_format` and the tests calls `name` yet. The CLI `name` handler does not call `name`, so `--kind verify` in T-003 still exits 0.
- R-019 stays open after this slice. The integrator sets it to `in_progress` with the S-002 tests as partial evidence and the note "parse-back clause closes in S-007". The state-writer adds R-019 to the S-007 requirements.
- R-068 in S-006 needs `parse` for its round-trip test, but `parse` comes in S-007. ADR-20261009-034229 flags this. The state-writer or the escalator must move R-068 to S-007 or make its check depend on S-007. This slice does not change it.

## Critique responses

- ADR-20261009-034220 (tail as a one-row table): the Approach, Files and Step 3 now define `TAILS`, a table keyed by kind with only the `slice` row. `tail` has its final signature and `Fail` contract. T-016 tests the slice tail through `name` and the missing or empty `id` `Fail`. No test asserts that another kind fails. R-018 stays with S-003.
- ADR-20261009-034229 (R-019 parse-back clause): T-016 stays as planned, with the literal example, the strip half through `split` and the lowercase check. The plan adds no `parse` stub. R-019 is partial evidence here; the Risks say the integrator sets it to `in_progress` and S-007 closes it. The R-068 flag is in the Risks.
- ADR-20261009-034215 (CLI echo): the `name` handler keeps the interim echo and the exit-2 path. R-019 is proven through the Python `name` only. T-003 to T-007 stay unchanged. S-004 replaces the handler body under R-003.
