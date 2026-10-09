# Review: S-003, lens test-quality, round 1

- Diff: `13b17f1..1921d70` (the fix round on `sdlc/S-003`).
- Files: `skills/sdlc/test/branches.test.mjs`, `.sdlc/slices/S-003/tests.md`.
- Verdict: 0 blocking findings, 2 non-blocking findings.

## What holds

- T-024 promotes TC-cli-10 and TC-cli-18. tests.md records the promotion with the source path.
- T-024 asserts exit codes, `ok`, `format`, `branch` and `given`. It does not assert internals.
- T-024 adds a control: `preflight` without the flag still fails on each broken config. The control proves that each config is really broken.
- The spec-fidelity verifier swapped the operands of `given`. T-024 failed on that mutation.
- T-024 has no sleep, no network and no nested suite run. It skips the unreadable case as root.
- The test name tells what the test checks.
- The new code holds no comments.
- I ran `node --test --test-name-pattern="broken config" skills/sdlc/test/branches.test.mjs`. Result: exit 0, 1 pass.

## Findings

### 1. T-024 does not restore the mode of the unreadable config (non-blocking)

The git-modes test restores `chmodSync(modesFile, 0o644)` in a `finally` block. T-024 leaves the config at mode `000`.
The scratch cleanup still removes the file, so no test fails now. The two tests are not consistent.
Restore the mode in a `finally` block, as the git-modes test does.

### 2. T-019 still has no case for an empty `ts` (non-blocking)

Round 0 reported this gap. The plan says the state tail treats an empty `ts` as absent.
Add `tail("state", ts="")` to T-019 and assert `^state-\d{14}$`.
