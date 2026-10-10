# Plan: S-fix-M-1-1 (revision 2)

## Approach
Make two small edits in `skills/sdlc/branches.py`, and add tests. First, `parse` refuses any tail that holds a non-ASCII character. After it cuts the tail from the branch, it returns `None` when `middle.isascii()` is false. This check runs in both lower and non-lower mode and runs before any row matches. So no capture group (id, area, profile, round) can hold a look-alike such as U+212A, U+017F or a Unicode digit. The `(.+)` captures of the verify, attempt and e2e-area rows are covered, because the whole tail is ASCII. Second, `parse` lowers the head, foot, prefix, suffix and `ids` candidates with one helper `_ascii_lower` that changes only `A-Z`. So `str.lower()` cannot turn U+212A into `k` in the head, foot or ledger id. Third, `name` checks its own output: it calls `parse` on the branch it built, and raises `Fail` unless the kind equals the requested kind and every given part equals the parsed part. Integer parts compare by value. String parts compare in ASCII lowercase under `{name:lower}`. `name` keeps `.lower()` for the tail; a non-ASCII id then fails the round trip. This refuses `--id S-001-attempt-2`, `--id S-001-v0-cli-0` and every non-ASCII id. The CLI already maps `Fail` to exit 2 with `ok: false`. No signature, flag or state format changes. This plan does not use `re.ASCII`: the ASCII tail check makes it redundant (ADR-20261010-144335-decision-judge-S-fix-M-1-1-9b5c allows it and does not require it).

## Files
- Modify `skills/sdlc/branches.py`: add `_ascii_lower`; add the `isascii` check in `parse`; use `_ascii_lower` in `parse` for head, foot, prefix, suffix and `ids`; add the round-trip check at the end of `name`.
- Modify `skills/sdlc/test/branches.test.mjs`: add the tests below. Create no `e2e/` file (ADR-20261010-143858-decision-judge-S-fix-M-1-1-b796).
- No change to `next-action.py` or `janitor.py`: both call `parse`.

## Tests
All tests go in `skills/sdlc/test/branches.test.mjs`, in the style of the existing `CALL` probes. Put SC-M-1-076 or SC-M-1-080 in each title.
- T-R-019-roundtrip (R-019, SC-M-1-076): `name("sdlc/{name}", "slice", id="S-001-attempt-2")` and `id="S-001-v0-cli-0"` raise `Fail`. The CLI call `name --kind slice --id S-001-attempt-2` exits 2 with `ok: false`; same for `--id S-001-v0-cli-0`.
- T-R-019-valid (R-019): `name(..., "slice", id="S-001")` is `sdlc/S-001`. `S-fix-M-1-2` names and parses back as a slice. `attempt` (id, n=2), `verify` (all parts), `e2e-area` and `state` still round-trip.
- T-R-019-unicode-name (R-019): `name` raises `Fail` for `id="S-00K"` (U+212A) and for an id holding `é`, under `{name}` and `{name:lower}`.
- T-R-019-int-value (R-019): `name(..., "run", n="02")` succeeds and parses back to `n == 2` (ADR ea04).
- T-R-019-lower (R-019): `name("Feat/PROJ-{name:lower}-X", "slice", id="S-001")` is `Feat/PROJ-s-001-X`.
- T-R-022-ascii (R-022, SC-M-1-080): for each format `feature/p-1-{name}` and `feature/p-1-{name:lower}`, `parse` returns `None` for these tails (U+212A is K sign, U+017F is long s):
  - slice look-alikes: `S-00K`, `s-001` plus U+017F;
  - verify look-alike: `s-00K-v0-cli-0`;
  - attempt look-alike: `s-00K-attempt-1`;
  - e2e-area look-alike: `M-1-e2e-` plus `é`;
  - verify with a Unicode digit round: `S-001-v` plus Arabic-Indic digit `٣` plus `-cli-0`.
  The ASCII cases (`S-fix-M-1-2`, `M-1-e2e-api`, `M-1-e2e-a-b`, `S-001-v0-http-api-0`) give the same results as before.
- T-R-024-ids-ascii (R-024): `parse("feature/PROJ-1-{name:lower}", "feature/proj-1-s-001", ids=["S-001"])` still gives `id: "S-001"` and `known: true`. With `ids=["S-00K"]` (U+212A) the id is not matched: `known: false`. With format `work/{name:lower}`, `parse` of `wor` plus U+212A plus `/s-001` is `None`. With format `{name:lower}-wk`, `parse` of `s-001-w` plus U+212A is `None`. These cases fail if head, foot or ids use `.lower()`.
- T-R-053-list (R-053, SC-M-1-080): in a scratch git repo, `list_kind` for `slice` and for `verify` under `feature/p-1-{name:lower}` lists the ASCII branches and omits the look-alike branches `feature/p-1-s-00K`, `feature/p-1-s-001`+U+017F and `feature/p-1-s-00K-v0-cli-0`. `next-action.py` and `janitor.py` use the same `parse`, so they inherit this.
- Existing tests: run `npm test`. A test never loses an assertion.

## Steps
1. Write the failing tests above. Run them. Confirm they fail for the stated reason.
2. Add `_ascii_lower` (a `str.translate` table for `A-Z`) above `parse`.
3. In `parse`: after the length check, build `head` and `foot`; with `lower`, apply `_ascii_lower` to head, foot, prefix and suffix. After cutting `middle`, return `None` if `not middle.isascii()`. In the `ids` compare, use `_ascii_lower` on both sides.
4. In `name`: keep `.lower()` for the tail. Build the branch. Call `parse(fmt, branch)`. Raise `Fail` naming the kind and the branch when the kind or any given part differs.
5. Run `npm test`. Run the two CLI reproductions from the milestone report.

## Risks
- Non-ASCII literal text in the format prefix or suffix is untouched in non-lower mode. In lower mode it compares by ASCII lowering only, so case-insensitive matching of non-ASCII literals is lost. The spec does not require it.
- A format whose suffix could join the tail into another kind makes `name` raise `Fail` for some ids. This is the required outcome.
- The CLI passes int parts as ints. The check compares by `int` for `INTEGER_PARTS`.
- `state` without `ts` has no given `ts`, so the check skips `ts`.
- A caller that passes a non-ASCII id to `name` now gets `Fail`. `npm test` shows any such caller.

## Critique responses
- Critique spec-fidelity item 1 (the `(.+)` capture still matches `s-00K-v0-cli-0`): `parse` now returns `None` for any tail that is not ASCII, before the rows run. This covers the verify, attempt and e2e-area captures in both modes. The earlier idea (`re.ASCII` only) is dropped.
- Critique spec-fidelity item 2 (reject non-ASCII captures in both modes; add tests): T-R-022-ascii covers the verify, attempt and e2e-area look-alikes under `{name}` and `{name:lower}`. T-R-053-list covers `list_kind` for the verify look-alike.
- Critique spec-fidelity item 3 and the architecture critique: no change needed. The round-trip check, `n=02` by value, tests in `skills/sdlc/test`, and the head/foot cases stay. The non-lower `\d` note is now closed too, because the ASCII tail check rejects Unicode digits.
