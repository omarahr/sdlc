# sdlc — autonomous spec-to-product loop for Claude Code

`/sdlc` takes an approved spec and implements it end to end, without stopping to ask questions. It splits the spec into requirements and small vertical slices, and then runs each slice through an adversarial loop:

```
plan → tests first → implement → verify → review → integrate
                 └── on repeated failure: replan → split → spike → alternative → park

every milestone: plan scenarios → critique coverage → boot the real stack → run scenarios → judge failures → fix slices
```

Each slice is verified at its real boundary: integration tests through the public API against a real database, scoped to what the spec says. Anything the spec leaves undefined is noted for later instead of blocking the slice.

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

## What it writes to your repo

| File | Contents |
|---|---|
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
  sdlc-loop.js    # the workflow (orchestration)
  prompts/        # one prompt per role: planner, test-writer, implementer, verifier, reviewer, …
  test/           # tests for the workflow logic (node:test)
  fixtures/       # tiny specs for end-to-end checks
```

Run the tests with `npm test` (Node 20+).

## License

MIT
