# Plan: S-fix-M-1-1b (revision 1)

## Approach
Make `name` in `skills/sdlc/branches.py` check its own output. After `name` builds the branch, it calls `parse` with the same format. It raises `Fail` unless `parse` returns the requested kind and every given part. Integer parts compare by value, so `n="02"` still works. With `{name:lower}`, string parts compare in ASCII lowercase. `name` also lowers the tail with `_ascii_lower`, the helper that slice S-fix-M-1-1a added, in place of `str.lower()`. So `name` and `parse` use one lowering rule. `parse` already refuses non-ASCII ids, so a non-ASCII id now fails the round trip. This refuses `--id S-001-attempt-2` and `--id S-001-v0-cli-0`, which `parse` reads as kinds attempt and verify. The CLI maps `Fail` to exit 2 with `ok: false`, so `cmd_name` needs no change. In `next-action.py`, `active_branch` compares ids with `str.lower()`. It changes to `_ascii_lower`, so the id match follows the same rule. No signature, flag or state format changes. This slice only adds an `_ascii_lower` call and a check. It does not touch `parse`.

## Files
- Modify `skills/sdlc/branches.py`: `name` lowers the tail with `_ascii_lower` and runs the round-trip check. `_ascii_lower` is defined after `name` at module level; `name` calls it at run time, so the order is safe.
- Modify `skills/sdlc/next-action.py`: `active_branch` compares ids with `branches._ascii_lower`.
- Modify `skills/sdlc/test/branches.test.mjs`: add the unit tests below.
- Modify `skills/sdlc/test/next-action.test.mjs`: add the `active_branch` test below.
- Modify `e2e/pending.json`: remove the `SC-M-1-076` entry in the test phase. The test already exists in `e2e/tests/names.test.mjs`. Create no new e2e file.

## Tests
- T-R-019-roundtrip (R-019, SC-M-1-076), `branches.test.mjs`: `name("sdlc/{name}", "slice", id="S-001-attempt-2")` and `id="S-001-v0-cli-0"` raise `Fail`. The CLI call `name --kind slice --id S-001-attempt-2` exits 2 with `ok: false`. Same for `--id S-001-v0-cli-0`.
- T-R-019-valid (R-019), `branches.test.mjs`: `name("sdlc/{name}", "slice", id="S-001")` is `sdlc/S-001`. `S-fix-M-1-2` names and parses back as a slice. `run`, `milestone`, `e2e`, `e2e-area`, `state`, `verify` and `attempt` with valid parts still return the same names as before and parse back to the same parts.
- T-R-019-nonascii (R-019), `branches.test.mjs`: `name` raises `Fail` for `id="S-00K"` (U+212A) and for an id with `é`, under `{name}` and `{name:lower}`.
- T-R-019-int-value (R-019), `branches.test.mjs`: `name(..., "run", n="02")` succeeds and parses back to `n == 2`.
- T-R-019-lower (R-019), `branches.test.mjs`: `name("Feat/PROJ-{name:lower}-X", "slice", id="S-001")` is `Feat/PROJ-s-001-X`. `name` lowers only the tail.
- T-R-019-lower-nonascii-area (R-019), `branches.test.mjs`: `name("Feat/PROJ-{name:lower}-X", "e2e-area", id="M-1", area="É")` succeeds and parses back to area `É`. The e2e-area pattern `(.+)` accepts a non-ASCII part, so this is the one input that tells `_ascii_lower` from `str.lower()`. Without Step 2, `str.lower()` gives `é`, the round-trip compares `É` with `é` under ASCII lowering, and `name` raises a false `Fail`. Confirm this test fails before Step 2.
- T-R-019-e2e-id (R-019, SC-M-1-076), `branches.test.mjs`: `name(..., "slice", id="S-001-e2e")` parses back as a slice with that id, so it succeeds. This keeps the e2e scenario's third call valid.
- T-R-053-active (R-053), `next-action.test.mjs`: in a scratch repo with format `feature/p-1-{name:lower}`, a local branch whose slices.json marks `S-001` in progress is the active branch. A look-alike branch `feature/p-1-s-00K` (U+212A) is not active. A slice id with U+212A in slices.json does not match the ASCII branch id.
- SC-M-1-076 (`e2e/tests/names.test.mjs`): after the test phase removes it from `e2e/pending.json`, it fails first and passes after the fix.
- Existing tests: run `npm test`. No test loses an assertion.

## Steps
1. Remove `SC-M-1-076` from `e2e/pending.json`. Write the tests above. Run them and confirm they fail for the stated reason.
2. In `name`: replace `middle.lower()` with `_ascii_lower(middle)`.
3. In `name`: build the branch. Call `parse(fmt, branch)`. Raise `Fail` that names the kind and the branch when the parsed kind differs or a given part differs. Skip `ts` for `state` when the caller gave none.
4. In `next-action.py`: use `branches._ascii_lower` on both sides of the id compare in `active_branch`.
5. Run `npm test` and `node e2e/run.mjs`. Run the two CLI reproductions from the milestone report.

## Risks
- A format whose suffix joins the tail into another kind makes `name` raise `Fail` for some ids. This is the required outcome.
- The CLI passes integer parts as ints, and the check compares them by value. A part type mismatch would give a false `Fail`. T-R-019-valid covers every kind.
- `state` with no `ts` builds its own timestamp. The check skips `ts` in that case.
- A caller that passes a non-ASCII id to `name` now gets `Fail`. `npm test` shows any such caller.
- Other callers of `name` in the repo (e2e tests, SKILL.md steps) run unchanged for valid ids.

## Critique responses
- spec-fidelity 1 (Step 2 untested): added T-R-019-lower-nonascii-area. It fails before Step 2 and passes after it.
- spec-fidelity 2 (ADR premise): ADR-20261010-143858-decision-judge-S-fix-M-1-1-b796 and ADR-20261010-144331-decision-judge-S-fix-M-1-1-a2e0 say to treat the e2e files as absent. That premise no longer holds: `e2e/pending.json`, `e2e/tests/names.test.mjs` and `e2e/run.mjs` exist, and `SC-M-1-076` is in `pending.json`. The slice notes require the `pending.json` edit, so the slice notes win. This plan edits `pending.json` and keeps the unit tests in `skills/sdlc/test`.
- architecture note 1 (private name): `next-action.py` already imports `branches` and calls `branches._ascii_lower`. Both files live in the same skill directory. Keep the call and do not rename the helper, to keep this slice small.
- architecture note 2 (uppercase verify profile): the `npm test` step in Step 5 covers it. A caller that passes an uppercase profile under a `{name:lower}` format now gets `Fail`. This is the required outcome.
- Earlier refutations (S-fix-M-1-1 plans): the earlier plans mixed `name` and `parse` changes in one slice. This plan only changes `name` and `active_branch`, and relies on `parse` from S-fix-M-1-1a.
