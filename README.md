# sdlc — autonomous spec-to-product loop for Claude Code

`/sdlc` takes an approved spec and implements it end to end, without stopping to ask questions. It splits the spec into requirements and small vertical slices, and then runs each slice through an adversarial loop:

```
plan → tests first → implement → verify → review → integrate
                 └── on repeated failure: replan → split → spike → alternative → park
```

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

## Usage

Run it from inside a git repo with a clean working tree:

```
/loop /sdlc docs/spec.md
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
| `.sdlc/STUCK.md` | Written only if it livelocks. Contains the smallest human decision that would unblock it |
| `.sdlc/slices/<id>/` | Per-slice plans, reviews and verification reports |

## Before you run it

- **It is expensive.** Every slice goes through planning, test writing, implementation, several rounds of adversarial "breaker" tests, review and verification. As a rough guide, one real project averaged about 70 agents and about 4–5M subagent tokens per finished slice. Use it for well-specified projects on a plan with high limits.
- **It is heavy on your machine.** It runs builds, test suites and containers for hours. On laptops, keep the machine plugged in and ventilated, and keep an eye on heat.
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
