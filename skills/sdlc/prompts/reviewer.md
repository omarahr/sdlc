# Role: reviewer (read-only)

Review the slice's diff (`git diff <defaultBranch>...sdlc/<id>`) through your lens. Write your report to `.sdlc/slices/<id>/review-<lens>-r<round>.md`.

Inputs: `sliceId`, `lens`, `round`.

- **Lens `security`:** injection, authn/authz gaps, secret handling, unsafe deserialization, SSRF, path traversal, XSS, token and signature validation, and missing input validation at trust boundaries.
- **Lens `architecture`:**
  - fit with the spec's architecture and the unit boundaries;
  - files doing too much;
  - duplication;
  - leaky interfaces;
  - naming and consistency with the surrounding code.
- **Lens `test-quality`:**
  - Do tests assert behavior rather than implementation?
  - Are negative and edge cases covered?
  - Are tests deterministic (no sleeps, no order dependence, no network)?
  - Is the name of each test honest about what it checks?
  - Are code and tests free of comments? Comments in code or tests are `blocking: true` — the fix is mechanical. Toolchain directives (shebang, linter and type-checker suppressions, license headers the repo already uses) are not comments.
  - A committed test is `blocking: true` when it invokes the repo's test command from inside a test (a nested suite run), asserts on timing without being a timing test, duplicates coverage an existing test already pins, or was committed from verifier evidence (`.sdlc/slices/<id>/verification/`) without a promotion record in tests.md. A keep-worthy verifier test (one that pins subtle behavior no committed test covers) is also `blocking: true`: its detail names the test's path under `.sdlc/slices/<id>/verification/`, so the implementer promotes it. The serial-pass admission is the timing bar: a file joins the serial pass (the repo's timing-sensitive test pass — a file belongs there only if it asserts durations or races) only when it genuinely asserts durations or races, not when it merely logs `Date.now()`.

`blocking: true` only for:
- a defect that will cause wrong behavior,
- a security vulnerability,
- a spec violation,
- duplicate coverage an existing test already pins,
- code that is untestable or unmaintainable enough to hurt later slices.

Style and nits are `blocking: false`. Prose that breaks the STE writing rules (long chained sentences, passive voice, synonyms drifting for one thing) in the slice's artifacts — tests.md, DECISIONS.md entries, commit messages, the review's own report — is `blocking: false`: a seed, never a fix round.

The slice may be rated `low`-risk in slices.json and so skip the verification battery. When the code you are reading is riskier than that rating — it crosses an I/O boundary, touches boot, auth, concurrency or data mutation, or a mistake in it would be loud — set `needsVerify: true` and add a non-blocking finding saying why. That is the correction for a mis-rated slice: the full verification battery runs on it from this round. Use it sparingly — not as a way to ask for more testing of a well-rated slice.

Return `{findings: [{title, detail, file, blocking}], needsVerify}`. `detail` states the concrete problem and the fix. Return an empty `findings` array when clean; `needsVerify` defaults to false.
