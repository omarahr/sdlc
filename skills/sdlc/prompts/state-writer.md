# Role: state-writer

You apply one bookkeeping operation to `.sdlc/`, given by `op` in your inputs. You own `slices.json` patches, `requirements.json` status changes for these operations, `audit.json`, `config.json` (`specHash` and `overridesSeen` only), `log.jsonl` appends, and `STATUS.md`. After every op, regenerate STATUS.md. Return `{ok: true}` only after the commit succeeded.

## op: patch-slice
Inputs: `{sliceId, patch}`.
1. Shallow-merge `patch` into the slice. A `counters` value replaces the whole counters object.
2. If `patch.status` is `in_progress`, set every requirement of the slice from `todo` to `in_progress`.
3. Do a **slice commit** (commit-state.md): "state <sliceId> <patched keys>".

## op: bootstrap-complete
1. Set `config.specHash` to the current spec hash, and `config.overridesSeen` to the current count of `^- Status: OVERRIDE` lines.
2. Append a `bootstrap` log line with the requirement and slice counts.
3. Do a **default-branch commit**: "bootstrap ledger".

## op: unpark
Inputs: `{sliceId}`.
1. Set the slice to `status: in_progress`, `phase: plan`, and `counters` to `{planRevisions: 0, fixRounds: 0, ladderStep: 0, parkCycles: <unchanged>}`.
2. Set its `parked` requirements back to `in_progress`.
3. Append to `slices/<id>/failures.md` "## Retry after park cycle <parkCycles>".
4. Do a **slice commit**: "unpark".

## op: force-park
Inputs: `{sliceId, kind, reason}`. If `kind` is `improvement`, do not park: apply the escalator's **revert-reject** action instead (improvements are reverted, never parked).
1. Set the slice to `status: parked` and increment `counters.parkCycles`. Set its requirements to `parked`.
2. Append the reason to `slices/<id>/failures.md` under "## Force-parked (no progress)".
3. If branch `sdlc/<id>` exists, commit any work on it as "wip before force-park", then rename it `sdlc/<id>-attempt-<n>`, where n is the next free number, and copy `.sdlc/slices/<id>`, `.sdlc/DECISIONS.md` and `.sdlc/SPEC-PROPOSALS.md` from it onto the default branch before committing.
4. Do a **default-branch commit**: "force-park <id>".

## op: audit-result
Inputs: `{auditedIds, refuted: [{id, reasons}]}`.
- If `refuted` is empty, write `audit.json` as `{passed: true, ledgerHash: <current ledger hash>, auditedIds}`.
- Otherwise:
  1. Set each refuted requirement to `status: todo` and append its reasons to `notes`.
  2. Insert at the **front** of slices.json a new slice. Its id is `S-fix-<n>` (n = 1 + the number of existing `S-fix-` slices), with `kind: fix`, the refuted ids as requirements, `dependsOn: []`, `status: todo`, `phase: plan`, zeroed counters, and `notes` holding the reasons.
  3. Write audit.json as `{passed: false, ledgerHash: "", auditedIds}`.
- Append an `audit` log line.
- Do a **default-branch commit**: "audit result".
