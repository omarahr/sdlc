# Plan: S-001 branches.py skeleton: importable CLI, JSON contract, load_format

Requirements: R-013, R-098, R-014, R-088, R-016.

## Approach

Create `skills/sdlc/branches.py` as a Python 3 module that uses the standard library only. The module owns the CLI contract: four subcommands, each with the flags of spec §2, and one JSON object on stdout. This slice builds the contract layer and `load_format`. The real logic of `name`, `parse`, `list` and `preflight` comes in later slices (S-002 to S-017). Each handler in this slice checks `--repo` and `--kind` or `--mode`, resolves the format and runs `validate_format`. On success it prints `{"ok": true, "command": <cmd>, "format": <resolved format>, "args": <parsed flags without command and format>}` and exits 0. The resolved format replaces the raw `--format` value. One shared helper builds `args` from the argparse namespace, with no per-command filter and no rename. The top level holds only `ok`, `command`, `format` and `args`, so `kind` and `branch` appear only inside `args` (ADR-20261009-024229). The handlers emit no final result field: no `samples`, `rules`, `derived`, `kind`, `tail`, `branch`, `known` or `branches`. Later slices replace each handler body and keep the contract.

Every bad input raises the module's `Fail` exception. `main()` catches it, prints `{"ok": false, "error": ...}` and exits 2. An `argparse.ArgumentParser` subclass overrides `error()`, so an unknown flag, a missing required flag or a non-integer `--n`, `--round` or `--part` also prints that JSON object and exits 2. Argparse usage text never goes to stdout.

The bad-input checks in this slice: `--repo` must be an existing directory; `--kind` must be one of the eight kinds of spec §1; `--mode` must be one of the modes in `git-modes.json` beside the script; `--format` must hold exactly one `{name}` or `{name:lower}`, no other brace and no whitespace. This check is `validate_format(fmt)` with its final signature and its final `Fail` contract, but without the `git check-ref-format --branch` step. S-002 adds that step inside the same function and owns R-017. S-001 does not mark R-017 done. No path exits 1.

For R-098, `next-action.py`, `state-write.py` and `janitor.py` insert their own directory at the front of `sys.path` and `import branches`. The import is the wiring only. S-021, S-022 and S-024 replace the branch regexes with calls into the module and test recognition through it. S-001 reads "branch recognition still resolves" as no regression after the import lands. One new test runs one recognition path per script through its CLI from a scratch working directory.

## Files

- Create `skills/sdlc/branches.py`: `Fail`, `DEFAULT_FORMAT = "sdlc/{name}"`, `KINDS` (the eight kinds in the order of the spec §1 table), `load_format(repo)`, `validate_format(fmt)` (placeholder, brace and whitespace checks only), the four command handlers, the JSON-erroring argument parser and `main()`. The module reads `git-modes.json` only inside the `preflight` handler, never at import, so an import never fails on that file. No comments, per `_common.md`.
- Modify `skills/sdlc/next-action.py`: after the stdlib imports, add `sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))` and `import branches`.
- Modify `skills/sdlc/state-write.py`: the same two lines.
- Modify `skills/sdlc/janitor.py`: add `import sys`, then the same two lines.
- Modify `skills/sdlc/test/git-modes.test.mjs`: at lines 51 and 71 the tests copy a script into a scratch directory. Copy `branches.py` beside it too, so the copied script can import the module. The assertions stay the same.
- Create `skills/sdlc/test/branches.test.mjs`: the tests below, T-001 to T-010. It uses `SKILL_DIR` and `scratch` from `harness.mjs` and skips when `python3` is missing, as `git-modes.test.mjs` does.

## Tests

All tests are in `skills/sdlc/test/branches.test.mjs`. They run under `npm test`.

- T-001 (R-013) `branches.py imports from its path and exposes the public functions`: a `python3 -c` probe loads the module through `importlib.util.spec_from_file_location`. It asserts that `Fail`, `load_format`, `validate_format` and `main` are present and callable or a class.
- T-002 (R-013) `branches.py imports only standard library modules`: the probe reads the module with `ast` and collects every `import` and `from` name. It asserts that each top-level name is in `sys.stdlib_module_names`.
- T-003 (R-013, R-088) `every command runs and prints one JSON object`: for `name`, `parse`, `list` and `preflight`, run `python3 branches.py <command>` with every flag its spec line names. Use a scratch git repo as `--repo`. Assert exit 0, assert that stdout parses as one JSON object, and assert `ok: true`, `command` and `format`. The test asserts no other field. The `name` call passes `--kind verify --id S-001 --n 1 --area api --round 0 --profile http-api --part 0 --format feature/{name}`. The `parse` call passes `--branch sdlc/S-001 --format sdlc/{name}`. The `list` call passes `--kind slice --format sdlc/{name}`. The `preflight` call passes `--mode mr --format sdlc/{name} --branch main`.
- T-004 (R-088) `a flag that a command does not name is bad input`: `parse --kind slice`, `list --branch x` and `preflight --kind slice` each exit 2 with `{"ok": false, "error": <string>}` as the only stdout.
- T-005 (R-014) `bad input exits 2 with one JSON error object`: each of these exits 2, prints one JSON object with `ok: false` and a non-empty string `error`, and prints no usage text on stdout. The format cases are only the structural ones of the S-001 `validate_format`; S-002 tests the invalid-ref case under R-017:
  - `preflight --format "feature/x"` (no placeholder);
  - `preflight --format "{name}-{name}"` (two placeholders);
  - `name --format "sdlc/ {name}"` (whitespace);
  - `name --format "sdlc/{id}/{name}"` (an extra brace pair);
  - `name --kind bogus`;
  - `name --kind attempt --n two`;
  - `preflight --mode bogus`;
  - `parse` without `--branch`;
  - `list --repo <a path that does not exist>`;
  - no command.
- T-006 (R-016) `load_format returns the config value or the default`: a probe calls `load_format` on scratch repos. A config with `"branchFormat": "feature/{name}"` gives `feature/{name}`. A config without the key, a config with `"branchFormat": ""` and a repo without `.sdlc/config.json` each give `sdlc/{name}`.
- T-007 (R-016) `a command without --format uses the config format`: `parse` on a repo whose config holds `feature/{name}` prints `format: "feature/{name}"`. On a repo without config it prints `sdlc/{name}`. A `--format` flag wins over the config value.
- T-008 (R-098) `the three scripts import branches from their own directory`: for each of `next-action.py`, `state-write.py` and `janitor.py`, a `python3 -c` probe runs with its working directory in a scratch directory. The probe loads the script by path through `importlib`, then asserts that `mod.branches.__file__` is `branches.py` in the skill directory. Under `importlib`, `sys.path[0]` is the probe's working directory, so only the script's own `sys.path` insertion can make the import resolve.
- T-009 (R-098) `the three scripts run with the working directory outside the skill directory`: run each script with `--help` and `cwd` set to a scratch directory. Assert exit 0.
- T-010 (R-098) `branch recognition in the three scripts still resolves from a scratch working directory`: each script runs through its CLI with `cwd` set to a scratch directory and `--repo` set to a scratch git repo. Each assertion is the result the script gives before the import lands:
  - `next-action.py --repo <repo>` on a repo whose `main` has `S-1` as `todo` and whose local `sdlc/S-1` marks `S-1` as `in_progress`. The decision is `slice` and `checkout` is `sdlc/S-1`. This is the `active_branch` path.
  - `state-write.py base-branch --repo <repo> --slice S-2` where `S-2` depends on `S-1`, `S-1` is `awaiting-merge` and the branch `sdlc/S-1` exists. The output has `branch: "sdlc/S-1"`. This is the `awaiting_merge_base` path.
  - `janitor.py --repo <repo> --days 36500` on a repo with `S-1` marked `done`, and the branches `sdlc/S-1-v1` and `sdlc/S-1`. `removedBranches` is `["sdlc/S-1-v1"]`, and `sdlc/S-1` still exists. This is the `V_BRANCH` path. The large `--days` value keeps the janitor away from other scratch directories.

  The fixture shapes copy the existing `next-action.test.mjs`, `scripts.test.mjs` base-branch and janitor fixtures. The test runs all three before step 7 too, so step 1 records the pre-import result.

No performance items apply.

## Steps

1. Write `branches.test.mjs` with T-001 to T-010. Run `npm test`. Confirm that T-001 to T-008 fail and that T-009 and T-010 pass before the import lands.
2. Create `branches.py` with `Fail`, `DEFAULT_FORMAT`, `KINDS` and `load_format`. `load_format` reads `<repo>/.sdlc/config.json`. It returns `branchFormat` when that is a non-empty string. It returns `DEFAULT_FORMAT` when the file is absent or the key is missing or empty. Invalid JSON in the config raises `Fail`.
3. Add `validate_format(fmt)`: count `{name}` and `{name:lower}`, require a total of one, remove that placeholder and require no `{`, `}` or whitespace in the rest.
4. Add the parser subclass whose `error()` raises `Fail`. Add four subparsers with the flags of spec §2. `--n`, `--round` and `--part` take `type=int`. `--repo` is required on each command.
5. Add one shared helper `_echo(command, fmt, ns)`. It returns `{"ok": True, "command": command, "format": fmt, "args": {k: v for k, v in vars(ns).items() if k not in ("command", "format")}}`. Add the handlers. Each checks that `--repo` is a directory, resolves `fmt` from `--format` or `load_format(repo)` and calls `validate_format(fmt)`. `name` and `list` check `--kind` against `KINDS`. `preflight` checks `--mode` against `git-modes.json` beside the script. Each returns the result of `_echo`.
6. Add `main(argv=None)`: parse, dispatch, print the result with `json.dumps`, and exit 0. On `Fail`, print the error object and exit 2. Add the `if __name__ == "__main__":` guard.
7. Add the `sys.path` insertion and `import branches` to the three scripts. Add `import sys` to `janitor.py`.
8. Run `npm test`. Confirm that every test passes, including T-010 and the unchanged `git-modes`, `scripts` and `next-action` suites.

## Risks

- The handler outputs in this slice are placeholders. Later slices change their result fields. T-003 to T-007 assert only one JSON object, `ok`, `command`, `format` and the exit-2 error shape, so they stay valid when the fields change.
- ADR-20261009-024229 settles the echo position: the flags sit under `args`, built by one shared helper. No test reads `args`. S-002 to S-017 replace the handler bodies, and `args` goes away with them. A flat echo stays a one-line change in the helper.
- `git-modes.test.mjs` copies `next-action.py` and `state-write.py` alone into a scratch directory and loads them. After step 7, the copy cannot find `branches.py`, and those tests fail on import. Step 7 must handle this: the test copies `branches.py` beside the script, or the scripts tolerate the missing module. The plan picks the first option, because a silent fallback hides a broken install. This changes `git-modes.test.mjs`. It does not weaken any assertion.
- A search for `copyFileSync` and `cpSync` finds no other test that copies a script. Step 8 runs the whole suite to find any other case.
- The import adds a `__pycache__` directory beside the scripts. `.gitignore` already ignores `__pycache__/`.
- `argparse` exits 0 on `--help`. The `--help` output of `branches.py` is not JSON. The contract covers commands, and `--help` is not bad input, so the plan accepts this.

## Critique responses

- ADR-20261009-024048 (interim output): each handler checks `--repo` and `--kind` or `--mode`, resolves the format and runs `validate_format`. Success prints one object with `ok`, `command`, the resolved `format` and the parsed flags, and exits 0. Bad input prints `{"ok": false, "error": <string>}` and exits 2. No path exits 1. No final result field appears. T-003 to T-007 assert only one JSON object, `ok`, `command`, `format` and the exit-2 error shape. The flags sit under `args`, so the forbidden keys `kind` and `branch` never appear at the top level.
- ADR-20261009-024036 (validate_format split): `validate_format(fmt)` has its final signature and raises `Fail`. It holds only the placeholder, brace and whitespace checks. Every handler calls it. S-002 adds the `git check-ref-format --branch` step inside it. T-005 tests only no placeholder, two placeholders, whitespace and an extra brace pair. S-001 does not mark R-017 done.
- ADR-20261009-024047 (R-098 scope): the plan keeps T-008 and T-009 and runs the existing `next-action`, `state-write` and `janitor` suites unchanged. The new T-010 runs one recognition path per script through its CLI from a scratch working directory and asserts the pre-import result. S-001 does not test recognition through `branches.py`. R-098 stays in S-001 beside R-013.
- ADR-20261009-024229 (nested echo, option 2): each S-001 handler returns the result of one shared helper `_echo` in `branches.py`. The helper prints `ok`, `command`, the resolved `format` and `args`. `args` holds the argparse namespace without `command` and `format`, with no per-command filter and no rename. No other top-level key exists, so `kind` and `branch` appear only inside `args`. Bad input keeps `{"ok": false, "error": <string>}` and exit 2. T-003 to T-007 stay unchanged.
