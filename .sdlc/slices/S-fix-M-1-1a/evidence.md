# Evidence: S-fix-M-1-1a, parse is ASCII only

## R-022
Parse compiles every row with re.ASCII. Look-alike characters no longer match as loop branches.
- T-R-022-ascii: K sign, long s and Arabic-Indic digit tails do not parse as loop branches.
- T-R-022-area: a non-ASCII area stays an e2e-area.
- T-R-022-order: row order holds for valid ASCII tails in both modes.
- SC-M-1-080 (e2e/tests/parse-list.test.mjs): look-alike branches are not loop branches. The entry left e2e/pending.json.

## R-024
Lowering uses an ASCII-only helper. A look-alike id no longer reports known true.
- T-R-024-ids: the K sign does not lower to k.
- T-R-024-affix: a look-alike prefix or suffix does not match.

## Verification
The cli and contract profiles passed 13 cases in round 0. The gate receipt is valid for commit 343b145.

## Files
- skills/sdlc/branches.py
- skills/sdlc/test/branches.test.mjs
- e2e/pending.json
