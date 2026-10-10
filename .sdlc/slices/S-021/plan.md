# Plan S-021: next-action.py recognizes branches through parse

## Approach
`next-action.py` already imports `branches`. Read the format once in `decide` as `config.get("branchFormat") or "sdlc/{name}"`, and pass it to each helper. Call `branches.parse` or `branches.name` instead of each literal `sdlc/` match. `active_branch` lists all local branches. It keeps the branches that parse to `slice`. It takes the slice id from the parsed `id`. For a lowercased format, it matches the ledger id of that branch without case. Pull request heads are filtered by kind: `state`, `e2e` (never `e2e-area`), `slice` (with `ids=by_id`) and `milestone`. `merged_heads` is looked up with `branches.name(fmt, "slice", id=...)`. Comments that name `sdlc/` branches stay accurate or move to kind names. The default format keeps every existing test green.

## Files
- Modify `skills/sdlc/next-action.py`. `active_branch(repo, current, fmt)` takes the format. The state, e2e, slice, merged and milestone checks use `parse` and `name`. `decide` reads `fmt` once.
- Modify `skills/sdlc/test/next-action.test.mjs`: add the custom-format tests.

## Tests
- T1 (R-053): `active slice branch is found by parse under a custom format`, in `next-action.test.mjs`. Format `feature/PROJ-1-{name}`. A branch `feature/PROJ-1-S-1` with an in-progress slice gives `checkout` equal to that branch. A foreign branch `feature/PROJ-1-sdlc-foo` and an `sdlc/S-1` branch never read as active.
- T2 (R-054): `state, e2e, slice and milestone heads are recognized under a custom format`. State PR head `feature/PROJ-1-state-20261010000000` is ready and gives a merge. An `e2e-area` head is ignored. A slice head resolves to the ledger id. A stack milestone head `feature/PROJ-1-M-2` gives `wait`. A foreign head `feature/PROJ-1-sdlc-foo` is ignored.
- T3 (R-054): `a lowercased head resolves to the ledger id`. Format `feature/PROJ-1-{name:lower}`. Head `feature/proj-1-s-1` marks `S-1` awaiting-merge. A merged head `feature/proj-1-s-1` gives `retryMerge` through `name(fmt, "slice", id="S-1")`.
- T4 (R-055): `a missing or empty branchFormat falls back to sdlc/{name}`. An empty string and an absent key both recognize `sdlc/S-1`.
- T5 (R-076): the single test named in the spec, `the active slice branch, slice PR heads, the state PR, the e2e PR and the stack milestone hold are recognized under a custom format`. It covers T1 and T2 assertions in one fixture and asserts the foreign head is ignored.
- T6 (R-077): the full suite (`npm test`) passes with no `branchFormat` set. The existing next-action tests are the proof.

## Steps
1. Write the tests T1 to T5. Run them and confirm they fail.
2. Add `fmt = config.get("branchFormat") or branches.DEFAULT_FORMAT` in `decide`, after the config read.
3. Rewrite `active_branch` with `for-each-ref refs/heads/`, `branches.parse`, and the slice-kind filter.
4. Rewrite `state_prs`, `e2e_prs` and the milestone hold with `parse` kind checks. Drop the `-e2e` suffix special case, because `e2e` and `milestone` are separate kinds.
5. Rewrite the slice map with `parse(fmt, head, ids=by_id)` and use the returned `id`.
6. Rewrite the `merged_heads` lookup with `branches.name`.
7. Update the comments that quote `sdlc/` heads. Run `npm test`.

## Risks
- `parse` of a milestone head needs the `M-` anchor. A stack head such as `sdlc/M-1-e2e` parses to `e2e`. The hold skips it by kind.
- A lowercased format needs ledger ids. `active_branch` runs before the ledger loads. It reads the `slices.json` of each branch and matches without case.
- Performance: `for-each-ref refs/heads/` lists more branches than before. Each non-slice branch is skipped before any `git show`.
- A foreign branch that parses as a slice (for example `feature/PROJ-1-S-002`) with no matching in-progress slice stays inactive.

## Critique responses
- No critiques in this revision.
