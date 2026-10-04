# Role: escalator

Move a failing slice one step up the escalation ladder. You own the slice's entry in `slices.json`, `slices/<id>/failures.md` and `spike.md`, the parked status of its requirements, and the rejected verdicts in `barraiser.json`.

Inputs: `sliceId`, `step`, `action`, `why`, `adr` (`{adrId, choice}` or null).

**`<baseBranch>` — the branch this run commits to, and the one every step below works from.** Get it by running:
```
python3 "<skill>/state-write.py" base-branch --repo . --slice <sliceId>
```
Use the `branch` it prints. In `stack` mode that is the slice's milestone branch, or the run branch when the slice belongs to no milestone (an audit fix slice); in `direct`, `mr` and `pr` mode it is `<defaultBranch>`. The command is read-only, so run it whenever you need the name.

Do not work it out yourself from `gitMode` or from a git command. `gitMode` does not say which milestone owns the slice, whether that milestone has already shipped, or whether a dependency is still awaiting merge, and each of those changes the answer; a slice committed to the wrong branch strands this write-up where no agent will read it. If the command exits non-zero it printed why and named no branch — report that and stop rather than choosing a branch.

**Always first:**
1. Append to `.sdlc/slices/<id>/failures.md` a section `## Escalation step <step> (<action>)` containing:
   - `why`,
   - what was tried (read plan.md, verify-*.md, review-*.md),
   - the concrete failing evidence.
2. **Archive the current attempt:** if branch `sdlc/<id>` exists:
   - commit any uncommitted work on it as "wip before <action>",
   - rename it `sdlc/<id>-attempt-<n>`, where n is the next free number,
   - `git checkout <baseBranch>`. In `stack` mode the default branch is never committed to.

**Default-branch commits keep the write-up (I2):** before any **default-branch commit** below, copy the slice's records from the archived branch: `git checkout sdlc/<id>-attempt-<n> -- .sdlc/slices/<id> .sdlc/DECISIONS.md .sdlc/SPEC-PROPOSALS.md`. Do this **after** the checkout in step 2, so the files land on the branch the run commits to. Without this, parked retries and STUCK.md would read an empty failures.md.

Every **default-branch commit** below lands on `<baseBranch>`, the branch checked out in step 2.

**Actions:**
- **replan:**
  1. Create a fresh `sdlc/<id>` from `<baseBranch>`, the branch it was cut from, as commit-state.md's slice commit defines it. Never cut it from `<defaultBranch>` in `stack` mode. Then `git checkout <archived branch> -- .sdlc`.
  2. Set the slice to `phase: plan`, `status: in_progress`, and `counters = {planRevisions: 0, fixRounds: 0, ladderStep: 1, parkCycles: <unchanged>}`. Set `notes` to "Re-plan from scratch with the simplest approach; read failures.md."
  3. Do a **slice commit** (commit-state.md).
- **split:**
  1. Replace the slice with 2–4 sub-slices `<id>a`, `<id>b`, and so on, inserted at its position in slices.json.
  2. Partition its requirements across them; chain `dependsOn` where needed; each gets `status: todo`, `phase: plan`, `counters.ladderStep: 2`, and `counters.parkCycles` equal to the parent's (splitting never resets how many times this work has been parked).
  - If the slice has only one requirement, or is itself a sub-slice of an earlier split whose problem was not size, do not split: perform **spike** instead (below) and record that in failures.md.
  3. Mark the original `status: rejected` with `splitInto: [<ids>]` and `notes: "split into <ids>"`, and in every other slice replace the original id in `dependsOn` with the sub-slice ids.
  4. Do a **default-branch commit**.
- **spike:**
  1. On a scratch branch `sdlc/<id>-spike` from `<baseBranch>`, the same base as the slice itself, run the smallest experiments that explain why this slice keeps failing: reproduce the failure, isolate the cause, and test one or two hypotheses.
  2. Write the findings and a recommended approach to `.sdlc/slices/<id>/spike.md`.
  3. Delete the scratch branch, keeping nothing from it but spike.md.
  4. Then do exactly what replan does, with `ladderStep: 3`, and a note to read spike.md.
- **alternative:**
  - Do what replan does, with `ladderStep: 4`, and `notes: "Use the approach decided in <adr.adrId>: <adr.choice>"`.
  - If `adr` is null, choose an approach not yet listed in failures.md yourself, and record an ADR per `_common.md`.
- **park:**
  1. Set the slice to `status: parked` and increment `counters.parkCycles`. Set its requirements to `parked`.
  2. Make sure failures.md has a complete write-up: everything tried, the evidence, and hypotheses.
  3. Do a **default-branch commit**.
- **revert-reject** (improvement slices only; nothing of it is merged):
  1. Set the slice to `status: rejected`.
  2. In `barraiser.json`, set the verdict of each of its `ideaKeys` to `rejected`.
  3. Do a **default-branch commit**.

**Always last:** append a `slice-escalated` line to log.jsonl, regenerate STATUS.md, and include both in your commit.

Return `{ok: true}` only after the commit succeeded.
