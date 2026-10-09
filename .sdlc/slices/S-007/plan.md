# S-007 plan: parse classifies a branch tail (revision 2)

## Approach
`branches.py` has `split`, `name` and `tail`, and a `parse` command that only echoes its arguments. This slice adds the Python function `parse(fmt, branch, ids=None)` and makes the `parse` command call it.
`parse` strips the literal prefix and suffix with `split`, then classifies the tail by the eight regexes of spec section 2, in table order. A new module constant holds the rows as ordered `(kind, regex, parts)` entries. The regexes compile with `re.IGNORECASE` when the format has `{name:lower}`, and with no other flag, as the spec says.
A branch that misses the prefix or suffix gives `None`. A tail that matches no row gives `None`. Each row holds the spec regex text as written, with its `^` and `$` anchors, and `re.search` applies it. The plan adds no stricter match than the spec gives.
The result holds `kind`, `tail`, `known` and the parts that apply. The numeric parts `n`, `round` and `part` are integers. With `ids`, `id` takes the ledger's spelling and `known` is true or false. Under `{name:lower}` the lookup ignores case. When two ledger ids differ only in case, the first one in `ids` order wins. Under any other format the lookup is an exact match. Without `ids`, or for a kind with no `id` (`run`, `state`), `known` is `None`.
The `parse` command prints `kind: null` for a foreign branch. Otherwise it prints the result keys flat. This slice also adds the parse assertion to the S-006 round-trip test and closes R-068 (ADR-20261009-164238).

## Files
- Modify `skills/sdlc/branches.py`: add the `PARSE_ROWS` table, the `parse` function and the new `cmd_parse` output. About 60 lines.
- Modify `skills/sdlc/test/branches.test.mjs`: add the parse tests below, add `parse: callable` to the exports test, and add the parse assertion to T-R-068a. About 150 lines.
- No other file changes. Rows 1 to 8 are all in this slice because a partial table cannot give R-021 and R-023. S-008 and S-009 add the precedence tests for the rows.

## Tests
All tests are in `skills/sdlc/test/branches.test.mjs`. Run them with `node --test skills/sdlc/test/branches.test.mjs`.
- T-R-021a (R-021) "parse returns null for a foreign branch": `main` under the default, `feature/PROJ-1-foo` under `feature/PROJ-1-{name}`, and `sdlc/feature-x` under the default all give `None`. The CLI prints `kind: null` for each.
- T-R-021b (R-021) "a branch that passes the prefix and suffix test but matches no row gives null": `sdlc/feature-x` passes both tests. Also check `sdlc/` (empty tail), `sdlc/run-`, `sdlc/run-x` and a suffix format `{name}-wip` with `S-001` (no suffix) and `S-001-wip` (a slice).
- T-R-022a (R-022) "classification follows rows 1 to 8": one branch per row gives its kind. `S-fix-M-1-2` is a slice. `M-1-e2e-api` is an e2e-area. `S-001-v0-http-api-0` is a verify branch with profile `http-api`, round 0, part 0. `M-1-e2e-a-b` gives area `a-b`.
- T-R-022b (R-022) "under {name:lower} the regexes ignore case": `feature/PROJ-1-s-001`, `feature/PROJ-1-m-1-e2e-api`, `feature/PROJ-1-run-2` classify. Under `feature/PROJ-1-{name}` the same lowercase tails give `None`.
- T-R-023a (R-023) "the result holds the parts that apply": `sdlc/run-2` gives kind `run` and `n: 2`. `sdlc/state-20261008101500` gives `ts`. `sdlc/S-001-v0-http-api-0` gives `id`, `round`, `profile`, `part`. `sdlc/M-1-e2e-api` gives `id` and `area`. `sdlc/S-001-attempt-3` gives `id` and `n: 3`. Each result also holds `tail`. No key outside the table appears.
- T-R-023b (R-023) "the CLI prints the same result": `branches.py parse` for the five branches above prints the same kind and parts as the Python call, with integer `n`, `round` and `part`.
- T-R-024a (R-024) "ids resolve the ledger spelling": `parse("feature/PROJ-1-{name:lower}", "feature/proj-1-s-001", ids=["S-001"])` gives `id: "S-001"` and `known: true`. An id absent from the list gives `known: false` and keeps the parsed id. Without `ids`, `known` is `None`. An iterator and a tuple work as `ids`. With `ids=["S-001","s-001"]` under lower, `id` is `S-001`. With `ids=["s-001","S-001"]`, `id` is `s-001`.
- T-R-024b (R-024) "case-insensitive matching only under lower": under `sdlc/{name}`, `ids=["s-001"]` and branch `sdlc/S-001` give `known: false`. Under the lower format they give `known: true`.
- T-R-069a (R-069) "parse returns null for a foreign branch and resolves ids against the ledger": the four results of the R-069 quote. `main` under the default (prefix miss), `feature/PROJ-1-foo` under `feature/PROJ-1-{name}` (prefix hit, tail matches no row) and `sdlc/feature-x` under the default (tail matches no row) give null; `feature/proj-1-s-001` with ids `['S-001']` gives `S-001` and `known: true`.
- T-R-068c (R-068) "parse closes the round trip": inside T-R-068a, parse each of the 24 built branches. Assert the kind equals the built kind and each input part equals the parsed part. Under the lower format, pass `ids` for the id kinds and assert the ledger spelling returns.

## Steps
1. Test-writer: write the tests above. Run them. They fail because `parse` is missing.
2. Add `PARSE_ROWS` and `parse` to `branches.py`. Use `split` for the prefix and suffix. Check `len(branch) >= len(prefix) + len(suffix)` before slicing.
3. Replace the echo in `cmd_parse` with the call to `parse`. Print `ok`, `command`, `format`, `branch` and `kind`, then the parts when `kind` is not null.
4. Update the exports test and T-R-068a.
5. Run `node --test skills/sdlc/test/branches.test.mjs`, then `npm test`.

## Risks
- A wrong null hides an active slice from the loop (risk medium). Tests cover every row and every foreign case in the spec.
- Unicode digits: `\d` with no `re.ASCII` flag also matches non-ASCII digits, and `int()` accepts them. The spec names no such flag, so the plan adds none. No test pins this case.
- Row 6 uses a lazy profile group. T-R-022a pins `http-api` and `a-b` so a greedy change shows up.
- The flat CLI output changes the `parse` command output. Existing tests read only `ok`, `command` and `format`. Later slices (S-018, S-021 to S-024) read `kind` and the parts.
- Milestone and slice ids come from the ledger. Under `lower`, a milestone id also resolves through `ids`. No spec text forbids it.

## Critique responses
- spec-fidelity (rev 2, trailing newline): option (a). The plan drops `fullmatch`. Each row uses the spec regex text with `re.search`, so the behavior is the spec behavior. No new test is needed.
- spec-fidelity (rev 2, ambiguous ledger): the first spelling in `ids` order wins. T-R-024a pins both orders.
- architecture (rev 2): no change needed.
Revision 0 followed these ADRs. Revision 1 added the last two responses. Revision 2 adds the first two.
- ADR-20261009-170811-decision-judge-S-007-275e: `known` is `None` for `run` and `state`, even when `ids` is given. `known` is true or false only for kinds with an id part.
- ADR-20261009-170812-decision-judge-S-007-35cd: under `{name:lower}`, `parse` resolves every parsed id through `ids`, milestone kinds included. T-R-024a and T-R-068c cover the lookup.
- ADR-20261009-170814-decision-judge-S-007-5aab: the `parse` command prints one flat JSON object. A foreign branch prints `kind: null` with no part keys, and exits 0. T-R-021a and T-R-023b assert this.
- ADR-20261009-164238-decision-judge-S-006-a3a8: this plan adds the parse assertion (T-R-068c) and closes R-068. The state-writer adds R-068 to this slice's requirements.
- spec-fidelity: Option (a). The plan drops `re.ASCII`. The flags now match spec section 2 exactly: `re.IGNORECASE` under `{name:lower}` and no other flag. No test or ADR for `re.ASCII` is needed. The T-R-069a text now names the format for each null branch.
- architecture: The plan now states that `ids` matching is exact when the format is not lower. T-R-024b pins it.
