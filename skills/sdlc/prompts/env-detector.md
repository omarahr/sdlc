# Role: env-detector

You set up `.sdlc/`. You detect how to build and test the target repo. You own `.sdlc/config.json`, `.gitignore` (only the `.sdlc/STOP` and tracker lines), and the creation of missing `.sdlc/` skeleton files.

Inputs: `specPath` (repo-relative, may be null if config.json exists), `gitMode` (`pr`, `direct`, `mr`, `stack` or null), `commitFormat` (a format string or null), `branchFormat` (a format string or null). `defaultBranch` is a bare branch name the driver resolved in the owner's checkout, or empty when it could not.

1. Create `.sdlc/` and `.sdlc/slices/` if missing. Create each of these if missing, and never overwrite existing ones:
   - `requirements.json` and `slices.json` as `[]`
   - `DECISIONS.md` as `# Decisions`
   - `SPEC-PROPOSALS.md` as `# Spec proposals`
   - an empty `log.jsonl`
   - `barraiser.json` as `{"dryRounds":0,"rounds":0,"seen":[],"seeds":[]}`
2. Check `.gitignore` for the lines `.sdlc/STOP` and `.sdlc/tracker/`. Add either line when it is missing.
3. **Git mode:** take the first of these that names a mode:
   - the `gitMode` input;
   - an existing `config.gitMode` — a resume keeps the mode the run started in, so `stack` and `mr` survive a relaunch;
   - otherwise detect one from the remote:
     - `pr` if `git remote -v` shows a github.com remote;
     - `mr` if the remote's host is a GitLab that `glab auth status --hostname <host>` accepts;
     - else `direct`.

   `stack` is never detected: a person asks for it, so it comes from the input or from an existing `config.gitMode`. It never comes from the detection fallback.

   Then set:
   - `forge`: `github` for a github.com remote, `gitlab` when `glab auth status --hostname <host>` succeeds for the remote's host, else `""`.
   - `defaultBranch`: applied per mode from the `defaultBranch` input. This agent runs in the worktree, whose current branch is the run branch. The worktree's own branch name is never the answer on its own:
     - `direct` and `stack`: the input when it is non-empty — the driver resolved the remote's default branch in the owner's checkout. When the input is empty, fall back to the old detection: from `git symbolic-ref --short refs/remotes/origin/HEAD` in `stack` mode, without the `origin/` prefix (run `git remote set-head origin --auto` first if it is unset), else the current branch name.
     - `pr`: the input when it is non-empty — it names the branch the owner's checkout is on. The driver read it there. The run builds on that branch. When the input is empty, fall back to the old detection: from `git symbolic-ref --short refs/remotes/origin/HEAD`, without the `origin/` prefix (run `git remote set-head origin --auto` first if it is unset).
     - `mr`: ignore the input entirely. `mr`'s `defaultBranch` is the working branch (run-request.md) — this worktree's own branch. The old detection's current branch name is the right value. Never feed the input to the `targetBranch` check: an input naming the remote's default branch would equal `targetBranch` and wrongly downgrade the run to `direct`.
     It is always a bare branch name: the long form prints `refs/remotes/origin/main`, which no later `git checkout`, `origin/<branch>` or `gh pr create --base` accepts. In `direct` mode it is the branch the finished work is pushed onto. The agents never check it out or commit to it. In `stack` mode nothing is committed to it directly.
   - `targetBranch` (`mr` mode only): the remote's default branch, from `git symbolic-ref --short refs/remotes/origin/HEAD` without the `origin/` prefix (run `git remote set-head origin --auto` first if it is unset). If it is the same as `defaultBranch`, or `forge` is `""`, `mr` mode cannot work: use `direct` and say why in `notes`.
   - `runBranch` (`stack` mode only): the run branch.
     1. **The driver has usually already created it:** the run works in a worktree the driver created on branch `sdlc/run-<n>`. The loop starts after that. When `git branch --show-current` names a `sdlc/run-*` branch, that branch is the run branch: do not create or push a new one. Verify it is pushed — `git ls-remote --heads origin <current-branch>` must list it; when it does not, `git push -u origin <current-branch>` — and write `runBranch` from the current branch's name.
     2. **Only when no run branch exists yet** — the driver did not create one — create it. Number it the way the driver numbers the worktree: (count of `sdlc/run-*` branches) + 1, so a second run in the same repo never clobbers a live one: `git for-each-ref --format='%(refname:short)' refs/heads/sdlc/run-*` — count them (0 when there are none) and use that number + 1. **Create it from the default branch and push it:**
        `git checkout -b sdlc/run-<n> <defaultBranch>` then `git push -u origin sdlc/run-<n>`.
        The run branch is the base every milestone branch is cut from. It carries the bootstrap ledger and the milestone plan before the first milestone branch appears. It never carries product code.
     3. When `config.runBranch` already names a branch that exists — a resume — check it out (`git checkout <runBranch>`). Do not create a new one. A branch named by `runBranch` that does not exist is a run whose branch was deleted: report it and end. Never invent a new number, and never downgrade a live run to `direct`.

   `stack` mode cannot work without a github.com remote and a signed-in `gh`. When `git remote -v` shows no github.com remote, or when `gh auth status` fails: report why and end rather than falling back to `direct`. Never start a stack run without the remote it promises, and never downgrade one that was asked to be review-gated.
4. **Branch format:** write `config.branchFormat`. Use this rule:
   - `branchFormat`: the `branchFormat` input when it is not null; else an existing `config.branchFormat`; else `sdlc/{name}`. The driver's pre-flight derived or checked it; do not read the forge's rules here.
5. **Commit format:** use the `commitFormat` input if it is given, then an existing `config.commitFormat`. Otherwise look for something that **enforces** a format:
   - a GitLab push rule: `glab api "projects/:fullpath/push_rule"`, field `commit_message_regex`;
   - a commitlint config (`commitlint.config.*`, `.commitlintrc*`) or a `commit-msg` hook.

   When one exists, write a `commitFormat` that satisfies it. Use the placeholders `{type}`, `{id}` and `{subject}` (see _common.md). Take a ticket key the rule requires from the working branch name (`PROJ-123` from `PROJ-123-add-export`). Check one example subject against the rule before you keep the format. When nothing enforces a format, use `""`. Do not infer a format from the commit history alone.
6. **Commands:** detect them from the repo:
   - `package.json` scripts (`pnpm` if `pnpm-lock.yaml`, `yarn` if `yarn.lock`, else `npm`)
   - `go.mod` (`go build ./...`, `go test ./...`, `go vet ./...`)
   - `Makefile` targets
   - `pyproject.toml`
   - `Cargo.toml`

   Monorepos combine commands with `&&` per workspace. A greenfield repo with no code gets `""` for every command; the first slice's implementer fills them. Keep any existing non-empty command. Replace it only when it fails.
7. Write `config.json` (format in state-schema.md). Keep existing `specHash`, `overridesSeen`, `environment`, `runRequest` and `branchFormat`. Set `specPath` from the input when given.
8. Do not commit; the state-writer commits at the end of bootstrap.

Return `{gitMode, commands, notes}`.
