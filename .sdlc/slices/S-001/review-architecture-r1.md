# Review: S-001, lens architecture, round 1

Diff: `git diff main...sdlc/S-001` at 4434d71.

Verdict: no blocking finding.

## Fit with the spec

- `branches.py` holds the four commands of spec §2 with the spec's flags. It holds `Fail`, `load_format` and `validate_format` with their final signatures.
- The handlers share `_repo`, `_format`, `_kind` and `_echo`. Later slices can replace each handler body and keep the contract.
- The three scripts insert their real directory into `sys.path` and import `branches`, as spec §2 says. They do not use the module yet. S-021, S-022 and S-024 own that change.
- The module reads `git-modes.json` only inside `preflight`. An import never fails on that file.

## Findings

1. A third copy of `load_git_modes` (non-blocking). `branches.py`, `next-action.py` and `state-write.py` each parse `git-modes.json` with their own code. `git-modes.test.mjs` pins only the two scripts. Add `branches.py` to the `SCRIPTS` list of that test. Alternatively, let the two scripts call `branches.load_git_modes` and map `Fail` to their own error.
2. Two rules for the script directory (non-blocking). The `sys.path` line uses `realpath`. Every `GIT_MODES_PATH`, the one in `branches.py` included, uses `abspath`. Through a symlink, the code comes from the real directory, but the mode list comes from the symlink directory. Define one `SKILL_DIR` with `realpath` in `branches.py` and build `GIT_MODES_PATH` from it.
3. The testkit self-tests do not run in `npm test` (non-blocking). The glob `skills/sdlc/test/*.test.mjs` does not reach `test/testkit/*.test.mjs`. A broken tool then fails only inside a later verifier run. Widen the glob, or add a top-level test file that imports the testkit self-tests.
