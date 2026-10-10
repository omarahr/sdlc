# Plan S-023: state-write.py threads the format through its remaining paths

## Approach
S-022 added `format_of(repo, config)` and calls it in two places: `patch_slice` and the `base-branch` arm of `main()`. This slice moves that derivation into `main()`, so `fmt` is derived once from the config read there, with `load_format` as the fallback that `format_of` already holds. `main()` passes `fmt` to `patch_slice` as a parameter. `patch_slice` stops calling `format_of`. The `ship-prune` and `collect-verification` commands do not exist in `state-write.py` (the loop-economy spec has not landed in code). So R-083 gets a parse-based matcher now: `slice_side_branches(repo, fmt, slice_id)` lists the local `verify` and `attempt` branches of one slice through `branches.parse` with `ids=[slice_id]`, so `branches.py` alone owns the casing rule. The future commands must call this helper and hold no local regex. A test shows a verify tail and an attempt tail match under a custom format and that a foreign branch and another slice's branch do not.

## Files
- Modify `skills/sdlc/state-write.py`:
  - `main()` reads `config.json` once for `patch-slice` and `base-branch`, calls `require_known_mode`, calls `format_of` once, and passes `fmt` down.
  - `patch_slice(repo, slice_id, patch, fmt)` requires `fmt`. It holds no second derivation path. The only caller is `main()`. `patch_slice` still reads `config.json` for its other fields, so the config is read twice for `patch-slice`; the plan accepts this.
  - New `slice_side_branches(repo, fmt, slice_id)`: lists local branches, calls `branches.parse(fmt, branch, ids=[slice_id])`, and keeps entries of kind `verify` or `attempt` with `known` true. It holds no regex and no id comparison. It returns sorted branch names.
- Modify `skills/sdlc/test/scripts.test.mjs`: the tests below.

## Tests
- R-059-a, `scripts.test.mjs`, `main derives the format once and patch-slice uses it`: a Python probe loads `state-write.py` with `importlib`, replaces `format_of` with a counter, and runs `main()` for `patch-slice` and for `base-branch` under a custom format in config. It asserts one call per run and that the branch carries the custom prefix.
- R-059-b, `scripts.test.mjs`, `patch_slice takes fmt as an argument`: a probe calls `patch_slice(repo, id, patch, fmt)` with a format that differs from config. It asserts the branch follows the argument. This shows that `patch_slice` does not derive it again.
- R-059-c, `scripts.test.mjs`, `a config without branchFormat falls back to load_format`: with no `branchFormat` in config and a custom format absent, `patch-slice` names `sdlc/S-001`. Existing default-format tests keep passing.
- R-083-a, `scripts.test.mjs`, `slice_side_branches matches verify and attempt tails under a custom format`: format `feature/PROJ-1-{name}`; local branches `feature/PROJ-1-S-001-v0-http-api-0`, `feature/PROJ-1-S-001-attempt-2`, `feature/PROJ-1-S-002-attempt-1`, `feature/PROJ-1-S-001` and `sdlc/S-001-v0-http-api-0`. For S-001 it returns exactly the first two.
- R-083-c, `scripts.test.mjs`, `slice_side_branches matches under a lowercase format`: format `feature/{name:lower}`; branches `feature/s-001-attempt-2`, `feature/s-001-v0-http-api-0`, `feature/s-002-attempt-1` and `feature/s-001`. For S-001 it returns exactly the first two.
- R-083-b, `scripts.test.mjs`, `state-write.py holds no local regex for verify or attempt names`: the source text has no `-attempt-` or `-v\d` pattern literal.

## Steps
1. Write the tests first. Run them to see them fail.
2. Add `slice_side_branches` using `branches.parse` with `ids=[slice_id]`; list branches with `git for-each-ref`, as `list_kind` does; convert `branches.Fail` to `Fail`.
3. Change `patch_slice` to take a required `fmt`.
4. Change `main()`: read the config once for `patch-slice` and `base-branch`, derive `fmt` once, pass it on.
5. Run `npm test`. Fix failures without weakening a test.

## Risks
- Loop-economy commands may land later with their own matching. The helper and the source test give that slice one place to call.
- A caller that imports `patch_slice` with three arguments breaks. The search shows `main()` as the only caller. Step 3 re-checks this with `grep`.
- `main()` reads config before `patch_slice` does. A missing config file must give the same error as today.

## Critique responses
- ADR-20261010-043504-decision-judge-S-023-770f (Option 1): the plan builds no `ship-prune` or `collect-verification` command. It adds only `slice_side_branches(repo, fmt, slice_id)` on `branches.list_kind` for the verify and attempt kinds. Tests R-083-a and R-083-b cover it under a custom format. R-083-b keeps the source test that bans local `-attempt-` and `-v` patterns.
- Critique 1 and 2 (spec-fidelity, architecture; lowercase format): the helper calls `branches.parse` with `ids=[slice_id]` and keeps `known` entries. Test R-083-c covers `feature/{name:lower}`.
- Architecture minor, `fmt=None` fallback: `fmt` is now required, so `main()` holds the only derivation.
- Architecture minor, double config read: the Files section states it and accepts it.
