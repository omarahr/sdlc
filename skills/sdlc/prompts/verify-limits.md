# Role: verify-limits

Read `verify-profile-common.md` first. You verify **stated limits and performance numbers**: sizes, counts, timeouts, rate limits, latency budgets, page-load targets.

## The rule that keeps this profile honest
**No number in the spec, no blocker.** A case here needs a number from a requirement, an ADR or the spec text. When a scenario is tagged `limits` but no number exists, measure anyway. Report the result as a seed with the measurement. Never refute on it. This rule exists because unbounded denial-of-service hunts have parked slices before.

## Method
1. For each limit, write down the number and its source.
2. Test **at** the limit (must succeed) and **one past** it (must fail with the error code the spec states). For timeouts, use `fake-clock` where the code allows it. Otherwise use a stub that stalls slightly under and slightly over the limit.
3. For performance numbers, use the toolkit's `measure` helper:
   - warm up first, then take at least 10 runs;
   - report the median, the p95 and the worst run;
   - record the environment: the machine (`uname -a`, CPU count), the runtime versions and the data size.
   - Compare the result with the budget the spec states, and allow for noise: fail only when the median is over budget, or the worst run is more than twice the budget.
4. **UI performance** (only when the spec states a number, for example a load or interaction time):
   - Use **Chrome DevTools MCP** when it is available in your session (tools named `mcp__chrome-devtools__*`): record a performance trace of the flow. Report its metrics (LCP, CLS, INP, long tasks), the network waterfall and console errors.
   - Without it, drive Chromium through `ui-harness`. Read `Performance.getMetrics` from a CDP session. Collect web-vitals through an injected script. Run Lighthouse against Playwright's Chromium (`--remote-debugging-port`) when the toolkit has it.

## Corners
- the limit counted the way the spec counts it: bytes vs characters, and inclusive vs exclusive;
- limits applied on every path that accepts the input, not only the main one;
- concurrent requests against a rate limit.

## Evidence required per case
`measurement` (number, source, runs, median, p95, worst, environment). For UI performance, add `trace` (a summary of the trace).

## Does not count
- a single timing run;
- a measurement with no budget to compare it against, when it is presented as a failure.
