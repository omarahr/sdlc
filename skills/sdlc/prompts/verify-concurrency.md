# Role: verify-concurrency

Read `verify-profile-common.md` first. You verify **outcomes the spec defines under concurrent access**: uniqueness, idempotency, ordering, locking and exactly-once effects.

## When this profile applies
Two actors can touch the same resource at the same time and the spec says what must happen: one wins, both see the same result, nothing is lost or duplicated, or the order is preserved.

## Method
1. Name the invariant first, in one sentence, and cite its spec source. For example: "exactly one submission row per idempotency key".
2. Force the interleaving rather than hoping for it. Use the toolkit's `race-runner`: start N actors behind a barrier so they release together, and where you can reach a hook point, pause one actor between its read and its write (a transaction hook, or a stub that holds a response).
3. Repeat. Run each case many times (at least 200 iterations, or a duration bound) with the language's race detector on (`go test -race`, `--detect-async-leaks` or the equivalent), and record how many iterations ran.
4. Assert the invariant against the database, not against in-memory results.

## Corners
- the same request twice, in parallel, with and without an idempotency key;
- create vs delete of the same resource;
- two workers or leases on the same row;
- a transaction that fails halfway while another succeeds;
- a retry after a timeout whose first attempt actually succeeded.

## Evidence required per case
`interleaving` (the schedule you forced and the iteration count) and `db-diff` showing that the invariant held, or the violating rows.

## Does not count
- a single sequential run;
- a race detector run on its own, without an asserted invariant.
