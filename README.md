# sdlc — autonomous spec-to-product loop for Claude Code

`/sdlc` takes an approved spec and implements it end to end, without stopping to ask questions. It splits the spec into requirements and small vertical slices, and then runs each slice through an adversarial loop:

```
plan → tests first → implement → verify → review → integrate
                 └── on repeated failure: replan → split → spike → alternative → park

every milestone: plan scenarios → critique coverage → boot the real stack → run scenarios → judge failures → fix slices
```

Each slice is verified at its real boundary by a **verification group**:
- A **verify-planner** breaks the slice into test scenarios and tags each with every **profile** that can prove it wrong.
- A **verify-toolsmith** builds any verification tool the profiles need that the repo does not have yet. The tools go into the repo's testkit, each with its own self-test, and later slices reuse them.
- One **profile verifier** per profile tests its scenarios, alongside the spec-fidelity and regression verifiers.

| Profile | Verifies | Against |
|---|---|---|
| `http-api` | endpoints, errors, persisted state | the real server and database |
| `async` | retries, backoff, outbox, leases | the worker loop on a fake clock |
| `concurrency` | uniqueness, idempotency, ordering | forced interleavings and the race detector |
| `data` | migrations, constraints, stored formats | the real database engine |
| `ui` | screens and interaction | Playwright and Chromium, with screenshots and axe |
| `i18n` | locales, fallback, RTL, bidi | UI and API in each locale |
| `cli` | commands, flags, exit codes, files | the built binary in a scratch project |
| `contract` | exported functions and types | the public entry point, with property and type tests |
| `security` | auth, tokens, tenancy, egress | an exploratory attack session |
| `limits` | stated sizes, timeouts, budgets, UI performance | measured at and past the spec's number (Chrome DevTools MCP when available) |

Verification scales with the slice:
- The planner rates each slice's risk, and the rating caps the group: low risk runs 2 profiles, medium 4, and high up to 8. Each profile agent works to a time limit.
- The full group runs once, in the slice's first round. Fix rounds re-run only the scenarios that failed or were blocked, and the regression lens re-runs every committed test.
- When a review finding sends the slice back for a fix, the planner adds scenarios for what the fix changed, and the profile verifiers test those.
- Profile agents run 4 at a time, because each one starts its own database and test runs.
- Every agent runs on the session model, the one the run is already using, so no particular model is required. You can have the spec-fidelity verifier and the three code reviewers run on a different model than the one that plans and writes the code, so one model's blind spots are not graded by the same model: pass `reviewModel` in the workflow args (one model name, or a list tried in order). The agents that challenge review findings stay on the session model, so each blocking finding is then checked by both. A review model that fails falls back to the next in the list and finally to the session model, and one that fails twice in a row is not tried again in that run. A review model that hangs instead of failing cannot be detected, which is why this is off by default.

Everything is scoped to what the spec says. Anything the spec leaves undefined is noted for later instead of blocking the slice.

When a milestone's slices are done, a **behavior campaign** checks what the running system actually does:
- It plans black-box scenarios from the spec, and every expected outcome cites the spec or an ADR. Critics then hunt for missing corner cases: authz, limits, races, retries, dependency failures and RTL.
- It boots the whole stack from source, then runners drive it through the API and Playwright. They check the response, the database, the logs, emitted events and metrics.
- Three independent judges reproduce every failure before it becomes a fix slice.
- The scenarios stay in the repo as an e2e suite that every later slice must keep green.

When every slice is done, a final audit checks the whole spec. Optional **bar-raiser** rounds then polish quality past what the spec asks for.

All progress lives in `.sdlc/` in your repo, so a run can be stopped, run into usage limits, or crash, and pick up where it left off.

## Install

In Claude Code:

```
/plugin marketplace add omarahr/sdlc
/plugin install sdlc@sdlc
```

Restart Claude Code if `/sdlc` doesn't show up right away.

To update later:

```
/plugin marketplace update sdlc
```

### Requirements

- A Claude Code version that has the **Workflow** tool (multi-agent workflows). The plugin launches the `sdlc-loop` workflow through it.
- `git`. For PR mode, the [GitHub CLI](https://cli.github.com) signed in with `gh auth login`. For MR mode on GitLab, the [GitLab CLI](https://gitlab.com/gitlab-org/cli) signed in with `glab auth login`.
- Python 3, which the loop uses to decide each next step and to build the tracker.
- Whatever toolchain your spec needs (Node, Go, Docker, …). The loop detects the build, test and lint commands on its own.

## Write the spec first (recommended: Superpowers)

`/sdlc` works best on a spec written with the **brainstorming** skill from [obra's Superpowers plugin](https://github.com/obra/superpowers). That skill turns an idea into an approved design through a short Q&A. The design it writes has what the loop relies on:
- clear intent and non-goals;
- the architecture and units;
- exact error behavior and limits;
- a testing strategy;
- a build order.

The slicer follows the build order. The behavior campaigns take their expected outcomes and corner cases from the error-handling and limits sections. The fewer gaps the spec leaves, the fewer decisions the loop has to make on its own.

1. Install Superpowers: `/plugin install superpowers@claude-plugins-official`.
2. Describe what you want to build and let the brainstorming skill lead. Review the spec it writes to `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md` before you approve it.
3. Hand the approved spec to the loop (below).

Any clear Markdown spec works, but a vague one leaves many autonomous decisions to the loop, so skim `DECISIONS.md`.

## Usage

Run it from inside a git repo with a clean working tree:

```
/loop /sdlc docs/superpowers/specs/2026-01-15-my-app-design.md
```

Wrapping it in `/loop` is recommended. Each workflow run has a cap on how many agents it can use (850 by default), and the loop relaunches the run whenever it hits that cap or a usage limit. It checks back every 30 minutes until the spec is done. If 24 runs in a row make no progress (about 12 hours), the loop stops and reports why; run `/sdlc <spec>` to start it again.

| Command | What it does |
|---|---|
| `/sdlc <spec> [--git pr\|direct\|mr] [--commit-format "<format>"] [--max-iterations N] [--bar-raiser N]` | Start or resume a run |
| `/sdlc status` | Print the dashboard (`.sdlc/STATUS.md`) |
| `/sdlc stop` | Finish the current step, then exit. Run `/sdlc <spec>` to resume |

- `--git pr` (default when the repo has a GitHub remote): one branch and one PR per slice. It merges only once CI passes.
- `--git mr` (default when the remote is a GitLab that `glab` is signed in to): commits every slice to the branch you started on, pushes it, and keeps **one** merge request for the whole run open against the remote's default branch. After each slice it waits for the pipeline and fixes CI-only failures. When the run is done it marks the merge request ready; you review and merge it. Start from a feature branch. It also works on GitHub, as one pull request for the run.
- `--git direct`: commits to the branch you are on and pushes nothing. This is the default when there is no GitHub remote and no signed-in GitLab.
- `--commit-format "<format>"`: the subject of every commit and the merge-request title, with the placeholders `{type}`, `{id}` and `{subject}`. For example `"{type}: [PROJ-123] {subject}"`. Without it, the run uses a format only when the repo enforces one (a GitLab push rule, commitlint or a commit-msg hook).
- `--bar-raiser N`: allow up to N polish rounds after the spec is complete. The default is 0.
- `--max-iterations N`: a smoke run that stops after N iterations.

Live progress shows in `/workflows`.

## Track progress in the browser

`/sdlc` builds a progress tracker at `.sdlc/tracker/index.html`. Open it in a browser and leave it open: the loop regenerates it on every 30-minute heartbeat, and the page reloads itself every minute. `/sdlc tracker` builds it on demand. It shows:
- slices and requirements done, and milestones verified;
- the milestone track, with each milestone's behavior-campaign status (to verify, fixing, verified) and its ETA;
- what is running right now (slice step, or campaign step);
- pace, likely finish and the run's agent budget;
- CPU load, and overheating on macOS;
- recent events, and what is waiting for you: parked slices, decisions and spec proposals.

![Example tracker](docs/tracker.png)

See the [live example page](https://htmlpreview.github.io/?https://github.com/omarahr/sdlc/blob/main/docs/example-tracker.html) (made-up data, source in [`docs/example-tracker.html`](docs/example-tracker.html)).

To build it outside Claude Code, from a clone of this repo:
```
python3 skills/sdlc/tracker/collect.py --repo /path/to/your/project
```
It also has a **Test reports** section linking to `.sdlc/tracker/reports/`, with one page per slice. When a slice merges (or is parked), a **test-reporter** writes its test completion report, `.sdlc/slices/<id>/REPORT.md`. It contains:
- a summary;
- traceability from each spec line to the cases that prove it;
- every scenario and case, in Given / When / Then form, with its evidence (HTTP exchanges, database diffs, attempt timelines, screenshots, transcripts, property runs);
- the security sessions;
- the defects found along the way and how each was fixed;
- what was not tested.

On the HTML pages, every test a report names has its source shown under it, and each verification round follows as an appendix. The Markdown files are committed with the rest of `.sdlc/`, so they can also be read on GitHub.

The collector needs Python 3 and nothing else. To share the tracker, ask Claude to publish `.sdlc/tracker/index.html` as an Artifact.

## What it writes to your repo

| File | Contents |
|---|---|
| `.sdlc/tracker/index.html` | The browser tracker (generated, gitignored) |
| `.sdlc/slices/<id>/REPORT.md` | The slice's test completion report, for you to read |
| `.sdlc/slices/<id>/verification/` | Each round's scenario plan and the profile verifiers' cases, evidence, logs and screenshots |
| `.sdlc/testkit.json` | The verification tools in the repo's testkit, and how to use them |
| `.sdlc/STATUS.md` | Dashboard: requirements and slices done, the current slice, recent events |
| `.sdlc/requirements.json`, `.sdlc/slices.json` | The spec broken into requirements and slices |
| `.sdlc/DECISIONS.md` | Every autonomous decision it made. **Skim this** |
| `.sdlc/SPEC-PROPOSALS.md` | Product ideas it found and left for you to decide |
| `.sdlc/milestones.json`, `.sdlc/milestones/<id>/` | Milestones and their behavior campaigns: scenarios, runs with raw evidence, judge verdicts and a report |
| `e2e/`, `e2e/pending.json` | The black-box e2e suite the campaigns build, and the scenarios waiting on a fix slice |
| `.sdlc/STUCK.md` | Written only if it livelocks. Contains the smallest human decision that would unblock it |
| `.sdlc/slices/<id>/` | Per-slice plans, reviews and verification reports |

## Before you run it

- **It is expensive.** Every slice goes through planning, test writing, implementation, integration-level behavior tests, review and verification, plus a black-box behavior campaign per milestone. As a rough guide, one real project averaged about 70 agents and about 4–5M subagent tokens per finished slice. Use it for well-specified projects on a plan with high limits.
- **It is heavy on your machine.** It runs builds, test suites, containers and browsers for hours. Behavior campaigns run at most three scenario runners at a time. On laptops, keep the machine plugged in and ventilated, and keep an eye on heat.
- **It only knows what the spec says.** Gaps in the spec are filled with autonomous decisions, and every one is logged in `DECISIONS.md`.
- **It never overwrites your uncommitted work.** It refuses to start on a dirty working tree.

## How it works

These diagrams follow `skills/sdlc/sdlc-loop.js` and `skills/sdlc/SKILL.md`. Every box is an agent role from `prompts/` or a function in the script.

### The driver: `/sdlc` relaunches the workflow until it ends

```mermaid
flowchart TD
  U(["/loop /sdlc spec.md"]) --> PF{"Pre-flight<br/>git repo, spec exists,<br/>clean tree, git mode, gh auth"}
  PF -- fail --> X1(["report and end"])
  PF -- ok --> DF["read driver.json if present<br/>(lastKey, streak, stalledRuns)"]
  DF --> L["launch the sdlc-loop workflow<br/>and build the tracker"]
  L --> HB["heartbeat every 30 min<br/>rebuild the tracker"]
  HB --> L2{"run finished?"}
  L2 -- no --> HB
  L2 -- yes --> SV["save the counters to driver.json"]
  SV --> S{"result state"}
  S -- "continue<br/>(did work, hit the agent cap)" --> L
  S -- "waiting or stalled" --> W["wait 30 min"] --> L
  S -- "done, stopped, livelock or stuck" --> DEL["delete driver.json"] --> E(["report and end the loop"])
```

- `waiting`: only PRs awaiting human review remain.
- `stalled`: the run completed nothing, or it repeated the same outcome three times.
- `stuck`: 24 stalled runs in a row, about 12 hours without progress.
- `livelock`: nothing can run without a human decision. `.sdlc/STUCK.md` names the smallest one.

### One run: read the state, pick one action, repeat

```mermaid
flowchart TD
  RS["state-reader<br/>syncs the repo with its PRs, then runs<br/>next-action.py on the .sdlc/ state"] --> D{"next action"}
  D -- "STOP file" --> stop(["stopped"])
  D -- "no config, or the spec changed" --> BS["bootstrap"]
  D -- "a PR is now mergeable" --> RM["retryMerge"]
  D -- "a slice is in progress,<br/>or the next todo slice is ready" --> SL["slice"]
  D -- "no milestones yet" --> MP["milestonePlan"]
  D -- "a milestone's slices are finished" --> MS["milestone"]
  D -- "a parked slice has retries left" --> PR["parkedRetry"]
  D -- "only PRs awaiting review" --> wait(["waiting"])
  D -- "audit missing or out of date" --> AU["audit"]
  D -- "nothing can run" --> LL["stuck-writer"] --> ll(["livelock"])
  D -- "spec complete,<br/>bar-raiser rounds left" --> BR["barRaiserRound"]
  D -- "everything finished" --> done(["done"])
  BS & RM & SL & MP & MS & PR & AU & BR --> G{"same outcome<br/>3 times in a row?"}
  G -- no --> H{"room under the agent cap<br/>for the next action?"}
  H -- yes --> RS
  H -- no --> cont(["continue"])
  G -- "yes, on a slice" --> FP["force-park the slice"] --> RS
  G -- "yes, no slice to park" --> st(["stalled or stuck"])
```

The workflow script cannot read files, so it never chooses the next step itself. Each iteration the state-reader agent runs `next-action.py`, a small script that reads the `.sdlc/` state and checks, in order: stop or bootstrap, work in flight, milestones, new work, nothing can start, wrap up. The workflow runs that one action and asks again. State the script cannot explain ends the run as stalled instead of guessing.

### Bootstrap: the spec becomes requirements and slices

```mermaid
flowchart LR
  A["env-detector<br/>build, test and lint commands,<br/>git mode"] --> B["requirements-extractor"]
  B --> C["completeness-critic"]
  C -- "found more" --> C
  C -- "2 dry rounds, or 8 rounds" --> D["slicer<br/>vertical slices in build order"]
  D --> E["state-writer<br/>bootstrap complete"]
```

### A slice: plan, tests first, build loop, integrate

```mermaid
flowchart TD
  subgraph Plan ["Plan (up to 3 revisions)"]
    P["planner"] --> AMB{"ambiguities?"}
    AMB -- yes --> DP["decision panel<br/>3 proposers and a judge,<br/>recorded as an ADR"] --> P
    AMB -- no --> PC["plan-critic x2<br/>spec-fidelity, architecture"]
    PC -- refuted --> P
  end
  P -- "too big" --> ESC
  PC -- "all clear" --> T
  subgraph Tests ["Tests first (3 attempts)"]
    T["test-writer"] --> TC["test-checker<br/>do the tests fail<br/>for the right reason?"]
    TC -- no --> T
  end
  TC -- yes --> I
  subgraph Build ["Build loop (3 fix rounds)"]
    I["implementer"] -- green --> V["verification group"]
    V -- refuted --> FX["next fix round,<br/>evidence fed back"] --> I
    V -- pass --> RV["reviewer x3<br/>security, architecture, test-quality"]
    RV --> FR["finding-refuter<br/>challenges blocking findings"]
    FR -- "a blocking finding survives" --> FX
    I -- "not green" --> FX
  end
  FR -- "nothing blocking" --> REP["test-reporter<br/>REPORT.md"]
  REP --> INT["integrator<br/>PR or direct commit"]
  INT --> OUT(["merged, or awaiting merge"])
  PC -- "3 refutations" --> ESC["escalation ladder"]
  TC -- "3 failed attempts" --> ESC
  FX -- "3 rounds used" --> ESC
  INT -- failed --> ESC
```

Progress is saved after each phase, so a resumed slice picks up where it stopped. Review findings that do not block, and verifier ideas outside the spec, are kept as seeds for the bar raiser.

### The verification group

```mermaid
flowchart TD
  R0{"first round?"}
  R0 -- yes --> VP["verify-planner<br/>scenarios, profiles, risk, tools"]
  VP --> CAP["cap the profiles by risk<br/>low 2, medium 4, high 8"]
  R0 -- "no, a fix round" --> PEND["re-run only the scenarios<br/>that failed or were blocked"]
  R0 -- "no, after a review fix" --> RF["verify-planner<br/>adds scenarios for the fix"]
  RF --> TS
  CAP --> TS{"tools missing?"}
  PEND --> TS
  TS -- yes --> TSM["verify-toolsmith<br/>builds testkit tools with self-tests"] --> PAR
  TS -- no --> PAR
  subgraph PAR ["in parallel"]
    SF["verifier: spec-fidelity<br/>(review model)"]
    RG["verifier: regression<br/>every committed test"]
    PV["one verifier per profile,<br/>4 at a time, each on its own branch"]
  end
  PV --> COL["verify-collector<br/>folds the profile tests<br/>into the slice branch"]
  SF & RG & COL --> TALLY{"any of the 3 votes refuted?<br/>spec-fidelity, profiles, regression"}
  TALLY -- yes --> BACK(["back to the implementer"])
  TALLY -- no --> REV(["on to review"])
```

### The escalation ladder

```mermaid
flowchart LR
  F(["repeated failure"]) --> S1["Step 1: replan"] --> S2["Step 2: split"] --> S3["Step 3: spike"] --> S4["Step 4: alternative<br/>a decision panel picks<br/>a new approach"] --> S5["Step 5: park<br/>with a test report"]
  S5 -. "retried later, up to 3 times" .-> S1
```

Each failure climbs one rung. A parked slice never blocks the slices that depend on it. An improvement slice from the bar raiser is reverted and rejected at the last rung instead of parked.

### A milestone's behavior campaign

```mermaid
flowchart TD
  SP["scenario-planner<br/>black-box scenarios,<br/>each citing the spec or an ADR"] --> CC["coverage-critic x3<br/>spec-coverage, adversary, observability"]
  CC -- "gaps (up to 3 revisions)" --> SP
  CC -- clear --> EH["e2e-harness<br/>boots the whole stack from source"]
  EH -- "cannot run" --> BL(["milestone blocked"])
  EH -- ok --> SR["scenario-runner per area, 3 at a time<br/>API, UI, database, logs, events, metrics"]
  SR --> FAILS{"failures?"}
  FAILS -- none --> MW
  FAILS -- "yes (first 8)" --> BJ["behavior-judge x3 per failure<br/>each reproduces it independently"]
  BJ -- "a majority refutes it" --> DIS["dismissed<br/>test bug, spec gap, flaky, out of scope"]
  BJ -- otherwise --> BUG["product bug"]
  DIS & BUG --> MW["milestone-writer<br/>status and fix slices"]
  MW --> NX(["verified, or fixing:<br/>the fix slices run, then the campaign<br/>runs again (3 attempts at most)"])
```

### The final audit and the bar raiser

```mermaid
flowchart TD
  subgraph Audit
    AP["audit-planner<br/>requirements in chunks"] --> AD["auditor x3 per chunk"]
    AD --> AW["state-writer<br/>records the result"]
    AW -- "some refuted" --> RO(["requirements reopened"])
    AW -- "none refuted" --> OK(["audit passed"])
  end
  subgraph Bar ["Bar raiser (only with --bar-raiser N)"]
    BRR["barraiser-reader<br/>ideas seen so far, seed backlog"] --> BF["bar-finder x7<br/>performance, security hardening, test gaps,<br/>accessibility and RTL, resilience,<br/>observability, code health"]
    BF --> DD["drop duplicates, take 20"]
    DD --> BC{"changes behavior?"}
    BC -- yes --> PROP["SPEC-PROPOSALS.md,<br/>for you to decide"]
    BC -- no --> BJ2["bar-judge x3"]
    BJ2 --> BW["barraiser-writer<br/>accepted ideas become<br/>improvement slices"]
    BW --> DRY(["ends after 2 dry rounds<br/>or N rounds"])
  end
```

## Development

The workflow script and prompts live in `skills/sdlc/`:

```
skills/sdlc/
  SKILL.md        # the /sdlc command
  tracker/        # collect.py + template.html: the browser tracker
  sdlc-loop.js    # the workflow (orchestration)
  next-action.py  # decides the next action from the .sdlc/ state
  prompts/        # one prompt per role: planner, test-writer, implementer, verifier, reviewer, …
  test/           # tests for the workflow logic (node:test)
  fixtures/       # tiny specs for end-to-end checks
```

Run the tests with `npm test` (Node 20+).

## License

MIT
