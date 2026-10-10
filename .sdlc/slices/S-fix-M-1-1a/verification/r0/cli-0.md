# verify-cli: S-fix-M-1-1a, round 0

- Profile: cli, part 0. Commit: 798e216. Verdict: pass (5 cases, 5 pass).
- Environment: macOS, python3, node 24. The cli-runner runs the real `branches.py` in scratch git repos. No network.
- Test file: `.sdlc/slices/S-fix-M-1-1a/verification/r0/tests/cli-0/parse.verify-cli.test.mjs`
- Command: `node --test .sdlc/slices/S-fix-M-1-1a/verification/r0/tests/cli-0/parse.verify-cli.test.mjs`
- Result: 51 tests, 51 pass. Against branches.py from before the fix, 25 of 51 fail, so the cases can fail.

## Cases
- TC-cli-1 (VS-1): parse returns kind null, exit 0, for tails with U+212A, U+017F and U+0663 in slice, verify, attempt, run, milestone, e2e and state rows, in both name modes. Pass.
- TC-cli-2 (VS-2): lower mode gives null for a K-sign prefix, K-sign suffix and long-s suffix. ASCII case folding of prefix and suffix still matches. Pass.
- TC-cli-3 (VS-2): `list` skips look-alike branches and keeps valid ones. Pass.
- TC-cli-4 (VS-3): valid ASCII tails keep kind and id. Mixed case matches in lower mode only. `M-1-e2e-é` stays e2e-area. Pass.
- TC-cli-5 (VS-1): unknown flag gives a non-zero exit and a JSON error. A second run gives the same reply. The tree does not change. Pass.

## Seeds
- testkit: the CLI has no flag for ledger ids, so the known true/false result cannot be reached from the CLI. The contract profile covers it.
