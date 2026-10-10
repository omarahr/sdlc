Verdict: HELD

Checked in a detached worktree of sdlc/S-fix-M-1-1a at commit 798e216d764794a5514dd6fb296522e92a575f25.

## Requirement checks
| Requirement | Spec says | Checked how | Tests | Result |
|---|---|---|---|---|
| R-022 | "otherwise the tail between them is classified by the first regex that matches, in this order, compiled with `re.IGNORECASE` when `lower` is set" | Read the diff. Ran parse on 17 valid and look-alike tails in both modes. Row order and kinds are unchanged. The non-ASCII area stays e2e-area. | skills/sdlc/test/branches.test.mjs:2923, :2940, :2952 | holds |
| R-024 | "`id` is replaced by the ledger's spelling that matches it, case-insensitively under `lower`, and `known` says whether one matched; without `ids`, `known` is `None`" | Ran parse with ids, with an absent id, without ids, and with look-alike affixes. Results match the acceptance text. | skills/sdlc/test/branches.test.mjs:2923, :2963, :2978; e2e/tests/parse-list.test.mjs:333 (SC-M-1-080) | holds |

Commands run: `node --test skills/sdlc/test/branches.test.mjs` (203 pass, 0 fail). `node --test e2e/tests/parse-list.test.mjs` (12 pass, 1 skipped, 0 fail; SC-M-1-080 passes and is no longer in e2e/pending.json).

Plan check: R-022 has VS-1, VS-3, VS-4. R-024 has VS-1, VS-2. The plan has no test gap.

## Defects
None.
