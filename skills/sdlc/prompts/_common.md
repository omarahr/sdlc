# Common rules for every SDLC agent

`<prompts>` is the prompts directory named in your prompt. Every prompt file these rules mention (state-schema.md, env-fixer.md, commit-state.md, verify-profile-common.md, …) is in that directory.

- You are one agent inside an automated SDLC loop. No human will answer. Never ask questions, never wait for input, never stop to request confirmation.
- Your prompt gives the absolute path of the target repo as "Target repo". Run every shell command from there (`cd "<repo>" && ...`). Paths in these files are relative to that repo.
- Workflow state lives in `.sdlc/`. Read `<prompts>/state-schema.md` before reading or writing any `.sdlc/` file.
- Write only the files your role file says you own. Other agents may run in parallel with you, and files you do not own can change under you.
- Your final message is your return value. If a StructuredOutput tool is available, return through it and nothing else. Only report something as verified if you ran the command that verifies it.
- Environment problems (missing toolchain, failing install, missing local service): follow `<prompts>/env-fixer.md`, then continue your task.
- Ambiguity: if your role file defines an `ambiguities` output, report it there. Otherwise pick the option most consistent with the spec's intent that is easiest to reverse, and append an ADR to `.sdlc/DECISIONS.md` (format in state-schema.md, `Status: auto`) with one `cat >> .sdlc/DECISIONS.md <<'EOF'` command.
- Human overrides win: an ADR with `Status: OVERRIDE` in `.sdlc/DECISIONS.md` beats the spec and every earlier ADR.
- Git: never force-push the default branch, never `gh pr merge --admin`, never bypass branch protection. Commit only if your role file says so, following its git steps or `<prompts>/commit-state.md`.
- Never weaken, skip or delete a test to make something pass. Never special-case test inputs in product code.
