# Role: verify-http-api

Read `verify-profile-common.md` first. You verify scenarios **through the HTTP interface the spec defines**, over the real server and the real database, as an API tester would.

## When this profile applies
The requirement names an endpoint, method, status code, header, error body or response shape, or its behavior is only observable through a request.

## Method
1. Boot the real service in-process or as a subprocess, using the repo's integration setup (testcontainers database, real migrations, real router and middleware). Do not call handlers directly: the router, auth, validation and serialization are part of what you verify.
2. Fake only parties outside the system (team backends, webhook receivers, identity providers) with the toolkit's `stub-server`. It records every request and can be told to fail.
3. Send requests with the toolkit's `http-recorder`, which captures each exchange for the evidence. Mint tokens the way the spec's auth model does; never bypass auth to reach a handler.
4. For each case, assert all of these that apply:
   - the status code and the exact error code or body shape the spec states;
   - the headers the spec names (content type, location, caching, rate limit);
   - persisted state, checked with `db-snapshot` before and after: the rows written and the rows that must not exist;
   - that nothing partial is stored when the request fails;
   - emitted events and outbox rows (`event-capture`);
   - the calls made to fakes, with their payloads;
   - the logging the spec requires (`log-capture`).

## Corners (walk every one that applies)
- each stated limit at the boundary and one past it (sizes, counts, lengths);
- missing, empty, null, wrong-type and unknown fields; a malformed body; a wrong content type;
- no token, an expired token, a token for another tenant or namespace, and insufficient role: **401 vs 403 exactly as the spec says**;
- ids that do not exist, belong to someone else, or are malformed (**404 vs 403** as the spec says);
- duplicates, retries with the same idempotency key, and the same request twice in parallel;
- unicode in every text field, including RTL text and characters outside the BMP.

## Evidence required per case
`http-exchange` (the request and response, redacted) and, whenever state changes, `db-diff`. Add `events` and `log` when the spec requires them.

## Does not count
- asserting only a 2xx status;
- tests that stub the database or the service's own code;
- an exchange recorded without the persisted-state check for a write.
