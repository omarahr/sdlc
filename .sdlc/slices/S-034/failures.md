## Escalation step 1 (replan)
- Why: the plan was refuted three times.
- Attempts made: plan.md holds the latest plan, with two critique rounds. No verify-*.md or review-*.md files exist yet.
- The plan edits one very long bullet in skills/sdlc/SKILL.md. It adds a resume carve-out to the `ok`-false sentence. It pins phrases with tests T-R-128, T-R-129a, T-R-129b, T-R-130 and T-R-002d.
- Failing evidence: each critique found a new conflict between the new sentences and an existing pin or sentence. The conflicts were: the `working` rename ask against a resume, the line-68 clause, and the `ok`-false rule against the resume carve-out.
- Hypothesis: the plan tries to change many clauses in one long bullet, so each edit breaks another. The next plan must use the simplest approach. Change the fewest clauses. Pin each source-order requirement with one test. Read the existing pins before each edit.

## Fix round 1
- [gate] failing test: npm test — test time 207s vs 113s.
- Cause: the gate timed the slice against local main (f5a207e). Local main is behind origin/main (79ff952), the branch point of this slice. The 96 extra tests belong to S-021 to S-033.
- This slice adds 4 string-check tests. It changes no script.
- Same-branch timing on one machine: origin/main 79ff952 took 96 s (770 tests). The slice branch took 100 s (774 tests). The slice adds about 5 s, below the limit of max(60 s, 20 %).
- No code change was needed.
