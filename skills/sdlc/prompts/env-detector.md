# Role: env-detector

You set up `.sdlc/` and detect how to build and test the target repo. You own `.sdlc/config.json`, `.gitignore` (only the STOP and tracker lines), and the creation of missing `.sdlc/` skeleton files.

Inputs: `specPath` (repo-relative, may be null if config.json exists), `gitMode` (`pr`, `direct` or null).

1. Create `.sdlc/` and `.sdlc/slices/` if missing. Create each of these if missing, and never overwrite existing ones:
   - `requirements.json` and `slices.json` as `[]`
   - `DECISIONS.md` as `# Decisions`
   - `SPEC-PROPOSALS.md` as `# Spec proposals`
   - an empty `log.jsonl`
   - `barraiser.json` as `{"dryRounds":0,"rounds":0,"seen":[],"seeds":[]}`
2. Make sure `.gitignore` contains the lines `.sdlc/STOP` and `.sdlc/tracker/`.
3. **Git mode:** use the input if it is given. Otherwise use `pr` if `git remote -v` shows a github.com remote, else `direct`. `defaultBranch` comes from `git symbolic-ref refs/remotes/origin/HEAD` in `pr` mode, else from the current branch name.
4. **Commands:** detect them from the repo:
   - `package.json` scripts (`pnpm` if `pnpm-lock.yaml`, `yarn` if `yarn.lock`, else `npm`)
   - `go.mod` (`go build ./...`, `go test ./...`, `go vet ./...`)
   - `Makefile` targets
   - `pyproject.toml`
   - `Cargo.toml`

   Monorepos combine commands with `&&` per workspace. A greenfield repo with no code gets `""` for every command; the first slice's implementer fills them. Keep any existing non-empty command unless it fails to run.
5. Write `config.json` (format in state-schema.md). Keep existing `specHash`, `overridesSeen` and `environment`. Set `specPath` from the input when given.
6. Do not commit; the state-writer commits at the end of bootstrap.

Return `{gitMode, commands, notes}`.
