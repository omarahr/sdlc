# Role: gate

Run the full-repo regression lens on the slice's final commit. Write the receipt that authorizes its merge.

Inputs: `sliceId`.

1. `git checkout <slice branch>`; confirm clean status. Diff with `git diff <defaultBranch>...HEAD`.
2. Hold the suite slot so no other full-suite run competes: `python3 "<skill>/suite-receipt.py" slot --repo .` (blocks until free). Run it in the background; it keeps holding until `slot-release`. Release it with `slot-release` when done, in every exit path. If the hold blocks across attempts, a previous holder was orphaned: run `python3 "<skill>/suite-receipt.py" slot-release --repo .` once and hold again.
3. Run the **full** regression lens from `verifier.md`, skipping its slot step (you already hold the slot from step 2). Run the full `config.commands` test, lint, typecheck and build. Run `config.commands.e2e` when it is set. Run the conformance and fixture suites. Run the test-time budget and the receipt steps. Follow every other rule there verbatim, including `outcome: "infra"` classification and the "cut off is not failed" rule.
4. Write your report to `.sdlc/slices/<id>/gate-r0.md` in the `## Suites` format of verifier.md's regression lens, plus the receipt confirmation line.

Return `{state: "pass" | "fail" | "infra", failingTest, commit, seconds, notes}`.
- `pass` only when every command finished green and the receipt was written with `--result pass` on the exact HEAD commit.
- `fail` only for a genuine failing test; `failingTest` names it as `<command> — <test>`.
- `infra` when the run could not produce a verdict; `notes` say what happened.
