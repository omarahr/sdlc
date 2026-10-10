# Plan S-033: state-write and janitor take their format from the module

## Approach

Slices S-022 and S-024 already moved most of the work into `branches.py`. `prune_stale_milestone_branches` already keeps only branches that `branches.parse` classifies as `milestone`. `janitor.py` already calls `branches.load_format(repo)`. One gap stays. `branch_run` in `state-write.py` reads `runBranch` from the config committed on a branch. It never checks that the value is a run branch. This slice gives `branch_run` a `fmt` argument. It returns the stored value only when `branches.parse(fmt, value)` has kind `run`. Any other value (a foreign name such as `main` or `release/x`) counts as "no run". The two callers, the prune loop and `ensure_milestone_branch`, pass `fmt`. A branch that claims a foreign run is then neither pruned as this run's own nor refused as another run's. The slice also adds tests that pin R-138 and R-139 under a custom format and under the default format. Behaviour under `sdlc/{name}` with real run names does not change.

## Files

- Modify `skills/sdlc/state-write.py`: `branch_run(repo, branch, fmt)` classifies with `branches.parse`; the two callers pass `fmt`; update the docstring.
- Modify `skills/sdlc/test/scripts.test.mjs`: add the tests below. Reuse the existing stack-mode fixtures and the janitor `fixture`, `slice`, `refs` and `runJanitor` helpers.
- No change to `skills/sdlc/janitor.py` unless a janitor test fails. It already meets R-139.

## Tests

All tests go in `skills/sdlc/test/scripts.test.mjs`.

- T-R-138a (R-138): "the prune treats only branches that parse to milestone as milestone branches under a custom format". Format `feature/PROJ-1-{name}`. Shipped branches `feature/PROJ-1-M-1` and foreign `sdlc/M-2`, `feature/PROJ-1-M-3-e2e`, `feature/PROJ-1-S-001`, `feature/PROJ-1-run-1`. Assert only `feature/PROJ-1-M-1` goes.
- T-R-138b (R-138): "branch_run takes a run branch only when it parses to kind run". Load `state-write.py`; commit `.sdlc/config.json` with `runBranch: "feature/PROJ-1-run-1"` on a branch. Assert `branch_run(repo, branch, fmt)` returns it. Repeat with `runBranch: "sdlc/run-1"` under the custom format and with `runBranch: "main"`. Assert both return `""`. Repeat under the default format with `sdlc/run-1` (returned) and `feature/PROJ-1-run-1` (`""`).
- T-R-138c (R-138): "a foreign branch is not taken as the run branch". A leftover milestone branch whose committed config names a foreign run, with unshipped work. Assert `ensure_milestone_branch` does not fail with "belongs to run" and does not prune it. A control branch naming another real run branch still fails with "belongs to run".
- T-R-139a (R-139): "a repo whose config holds feature/PROJ-1-{name} makes the janitor sweep under that format". Verify branches `feature/PROJ-1-S-001-v0-http-api-0` (slice done) goes; `sdlc/S-001-v0-http-api-0` stays.
- T-R-139b (R-139): "a repo with no branchFormat makes the janitor sweep under sdlc/{name}". Same ledger. `sdlc/S-001-v0-http-api-0` goes; `feature/PROJ-1-S-001-v0-http-api-0` stays. Repeat with `branchFormat: ""`.
- T-R-139c (R-139): "janitor.py takes its format from load_format". Read the file; assert it contains `branches.load_format(repo)` and no `sdlc/` literal outside prose.
- The existing prune, stack and janitor tests stay green with no edit.

## Steps

1. Write T-R-138a to T-R-138c and T-R-139a to T-R-139c. Run `npm test`. T-R-138b and T-R-138c fail on the old `branch_run`. The others pass because S-022 and S-024 did that work.
2. Change `branch_run` to take `fmt` and return the value only when `branches.parse` gives kind `run`.
3. Pass `fmt` from `prune_stale_milestone_branches` and `ensure_milestone_branch`.
4. Run `npm test`. All tests pass.

## Risks

- The janitor deletes branches. This slice does not change its deletion rule, so the risk stays low. The tests pin that a foreign branch stays.
- `branch_run` now returns `""` for a stored name that does not parse. A run with an odd `runBranch` could skip the "belongs to run" refusal. The old name `sdlc/run-<n>` always parses under the default format, so real runs keep the refusal.
- A malformed format makes `branches.parse` raise `Fail`. `branch_run` converts it with the existing `Fail` wrapper used in `branch_kind`.

## Critique responses

None. There are no input critiques.
