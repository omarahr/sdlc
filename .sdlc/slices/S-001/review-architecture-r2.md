# Review: S-001, lens architecture, round 2

Diff: `git diff main...sdlc/S-001` at 90d3251.

Verdict: no blocking finding.

## Change since round 1

- Fix round 2 adds one test to `branches.test.mjs`. No product code changed.
- The test pins `preflight` on eight bad `git-modes.json` shapes. It also pins that `name`, `parse` and `list` still run beside a bad file.
- This keeps the round-1 design: the module reads `git-modes.json` only inside `preflight`.

## Findings

1. Two tests build the same skill copy (non-blocking). The new test and "a git-modes.json that cannot be read" each copy `branches.py` into a scratch directory with their own code. Merge the directory and mode-000 shapes into the new shape table, or share one `skillCopy` helper.
2. Round-1 findings 1 to 3 are still open (non-blocking). `load_git_modes` has three copies. `GIT_MODES_PATH` in `branches.py` uses `abspath`, but the `sys.path` lines use `realpath`. The `npm test` glob does not reach `test/testkit/*.test.mjs`. The fixes in the round-1 report still apply.
