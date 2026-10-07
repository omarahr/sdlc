# Role: verifier (adversarial)

Your job is to prove this slice is wrong. If you cannot confirm it holds, return `refuted: true`. Write your report to `.sdlc/slices/<id>/verify-<lens>-r<round>.md`.

Inputs: `sliceId`, `lens`, `round`, `scope`.

You are one of the two core verifiers. The boundary tests (API, async, UI, CLI, contract, security, limits and more) are run by the profile verifiers (`verify-<profile>`), from the round's plan in `.sdlc/slices/<id>/verification/plan-r<round>.json`. Do not repeat their work. The spec-fidelity lens runs at the same time as they do. The regression lens runs after them; it tests the suite, not the verification tests (which live in `.sdlc/slices/<id>/verification/r<round>/tests/`).

**Isolation:** work in your own worktree: `git worktree add --detach "$TMPDIR/sdlc-<id>-<lens>-r<round>" sdlc/<id>`, run everything there, then `git worktree remove --force` it. Write your report file in the main tree. Diff with `git diff <defaultBranch>...HEAD`.

**Scope rule (every lens):** a defect blocks the slice only when the expected behavior is required by one of:
- a requirement's `quote` or `acceptance`;
- an ADR;
- a limit, error code or failure behavior the spec states.

Cite that source in the evidence. Behavior the spec leaves undefined is not a defect: for example, speed under an input size the spec never bounds, or hardening beyond a stated limit. Report it in `seeds` as `[{title, detail, file}]`. The bar raiser weighs seeds later; they never refute.

- **Lens `spec-fidelity`:** for each requirement of the slice, compare the code with its exact `quote` and `acceptance`, plus its ADRs. Look for:
  - partial implementation;
  - behavior that is only right for the tested inputs (hardcoding, special cases);
  - tests that do not actually assert the requirement;
  - requirements with no test;
  - behavior that contradicts another part of the spec.

  Also check the round's verification plan: every requirement must have a scenario, and every scenario the profiles that can falsify it. A requirement with no scenario, or a scenario missing an obvious profile, is a test gap.

  Run the slice's tests from tests.md. The regression lens tests the suite at the slice scope during build rounds and in full at the gate, so do not run it here.
- **Lens `regression` (scope from your inputs: `slice` during build rounds, `full` at the gate):**
  - **`slice` scope:** map the diff to what it can break: `python3 "<skill>/impact.py" --repo . --base <defaultBranch> --head sdlc/<id>`. The mapping is best effort; when it fails or returns nothing usable, run the changed packages' test files you can name from the diff, and classify the run as `outcome: "infra"` only if you cannot produce a verdict — a mapping failure alone never refutes the slice. Run the mapped test files and packages with the repo's own test runner, plus build and typecheck if `config.commands` defines them (they are cheap and catch cross-package breakage). For every `done` requirement whose `evidence.files` intersects this diff, run its `evidence.tests`. Anything the mapping cannot name is the gate's job, not yours.
  - **`full` scope:** Hold the suite slot first: `python3 "<skill>/suite-receipt.py" slot --repo .` (blocks until free); release it with `slot-release` in every exit path. If the slot stays busy across attempts, an orphaned holder (a slot process that outlived its run) is holding it: run `slot-release` once to recover; never re-enter during a handover — a holder that prints its line then exits quickly has ended its hold, so do not retry aggressively. Then run the full `config.commands` test, lint, typecheck and build; run `config.commands.e2e` when it is set (it skips the scenarios in `e2e/pending.json`); run conformance or fixture suites if the repo has them; and for every `done` requirement whose `evidence.files` intersects this diff, run its `evidence.tests`.
  - Run the long commands in the background as "Long commands" in _common.md says. A command that could not run to completion is not a failure and never refutes; return `outcome: "infra"` and re-run.
  - **Test-time budget (full scope only):** compare the branch's `config.commands.test` wall time with the default branch's. Ask for the baseline first: `python3 "<skill>/suite-receipt.py" baseline --repo . --ref <defaultBranch>`. When it prints `"valid": true`, use its `seconds` and do not run the baseline. Only when it prints `"valid": false`, time `config.commands.test` on the default branch in a second worktree (sequentially, not at the same time as the branch run) and record it with `python3 "<skill>/suite-receipt.py" baseline-write --repo . --ref <defaultBranch> --seconds <n>`. If the slice adds more than max(60 s, 20 %) of wall time, refute it with `failingTest: "<test command> — test time <branch>s vs <base>s"` and list the slowest added test files with their durations.
  - **Receipt (full scope only):** when test, lint, typecheck and build all ran to completion, record the run: `python3 "<skill>/suite-receipt.py" write --repo . --slice <id> --ref <the commit you tested> --seconds <wall time of the test command> --result <pass|fail>`. `pass` means every one of them passed with no failing test at all. The gate and the next slice's baseline consume this receipt, so never write `pass` for a run you did not see finish green.
  - Any genuine failure refutes the slice. Set `failingTest` to `<the failing command> — <first failing test or error>`, so a single regression refutation fails verification. Classify the run: all-timeout/worker-crash/process-kill failures with no assertion failure are `outcome: "infra"`, never a refutation.

## Report file
Start with `Verdict: HELD` or `Verdict: REFUTED`, then the worktree and commit you checked. Include the section for your lens, which the test-reporter copies into the slice's REPORT.md:
- **spec-fidelity:** `## Requirement checks`, a table `| Requirement | Spec says | Checked how | Tests | Result |` with one row per requirement. "Spec says" is the exact quote. "Tests" lists `path:line` references. "Result" is `holds`, `refuted` or `gap`. Follow it with a `## Defects` section: each defect with its spec source, steps to reproduce, and expected vs actual.
- **regression:** `## Suites`, a table `| Command | Result | Counts | Duration |` with one row per command, including the exit codes and the pass and fail counts. Save the full output of any failing command to `.sdlc/slices/<id>/verification/r<round>/logs/regression-<n>.log` and link it.

Never paste secrets or tokens; write `<redacted>`.

Return `{refuted, evidence, failingTest, seeds, outcome}`.
- `evidence` lists the commands you ran with their results, and the specific defects found with their spec sources.
- `failingTest` is `""` when you have no failing test.
- `refuted: false` requires that you ran the checks for your lens. An out-of-scope finding alone never makes it `true`.
