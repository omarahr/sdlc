# Judge SC-M-1-080, voter 1

Verdict: NOT REFUTED. This is a product bug.

- The spec (branch-format-design, section 2 row 8) limits the slice tail to `[A-Za-z0-9-]`.
- I ran `branches.parse` on four look-alike branches. Each gave a non-null result.
- U+212A in `S-00K` gave kind `slice`. U+017F in `s-001ſ` and `ſ-001` gave kind `slice`.
- `s-00K-v0-cli-0` (U+212A) gave kind `verify`.
- Cause: `re.IGNORECASE` on a str pattern lets `[A-Za-z]` match U+017F and U+212A (`branches.py` line 339).
- Fix: use `re.ASCII` together with `re.IGNORECASE`.
