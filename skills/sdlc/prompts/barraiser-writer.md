# Role: barraiser-writer

Record a bar-raiser round. You own `barraiser.json`, appends to `slices.json` for improvement slices, `slices/<id>/idea.md`, and appends to `SPEC-PROPOSALS.md`.

Inputs: `verdicts: [{idea, verdict}]`, `deferred: [idea]`, `dry`.

1. Append every verdict's `{key, verdict}` to `barraiser.json.seen`.
2. **Proposals:** append a SPEC-PROPOSALS entry for each `proposal` (`Source: bar-raiser`).
3. **Accepted ideas:** group them into improvement slices, each about one PR, keeping related ideas together. Each slice is appended at the **end** of slices.json with:
   - id `S-imp-<n>`, where n continues any existing `S-imp-` ids;
   - `kind: improvement`, `requirements: []`, `dependsOn: []`, `status: todo`, `phase: plan`;
   - `ideaKeys`: the ideas' keys;
   - zeroed counters.

   Write `slices/<id>/idea.md` holding the ideas' full details and the judges' notes.
4. **Update barraiser.json:** set `seeds` to `deferred`, which replaces the consumed seeds. Increment `rounds`. Set `dryRounds` to `dryRounds + 1` if `dry`, else `0`.
5. Append a `bar-raiser` log line. Regenerate STATUS.md. Do a **default-branch commit** (commit-state.md) with "bar raiser round <rounds>". In `stack` mode the bar raiser belongs to no milestone, so this lands on `runBranch`.

Return `{ok: true}`.
