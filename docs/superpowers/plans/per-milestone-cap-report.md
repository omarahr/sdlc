# Per-milestone agent cap

The agent cap in `skills/sdlc/sdlc-loop.js` is an allowance per milestone rather than one number for a
whole run, so one milestone's work no longer eats the budget the next milestone needs.

## The problem

`const CAP = A.runAgentCap || 850` was measured against a single `spent` counter that only ever
increased, so it was really a per-*run* cap wearing a per-milestone name. Two consequences:

- a long first milestone could spend the whole allowance and leave the run unable to start the second
  one, even though the run then relaunched with a fresh 850 anyway;
- the pause message read `agent cap or budget: 850/850 agents spent`, a number that silently became
  meaningless the moment the counter and the cap described different windows.

## The boundary, and why that one

The two candidates were `milestoneAction` (the behavior campaign completing) and `milestonePlan` (the
one-shot "milestones.json is missing" action). `milestonePlan` is not a boundary at all: it runs once
per spec, before the first milestone exists, so resetting there would be a single reset per run and
would leave the bug in place. The boundary is the milestone campaign.

The real question was finer than *where* to reset but *when*: a milestone that goes `fixing` runs
several campaigns before it verifies, and the fix slices between those campaigns are `slice` actions.
Should each campaign get a fresh allowance, or should all the rounds of one milestone share one?

**All the rounds of one milestone share one allowance.** A milestone is a promise about behavior — one
verified outcome, checked against scenarios. Its campaigns are attempts at that one check, and the fix
slices exist to satisfy the findings of the attempt just made. A fresh allowance per campaign would mean
the milestone-writer's three-attempt limit silently became three times CAP for a single milestone, which
is the runaway case the cap exists to catch, and it would make "850 agents" mean a different amount of
work for every milestone. So the reset is keyed on the milestone *changing*, not on a campaign
completing: a `fixing` round is a second attempt at the same milestone and spends the same budget.

## What changed

Only `skills/sdlc/sdlc-loop.js`, plus tests and one harness line.

- **`spent` is untouched and still cumulative.** `finish()` reports it as `agentsSpent`, and the tracker
  counts the same agents independently out of the journal. Nothing resets it.
- **`milestoneSpent` is the cap's comparison basis.** `hasHeadroom()` compares `milestoneSpent` against
  `CAP`; `run()` increments both counters per attempt; `buildLoop()`'s per-fix-round brake
  (`spent + ROUND_COST > CAP`) also compares `milestoneSpent`, since it is the same cap and leaving it
  on the run total would mean a slice's fix rounds were stopped by earlier milestones' spending —
  exactly the behaviour this change exists to remove.
- **The reset is in the loop, before the headroom check**, in `main()`:
  ```js
  if (next.action === 'milestone' && next.milestoneId !== milestoneId) {
    milestoneId = next.milestoneId
    milestoneSpent = 0
  }
  ```
  Placement matters. Resetting inside `milestoneAction` would be too late: `hasHeadroom()` gates the
  action before it is dispatched, so a run that had exactly exhausted the previous milestone's
  allowance could never start the next milestone's campaign. Resetting before the check means the first
  action of a new milestone is admitted against its own fresh allowance.
- **The pause message names both numbers**, because `850/850` now means something different:
  ```
  agent cap or budget: 47/100 agents spent since milestone M-1 began (48 in this run), milestone needs ~90
  ```
- **`milestonePlan` is deliberately not a boundary** — see above.
- **`--max-iterations` and the no-progress guards are untouched.** `MAX_ITER`, `streak`/`lastKey` and
  `STUCK_LIMIT` count iterations and stalled runs; none of them read `spent`.
- **The money brake is untouched.** `budget.remaining() < 50000` still sits in `hasHeadroom()` as a
  separate run-wide condition, is not reset with `milestoneSpent`, and a run out of budget stops
  wherever it is in its milestones.

`INTERNALS` exposes `milestoneSpent` and `milestoneId` alongside the existing `spent` getter. No reset
function was added to production code — the reset production needs is the milestone boundary itself.

## Tests

Four tests in `skills/sdlc/test/core.test.mjs`, next to the existing cap tests. Each drives the real
loop through the fake runtime, not `hasHeadroom` directly.

One harness change: `fakeRuntime`'s `budgetTotal` now accepts a function, so a test can change the
remaining budget mid-run. Without it the money brake either fires on the first action or never, and
"the brake still applies *at* a milestone boundary" cannot be expressed.

```
npm test
```

| Test | Before | After |
| --- | --- | --- |
| the agent cap holds inside one milestone: a fixing round of the same milestone gets no headroom | ✖ fail | ✔ pass |
| crossing a milestone boundary restores the cap: the next milestone gets a whole allowance | ✖ fail | ✔ pass |
| the run total is not reset at a milestone boundary, and the pause message says which number it means | ✖ fail | ✔ pass |
| the money brake still stops a run whose milestone allowance was just made whole | ✖ fail | ✔ pass |

Each was run against `git show HEAD:skills/sdlc/sdlc-loop.js` to confirm it fails first. They fail for
the right reason, not by accident of a missing export:

- cap holds inside a milestone — before, the message was `agent cap or budget: 48/100 agents spent,
  milestone needs ~90`, with no milestone basis and no run total.
- boundary restores the cap — before, the run ended `continue` (paused on M-2) instead of `stopped`;
  M-2's campaign never ran.
- run total not reset — before, the same run paused at M-2 with `48/100`, so the message named neither
  the milestone basis nor the run total.
- money brake — before, the run ended `stalled` at the budget stop rather than `continue` after doing
  M-1's work.

Full suite: **317 passing, 0 failing**. The script still satisfies `prompts.test.mjs`'s forbidden-API
check (one `export const meta`, no `import`, no `require(`, no `Date.now()`/`Math.random()`/
`new Date()`, `return await main() // @entry` intact).

## Found, not changed

1. **The tracker pairs a run total with a run cap that is no longer one.** `collect.py` writes
   `"run": {"agents": <count of `"type":"started"` lines in the journal>, "cap": 850}` and defaults
   `--run-cap` to 850. `agents` is still a true run-wide count — the journal does not care about
   milestones — but `cap` is now a per-milestone allowance, so the pair no longer describes one window.
   **It is not currently visible:** `cap` is written to `status.json` and rendered nowhere in
   `template.html`. So nothing user-facing is wrong today. If anyone later surfaces it, it will need a
   milestone id, and the count is per-run so the bar would need rethinking rather than relabelling.
2. **`README.md:98`** — "Each workflow run has a cap on how many agents it can use (850 by default)" is
   now wrong in the same way. One clause.
3. **`meta.whenToUse`** in `sdlc-loop.js` still says "the per-run agent cap". Left alone deliberately:
   `whenToUse` is what the Workflow tool surfaces to the model choosing a workflow, and it is edited
   through the plugin-authoring path, not by hand.
4. **A milestone's build slices are charged to the previous milestone's window.** `next-action.py`'s
   `slim_slice()` carries no milestone id, so the script genuinely cannot tell which milestone a slice
   belongs to. Slices run before their milestone's campaign, so each milestone's slices land in the
   preceding window and are then wiped by the reset. This under-counts rather than over-counts — the
   run still stops on cap, just earlier, at a slice-heavy point — but it is a real imprecision. Fixing
   it means adding a milestone id to the slice payload in `next-action.py`, which is outside this
   change.
5. **The pre-existing `buildLoop` cap test** (`fixes.test.mjs`, `runAgentCap: 61`) still passes, because
   that scenario crosses no milestone boundary so both counters are equal. It is a weaker guard than it
   looks now; the new tests are the real coverage.