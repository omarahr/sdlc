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
- Profile agents run 4 at a time, because each one starts its own database and test runs.
- The spec-fidelity verifier and the three code reviewers run on a different model (Fable 5.1) than the one that plans and writes the code, so one model's blind spots are not graded by the same model. The agents that challenge review findings stay on the session model, so each blocking finding is checked by both. Pass `reviewModel: null` in the workflow args to use the session model everywhere. If the review model is unavailable, that agent retries on the session model.

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
- `git`. For PR mode, the [GitHub CLI](https://cli.github.com) signed in with `gh auth login`.
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

Wrapping it in `/loop` is recommended. Each workflow run has a cap on how many agents it can use (850 by default), and the loop relaunches the run whenever it hits that cap or a usage limit. It checks back every 30 minutes until the spec is done.

| Command | What it does |
|---|---|
| `/sdlc <spec> [--git pr\|direct] [--max-iterations N] [--bar-raiser N]` | Start or resume a run |
| `/sdlc status` | Print the dashboard (`.sdlc/STATUS.md`) |
| `/sdlc stop` | Finish the current step, then exit. Run `/sdlc <spec>` to resume |

- `--git pr` (default when the repo has a GitHub remote): one branch and one PR per slice. It merges only once CI passes.
- `--git direct`: commits to the default branch. This is the default when there is no GitHub remote.
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

## Development

The workflow script and prompts live in `skills/sdlc/`:

```
skills/sdlc/
  SKILL.md        # the /sdlc command
  tracker/        # collect.py + template.html: the browser tracker
  sdlc-loop.js    # the workflow (orchestration)
  prompts/        # one prompt per role: planner, test-writer, implementer, verifier, reviewer, …
  test/           # tests for the workflow logic (node:test)
  fixtures/       # tiny specs for end-to-end checks
```

Run the tests with `npm test` (Node 20+).

## License

MIT
