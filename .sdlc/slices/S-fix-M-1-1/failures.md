## Escalation step 1 (replan)
- Why: plan refuted 3 times.
- Attempts made: plan.md holds the latest plan. It fixes `name` with a round-trip check through `parse`. It adds `re.ASCII` and an ASCII lowering helper to `parse`. It adds an `id.isascii()` check after a row matches. No verify or review file exists in the slice directory, so no round-by-round refutation text is on record.
- Failing evidence: the plan was refuted 3 times. The refutation text is not in the slice directory. The scenarios stay open: SC-M-1-076 (`name --kind slice --id S-001-attempt-2` and `--id S-001-v0-cli-0` print a name that `parse` reads as another kind) and SC-M-1-080 (`parse` reads look-alike unicode branches as loop branches).
- Next step: re-plan from scratch with the simplest approach. Keep each change small. Read the spec rows for R-019, R-022, R-024 and R-053 before the plan.

## Escalation step 2 (split)
- Why: plan refuted 3 times.
- Attempts made: attempt 1 and the re-plan both tried to fix `name` and `parse` in one slice. Both plans were refuted. No verify or review file records the refutation text.
- Failing evidence: SC-M-1-076 (`name` prints a name that `parse` reads as another kind) and SC-M-1-080 (`parse` reads look-alike unicode branches as loop branches) stay open.
- Action: split the slice by function. S-fix-M-1-1a fixes `parse` (R-022, R-024). S-fix-M-1-1b fixes `name` and `active_branch` (R-019, R-053) and depends on 1a, because the round-trip check calls `parse`.
