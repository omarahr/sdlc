# S-005 review: test-quality, round 0

Diff: `41de37e..sdlc/S-005` (commit 6aa869e). Files: `skills/sdlc/branches.py`, `skills/sdlc/test/branches.test.mjs`.
I ran `node --test skills/sdlc/test/branches.test.mjs` on the slice branch: 38 tests, 38 pass.
The diff has no comments in code or tests. The tests do not sleep, do not use the network and do not depend on order.

## Blocking

1. **T-R-119 misses two real push shapes, and the verifier has a stronger test.**
   The committed scan checks each push line alone. The cli-0 verifier proved two blind spots (TC-cli-11, `logs/cli-0-TC-cli-11.txt`).
   A push of a verify name built on an earlier line passes T-R-119. A `git(repo, "push", ...)` call split over two lines passes it too.
   `.sdlc/slices/S-005/verification/r0/tests/cli-0/branches.verify-cli.test.mjs` TC-cli-10 (line 256) catches all three mutants. It joins lines and pins the exact set of push sites.
   Fix: promote the TC-cli-10 approach into T-R-119. Join continuation lines, and pin the exact list of push and create sites, so a new push site fails the test. Use repo-relative imports, not the absolute worktree paths. Record the promotion in tests.md.

2. **The "non-integer --n" case for attempt is a duplicate.**
   `tail builds the attempt tail and fails on a missing part` calls `assertBadInput` with `--kind attempt --id S-001 --n two`. The existing test `bad input exits 2 with one JSON error object` already pins these exact arguments.
   Fix: delete that `assertBadInput` line from the new test.

3. **T-R-008a duplicates two existing tests.**
   `name takes the format from the flag, then the config, then the default` already pins the CLI state output: exit 0, kind `state`, format `sdlc/{name}`, branch `^sdlc/state-\d{14}$`.
   `the state tail is the current UTC time` already pins the UTC window under `TZ=Pacific/Kiritimati`.
   The CLI calls the same `tail`, so the new test adds no behavior.
   Fix: delete T-R-008a. Map R-008 in tests.md to the two existing tests and to T-R-008b.

## Non-blocking

4. **New helpers copy existing ones.** `namedBranch` repeats the `named` helper in the format-order test. `assertMissingPart` repeats the loop body of `name without a required part exits 2 with one JSON error and no traceback`. Add the verify and attempt cases to that existing table, and reuse one helper.

5. **T-R-008b partly repeats coverage.** The `default` ts case repeats `state_ts` in `tail builds the slice, state and e2e-area tails`. Only the prefixed format and the empty ts are new. Keep those two cases.

6. **The verifyPhase check depends on exact source text.** It needs `async function verifyPhase` at column 0, a closing line equal to `}`, and the literal `const branch = g =>`. A formatter change breaks it with no behavior change. The test messages name the cause, so a failure is easy to read. Accept this for now.

7. **The loop builder and `branches.py` can drift.** No committed test checks that `name --kind verify` equals the string the `sdlc-loop.js` builder makes. Verifier TC-cli-3 and TC-contract-8 check it. Pin it in the slice that routes the loop through `branches.py`.
