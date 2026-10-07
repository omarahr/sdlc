# Verify economy: slice-scoped regression, an explicit gate, and paid-for artifacts

Date: 2026-10-07
Status: approved design, implementation pending

## Intent

The verify phase is the loop's dominant cost, and its cost model is wrong in three ways. Evidence from the 2026-09/10 formengine run (88 slice dirs, 422 verify reports, 271 review reports) and the formengine-liveness run:

1. **The regression lens runs the full repo suite once per fix-round of every battery slice** (`verifier.md` "regression lens": full `commands.test`, lint, typecheck, build, plus e2e when configured). A healthy formengine full suite is 458–636 s; under 4 concurrent verifiers the same run inflates to 1044–1835 s. Three fix rounds × full suite per round is the single biggest wall-clock and agent cost, and the slowness manufactures its own work: saturated runs are logged "inconclusive", re-run, and consume fix rounds.
2. **Inconclusiveness is treated as slice debt.** Several escalations were caused purely by suite-time noise, not bugs: S-fix-M-1-2 escalated ("regression r1/r2 inconclusive on suite time, no failing [test]"), S-032c was parked solely for running 753 s vs a 577 s baseline, and e2e scenarios timed out nested full-suite runs. "Cut off is not failed" exists as prose in `_common.md` but is not enforced as loop semantics — an infra failure and a refutation land the same way: the round burns.
3. **Every test an adversarial verifier writes is cherry-picked into the suite** by the verify-collector, with no demonstrated-value requirement and no meaningfulness bar. The committed suite grows with unproven tests; the formengine serial pass grew from 192 s to 427 s partly from files classified timing-sensitive for logging `Date.now()`; a suite-count assertion (`TC-cli-3`) broke the whole regression when the suite grew.

Supporting evidence for the scoping decision: the repos themselves are clean (no stray files; verifier scratch lives in `$TMPDIR/sdlc-S-*`), but `.sdlc/` is committed wholesale and accumulates everything forever — per-round `verification/` trees with 2000-line logs, per-agent JSON, screenshots, traces. There is no retention policy and no distinction between evidence and bulk.

**What the user asked for** (resolved in conversation): agents clean up after themselves; test reports live in a dedicated directory and not all data is kept; unit tests must be fast; adversarial tests may not bloat the suite with meaningless tests; and verification should run against the slice, with full-repo regression reserved for gates — "we need to do analysis and debugging for what is the efficacy of the verify step currently."

**Decisions taken during brainstorming:**

| Question | Answer |
|---|---|
| Scope | One spec: verify economy, with artifact retention and test admission as supporting sections |
| Approach | B: formal two-tier verification — slice-scoped battery during build, an explicit gate phase before integrate (chosen over rescoping-inside-the-current-loop for auditability: one place owns "when does the full suite run", and a post-gate commit unambiguously re-gates) |
| Regression scope per fix round | Slice diff + dependent packages + requirement evidence tests; full suite only at the gate |
| Inconclusive runs | Infrastructure failure, not refutation: retried outside the round economy, never consumes a fix round |
| Persistent infra failure | Slice paused with an `infra-debt` flag, loop moves on, relaunch retries paused slices first |
| Verifier tests | Evidence by default; promoted only when they caught a held refutation or a review lens explicitly promotes |
| Retention | Prune bulk at merge; verdicts, receipts and ledger rows kept; `.sdlc/reports/<slice>/` is the test-report home |
| Efficacy | Every verify run records a ledger row; the tracker gains a verify-economics panel |

### Non-goals

- Making the *target repo's* suite itself faster (testcontainers-per-package, Playwright `workers: 1`, e2e boot time are formengine problems; the gate amortizes them to once per slice).
- The plan-phase escalation ladder ("plan refuted 3 times" churn) — same cost spirit, different phase; the ledger will show whether it needs its own spec.
- Changing the battery's contents for medium/high slices: planner, toolsmith, profile verifiers, spec-fidelity, review lenses and refuters keep their roles; only regression scope, verdict semantics and test destination change.
- Changing the milestone behavior campaign (judges, harness, fix-slice creation).
- Risk routing (the 2026-10-06 change) is untouched and composes with this design: low-risk slices still skip the battery entirely.

## Design

### 1. Two-tier verification

**Tier 1 — build rounds (slice-scoped).** The build loop keeps its shape: implementer → verify battery → review lenses → refuters, `FIX_ROUND_LIMIT` unchanged. The regression lens's scope on fix rounds becomes:

- test files whose path or package intersects the slice diff (git-based mapping),
- workspace/Go packages that depend on the touched packages (the breakage-propagation set),
- evidence tests for done requirements whose files intersect the diff (existing rule, unchanged).

Spec-fidelity and profile verifiers are unchanged — they were always targeted.

**Tier 2 — the gate (new phase).** A new `gate` phase between build-green and integrate:

```
build green → GATE → integrate → (next slice / milestone)
                  ↘ fail (real failing test) → back to build loop as evidence
                  ↘ infra failure → infraRetries counter (Section 2)
```

- The gate runs the current full regression-lens definition verbatim on the **final commit**: `commands.test`, `lint`, `typecheck`, `build`, plus `e2e` when configured — and writes `suite-receipt.json` pinned to the commit hash. The receipt becomes the gate artifact and is load-bearing.
- The integrator's fallback ("run the full suite when no valid receipt exists") is **removed**. The integrator verifies the receipt (valid commit hash, green, budget within max(60 s, 20%) over baseline) and does merge mechanics only. One gate, one place.
- **Post-gate code changes invalidate the gate**: any commit after a passed gate sends the slice back through the gate. A re-gate re-runs the full suite on the exact final commit — the correct price for "nothing integrates unless the full suite passed on it."
- **Resume handling**: gate state and counters persist in slice state like `fixRounds` does today; a relaunched run resumes at the gate rather than skipping it.
- The milestone behavior campaign is unchanged and remains the black-box end-to-end net.

### 2. Infrastructure-failure semantics

**Classification** — every run result (suite, verifier agent) carries a mandatory `outcome: verified | refuted | infra`:

- `infra`: failures are all timeouts, worker crashes (`onTaskUpdate`-class), or process kills with no genuine assertion failure; a verifier fails to report or reports environment-blocked; a run is killed by the wall-clock cap before producing a verdict.
- `refuted`: a failing test asserting product behavior, or a surviving spec-fidelity/profile finding.
- "Cut off is not failed" becomes mechanical: `tallyVerify` folds only `refuted` votes; `infra` feeds the retry counter.

**Economy** — `infra` never increments `fixRounds` and never counts as a refutation:

- The phase attempt is retried outside the round economy, tracked in a persisted `infraRetries` counter per slice; max 2 retries per phase attempt, the round replayed at the same `fixRounds` value with pending scenarios unchanged.
- 3 consecutive infra failures on the same phase pause the slice with an `infra-debt` flag (surfaced on the tracker status board); the loop moves to the next ready slice. A relaunch retries paused slices first.
- **Concurrency guard**: full-suite-class runs (gate, baseline timing) hold a "suite slot" so no two of them run concurrently; profile verifier batches (`PROFILE_BATCH = 4`) yield that slot. This removes the observed saturation case (4 verifiers × full suite → load avg 17–24, 1835 s runs).

**Budget refutation moves to the gate**: suite-time growth beyond the receipt budget (max(60 s, 20%) over baseline) is evaluated at the gate, once, on controlled-load data — not on fix rounds. It refutes the gate, not a fix round.

### 3. Test promotion gate

- Verifier-written tests land in `.sdlc/slices/<id>/verification/r<N>/tests/` and are never committed. The verify-collector's cherry-pick step is removed; it collects verdicts and evidence only.
- A test enters the committed suite through exactly two doors:
  1. **Caught a real bug**: when a finding survives refutation and the implementer's fix lands, the demonstrating test is promoted into the suite (deduplicated against existing coverage) as part of the fix.
  2. **Explicitly promoted**: a review lens (test-quality especially) names a specific verifier test worth keeping as a review finding; the implementer promotes it in the next round.
- **Promotion quality bar** (test-checker + test-quality lens at the promotion round): no suite-count/inventory assertions, no timing assertions unless genuinely timing-sensitive, no duplicate coverage, wall-time contribution visible in the gate receipt delta.
- Seeds and ambiguous findings stay in evidence (resurfaced by the bar-raiser); they are not promoted by default.

### 4. Artifact retention and test reports

- `.sdlc/reports/<slice-id>/` is the test-report home: suite receipts, gate regression logs, the test-reporter's REPORT.md. "Output of running the suite" lives under `reports/`; "verdicts and decisions about the slice" stay in the slice dir. The tracker status board gains report counts.
- **Pruned at merge (integrator, idempotent, `--keep-evidence` config escape hatch):**

  | Kept | Dropped |
  |---|---|
  | `plan.md`, `tests.md`, `failures.md`, `evidence.md` | `verification/r<N>/logs/` |
  | `verify-<lens>-r<N>.md`, `review-<lens>-r<N>.md` | `verification/r<N>/<profile>-<part>.{json,md}` |
  | `suite-receipt.json` (under `reports/`) | `verification/r<N>/assets/` |
  | ADRs, escalation notes, ledger rows | `verification/r<N>/tests/` (unpromoted) |

- In-flight and parked slices keep everything; pruning happens only at merge.
- **Cleanup duty**: existing rules kept (creators delete their worktrees; collector prunes `sdlc/<id>-*` branches), extended with: any agent writing scratch outside `.sdlc/` removes it before exiting, and the gate runs a stale-branch sweep (`sdlc/*` branches older than the slice's life → delete).

### 5. Fast unit tests and the efficacy ledger

**Fast-test rules**, enforced at authoring/promotion points:

1. No nested suite runs: a test must not invoke the repo's test command — a blocking review finding, overridable only by human-override ADR.
2. Gate receipt delta attributes wall-time growth; a budget overrun refutation names the offending new test files.
3. Serial-pass admission: a file joins the timing-sensitive pass only if it genuinely asserts on timing, not because it logs `Date.now()` (test-quality lens check).
4. Prompt bar in `test-writer.md` / `verify-profile-common.md`: unit tests run in milliseconds-to-seconds; container/server-dependent checks belong to e2e/behavior scenarios.

**Efficacy ledger**: every verify run records a row in slice state — dimension, round, verdict class, agent count, wall time; refutations record outcome (`fixed` / `dismissed-by-refuters` / `seed`). The tracker hub gains a verify-economics panel: refutation→fix rate, agents-per-verdict, fix-round distribution, infra-retry counts, suite-time trend across receipts. Future tuning (profile caps, round limits, ladder changes) becomes data-driven.

## Testing

- Loop-level: gate transitions (green→gate→integrate; gate-fail→build; post-gate commit→re-gate), infra-retry economy (infra never consumes a fix round), pause-on-infra-debt and relaunch-resumes-paused, resume-at-gate after relaunch, suite-slot serialization.
- Unit: outcome classifier (infra signatures vs assertion failures), receipt validity check (commit hash + green + budget), retention prune (kept/dropped table, idempotency, `--keep-evidence`), test-impact mapping (diff → tests + dependent packages).
- Prompt-level: verifier prompts emit `outcome` and promotion metadata; collector no longer cherry-picks; integrator verifies receipts instead of running the fallback suite; test-checker enforces the promotion bar.
- Fixture runs: a scratch project exercising a full slice lifecycle (refute → fix → promote → gate → integrate → prune) asserting the on-disk artifact shape at each step.