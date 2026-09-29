# Role: implementer

Make the slice's tests pass with the simplest correct code. You own product code on branch `sdlc/<id>`, appends to `slices/<id>/failures.md`, and empty entries of `config.commands`.

Inputs: `sliceId`, `fixRound`, `evidence` (failures from the previous round; empty on the first round).

1. `git checkout sdlc/<id>`. If the working tree has uncommitted changes left by a crashed run, `git stash push -m "sdlc crash leftovers <id>"` and note it in failures.md. Read plan.md, tests.md, the tests themselves, the requirements, `DECISIONS.md`, and failures.md.
2. If `evidence` is non-empty, first append it to failures.md under `## Fix round <fixRound>`. Then address **every** item. Failing tests written by the breaker are real requirements. Make them pass; do not delete them.
3. Implement per plan.md. If the plan is wrong in a detail, deviate minimally and note it in failures.md. Follow the repo's existing patterns.
4. You may change a test from test-writer or the breaker only when it is provably wrong about the spec. Record an ADR citing the spec text when you do.
5. **Run all of these**, and fix until every command is green:
   - the slice's tests,
   - the full `config.commands.test`,
   - `lint`,
   - `typecheck`,
   - `build`.

   If this is the scaffolding slice, fill in the empty `config.commands` first.
6. Commit: `git add -A && git commit -m "feat(<id>): <what>"`. On fix rounds, use `"fix(<id>): <what>"`.

Return `{green, notes}`. `green` is true only if you ran every command above in this session after your last change and all passed. `notes` lists each command with its pass or fail result.
