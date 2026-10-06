# Risk-routed verification: low-risk slices skip the verify battery

Date: 2026-10-06
Status: approved design, awaiting spec review

## Intent

Verification is the loop's most expensive phase. In the 2026-10 id-verification run (345 agents, 36.8 agent-hours) Verify spent 82 agents and 12.76 h — 35% of all agent time, more than Review, Report, Implement and Integrate combined. The verify-planner already rates every slice `low`/`medium`/`high`, yet even a `low` slice — in that run, grep-proven dead-code deletions — paid the whole battery: planner, profile verifiers, spec-fidelity, regression, collector (5–10 agents, 0.2–1.2 h per slice).

Goal: **a slice rated low-risk at slicing time skips the per-slice verification battery entirely**, with the adversarial net preserved by three existing mechanisms rather than by per-slice agents.

**What the user asked for:** "make the verification run once per slice, it takes most of the work" — resolved in conversation to the risk-routed cut (lever 3 of the earlier IDV-345 analysis): low-risk slices defer scenario/profile verification to the milestone behavior campaign; medium/high slices keep today's full battery.

**Decisions taken during brainstorming:**

| Question | Answer |
|---|---|
| Where the cut lands | Risk-routed, not "once per slice" literally: most slices already verify once; the waste is the battery size on low-risk slices |
| What low-risk keeps per slice | Nothing beyond implement-green + review (approach A); review can demand the battery back |
| Who assigns risk | The slicer, at slice-creation time; "when in doubt, medium" |
| Unrated slices (old runs, fix slices) | Always the full battery — safe default, backwards compatible |
| Where deferred behavior gets covered | The milestone behavior campaign, told which slices were deferred |

**Assumptions:**
- The milestone behavior campaign exists and is mandatory for every milestone (it is: `milestone-writer` runs it before `verified`).
- The integrator's suite-receipt fallback (run the full suite itself when no receipt exists) is unchanged behavior, already exercised whenever regression never ran.

### Non-goals

- Changing the battery's contents for medium/high slices (planner, toolsmith, profiles, lenses, collector all stay as they are).
- Changing the milestone campaign's machinery (judges, harness, fix-slice creation) beyond one new input.
- Cross-slice batched verification (approach C in the discussion) — rejected: new machinery, blurred slice boundary.
- A slicer-facing risk appeal or re-rating flow beyond the review escalation. The planner does not re-rate (YAGNI; the review escalation covers "hairier than it looked").

## Design

### 1. Risk lives on the slice

`slices.json` entries gain two fields: `risk` (`"low" | "medium" | "high"`) and `riskReason` (one sentence). The **slicer** assigns both at creation, with prompt guidance drawn from observed ratings: pure deletions, dead config, docs, no runtime readers → `low`; crossing I/O boundaries, boot paths, concurrency, auth, data mutation → `medium` or `high`; when in doubt, `medium`.

`next-action.py`'s `slim_slice` passes `risk` through to the workflow script (the slice object already flows: state-reader → next-action.py → `NEXT.slice`).

**A slice with no `risk` field is unrated and always gets the full battery.** That covers runs started before this change and `S-fix-*` slices from audits and campaigns, which exist because verification found something.

### 2. The routing check

In `sdlc-loop.js`'s `buildLoop`, when the slice's `risk` is `"low"` and no verification has been demanded (§3), the round is **implement → review**; `verifyPhase` does not run. No verify-planner, toolsmith, profile verifiers, spec-fidelity, regression, or collector agents are spawned. `prevVerify` stays null and `tallyVerify` never runs for the slice. The review runs standalone (the `alongside` regression overlap simply does not occur). Tests-first, the implementer's green bar, and the integrator are untouched.

### 3. The review can demand the battery back

The reviewer prompt (`reviewer.md`, all three lenses) gains an instruction: when the code under review is riskier than the slice's `low` rating — crosses an I/O boundary the label missed, touches a path whose failure is loud — set `needsVerify: true` on the report with the reason. `FINDINGS` schema gains the optional boolean.

`reviewPhase` ORs the lenses' flags into `needsVerify`. When set, `buildLoop` records `counters.verifyDemanded = true` (persisted via the existing `persist`, so a resume keeps it) and the **next and later rounds run the full `verifyPhase`**: verify-planner plans the slice and rates it for real, and the round proceeds exactly as a rated slice's would. A demanded verification is never un-demanded.

### 4. The integrator's fallback covers the missing receipt

A low-risk slice produces no regression suite receipt, so `suite-receipt.py check` reports invalid and `integrator.md`'s existing fallback — run the full `config.commands` suite itself — applies. One prompt line in `integrator.md` notes that low-risk slices never carry a receipt, so running the suite is expected, not a symptom of a broken verifier.

### 5. The milestone campaign absorbs the deferred corners

`scenario-planner` reads state itself, so this is a prompt-only change: its prompt instructs it to read the milestone's slice list from `milestones.json`, find those slices' `risk` in `slices.json`, and treat every `low` one as deferred — its scenarios must cover the deferred slices' promised behavior too, and the coverage critics hunt their corners. Nothing else about the campaign changes — judges, harness, fix-slice creation are as today, and no input plumbing is added to `sdlc-loop.js`.

### Data flow

```
slicer → slices.json (risk, riskReason)
       → next-action.py slim_slice → NEXT.slice → buildLoop routing
       → (low) review.needsVerify → counters.verifyDemanded → full verifyPhase once demanded
       → scenario-planner reads slices.json at campaign time (prompt-only)
```

## Edge cases

- **Mis-rated slice (low but hairy).** Caught by review escalation (§3), then by the milestone campaign (§5), then by the final audit and bar raiser — four nets, in order of cost.
- **A slicer that rates everything low.** "When in doubt, medium" in the prompt; the same four nets apply.
- **Resume of a pre-change run.** Unrated slices get the full battery (§1).
- **Fix slices.** `S-fix-*` slices carry no `risk` → full battery (§1). A fix slice exists because something failed; skipping verification for it would invert the lesson.
- **A demanded verification on a slice that then passes review.** The demand persists for the slice's whole life — cheap insurance, no second-guessing.
- **`verifySeeds`.** Low-risk slices contribute no verifier hardening seeds to the bar raiser. Accepted: nothing is verified, so nothing is seeded.

## Testing

- `core.test.mjs` / `verify.test.mjs`: a `low` slice's round spawns no Verify-phase agents (labels inspected from the scripted runtime); a `needsVerify` review report triggers exactly one full battery that includes verify-planner; `verifyDemanded` persists across a persisted/reloaded counter set; an unrated slice runs the battery.
- `next-action.test.mjs`: `slim_slice` passes `risk` through; a missing `risk` yields no `risk` key downstream (unrated).
- `prompts.test.mjs`: slicer prompt carries the rating instruction and the doubt rule; reviewer prompt carries `needsVerify`; scenario-planner prompt carries the deferred-slices instruction; integrator prompt carries the receipt note.

## Files

| File | Change |
|---|---|
| `skills/sdlc/sdlc-loop.js` | routing in `buildLoop`; `needsVerify` in the FINDINGS schema + `reviewPhase` + `counters.verifyDemanded` |
| `skills/sdlc/next-action.py` | `slim_slice` passes `risk` |
| `skills/sdlc/prompts/slicer.md` | assign `risk` + `riskReason` per slice; the heuristics; "when in doubt, medium" |
| `skills/sdlc/prompts/reviewer.md` | `needsVerify` verdict with reason |
| `skills/sdlc/prompts/scenario-planner.md` | cover the milestone's `low`-rated slices |
| `skills/sdlc/prompts/integrator.md` | low-risk slices never carry a suite receipt |
| `skills/sdlc/prompts/state-schema.md` | the two new slice fields |
| `skills/sdlc/test/*.test.mjs` | the cases above |
