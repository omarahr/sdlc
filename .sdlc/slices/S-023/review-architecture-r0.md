# Review S-023, lens architecture, round 0

No blocking finding.

- Non-blocking: `slice_side_branches` has no caller. It follows the accepted ADR, and the source test guards the future commands. Keep it.
- Non-blocking: `slice_side_branches` repeats the `for-each-ref` loop of `branches.list_kind`. Add an `ids` parameter to `list_kind` in a later slice, so one loop remains.
- Non-blocking: `main()` reads `config.json` and `patch_slice` reads it again. The plan accepts this. Pass `config` to `patch_slice` in a later slice.
- Non-blocking: the `-v\d` source test is a text match and can fail on unrelated text. It is acceptable now.
