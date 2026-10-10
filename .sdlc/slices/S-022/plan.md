# Plan S-022: state-write.py names and classifies branches through the module

## Approach

`state-write.py` already imports `branches`. This slice removes the `sdlc/` literals and the `MILESTONE_BRANCH` regex from it. Each helper that names a branch takes a `fmt` argument. The helper builds the name with `branches.name(fmt, kind, id=...)`. The prune loop lists local branches and keeps those where `branches.parse(fmt, branch)` has `kind == "milestone"`. `patch_slice` and the `base-branch` command compute `fmt` with a small helper, `format_of(repo, config)`. The helper returns `config["branchFormat"]` when set, else `branches.load_format(repo)`. Slice S-023 (R-059) later moves this derivation into `main()`; this slice keeps the helper so each call path works now. `config.runBranch` stays a full branch name. `advance_run_branch` and `shipped_into` do not change. The default format `sdlc/{name}` gives the same names as before, so the existing tests keep passing.

## Files

- Modify `skills/sdlc/state-write.py`:
  - delete `MILESTONE_BRANCH`;
  - add `format_of(repo, config)`;
  - `ensure_milestone_branch`, `ensure_slice_branch`, `slice_base`, `awaiting_merge_base`, `milestone_branches_with_open_slice_pr` and `prune_stale_milestone_branches` take `fmt` and name branches through `branches.name`;
  - the prune loop lists `refs/heads/` and classifies with `branches.parse`;
  - `patch_slice` and the `base-branch` arm of `main()` call `format_of`;
  - update the docstrings that say `sdlc/M-<n>` or `sdlc/<id>` to speak of the format.
- Modify `skills/sdlc/test/scripts.test.mjs`: add the tests listed below. Reuse `fixture`, `stackConfig`, `call`, `seed` and `shippedM1`.

## Tests

All tests go in `skills/sdlc/test/scripts.test.mjs`. The custom format is `feature/PROJ-1-{name}` and the config field is `branchFormat`.

- T-1 (R-056, R-078): "state-write creates the slice and milestone branches under a custom format". Stack-mode fixture with a remote, slice `S-001` in milestone `M-1`, `runBranch` set to a full name. Run `patch-slice`. Assert the local branches `feature/PROJ-1-S-001` and `feature/PROJ-1-M-1` exist, `sdlc/S-001` and `sdlc/M-1` do not, and the slice branch is cut from the milestone branch.
- T-2 (R-056, R-078): "state-write finds the dependency branch through the module under a custom format". Slice `S-002` depends on `S-001` with status `awaiting-merge` and the branch `feature/PROJ-1-S-001`. Assert `patch-slice` cuts `feature/PROJ-1-S-002` from it. Assert `base-branch` prints `feature/PROJ-1-S-001`. Assert a branch named `sdlc/S-001` is not used as the base.
- T-3 (R-056): "base-branch names the milestone branch through the format". Stack mode, slice in `M-1`. Assert the answer is `feature/PROJ-1-M-1`. Add a lowercase case with `feature/{name:lower}`: assert `feature/s-001` and `feature/m-1`.
- T-4 (R-096): "a milestone branch with a slice pull request open against it is kept under a custom format". Same setup as the existing open-pull-request prune test, with the custom format. Two shipped milestone branches exist: `feature/PROJ-1-M-1` and `feature/PROJ-1-M-2`. Slice `S-001` in `M-1` is `awaiting-merge`. No open slice belongs to `M-2`. Assert the prune deletes `feature/PROJ-1-M-2` and keeps `feature/PROJ-1-M-1`. The control branch `M-2` fails on the old code, because the old prune never lists `feature/` branches. The kept branch is safe only through the `name(fmt, "milestone", id=mid)` entry in `in_use`.
- T-4b (R-096): "milestone_branches_with_open_slice_pr returns the milestone branch name from the format". Load `state-write.py` and call `milestone_branches_with_open_slice_pr` directly with the format `feature/PROJ-1-{name}`. Assert the returned set is exactly `{"feature/PROJ-1-M-1"}`. This fails on the old code, which returns `sdlc/M-1`, and fails if the `sdlc/{mid}` literal stays.
- T-5 (R-057): "the prune deletes a shipped milestone branch recognized by kind, under a custom format". Shipped `feature/PROJ-1-M-1` is deleted. Assert that `feature/PROJ-1-M-1-e2e`, `feature/PROJ-1-S-001` and `feature/PROJ-1-run-1` stay. Repeat under the default format for `sdlc/M-1-e2e`.
- T-6 (R-057): "state-write.py holds no MILESTONE_BRANCH regex". Read the file and assert `MILESTONE_BRANCH` and the literal `sdlc/{` do not appear in it. This guards the structural acceptance only; the tests above guard the behavior.
- T-7 (R-058): "a run branch with a custom format is advanced and kept as a full name". `runBranch: "feature/PROJ-1-run-1"`. Cut a milestone branch after the default branch moved. Assert the run branch is advanced as in the existing tests, and `config.runBranch` is unchanged.
- T-8 (R-056, R-057, R-058): the existing default-format stack, prune, base-branch and dependency tests stay green with no edits. This shows the default format behaves as before.

## Steps

1. Write T-1 to T-7 and T-4b first. Run them. Confirm they fail on the old code.
2. Add `format_of`. Delete `MILESTONE_BRANCH`.
3. Change `awaiting_merge_base` and `slice_base` to take `fmt` and use `name(fmt, "slice", id=dep)` and `name(fmt, "milestone", id=mid)`.
4. Change `milestone_branches_with_open_slice_pr` to return `name(fmt, "milestone", id=mid)` for each pending slice.
5. Change `prune_stale_milestone_branches` to list `refs/heads/`, classify with `branches.parse`, and pass `fmt` down.
6. Change `ensure_milestone_branch` and `ensure_slice_branch` to build `want` with `name`.
7. Call `format_of` in `patch_slice` and the `base-branch` arm. Pass the result to each helper.
8. Update the docstrings. Run `npm test`. Run `python3 skills/sdlc/ste-check.py` on any prose file touched (none expected).

## Risks

- A caller of a changed helper misses the new `fmt` argument. Mitigation: `grep` each helper name after the edit, and run the full suite.
- `parse` classifies `M-1-e2e` as `e2e`, not `milestone`. This matches the old regex, which excluded it. T-5 pins it.
- `branches.name` raises `Fail` for a missing part. `branches.Fail` is a different class from the local `Fail`. A bad id could then escape the `except Fail` in `main()`. Mitigation: `format_of` and the callers convert `branches.Fail` into the local `Fail`.
- Listing all of `refs/heads/` instead of `refs/heads/sdlc` reads more refs. The cost is small.
- `branch_run` has no branch regex today. It only reads `config.json` from a given branch. ADR-20261010-034202-decision-judge-S-022-f0a0 leaves it unchanged.

## Critique responses

- ADR-20261010-034202-decision-judge-S-022-f0a0 (Option 1): the plan leaves `branch_run` unchanged. R-057 is met in the prune loop, which classifies with `branches.parse`. T-5 and T-6 check this.
- spec-fidelity critique on T-4: T-4 now holds a control. A second shipped milestone branch with no open slice must be deleted while the held branch stays. T-4b calls `milestone_branches_with_open_slice_pr` directly and asserts the returned set. Both fail on the old code.
- architecture critique: no change needed. The plan keeps `format_of`, two files and the default format. The extra cost of listing `refs/heads/` stays accepted.
