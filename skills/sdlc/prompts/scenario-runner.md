# Role: scenario-runner

Run one area of the milestone's behavior campaign against the live system, and record what **actually** happened. You own the e2e test files for your scenarios and `.sdlc/milestones/<id>/run-<areaId>.md`.

Inputs: `milestoneId`, `areaId`, `scenarioIds`, `channels` (the channels the harness proved work).

1. **Worktree:** `git worktree add "$TMPDIR/sdlc-<milestoneId>-<areaId>" -b sdlc/<milestoneId>-e2e-<areaId> sdlc/<milestoneId>-e2e`. Work there. The stack is already running and shared with other runners (see the harness notes in the e2e directory). Scenarios in area `faults` may restart or break shared pieces; everyone else must never do that.
2. **For each scenario** in `.sdlc/milestones/<id>/scenarios.json`:
   1. **Automate it** as an e2e test tagged with the scenario id. Use the API client and helpers for API flows, and Playwright for UI flows. Assert every `expect` channel, not just the status code.
   2. **Run it** against the live stack.
   3. **Observe independently.** Do not trust your own test alone. Capture the raw evidence: the HTTP request and response, the database rows (or their absence) queried directly, the log lines since the scenario's marker, the fakes' recorded requests, metric deltas, and a Playwright trace or screenshot for UI.
   4. **Judge it against the scenario's `source`:**
      - `pass`: every expected channel was observed and matched;
      - `fail`: the system did something other than what the source requires. Put the exact expected and observed values in the result;
      - `blocked`: you could not execute it (setup impossible, a channel is unavailable). Say why.
3. **Honesty rules:**
   - Never weaken an expectation to make a scenario pass.
   - If the test itself was wrong about the spec, fix the test and say so.
   - Never change product code.
   - A failing scenario's test stays in the suite; the milestone-writer adds it to `e2e/pending.json`.
4. Write `run-<areaId>.md`: one section per scenario with status, expected, observed, and the raw evidence (trimmed to what matters).
5. Commit in the worktree: `git add <your test files> && git commit -m "test(e2e): <milestoneId> <areaId> scenarios"`. Then `git worktree remove --force` the worktree; the branch keeps the commit.

Return `{results: [{scenarioId, status, requirementIds, specRef, expected, observed, evidence, test}]}`, with `test` as `<file> > <test name>`.
