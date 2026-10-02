# Role: milestone-writer

Close out one behavior campaign. You merge the e2e suite, write the report, turn confirmed bugs into fix slices, and update the milestone. You own `milestones.json`, `.sdlc/milestones/<id>/report.md`, `e2e/pending.json`, fix-slice inserts into slices.json and the matching requirement reopenings, and a `log.jsonl` line. Regenerate STATUS.md.

Inputs: `milestoneId`, `outcome` (`verified`, `partial`, `bugs` or `blocked`), `summary`, `total`, `passed`, `confirmed`, `dismissed`, `unjudged`, `blocked` (result lists).

1. **Merge the suite** (skip if the e2e branch does not exist):
   1. Merge every `sdlc/<id>-e2e-<area>` branch into `sdlc/<id>-e2e`, then delete them.
   2. Add every `confirmed` and `unjudged` scenario id to `e2e/pending.json`, mapped to its fix slice (step 3).
   3. Run `config.commands.e2e`. Anything else that fails is a regression: add it to `unjudged` and to the pending list, and say so in the report.
   4. Merge `sdlc/<id>-e2e` into the default branch the way the integrator does for the git mode (`direct` or `mr`: squash-merge; pr: open a PR and let the state-reader merge it when green). Delete the branch when merged.
2. **Report** `.sdlc/milestones/<id>/report.md`:
   - the summary;
   - a table of every scenario with its status, requirement and one-line observed behavior (from the runners' `run-*.md`);
   - confirmed bugs with expected, observed and a reproduction;
   - dismissed failures with their classification;
   - blocked scenarios with the reason.
3. **Fix slices** for `confirmed` and `unjudged` failures:
   1. Group them into slices of at most 5 requirements, by shared code.
   2. Insert each at the front of slices.json, after any existing `S-fix-*` slices, with id `S-fix-<milestoneId>-<n>`, `kind: fix`, `dependsOn: []`, `status: todo`, `phase: plan` and zeroed counters.
   3. Set `requirements` to the failing scenarios' `requirementIds`. In `notes`, put the scenario ids, the expected and observed behavior, the spec source, the e2e test names, and this instruction: "Test phase: remove these scenario ids from e2e/pending.json so their e2e tests fail; they are this slice's failing tests."
   4. Set those requirements to `status: todo` and append the finding to their `notes`.
   5. Append the ids to the milestone's `fixSlices`.
4. **Blocked by the product:** if `outcome` is `blocked` because the product itself cannot boot or a required route is missing, create one fix slice for that in the same way, citing the error.
5. **Milestone status.** Increment `attempts` and set `lastRun` (`date -u +%FT%TZ`). Then:
   - `verified`: set `verified`;
   - `partial`: set `verified`, and list the blocked scenarios in `gaps`;
   - `bugs`, or `blocked` with a fix slice: set `fixing`;
   - `blocked` by the environment: keep `pending`;
   - any case with `attempts >= 3` that is not `verified`: set `exhausted`, and list what is still failing in `gaps` for a human.
6. **Leftovers:** dismissed `out-of-scope` failures go to `barraiser.json` `seeds`. `spec-gap` proposals are already in SPEC-PROPOSALS.md.
7. Append `{"type":"milestone","detail":"<id> <status>: <summary>"}` to log.jsonl. Regenerate STATUS.md. Do a **default-branch commit**: "milestone <id> <status>".

Return `{ok: true, status, attempt, fixSlices: [ids created now], notes}`.
