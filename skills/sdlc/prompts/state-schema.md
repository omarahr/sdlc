# `.sdlc/` state formats

All JSON files are pretty-printed with 2-space indentation. Hash commands:
- spec hash: `shasum -a 256 "<specPath>" | cut -d' ' -f1`
- ledger hash: `jq -c '[.[] | {id, status}]' .sdlc/requirements.json | shasum -a 256 | cut -d' ' -f1`
- If `jq` is missing, install it per env-fixer.md.

## config.json
Owned by env-detector. The state-writer sets `specHash` and `overridesSeen`; the implementer may fill empty `commands` while scaffolding.
```json
{
  "specPath": "docs/spec.md",
  "specHash": "",
  "overridesSeen": 0,
  "gitMode": "pr",
  "defaultBranch": "main",
  "commands": { "install": "", "build": "", "test": "", "lint": "", "typecheck": "" },
  "environment": []
}
```
- `specPath` is repo-relative.
- `specHash` is written only by the state-writer `bootstrap-complete` op.
- `overridesSeen` counts the lines matching `^- Status: OVERRIDE` in DECISIONS.md.
- `gitMode` is `pr` or `direct`.
- A command that does not apply is `""`.
- `environment` lists the install and service commands the env-fixer ran.

## requirements.json
The extractor and critic add entries. The integrator sets `done` and evidence. The state-writer reopens and parks. The escalator parks.
```json
[
  {
    "id": "R-001",
    "specRef": "§4.2",
    "quote": "Field ids are frozen on publish",
    "acceptance": "Renaming a field id of a published version is rejected with FIELD_ID_FROZEN",
    "status": "todo",
    "flags": [],
    "adrs": [],
    "evidence": { "files": [], "tests": [], "commit": "" },
    "notes": ""
  }
]
```
- `status` is `todo`, `in_progress`, `done` or `parked`.
- `flags` can include `external-stub` and `obsolete`.
- Ids are never reused.
- A requirement whose spec text was removed becomes `done` with the `obsolete` flag and a note.

## slices.json
The slicer creates slices. The state-writer patches them. The escalator restructures them. The barraiser-writer and state-writer append.

Array order is execution order, and a human may reorder it.
```json
[
  {
    "id": "S-001",
    "title": "Project scaffolding and test runner",
    "requirements": ["R-001"],
    "dependsOn": [],
    "kind": "spec",
    "status": "todo",
    "phase": "plan",
    "branch": "sdlc/S-001",
    "pr": "",
    "seeds": [],
    "ideaKeys": [],
    "notes": "",
    "counters": { "planRevisions": 0, "fixRounds": 0, "ladderStep": 0, "parkCycles": 0 }
  }
]
```
- `kind` is `spec`, `improvement` or `fix`.
- `status` is `todo`, `in_progress`, `awaiting-merge`, `done`, `parked` or `rejected`.
- `phase` is `plan`, `tests`, `implement` or `integrate`.

## DECISIONS.md (append-only)
```
### ADR-<YYYYMMDD-HHMMSS>-<role>: <title>
- Status: auto
- Context: <what forced the decision>
- Options: <considered options>
- Decision: <chosen option>
- Consequences / how to reverse: <...>
- Affects: <R-xxx, S-xxx>
```
Humans write `Status: OVERRIDE` entries. Agents never do. Timestamps come from `date -u +%Y%m%d-%H%M%S`; append the slice id and a 4-character suffix (`$(openssl rand -hex 2)`) so parallel agents never collide: `ADR-<ts>-<role>-<sliceId>-<hex>`.

## SPEC-PROPOSALS.md (append-only)
```
### P-<YYYYMMDD-HHMMSS>: <title>
- Source: bar-raiser | contradiction ADR-<id>
- Proposal: <...>
- Rationale: <...>
```

## log.jsonl (append-only, one JSON object per line)
```json
{"ts":"<date -u +%FT%TZ>","type":"bootstrap|slice-merged|slice-awaiting-merge|slice-escalated|audit|bar-raiser|state-pr-blocked|note","slice":"S-001","detail":"..."}
```

## STATUS.md
Every agent that writes state regenerates it by overwriting it with this template:
```
# SDLC status — <spec title>
Updated: <date -u +%FT%TZ>

Requirements: <done>/<total> done · <parked> parked · <external-stub> stubbed · <obsolete> obsolete
Slices: <done>/<total> done · current: <id title | none> · awaiting merge: <ids>
Audit: <passed | pending> · Bar raiser: round <rounds>, dry rounds <dryRounds>/2
ADRs: <count> · Spec proposals: <count>

## Recent
<last 10 log.jsonl lines as "- ts type slice detail">

## Needs a human eye (non-blocking)
<parked slices with one-line reason; awaiting-merge PR links; STUCK.md if present>
```

## audit.json (owned by the state-writer)
```json
{ "passed": true, "ledgerHash": "<ledger hash>", "auditedIds": ["R-001"] }
```

## barraiser.json
Owned by the barraiser-writer; the integrator appends `seeds`; the escalator marks ideas rejected.
```json
{ "dryRounds": 0, "rounds": 0, "seen": [{ "key": "perf-engine-memo-graph", "verdict": "accepted" }], "seeds": [{ "title": "...", "detail": "...", "file": "..." }] }
```
`verdict` is `accepted`, `rejected` or `proposal`.

## slices/<id>/
| File | Owner |
|---|---|
| `plan.md` | planner |
| `idea.md` | barraiser-writer (improvement slices) |
| `tests.md` | test-writer: one line per test, `<test id> — <requirement id> — <expected failure reason before implementation>`, where characterization tests say `characterization` |
| `failures.md` | append-only: implementer, escalator, state-writer |
| `verify-<lens>-r<round>.md` | verifier |
| `review-<lens>-r<round>.md` | reviewer |
| `spike.md` | escalator |
| `evidence.md` | integrator |

## STOP
`.sdlc/STOP` is a sentinel created by `/sdlc stop`. It is gitignored.
