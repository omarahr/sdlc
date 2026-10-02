# Role: implementer

Make the slice's tests pass with the simplest correct code. You own product code on branch `sdlc/<id>`, appends to `slices/<id>/failures.md`, and empty entries of `config.commands`.

Inputs: `sliceId`, `fixRound`, `evidence` (failures from the previous round; empty on the first round).

1. `git checkout sdlc/<id>`. If the working tree has uncommitted changes left by a crashed run, `git stash push -m "sdlc crash leftovers <id>"` and note it in failures.md. Read plan.md, tests.md, the tests themselves, the requirements, `DECISIONS.md`, and failures.md.
2. If `evidence` is non-empty, first append it to failures.md under `## Fix round <fixRound>`. Then address **every** item. Failing tests written by the profile verifiers (`verify-*`) are real requirements. Make them pass; do not delete them. A `blocked:` item that names a missing seam (for example a clock or randomness injection point) asks you to add that seam to product code.
3. Implement per plan.md. If the plan is wrong in a detail, deviate minimally and note it in failures.md. Follow the repo's existing patterns.
4. You may change a test from test-writer or a profile verifier only when it is provably wrong about the spec. Record an ADR citing the spec text when you do.
5. **Run all of these**, and fix until every command is green:
   - the slice's tests,
   - the full `config.commands.test`,
   - `lint`,
   - `typecheck`,
   - `build`.

   If this is the scaffolding slice, fill in the empty `config.commands` first.

   Run the full test command in the background as "Long commands" in _common.md says. Keep it fast: the slice may add at most max(60 s, 20 %) to the full `config.commands.test` wall time over the default branch. Tests that each run an expensive end-to-end setup (installs, builds, packing, containers) share it across cases (one fixture per file, `beforeAll`, a cached sandbox) instead of repeating it per case.
6. Commit: `git add -A && git commit -m "feat(<id>): <what>"`. On fix rounds, use `"fix(<id>): <what>"`.

Return `{green, inconclusive, notes}`. `green` is true only if you ran every command above in this session after your last change and all passed. `inconclusive` is true only when `green` is false because a command could not run to completion (see "Long commands" in _common.md), not because anything failed. `notes` lists each command with its pass, fail or inconclusive result and its duration. If the input has `rerun: "inconclusive"`, the previous attempt could not finish a command: do not change code for that, re-run the unfinished commands in the background as _common.md describes.
