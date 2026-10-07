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
  "forge": "github",
  "defaultBranch": "main",
  "runBranch": "",
  "targetBranch": "",
  "commitFormat": "",
  "runRequest": null,
  "commands": { "install": "", "build": "", "test": "", "lint": "", "typecheck": "", "e2e": "" },
  "environment": []
}
```
- `specPath` is repo-relative.
- `specHash` is written only by the state-writer `bootstrap-complete` op.
- `overridesSeen` counts the lines matching `^- Status: OVERRIDE` in DECISIONS.md.
- `gitMode` is `pr`, `direct`, `mr` or `stack`.
  - `pr`: one branch and one pull request per slice (GitHub only).
  - `direct`: the loop works on its run branch (`sdlc/run-<n>` in the run worktree), and the integrator pushes finished work onto `defaultBranch` (`git push origin HEAD:<defaultBranch>`); `defaultBranch` itself is never checked out or committed to.
  - `mr`: as `direct`, and the integrator also pushes `defaultBranch` and keeps one merge request for the whole run open against `targetBranch` (run-request.md). Wherever a prompt names only `pr` and `direct`, `mr` behaves as `direct`.
  - `stack`: one branch per slice inside one branch per milestone, on a run branch of their own. Slice pull requests target their milestone branch; the milestone pull request targets `defaultBranch`. GitHub only.
- `forge` is `github`, `gitlab` or `""`.
- `defaultBranch` is the remote's default branch in `pr` and `stack` mode. In `direct` and `mr` mode it is the branch the finished work is pushed onto — never a branch the agents check out or commit to, the loop's working branch is the run branch. In `stack` mode nothing is ever committed to it directly; the working branch is `runBranch`.
- `runBranch` is `""` outside `stack` mode. In `stack` mode it is the branch the whole run builds on, `sdlc/run-<n>`.
- `targetBranch` is set only in `mr` mode: the branch the run's merge request targets.
- `commitFormat` is `""` (use the subjects the role files give) or a format for every commit subject and merge-request title (see _common.md).
- `runRequest` is `null` or `{"url", "number"}`: the run's merge request, written by the integrator in `mr` mode.
- A command that does not apply is `""`.
- `environment` lists the install and service commands the env-fixer ran.
- An optional `keepEvidence: true` makes the integrator skip the retention prune of `.sdlc/slices/<id>/verification/` (see `slices/<id>/`).
- An optional `janitorDays` sets the scratch age in days at which `janitor.py` reaps the `sdlc-` directories under the OS temp dir (default 7).
- `commands.e2e` is set by the e2e-harness: one command that boots the whole system, runs every e2e test except the ids in `e2e/pending.json`, and tears it down.

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
    "risk": "",
    "riskReason": "",
    "seeds": [],
    "ideaKeys": [],
    "notes": "",
    "counters": { "planRevisions": 0, "fixRounds": 0, "ladderStep": 0, "parkCycles": 0, "verifyDemanded": false, "infraRetries": 0, "gateCommit": "" }
  }
]
```
- `kind` is `spec`, `improvement` or `fix`. Fix slices come from the audit (`S-fix-<n>`) or from a milestone's behavior campaign (`S-fix-<milestone>-<n>`).
- `risk` is `low`, `medium` or `high`, assigned by the slicer. A `low` slice skips the per-slice verification battery (the milestone's behavior campaign still covers it, and a reviewer can demand the battery back). A slice with no `risk` — written before this field existed, or a fix slice — is unrated and always gets the full battery.
- `status` is `todo`, `in_progress`, `awaiting-merge`, `done`, `parked` or `rejected`.
- `phase` is `plan`, `tests`, `implement`, `gate` or `integrate`.
- `counters.verifyDemanded` is `true` once a reviewer's `needsVerify` verdict demanded the verification battery for a `low` slice; the battery then runs for it from that round on.
- `counters.infraRetries` counts consecutive inconclusive (infra) rounds. An inconclusive round proves nothing, so it is replayed at the same fix round; the next build round with a verdict resets the count to 0 — a gate round and a review-blocked round do not — and three in a row parks the slice with `infraDebt`.
- `counters.gateCommit` is the commit the gate receipt covers (`""` until the gate passes); a code change after the passed gate invalidates it and forces a regate.
- `infraDebt` (boolean, optional) marks a slice parked after three consecutive infra failures; resuming it keeps the slice's phase and counters instead of re-planning.
- `ledger` (array, optional) records the slice's verification rounds and their outcomes. Each row is `{ "kind": "verify" | "gate", "round": <n>, "outcome": "verified" | "refuted" | "infra", "refutations": <n>, "failingTests": <n> }` (the numbers are counts). The loop appends one row per verify round — `verified` passed every lens, `refuted` failed with evidence (a round the implementer could not get green counts as `refuted` with zero refutations, and a review-blocked round on a `low` slice carries the blocking findings' count in `refutations`), `infra` was inconclusive — a cut-off run, a blocked scenario, or a verifier that failed to report — and replayed outside the fix-round economy — and one `gate` row (`round: 0`) per gate verdict. Every state-write that ends a round carries the full array, so the last row of any `ledger` patch is that round's outcome. Whether a refutation was fixed, dismissed by the refuters, or raised as a seed is not stored: the tracker derives it from consecutive rounds (a `refuted` row followed by a `verified` row at a higher round is a fix).
- A slice that was split is `rejected` and lists the slices it became in `splitInto` (for example `["S-013a", "S-013b"]`). It counts as finished, or as a met dependency, once every one of those does.

## milestones.json
Created by the milestone-planner. The slicer appends slices to it, and the milestone-writer updates status after each campaign.
```json
[
  {
    "id": "M-1",
    "title": "Sessions and submit",
    "demo": "Publish a form, open a session, submit answers and see them stored",
    "ui": false,
    "slices": ["S-014", "S-015", "S-016"],
    "status": "pending",
    "attempts": 0,
    "lastRun": "",
    "fixSlices": [],
    "pr": "",
    "gaps": []
  }
]
```
- `status` is `pending`, `fixing`, `verified` or `exhausted`. `exhausted` means 3 campaigns ran without verifying, and `gaps` says what still fails, for a human.
- `pr` is `""` or the milestone pull request's url, set by the milestone-writer in `stack` mode.
- Members are the listed slices, their split children (the listed id followed by a letter) and `fixSlices`.

## milestones/<id>/
| File | Owner |
|---|---|
| `scenarios.json`, `scenarios.md` | scenario-planner |
| `coverage-<lens>-r<n>.md` | coverage-critic |
| `run-<area>.md` | scenario-runner: expected, observed and raw evidence per scenario |
| `judge-<scenario>-v<k>.md` | behavior-judge |
| `report.md` | milestone-writer |

## e2e/pending.json
Maps a scenario id to the fix slice that owns it: `{"SC-M-1-004": "S-fix-M-1-1"}`. The e2e command skips these tests. The milestone-writer adds entries, and the fix slice's test-writer removes them.

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
{"ts":"<date -u +%FT%TZ>","type":"bootstrap|slice-merged|slice-awaiting-merge|slice-escalated|milestone|audit|bar-raiser|state-pr-blocked|note","slice":"S-001","detail":"..."}
```

## STATUS.md
Every agent that writes state regenerates it with `python3 "<skill>/state-write.py" status --repo .`. If the script cannot run, overwrite the file by hand with this template:
```
# SDLC status: <spec title>
Updated: <date -u +%FT%TZ>

Requirements: <done>/<total> done · <parked> parked · <external-stub> stubbed · <obsolete> obsolete
Slices: <done>/<total> done · current: <id title | none> · awaiting merge: <ids>
Milestones: <verified>/<total> verified · next: <id title | none> · fixing: <ids>
Audit: <passed | pending> · Bar raiser: round <rounds>, dry rounds <dryRounds>/2
ADRs: <count> · Spec proposals: <count>

## Recent
<last 10 log.jsonl lines as "- ts type slice detail">

## Needs a human eye (non-blocking)
<parked slices with one-line reason; exhausted milestones and milestone gaps; awaiting-merge PR links; STUCK.md if present>
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
| `verify-<lens>-r<round>.md` | verifier (spec-fidelity, regression) |
| `verification/plan-r<round>.json`, `.md` | verify-planner: scenarios, their profiles, the tools needed |
| `verification/r<round>/<profile>-<part>.json`, `.md` | verify-<profile>: cases, evidence and attacks (format in verify-profile-common.md) |
| `verification/r<round>/logs/`, `assets/` | verify-<profile> and verifier: long output, screenshots, traces |
| `verification/r<round>/tests/<profile>-<part>/` | verify-<profile>: unpromoted test files, written into the main tree as evidence |
| `verification/suite-receipt.json` | verifier (regression), through `suite-receipt.py`: the commit and code the full suite last ran on, its result and the test command's wall time |
| `gate-r0.md` | gate: the full-repo regression lens report written when the gate runs, plus the receipt confirmation line |
| `review-<lens>-r<round>.md` | reviewer |
| `spike.md` | escalator |
| `evidence.md` | integrator |

- The verifier's `scope` input is `slice` during build rounds — the regression lens maps the diff with `impact.py` — and `full` at the gate, where the full battery and the suite receipt run.
- When the slice merges, the integrator prunes `.sdlc/slices/<id>/verification/`: the per-round parts, `logs/`, `assets/` and unpromoted `tests/` are deleted, except `verification/suite-receipt.json` — `suite-receipt.py` `check` and `baseline` read only that path — and a copy of the receipt lands in `.sdlc/reports/<id>/suite-receipt.json`. `gate-r0.md` and the regression logs' final copies move to `.sdlc/reports/<id>/`. `plan.md`, `tests.md`, `failures.md`, `evidence.md`, every `verify-*.md` and `review-*.md`, ADRs and the ledger are kept. `keepEvidence: true` in config.json skips the prune.

## reports/<id>/
The slice's human-facing record, a sibling of the slice directory. The test-reporter creates it and commits its contents on `sdlc/<id>`; the integrator fills the rest at the retention prune.
| File | Owner |
|---|---|
| `REPORT.md`, `assets/` | test-reporter: the slice's test completion report and its screenshots |
| `gate-r0.md` and the regression logs' final copies | integrator: moved from `.sdlc/slices/<id>/` at the prune |
| `suite-receipt.json` | integrator: a copy of `.sdlc/slices/<id>/verification/suite-receipt.json` |

## test-baseline.json
Written by the regression verifier through `suite-receipt.py baseline-write`: the test command's wall time on the default branch, `{commit, code, seconds, at}`, for the test-time budget. It is only measured when no slice's receipt covers the default branch's code.

## testkit.json
Owned by the verify-toolsmith: the registry of verification tools in the repo's testkit, which the verify-planner and the profile verifiers read.
```json
[{ "id": "stub-server", "profiles": ["http-api", "async", "security"], "language": "go", "path": "backend/internal/testkit/stub", "usage": "s := stub.New(t); s.FailNext(2, 503); …", "selfTest": "go test ./internal/testkit/stub", "addedBy": "S-021 r0", "notes": "" }]
```

## STOP
`.sdlc/STOP` is a sentinel created by `/sdlc stop`. It is gitignored. The stop probe reads it from `mainRoot` — the checkout that owns the run, which the driver passes to the state-reader — because the run worktree never holds it.

## tracker/
`.sdlc/tracker/index.html`, `status.json` and `reports/` (the slice test reports as HTML) are generated by `tracker/collect.py` from the files above. They are gitignored, and no agent writes them.
