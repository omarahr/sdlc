# Review: S-003, lens test-quality, round 0

- Diff: `c5d105d..13b17f1` (the slice commits on `sdlc/S-003`).
- Files: `skills/sdlc/branches.py`, `skills/sdlc/test/branches.test.mjs`.
- Verdict: 1 blocking finding, 2 non-blocking findings.

## What holds

- T-019 to T-023 assert outputs and exit codes, not internals.
- T-020 runs the probe under `TZ=Pacific/Kiritimati`. A local-time stamp fails it. The bracket check uses the same clock and has no sleep.
- T-022 checks the exact key set of the `name` output.
- T-023 covers a config value equal to the default, an empty value, an absent key and an absent file.
- No test runs the suite, asserts on timing, or uses the network.
- The code and the tests hold no comments.
- The two adjusted tests keep all their assertions.

## Findings

### 1. Promote the "flag beats a broken config" verifier tests (blocking)

The slice owns R-015, the format resolution order. No committed test gives `--format` together with a broken `config.json`.
`cmd_preflight` computes `given` as `ns.format is not None or _config_format(repo) is not None`. The order of the two operands is load-bearing. Swap them, and preflight with `--format` fails on a broken config.
The verifier pins this behavior. Promote these tests into `skills/sdlc/test/branches.test.mjs` and record the promotion in tests.md:

- `.sdlc/slices/S-003/verification/r0/tests/cli-0/branch-name.verify-cli.test.mjs` TC-cli-18 (preflight `--format` with a broken config reports the flag and `given: true`).
- `.sdlc/slices/S-003/verification/r0/tests/cli-0/branch-name.verify-cli.test.mjs` TC-cli-10 (`name --format` with a broken config builds the flag's branch).

### 2. T-019 has no case for an empty `ts` (non-blocking)

The plan says the state tail treats an empty `ts` as absent. T-019 tests only an absent `ts` and a given `ts`.
Add `tail("state", ts="")` to T-019 and assert `^state-\d{14}$`. TC-contract-6 covers it in the verifier now.

### 3. The zero-part filter has no committed test yet (non-blocking)

`cmd_name` keeps a part when it `is not None`. A truthiness filter would drop `--n 0`, `--round 0` and `--part 0`.
No current row reads these parts, so no behavior shows the defect yet. TC-cli-112 patches `TAILS` to show it.
Let S-004 to S-006 pin it with a zero `round` or `part` on their real rows.
