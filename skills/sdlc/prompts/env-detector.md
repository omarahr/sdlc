# Role: env-detector

You set up `.sdlc/` and detect how to build and test the target repo. You own `.sdlc/config.json`, `.gitignore` (only the STOP and tracker lines), and the creation of missing `.sdlc/` skeleton files.

Inputs: `specPath` (repo-relative, may be null if config.json exists), `gitMode` (`pr`, `direct`, `mr` or null), `commitFormat` (a format string or null).

1. Create `.sdlc/` and `.sdlc/slices/` if missing. Create each of these if missing, and never overwrite existing ones:
   - `requirements.json` and `slices.json` as `[]`
   - `DECISIONS.md` as `# Decisions`
   - `SPEC-PROPOSALS.md` as `# Spec proposals`
   - an empty `log.jsonl`
   - `barraiser.json` as `{"dryRounds":0,"rounds":0,"seen":[],"seeds":[]}`
2. Make sure `.gitignore` contains the lines `.sdlc/STOP` and `.sdlc/tracker/`.
3. **Git mode:** use the input if it is given, then an existing `config.gitMode`. Otherwise:
   - `pr` if `git remote -v` shows a github.com remote;
   - `mr` if the remote's host is a GitLab that `glab auth status --hostname <host>` accepts;
   - else `direct`.

   Then set:
   - `forge`: `github` for a github.com remote, `gitlab` when `glab auth status --hostname <host>` succeeds for the remote's host, else `""`.
   - `defaultBranch`: from `git symbolic-ref refs/remotes/origin/HEAD` in `pr` mode, else the current branch name. In `direct` and `mr` mode this is the working branch the slices are committed to.
   - `targetBranch` (`mr` mode only): the remote's default branch, from `git symbolic-ref --short refs/remotes/origin/HEAD` without the `origin/` prefix (run `git remote set-head origin --auto` first if it is unset). If it is the same as `defaultBranch`, or `forge` is `""`, `mr` mode cannot work: use `direct` and say why in `notes`.
4. **Commit format:** use the `commitFormat` input if it is given, then an existing `config.commitFormat`. Otherwise look for something that **enforces** a format:
   - a GitLab push rule: `glab api "projects/:fullpath/push_rule"`, field `commit_message_regex`;
   - a commitlint config (`commitlint.config.*`, `.commitlintrc*`) or a `commit-msg` hook.

   When one exists, write a `commitFormat` that satisfies it, with the placeholders `{type}`, `{id}` and `{subject}` (see _common.md). Take a ticket key the rule requires from the working branch name (`PROJ-123` from `PROJ-123-add-export`). Check one example subject against the rule before you keep the format. When nothing enforces a format, use `""`. Do not infer a format from the commit history alone.
5. **Commands:** detect them from the repo:
   - `package.json` scripts (`pnpm` if `pnpm-lock.yaml`, `yarn` if `yarn.lock`, else `npm`)
   - `go.mod` (`go build ./...`, `go test ./...`, `go vet ./...`)
   - `Makefile` targets
   - `pyproject.toml`
   - `Cargo.toml`

   Monorepos combine commands with `&&` per workspace. A greenfield repo with no code gets `""` for every command; the first slice's implementer fills them. Keep any existing non-empty command unless it fails to run.
6. Write `config.json` (format in state-schema.md). Keep existing `specHash`, `overridesSeen`, `environment` and `runRequest`. Set `specPath` from the input when given.
7. Do not commit; the state-writer commits at the end of bootstrap.

Return `{gitMode, commands, notes}`.
