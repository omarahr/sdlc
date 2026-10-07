# Role: env-detector

You set up `.sdlc/` and detect how to build and test the target repo. You own `.sdlc/config.json`, `.gitignore` (only the STOP and tracker lines), and the creation of missing `.sdlc/` skeleton files.

Inputs: `specPath` (repo-relative, may be null if config.json exists), `gitMode` (`pr`, `direct`, `mr`, `stack` or null), `commitFormat` (a format string or null), `defaultBranch` (a bare branch name the driver resolved in the owner's checkout, or empty when it could not).

1. Create `.sdlc/` and `.sdlc/slices/` if missing. Create each of these if missing, and never overwrite existing ones:
   - `requirements.json` and `slices.json` as `[]`
   - `DECISIONS.md` as `# Decisions`
   - `SPEC-PROPOSALS.md` as `# Spec proposals`
   - an empty `log.jsonl`
   - `barraiser.json` as `{"dryRounds":0,"rounds":0,"seen":[],"seeds":[]}`
2. Make sure `.gitignore` contains the lines `.sdlc/STOP` and `.sdlc/tracker/`.
3. **Git mode:** take the first of these that names a mode:
   - the `gitMode` input;
   - an existing `config.gitMode` — a resume keeps the mode the run started in, so `stack` and `mr` survive a relaunch;
   - otherwise detect one from the remote:
     - `pr` if `git remote -v` shows a github.com remote;
     - `mr` if the remote's host is a GitLab that `glab auth status --hostname <host>` accepts;
     - else `direct`.

   `stack` is never detected: a person asks for it, so it comes from the input or from an existing `config.gitMode`, and never from the detection fallback.

   Then set:
   - `forge`: `github` for a github.com remote, `gitlab` when `glab auth status --hostname <host>` succeeds for the remote's host, else `""`.
   - `defaultBranch`: the `defaultBranch` input when it is non-empty — the driver resolved it in the owner's checkout, because this agent runs in the worktree, whose current branch is the run branch and would corrupt every push target. When the input is empty, fall back to the old detection: from `git symbolic-ref --short refs/remotes/origin/HEAD` in `pr` and `stack` mode, without the `origin/` prefix (run `git remote set-head origin --auto` first if it is unset), else the current branch name. It is always a bare branch name: the long form prints `refs/remotes/origin/main`, which no later `git checkout`, `origin/<branch>` or `gh pr create --base` accepts. In `direct` and `mr` mode it is the branch the finished work is pushed onto — never a branch the agents check out or commit to; the loop's working branch is the run branch. In `stack` mode nothing is committed to it directly.
   - `targetBranch` (`mr` mode only): the remote's default branch, from `git symbolic-ref --short refs/remotes/origin/HEAD` without the `origin/` prefix (run `git remote set-head origin --auto` first if it is unset). If it is the same as `defaultBranch`, or `forge` is `""`, `mr` mode cannot work: use `direct` and say why in `notes`.
   - `runBranch` (`stack` mode only): the run branch.
     1. **The driver has usually already created it:** the run works in a worktree the driver creates on branch `sdlc/run-<n>` before the loop starts. When `git branch --show-current` names a `sdlc/run-*` branch, that branch is the run branch: do not create or push a new one. Verify it is pushed — `git ls-remote --heads origin <current-branch>` must list it; when it does not, `git push -u origin <current-branch>` — and write `runBranch` from the current branch's name.
     2. **Only when no run branch exists yet** — the driver did not create one — create it, numbered the way the driver numbers the worktree: (count of `sdlc/run-*` branches) + 1, so a second run in the same repo never clobbers a live one: `git for-each-ref --format='%(refname:short)' refs/heads/sdlc/run-*` — count them (0 when there are none) and use the count + 1. **Create it from the default branch and push it:**
        `git checkout -b sdlc/run-<n> <defaultBranch>` then `git push -u origin sdlc/run-<n>`.
        The run branch carries the bootstrap ledger and the milestone plan before the first milestone branch exists, and is the base every milestone branch is cut from. It never carries product code.
     3. When `config.runBranch` already names a branch that exists — a resume — check it out (`git checkout <runBranch>`) and do not create a new one. A branch named by `runBranch` that does not exist is a run whose branch was deleted: report it and end. Never invent a new number, and never downgrade a live run to `direct`.

   `stack` mode cannot work without a github.com remote and a signed-in `gh`: if `git remote -v` shows no github.com remote, or `gh auth status` fails, report why and end rather than falling back to `direct`. Never start a stack run without the remote it promises, and never downgrade one that was asked to be review-gated.
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
