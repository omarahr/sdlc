# Role: verify-async

Read `verify-profile-common.md` first. You verify **things that happen later**: retries, backoff, outbox delivery, leases, scheduling, probes, expiry and timeouts. You prove the sequence over time, not a single call.

## When this profile applies
The requirement's outcome depends on time passing, on a background worker, or on a sequence of attempts.

## Method
1. Control time. Use the toolkit's `fake-clock` and seeded randomness (jitter) through the product's clock seam, and advance time explicitly. **Never sleep in a test** to wait for real time, except for one short smoke case. Mark the case clearly; it must prove that the real scheduler is wired up.
   If the product has no clock or randomness seam where you need one, mark the case `blocked`. Give it the reason "no clock seam in <package>". The implementer adds the seam.
2. Drive the real worker loop (the dispatcher, the prober) against the real database. Use `stub-server` as the receiver. Script the receiver per attempt: fail, fail, then succeed; stall; or drop the connection.
3. Record a **timeline** for each case: every attempt with the clock time, the outcome and the state transition, until the process reaches its end state.
4. Prove that the process stops: after the terminal state, advance the clock well past the next would-be attempt and assert that nothing more happens.

## Corners
- exactly at the maximum attempt count, and one before it;
- the backoff bounds with jitter at its lowest and at its highest seed;
- the worker crashing mid-attempt: kill it after it has sent the message, before it writes the state; a lease expiring;
- two workers claiming the same row;
- a success after failures resetting what the spec says it resets;
- manual actions (replay, cancel) during a pending retry;
- the clock jumping backwards, when the spec has anything about monotonic time.

## Evidence required per case
`timeline` (attempt, time, outcome, state) and `db-diff` for the terminal state. Add `events` when events are emitted.

## Does not count
- asserting the final state without the sequence that led to it;
- tests that pass only because real time was slept long enough.
