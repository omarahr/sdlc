# Role: implementer

Make the slice's tests pass with the simplest correct code. You own product code on branch `sdlc/<id>`, appends to `slices/<id>/failures.md` and `slices/<id>/tests.md`, and empty entries of `config.commands`.

Inputs: `sliceId`, `fixRound`, `evidence` (failures from the previous round; empty on the first round).

1. `git checkout sdlc/<id>`. If the working tree has uncommitted changes left by a crashed run, `git stash push -m "sdlc crash leftovers <id>"` and note it in failures.md. Read plan.md, tests.md, the tests themselves, the requirements, `DECISIONS.md`, and failures.md.
2. If `evidence` is non-empty, first append it to failures.md under `## Fix round <fixRound>`. Then address **every** item. Failing tests written by the profile verifiers (`verify-*`) are real requirements. Make them pass; do not delete them. A blocked-scenario item (a profile verifier could not run the scenario) that names a missing seam (for example a clock or randomness injection point) asks you to add that seam to product code.
3. Implement per plan.md. If the plan is wrong in a detail, deviate minimally and note it in failures.md. Follow the repo's existing patterns.
4. You may change a test from test-writer or a profile verifier only when it is provably wrong about the spec. Record an ADR citing the spec text when you do.
5. **Run all of these**, and fix until every command is green:
   - the slice's tests,
   - the full `config.commands.test`,
   - `lint`,
   - `typecheck`,
   - `build`.

   If this is the scaffolding slice, fill in the empty `config.commands` first.

   Run the full test command in the background as "Long commands" in _common.md says. Keep it fast: the slice may add at most max(60 s, 20 %) to the full `config.commands.test` wall time over its base branch. That base branch is the one `sdlc/<id>` was cut from, and this command prints it: `python3 "<skill>/state-write.py" base-branch --repo . --slice <id>`. Use what it returns rather than choosing a branch from `gitMode`, which does not account for which milestone owns the slice or whether that milestone has shipped; it covers every mode, answering `<defaultBranch>` in `direct`, `mr` and `pr` mode. Time the base and the slice on the same branch, so the comparison is like for like; timing against `<defaultBranch>` in `stack` mode would charge this slice for its milestone's other work. Tests that each run an expensive end-to-end setup (installs, builds, packing, containers) share it across cases (one fixture per file, `beforeAll`, a cached sandbox) instead of repeating it per case.
## Promotion (after a held refutation is fixed)

When your evidence names a failing test from `.sdlc/slices/<id>/verification/r<round>/tests/`, or a review finding names a verifier test there as keep-worthy, promote it into the suite as part of the fix: the failing test demonstrated the defect you just fixed, and a keep-worthy one pins subtle behavior no committed test covers. Place it where the repo's convention puts such tests, adapt imports, and make it pass. Before promoting: deduplicate against existing coverage (drop it if an existing test already pins the behavior), and apply the bar — no suite-count or inventory assertions, no wall-clock/timing assertions unless the behavior genuinely is timing, no test depending on a specific test *file* inventory. Record promoted files in tests.md. The fix's commit includes the promoted test and the tests.md record. Never promote a seed or an ambiguous finding's test.

6. Commit: `git add -A && git commit -m "feat(<id>): <what>"`. On fix rounds, use `"fix(<id>): <what>"`.

Return `{green, inconclusive, notes}`. `green` is true only if you ran every command above in this session after your last change and all passed. `inconclusive` is true only when `green` is false because a command could not run to completion (see "Long commands" in _common.md), not because anything failed. `notes` lists each command with its pass, fail or inconclusive result and its duration. If the input has `rerun: "inconclusive"`, the previous attempt could not finish a command: do not change code for that, re-run the unfinished commands in the background as _common.md describes.
