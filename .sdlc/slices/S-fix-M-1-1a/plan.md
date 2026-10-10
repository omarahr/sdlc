# Plan: S-fix-M-1-1a (revision 1)

## Approach
Change only `parse` in `skills/sdlc/branches.py`. Add one helper, `_ascii_lower`, that lowers only the letters `A-Z`. In lower mode, `parse` uses it for the head, the foot, the prefix, the suffix and the ledger ids. So U+212A (K sign) and U+017F (long s) never turn into `k` or `s`. `parse` compiles every row with `re.ASCII`, and in lower mode also with `re.IGNORECASE`. So the case-insensitive match covers only ASCII letters, and `\d` matches only `0-9`. After a row matches, `parse` requires the captured `id` part to be ASCII. It returns `None` when the `id` is not ASCII. The `area`, `profile` and the rest of the tail keep the spec behavior of `.+` and `[a-z0-9-]+?`. A tail such as `M-1-e2e-é` stays an e2e-area. The ADR-20261010-144335-decision-judge-S-fix-M-1-1-9b5c covers lower mode. The `re.ASCII` flag in non-lower mode is a new choice, recorded in a new ADR. The slice does not touch `name` or `active_branch`. Slice S-fix-M-1-1b owns them. The test phase removes `SC-M-1-080` from `e2e/pending.json`, so the e2e test then fails before the fix.

## Files
- Modify `skills/sdlc/branches.py`: add `_ascii_lower`; add `re.ASCII` to the flags in `parse`; add the `id.isascii()` check after a row matches; use `_ascii_lower` in `parse` for head, foot, prefix, suffix and `ids`.
- Modify `skills/sdlc/test/branches.test.mjs`: add the tests below.
- Modify `e2e/pending.json`: delete the `SC-M-1-080` entry (test phase).
- No change to `next-action.py` or `janitor.py`: both call `parse`.

## Tests
- T-R-022-ascii (R-022, SC-M-1-080): for the formats `feature/p-1-{name}` and `feature/p-1-{name:lower}`, `parse` returns `None` for these tails:
  - `S-00` plus U+212A;
  - `s-001` plus U+017F (lower mode; in the other mode the tail is no slice either);
  - `s-00` plus U+212A plus `-v0-cli-0`;
  - `s-00` plus U+212A plus `-attempt-1`;
  - `S-001-v` plus Arabic-Indic digit U+0663 plus `-cli-0`;
  - `run-` plus U+0663.
- T-R-022-area (R-022): `M-1-e2e-é` gives kind `e2e-area` with area `é`, in both modes. This shows the area part keeps the `.+` behavior.
- T-R-022-order (R-022): `S-fix-M-1-2` is a slice. `M-1-e2e-api` is an e2e-area. `M-1-e2e-a-b` gives area `a-b`. `S-001-v0-http-api-0` is verify with profile `http-api`. All results equal the results before the change, in both modes.
- T-R-024-ids (R-024): `parse("feature/PROJ-1-{name:lower}", "feature/proj-1-s-001", ids=["S-001"])` gives `id: "S-001"` and `known: true`. An id absent from the list gives `known: false`. Without `ids`, `known` is `null`. With `ids=["S-00"+U+212A]`, the branch `feature/proj-1-s-00k` gives `known: false`.
- T-R-024-affix (R-024): under `work/{name:lower}`, `parse` of `wor` plus U+212A plus `/s-001` is `None`. Under `{name:lower}-wk`, `parse` of `s-001-w` plus U+212A is `None`.
- SC-M-1-080 e2e test (R-024): the test in `e2e/tests/parse-list.test.mjs` passes after the fix. It fails before the fix, once the pending entry is gone.
- Existing tests: run `npm test`. No test loses an assertion.

## Steps
1. Delete the `SC-M-1-080` entry from `e2e/pending.json`. Write the new unit tests. Run them and `node e2e/run.mjs`. Confirm they fail for the stated reason.
2. Add `_ascii_lower` above `parse`. Use a `str.translate` table for `A-Z`.
3. In `parse`, apply `_ascii_lower` in the lower-mode head, foot, prefix and suffix line.
4. In `parse`, set the flags to `re.ASCII`, plus `re.IGNORECASE` in lower mode.
5. In `parse`, after a row matches, return `None` when a captured `id` is not ASCII.
6. In the `ids` compare, apply `_ascii_lower` on both sides in lower mode.
7. Run `npm test` and `node e2e/run.mjs`.

## Risks
- In lower mode, non-ASCII literal text in the prefix or suffix compares by ASCII lowering only. The spec does not require case-insensitive matching of non-ASCII literals.
- The `re.ASCII` flag changes `\d` in non-lower mode. Valid branches hold only `0-9`, so only look-alikes change.
- A tail with a non-ASCII `id` is no longer a loop branch. Valid ids are pure ASCII.
- `name` can still print a name that `parse` reads as another kind (SC-M-1-076). Slice S-fix-M-1-1b fixes that.

## Critique responses
- spec-fidelity: the plan drops the whole-tail `isascii()` check and the `None` result for `M-1-e2e-é`. It checks only the captured `id` after a row matches. It adds T-R-022-area, which shows that `M-1-e2e-é` gives e2e-area with area `é`. It uses `re.ASCII` for `\d` and records that choice in a new ADR.
- architecture: no change needed. The scope stays in `parse` plus one helper. The tail check of the first revision is now the `id` check plus `re.ASCII`, and the file size stays small.
