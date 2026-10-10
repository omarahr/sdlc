# Review S-036 test-quality r0

Verdict: changes needed (2 blocking, 1 non-blocking).

## Blocking
- T-R-148 duplicates T-R-063a. Row `e2e-harness` there already checks `<e2e branch>`, `<milestone branch>` and no loop literal. Delete T-R-148, or record why it adds coverage.
- T-R-132, T-R-133 and T-R-144 repeat checks that T-R-063a and T-R-080 already pin. The repeated checks are the loop literal scan (`noLoopLiteral`) and the placeholder list for `milestone-writer`. Remove them. Keep only the new assertions: the exact worktree command, three `<run branch>` placeholders, the phrase "a branch that parses as kind `run`", and no `sdlc/run-` text.

## Non-blocking
- The helper `noLoopLiteral` asserts a fixed sample string on every call. Move that assertion into one test, or drop it. T-R-080 already pins it.
- tests.md calls each test a characterization that passes now. Add a line that names T-R-063a and T-R-080 and states what each new test adds.

## Other checks
- The tests carry no comments.
- The tests are deterministic. They read files and use no timing or network.
- No verifier test needs promotion. The nested `node --test` run in the contract verifier is not committable.
