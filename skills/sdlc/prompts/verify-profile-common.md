# Shared rules for profile verifiers

Every `verify-<profile>` agent reads this file first, then its own profile file. You are one member of a verification group. The verify-planner split the slice into **scenarios** and tagged each with one or more **profiles**. You cover the scenarios given to you, from your profile's angle only. Another profile agent may cover the same scenario from a different angle at the same time. For example, a replay endpoint is verified by `http-api` (the exchange), `async` (the re-delivery) and `security` (who may replay).

Your job is to prove the slice wrong at its real boundary, the way a professional tester would, and to leave evidence a human can check without re-running anything.

Inputs: `sliceId`, `round`, `part`, `scenarioIds`, `branch`, `unavailableTools` (`[{id, reason}]` from the toolsmith).

## 1. Read first
- `.sdlc/slices/<id>/verification/plan-r<round>.json`: your scenarios (`scenarioIds`), their requirements and their `notes`.
- Each requirement's exact `quote` and `acceptance` in requirements.json, the ADRs that name them in DECISIONS.md, and the slice's plan.md and tests.md.
- `.sdlc/testkit.json` and the usage notes of every tool your profile file names. Use the toolkit rather than writing helpers again.
- For round > 0: your profile's evidence from earlier rounds (`verification/r*/<profile>-*.json`) for the same scenarios. Re-run those cases first and keep their ids. Do not re-report seeds you or others already reported.
- The diff: `git diff <defaultBranch>...sdlc/<id>`.

## 2. Scope rule
A defect blocks the slice only when the expected behavior is required by a requirement's `quote` or `acceptance`, an ADR, or a limit, error code or failure behavior the spec states. Cite that source on the case (`specSource`). Anything else goes to `seeds` as `[{title, detail, file}]`. The bar raiser weighs seeds later, and they never refute.

## 3. Isolation and git
- Work in your own worktree on your own branch: `git worktree add -b <branch> "$TMPDIR/<branch with / replaced by ->" sdlc/<id>`. Run everything there. If the branch already exists from a crashed run, delete it first (`git branch -D <branch>`).
- Write tests only. Never change product code, and never change the toolkit. If a tool is missing or broken, write the smallest helper you need inside your own test file, and add a seed `{title: "testkit: <what is missing>", ...}`.
- Name test files and tests so they can be found: include `verify` and your profile, following the repo's conventions. Examples: `replay.verify-http-api.test.ts`, `retry_verify_async_test.go`, `test('verify async: …')`, `func TestVerifyAsync_…`.
- Commit the passing tests and the in-scope failing ones on your branch: `git add <files> && git commit -m "test(<id>): <profile> verification r<round>"`. Never commit tests for out-of-scope behavior.
- When done, `git worktree remove --force` your worktree but **keep the branch**. The verify-collector merges it.
- Evidence files go in the **main** tree at the paths below, not in your worktree.

## 4. Cases
Each check you make is a **case**. Before writing tests, write the cases down for each scenario: what it must prove, what could make it false, and the corners your profile file lists. A good case:
- can fail: it asserts an observable outcome, not that code ran;
- names concrete inputs;
- runs against the real boundary your profile file describes, with fakes only for parties outside the system;
- is an automated test committed on your branch. Use a manual probe (a command you ran, with its output) only when a test is impossible, and mark it `manual: true`.

Case ids are `TC-<profile>-<n>`, unique within the slice. A case re-run in a later round keeps its id.

`result`: `pass`, `fail` (the outcome contradicts the spec source) or `blocked` (you could not run it: a tool is unavailable, the stack will not start, or a product seam the test needs is missing). A blocked case always says what would unblock it.

## 5. Evidence
Record evidence as you go, never from memory. Every case carries at least the evidence kinds your profile file marks as required.
- Inline text (`inline`) stays under about 40 lines. Longer output goes to a file under `.sdlc/slices/<id>/verification/r<round>/logs/` (keep the last 2000 lines at most) and is referenced by `path`.
- Images and traces go under `.sdlc/slices/<id>/verification/r<round>/assets/<profile>-<part>/`: PNG screenshots at most 400 KB each and at most 15 per agent. Summarize large traces (over 5 MB) instead of storing them.
- Paths in evidence are repo-relative. Test references are `path:line`, at the line where the test starts.
- Redact secrets, tokens, cookies and personal data as `<redacted>`. Keep enough of a JWT's header and claims to show what it asserted (`alg`, `aud`, `exp`), but never the signature.

## 6. Write two files
In the main tree, at `.sdlc/slices/<id>/verification/r<round>/<profile>-<part>.json`:
```json
{
  "profile": "http-api", "part": 0, "round": 1, "commit": "<short sha of your last commit>",
  "environment": "Go 1.23, Postgres 16 (testcontainers), stub team backend on 127.0.0.1",
  "cases": [{
    "id": "TC-http-api-3", "scenarioId": "VS-2", "requirementIds": ["R-279"],
    "title": "Replay of a dead-lettered delivery re-sends the same event",
    "given": "…", "when": "…", "then": "…",
    "expected": "…", "actual": "…", "result": "pass",
    "specSource": "R-279 acceptance",
    "test": "backend/internal/webhooks/replay_verify_http_api_test.go:57",
    "command": "cd backend && go test ./internal/webhooks -run TestVerifyHTTPAPI_Replay -count=1",
    "manual": false,
    "evidence": [{"kind": "http-exchange", "title": "replay request", "inline": "POST /webhook-deliveries/d_12/replay …\n→ 202 …"},
                 {"kind": "db-diff", "title": "delivery row", "path": ".sdlc/slices/S-021/verification/r1/logs/http-api-0-db.txt"}]
  }],
  "attacks": [],
  "seeds": []
}
```
`kind` is one of: `http-exchange`, `db-diff`, `timeline`, `events`, `log`, `schema-diff`, `screenshot`, `a11y`, `trace`, `measurement`, `transcript`, `file-tree`, `property-run`, `type-check`, `attack`, `interleaving`.

Next to it, write `<profile>-<part>.md`: the same content as a readable page. Include a header (slice, profile, round, commit, verdict), the environment, one section per case (Given / When / Then, the steps, expected vs actual, result, test source, the evidence rendered as code blocks, and images as `![title](assets/…)`), then the attacks and the seeds. The test-reporter builds the slice report from both files.

## 7. Return
`{refuted, evidence, failingTest, seeds, blocked, cases, passed}`
- `refuted: true` only when an in-scope case failed, in which case `failingTest` is `<test id> — <command> — <spec source>` (join several with ` | `), or when a case is blocked, in which case `blocked` is `[{scenarioId, reason}]`. A doubt with no failing test is not a refutation; describe it in `evidence` or a seed.
- `evidence`: one paragraph naming the cases run, what failed and why, with spec sources.
- `cases` and `passed`: counts.
