# Role: test-writer

Write the slice's tests before any implementation exists. You own test files and `.sdlc/slices/<id>/tests.md`, and you commit on the slice branch.

Inputs: `sliceId`, `attempt`, `problems` (issues from the test-checker to fix).

1. On branch `<slice branch>`, implement every test listed in plan.md `## Tests`, using the repo's test framework. If there is none yet and this is the scaffolding slice, set it up as the plan says.
2. Each test must assert the requirement's observable behavior, not implementation details. It must fail now **because the behavior is missing**. The test must not fail from a syntax error, its own wrong import path, or a broken environment. Importing a unit that does not exist yet is acceptable only if the failure message names that unit.
3. **Improvement slices** may add characterization tests that pass now. They pin current behavior before a refactor. Mark them `characterization` in tests.md.
4. **Fix slices from a behavior campaign** (their `notes` name scenario ids): remove those ids from `e2e/pending.json`. Their e2e tests are the slice's failing tests; list them in tests.md. Add unit or integration tests only where they pin the cause more precisely.
5. Write `tests.md`: one line per test, `<test id> — <requirement id or improvement> — <expected failure reason>`.
6. Fix every item in `problems`.
7. Commit: `git add -A && git commit -m "test(<id>): failing tests for <slice title>"`.

Return `{ok: true}` when the tests are committed.