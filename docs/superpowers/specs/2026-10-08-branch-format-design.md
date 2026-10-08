# Branch format: one owner for the loop's branch names, checked against the forge's rules before launch

Date: 2026-10-08
Status: approved design, implementation pending

## Intent

Every branch the loop makes is named under a hardcoded `sdlc/` prefix, and the scheme is spelled out in many places rather than owned by one: the driver in `SKILL.md`, ten prompts, the loop script (the verifier branch), `next-action.py` (enumerates `refs/heads/sdlc/`, strips the prefix from pull-request heads, regex-matches state, milestone and e2e heads), `state-write.py` (the milestone regex, slice and milestone branch creation) and `janitor.py` (the v-branch regex, the run-branch guard). Repos that enforce a branch naming rule reject those names at push time, inside the run, after the work is done:

- a GitLab project push rule (`branch_name_regex`, Premium and Ultimate) rejects every push of a branch that does not match;
- a GitHub repository or organization ruleset with a `branch_name_pattern` rule rejects branch creation that does not match;
- a team convention such as `feature/PROJ-123-short-title` is expected by reviewers even when nothing enforces it.

The pre-flight today checks a rule only in `mr` mode, only the GitLab project push rule, and only against the user's own working branch. In `pr` and `stack` mode, the modes that push the loop's own branches (`pr`: slice, state and e2e branches; `stack`: run, milestone and slice branches), nothing is checked. The precedent for the fix exists: `commitFormat` is a flag, then config, then a detected rule, with placeholders the role files fill.

**What the user asked for** (resolved in conversation): "checking the branch name rules before starting the loop; currently I think it is hardcoded." The rules to honor are GitLab push rules, GitHub rulesets and a stated team convention. Hooks are out of scope. On a mismatch: derive a format when the rule is simple, otherwise stop before launch with the rule and a suggested flag.

**Decisions taken during brainstorming:**

| Question | Answer |
|---|---|
| Rule sources | GitLab project push rule `branch_name_regex`; GitHub rulesets `branch_name_pattern`; a convention given as `--branch-format` |
| On mismatch | Derive a format from a single `starts_with`, `ends_with` or `contains` rule; otherwise stop before launch with the rule, the failing sample and a suggested `--branch-format` |
| Scope of the format | Every branch family, one scheme, one owner module (approach A); not only the pushed ones, not one format per family |
| Placeholder | One `{name}` (or `{name:lower}`) carrying the loop's own tail per family; literal text around it, so parsing is a strip |
| Default | `sdlc/{name}`: today's names exactly, so existing runs resume unchanged |
| Mid-run change | Refused: a run in progress keeps the format its config holds |

**Assumptions:**
- `gh` is signed in when the remote is github.com and the mode is `pr` or `stack` (the pre-flight already requires it); `glab` is signed in for GitLab in `mr` mode. A rules read that fails is a note, never a block: the push will tell, as today.
- GitLab group push rules seed new projects and are not evaluated at push time beside the project rule, so only the project rule is read.
- The loop-economy spec (2026-10-08) adds `ship-prune` and `collect-verification` to `state-write.py`, which match `-v*` and `-attempt-*` names. Whichever of the two specs lands second adapts the other's matching to `branches.parse`.

### Non-goals

- Local `pre-push` hooks and server-side `pre-receive` hooks: they cannot be read as rules, only probed by pushing.
- One format per branch family.
- Renaming the branches of a run already in progress.
- GitLab group push rules, GitHub "evaluate" (dry-run) rulesets, and rulesets that restrict creation by actor rather than by name.
- Changing worktree directory names (`.claude/worktrees/sdlc-run`, `$TMPDIR/sdlc-*`).

## Design

### 1. The format

`config.branchFormat` is a string with exactly one placeholder, `{name}` or `{name:lower}`, and literal text around it. The default is `sdlc/{name}`. The placeholder carries the loop's own tail per family:

| Kind | Tail (`{name}`) | Default name | Pushed in |
|---|---|---|---|
| `run` | `run-<n>` | `sdlc/run-1` | stack |
| `slice` | `<sliceId>` | `sdlc/S-001` | pr, stack |
| `milestone` | `<milestoneId>` | `sdlc/M-1` | stack |
| `e2e` | `<milestoneId>-e2e` | `sdlc/M-1-e2e` | pr |
| `e2e-area` | `<milestoneId>-e2e-<area>` | `sdlc/M-1-e2e-api` | never |
| `state` | `state-<UTC timestamp, %Y%m%d%H%M%S>` | `sdlc/state-20261008101500` | pr |
| `verify` | `<sliceId>-v<round>-<profile>-<part>` | `sdlc/S-001-v0-http-api-0` | never |
| `attempt` | `<sliceId>-attempt-<n>` | `sdlc/S-001-attempt-1` | never (deleted on the remote when present) |

`{name:lower}` lowercases the tail, for rules that forbid uppercase. A ticket key or a type prefix a convention wants is literal text: `feature/PROJ-123-{name}` names the first slice `feature/PROJ-123-S-001`.

The format is resolved like `commitFormat`: the `--branch-format` flag, else `config.branchFormat` on resume, else the pre-flight's derivation (section 4), else the default.

### 2. The owner module: `skills/sdlc/branches.py`

Python 3 standard library only. Importable (`next-action.py`, `state-write.py` and `janitor.py` insert the script directory into `sys.path` and import it) and runnable. Every command prints one JSON object; exit 2 with `{"ok": false, "error": "..."}` on bad input.

```
branches.py name     --repo DIR --kind KIND [--id ID] [--n N] [--area A] [--round R] [--profile P] [--part K] [--format F]
branches.py parse    --repo DIR --branch NAME [--format F]
branches.py list     --repo DIR --kind KIND [--format F]
branches.py preflight --repo DIR --mode MODE [--format F] [--branch CURRENT]
```

`--format` overrides the repo's `config.branchFormat`; without either, the default applies. `--repo` is the target repo, whose `.sdlc/config.json` holds the format once a run exists.

**Python API**

- `load_format(repo)`: `config.branchFormat` when `.sdlc/config.json` has a non-empty one, else `"sdlc/{name}"`.
- `validate_format(fmt)`: raises `Fail` unless the format contains exactly one of `{name}` or `{name:lower}`, no other `{` or `}`, no whitespace, and `name(fmt, "slice", id="S-001")` passes `git check-ref-format --branch`.
- `tail(kind, **parts)`: the tail from the table in section 1. `state` without `ts` generates the timestamp. A missing part is a `Fail`.
- `name(fmt, kind, **parts)`: the format with the placeholder replaced by the tail, lowercased for `{name:lower}`.
- `split(fmt)`: `(prefix, suffix, lower)`, the literal text before and after the placeholder and whether it lowercases.
- `parse(fmt, branch, ids=None)`: `None` unless `branch` starts with `prefix` and ends with `suffix`; otherwise the tail between them is classified by the first regex that matches, in this order, compiled with `re.IGNORECASE` when `lower` is set:

  | Order | Kind | Regex on the tail | Parts |
  |---|---|---|---|
  | 1 | `run` | `^run-(\d+)$` | `n` |
  | 2 | `milestone` | `^(M-\d+)$` | `id` |
  | 3 | `e2e` | `^(M-\d+)-e2e$` | `id` |
  | 4 | `e2e-area` | `^(M-\d+)-e2e-(.+)$` | `id`, `area` |
  | 5 | `state` | `^state-(\d{14})$` | `ts` |
  | 6 | `verify` | `^(.+)-v(\d+)-([a-z0-9-]+?)-(\d+)$` | `id`, `round`, `profile`, `part` |
  | 7 | `attempt` | `^(.+)-attempt-(\d+)$` | `id`, `n` |
  | 8 | `slice` | `^(S-[A-Za-z0-9-]+)$` | `id` |

  The result is `{"kind", "tail", "id", "n", "area", "round", "profile", "part", "ts", "known"}` with the parts that apply. When `ids` (an iterable of ledger ids) is given, `id` is replaced by the ledger's spelling that matches it, case-insensitively under `lower`, and `known` says whether one matched; without `ids`, `known` is `None`. A tail matching none of the rows is not a loop branch: `None`. Milestone rows are anchored on `M-` and slice ids start with `S-`, so `S-fix-M-1-2` is a slice and `M-1-e2e-api` is an e2e area.
- `list_kind(repo, fmt, kind)`: every local branch (`git for-each-ref --format=%(refname:short) refs/heads/`) that parses to `kind`, with its parts, sorted by `n` for `run` and `attempt` and by name otherwise.
- `read_rules(repo)`: section 3.
- `evaluate(rule, sample)` and `derive(rules)`: sections 3 and 4.

### 3. Reading and evaluating the rules

A rule is `{"source": "github" | "gitlab", "kind": "starts_with" | "ends_with" | "contains" | "regex", "pattern": str, "negate": bool, "label": str}`.

**GitHub** (`forge` is `github`): for each sample, `gh api "repos/{owner}/{repo}/rules/branches/<sample>"` with `/` in the sample encoded as `%2F` (`urllib.parse.quote(sample, safe="")`). The endpoint returns the active rules that apply to that branch name, with the ruleset's targeting and any organization-level ruleset already applied, and leaves out rulesets in "evaluate" or "disabled" enforcement; the branch does not have to exist. Keep the objects whose `type` is `branch_name_pattern`: `kind` is `parameters.operator`, `pattern` is `parameters.pattern`, `negate` is `parameters.negate` or `false`, `label` is `parameters.name` when present, else `ruleset <ruleset_id>` when present, else `branch_name_pattern`. A `gh api` failure (not signed in, no access, a network error) is one note, `rules unknown on github: <stderr>`, and the samples are `unchecked`.

**GitLab** (`forge` is `gitlab`): `glab api "projects/:fullpath/push_rule"` once. The literal `null` body, an error, or an empty `branch_name_regex` means no rule. Otherwise one rule, `kind` `regex`, `pattern` the regex, `label` `push rule`. A `glab` failure is the note `rules unknown on gitlab: <stderr>` and the samples are `unchecked`.

**No forge** (`forge` is `""`): no rules; every sample is `unchecked`.

`evaluate(rule, sample)` returns `True`, `False` or `None`:
- `starts_with`: `sample.startswith(pattern)`; `ends_with`: `sample.endswith(pattern)`; `contains`: `pattern in sample`; all case-sensitive, as git refs are.
- `regex`: `re.search(pattern, sample) is not None`. GitLab and GitHub evaluate RE2; Python's `re` accepts the same syntax for the patterns these rules use in practice. A pattern `re.compile` rejects gives `None`, and the sample is `unevaluated` with the note `cannot evaluate <label>: <re.error>`; it never blocks.
- `negate` flips `True` and `False`; `None` stays `None`.

A sample `fails` when any rule evaluates to `False` for it; it `passes` when every rule evaluates to `True`; it is `unevaluated` when no rule failed and at least one was `None`.

Besides the forge's rules, every sample must pass `git check-ref-format --branch <sample>`, which catches a literal part that makes an invalid ref (`..`, `~`, `^`, `:`, `?`, `*`, `[`, `\`, a leading `/`, a trailing `.lock`). That failure is reported as the rule `git check-ref-format`.

### 4. The pre-flight verdict and the derivation

`branches.py preflight --repo DIR --mode MODE [--format F] [--branch CURRENT]`:

1. `fmt` is `--format` when given, else `load_format(repo)`; `given` is whether a format came from the flag or the config. `validate_format(fmt)` or exit 2.
2. Samples, by mode: `pr`: `slice` (`S-001`), `state` (a generated timestamp), `e2e` (`M-1-e2e`); `stack`: `run` (`run-1`), `milestone` (`M-1`), `slice`; `mr` and `direct`: none of the loop's kinds. In `mr` mode only, `--branch CURRENT` adds the user's working branch as one more sample of kind `working`, evaluated as it is, because that is the branch the loop pushes in `mr` mode: this folds the existing `mr`-mode push-rule check into the same verdict. In every other mode `--branch` is ignored; the user's branch already exists and is never pushed by the loop.
3. Read the rules (section 3). Evaluate every sample.
4. When every sample passes or is unevaluated or unchecked: `ok` is `true` with `fmt`.
5. Otherwise, when `given` is false and the rules are exactly one rule with `negate` false and `kind` in `starts_with`, `ends_with`, `contains`: derive `fmt2` from the table below, evaluate the samples again under it, and when they all pass, `ok` is `true` with `fmt2` and `derived` `true`.

   | Rule | Derived format |
   |---|---|
   | `starts_with P` | `P` + `sdlc/{name}` |
   | `ends_with S` | `sdlc/{name}` + `S` |
   | `contains C` | `sdlc/` + `C` + `/{name}` |

6. Otherwise `ok` is `false`, and `suggestion` is a `--branch-format` line: for a derivable rule whose derivation still failed, the derived format; for a `regex` rule, `--branch-format "<literal that your rule accepts>/{name}"` with the pattern quoted beside it; for a `working` failure, the rename the user has to do.

Output:

```json
{"ok": true, "format": "feature/sdlc/{name}", "derived": true, "forge": "github",
 "rules": [{"source": "github", "kind": "starts_with", "pattern": "feature/", "negate": false, "label": "feature branches"}],
 "samples": [{"kind": "slice", "name": "feature/sdlc/S-001", "result": "pass", "rule": null}],
 "notes": [], "suggestion": ""}
```

`result` is `pass`, `fail`, `unevaluated` or `unchecked`; `rule` is the label of the first failing rule. Exit 0 when `ok`, 1 when not, 2 on bad input.

### 5. The driver (`SKILL.md`)

The Commands table gains `--branch-format "<format>"` beside `--commit-format`. In **Pre-flight**, the "Branch name (first run only)" bullet is replaced, and the `mr`-mode push-rule sentence is removed, by one bullet placed right after **Git mode**:

```markdown
   - **Branch format:** the loop names every branch it makes from one format (`branches.py`, placeholder `{name}`; default `sdlc/{name}`). Take the format from `--branch-format` when given, else from `$REPO/.sdlc/config.json` `branchFormat` when that file exists (a finished run leaves it on the default branch), else none. Run `python3 "$SKILL_DIR/branches.py" preflight --repo "$REPO" --mode <gitMode>` with `--format "<format>"` when you have one, and with `--branch "$BASE_BRANCH"` in `mr` mode. It reads the forge's branch-name rules, tests the names this mode will push, and prints a verdict. When `ok` is false, print its `samples` that failed with their `rule`, its `notes` and its `suggestion`, and end. When `ok` is true, `FMT` is its `format`; when `derived` is true, tell the user the format you derived and that it is now in config.json. A `working` sample that failed names the user's own branch: ask them to rename it and end. Then, when `$BASE_BRANCH` parses as one of the loop's kinds (`python3 "$SKILL_DIR/branches.py" parse --repo "$REPO" --format "$FMT" --branch "$BASE_BRANCH"` prints a kind), report that the workflow keeps those names for its own branches, ask the user to rename the branch (`git branch -m <new-name>`), and end. This check is first run only: on a resume the current branch is normally the run branch.
```

The **Run worktree** bullet names the run branch through the module: `RUN_BRANCH=$(python3 "$SKILL_DIR/branches.py" name --repo "$REPO" --format "$FMT" --kind run --n <n>)` where `<n>` is one more than the count of `branches.py list --kind run` on a first run; on a relaunch the run branch is the last entry of that list, and the worktree is put back on it. After the worktree exists, when `$WT/.sdlc/config.json` holds a `branchFormat` that differs from `$FMT`, report both and end: a run in progress keeps its names.

In **Launch**, the workflow args gain `branchFormat: "$FMT"`.

### 6. The loop script

```js
// every branch the loop names comes from one format; the Python module owns it, and this is the one place the
// script builds a name itself (the verifier branches), so the two substitutions are tested against each other
const BRANCH_FORMAT = A.branchFormat || 'sdlc/{name}'
function branchName(tail) {
  const lower = BRANCH_FORMAT.includes('{name:lower}')
  return BRANCH_FORMAT.replace(lower ? '{name:lower}' : '{name}', lower ? tail.toLowerCase() : tail)
}
```

`verifyPhase`'s `const branch = g => \`sdlc/${id}-v${round}-${g.profile}-${g.part}\`` becomes `const branch = g => branchName(\`${id}-v${round}-${g.profile}-${g.part}\`)`. The env-detector call gains `branchFormat: A.branchFormat || null`. `INTERNALS` exports `branchName` and `BRANCH_FORMAT`.

### 7. The scripts

**`next-action.py`**
- `active_branch(repo, current)`: enumerate `refs/heads/` (all local branches), keep those `parse` classifies as `slice`, and use the parsed `id` as `sid`.
- Pull-request heads: `state_prs` keeps heads that parse to `state`; `e2e_prs` keeps heads that parse to `e2e` (not `e2e-area`); the slice map keeps heads that parse to `slice`, with `ids=by_id` so a lowercased head resolves to the ledger id; `merged_heads` is looked up with `name(fmt, "slice", id=s["id"])`; the stack milestone hold keeps heads that parse to `milestone`.
- The format comes from the `config` the decision already read (`load_format` semantics: `config.get("branchFormat") or "sdlc/{name}"`).

**`state-write.py`**
- `MILESTONE_BRANCH` is replaced by `parse(...)["kind"] == "milestone"` wherever it is used.
- `ensure_milestone_branch` wants `name(fmt, "milestone", id=milestone_id)`; `ensure_slice_branch` wants `name(fmt, "slice", id=slice_id)`; the awaiting-merge dependency branch is `name(fmt, "slice", id=dep)`; `milestone_branches_with_open_slice_pr` adds `name(fmt, "milestone", id=mid)`; `prune_stale_milestone_branches` and `branch_run` classify with `parse`.
- `config.runBranch` keeps holding a full branch name, so `advance_run_branch` and `shipped_into` are unchanged.
- A `fmt` argument is threaded from `main()` where `config` is read, with `load_format(repo)` as the fallback.

**`janitor.py`**
- `V_BRANCH` and `V_ID` are replaced by `parse`: a branch is swept only when it parses to `verify`, its `id` is unknown to the ledger or its status is `done` or `rejected`; `run`, `attempt` and every other kind are never deleted. The format comes from `load_format(repo)`.

**`slicer.md`** writes the slice's informational `branch` field through the module (`<slice branch>` below); nothing in the scripts reads that field.

### 8. The prompts

`_common.md` gains a section:

```markdown
- **Branch names:** every branch the loop makes is named by one format, `config.branchFormat` (default `sdlc/{name}`). Never write such a name by hand. Print it: `python3 "<skill>/branches.py" name --repo . --kind <kind> ...`. The role files write these placeholders, and this table says which command fills each:

  | Placeholder | Command |
  |---|---|
  | `<run branch>` | the branch `config.runBranch` names in `stack` mode; otherwise `branches.py list --kind run`, its last entry |
  | `<slice branch>` | `branches.py name --kind slice --id <sliceId>` |
  | `<milestone branch>` | `branches.py name --kind milestone --id <milestoneId>` |
  | `<e2e branch>` | `branches.py name --kind e2e --id <milestoneId>` |
  | `<e2e area branch>` | `branches.py name --kind e2e-area --id <milestoneId> --area <areaId>` |
  | `<state branch>` | `branches.py name --kind state` (it makes the timestamp) |
  | `<attempt branch>` | `branches.py name --kind attempt --id <sliceId> --n <n>` |
  | `<verify branch>` | the `branch` input your prompt carries |

  To learn what a branch is, `branches.py parse --repo . --branch <name>` prints its kind and ids, or `null` for a branch that is not the loop's.
```

Every prompt that spells a branch today uses the placeholder instead. The literals to replace, by file (paths under `.sdlc/` are not branches and stay):

| File | Literals today | Placeholder |
|---|---|---|
| `commit-state.md` | `sdlc/<sliceId>`, `sdlc/run-<n>` (×4), `sdlc/M-<n>`, `sdlc/state-$(date -u +%Y%m%d%H%M%S)` | `<slice branch>`, `<run branch>`, `<milestone branch>`, `<state branch>` |
| `integrator.md` | `sdlc/<id>` (×9), `sdlc/run-<n>` (×3), `sdlc/<id>-attempt-*` | `<slice branch>`, `<run branch>`, "the slice's attempt branches (`branches.py list --kind attempt`, filtered to this slice)" |
| `milestone-writer.md` | `sdlc/<id>-e2e-<area>`, `sdlc/<id>-e2e`, `sdlc/M-<n>` (×6) | `<e2e area branch>`, `<e2e branch>`, `<milestone branch>` |
| `escalator.md` | `sdlc/<id>` (×3), `sdlc/<id>-attempt-<n>` (×2), `sdlc/run-<n>` | `<slice branch>`, `<attempt branch>`, `<run branch>` |
| `env-detector.md` | `sdlc/run-<n>` (×3), `sdlc/run-*` | `<run branch>`; "a branch that parses as kind `run`" |
| `implementer.md`, `test-writer.md`, `test-checker.md`, `planner.md`, `verifier.md`, `verify-planner.md`, `verify-toolsmith.md`, `test-reporter.md`, `gate.md`, `finding-refuter.md`, `verify-profile-common.md`, `verify-collector.md`, `state-reader.md` | `sdlc/<id>` | `<slice branch>` |
| `state-writer.md` | `sdlc/<id>`, `sdlc/<id>-attempt-<n>` | `<slice branch>`, `<attempt branch>` |
| `e2e-harness.md` | `sdlc/<milestoneId>-e2e`, `sdlc/M-<n>` | `<e2e branch>`, `<milestone branch>` |
| `scenario-runner.md` | `-b sdlc/<milestoneId>-e2e-<areaId> sdlc/<milestoneId>-e2e` | `-b <e2e area branch> <e2e branch>` |
| `slicer.md` | `branch: sdlc/<id>` | `branch: <slice branch>` |
| `state-schema.md` | `"branch": "sdlc/S-001"`, `sdlc/run-<n>` (×2), `sdlc/M-<n>` | the field's description says "the slice branch under `config.branchFormat`"; `runBranch` "the run branch (`run` kind under `config.branchFormat`)" |

`env-detector.md` gains the input `branchFormat` and the config line: "`branchFormat`: the `branchFormat` input when it is not null; else an existing `config.branchFormat`; else `sdlc/{name}`. The driver's pre-flight derived or checked it; do not read the forge's rules here." Its commit-format step keeps reading the push rule for `commit_message_regex`.

`state-schema.md` documents `"branchFormat": "sdlc/{name}"` in `config.json`: "the format of every branch the loop makes: literal text around one `{name}` (or `{name:lower}`) placeholder, which carries the loop's own tail per branch kind (`branches.py`). Set at the first launch; a resume keeps it."

### 9. Documentation

- `README.md`: the Usage table gets the `--branch-format "<format>"` flag with one example; a short **Branch names** paragraph after the git-mode bullets lists the kinds and tails, the default, the rules the pre-flight reads and what happens on a mismatch; "What it writes to your repo" mentions `branchFormat` in `config.json`; the Development tree lists `branches.py`.
- `prompts/ste-style.md` is unchanged; every prompt edit passes `ste-check.py`.

## Edge cases

- **No format, no rules**: the default; nothing changes for any repo that has no rule.
- **The default already satisfies the rule** (a regex like `^[a-z]+/.+`): `ok` with the default, nothing derived.
- **A rule that targets only the default branch**: the GitHub endpoint returns no `branch_name_pattern` for the samples; `ok`.
- **Several rules, or a negated one, and no format given**: no derivation; the verdict lists each failing sample with the rule, and the suggestion asks for a format.
- **A regex Python cannot compile**: `unevaluated`, a note, the run launches; the push reports the rejection as today.
- **`gh` or `glab` not available or not signed in**: `unchecked`, a note, the run launches.
- **`--branch-format` on a resume that differs from config**: refused with both values.
- **A format with `{name:lower}`**: `S-001` becomes `s-001` in the branch; `parse` with `ids` returns `S-001`; `next-action.py` and `janitor.py` always pass the ledger's ids.
- **The user's branch is `feature/PROJ-1-S-002` under that format**: it parses as a slice; the driver asks for a rename before the first run.
- **The user's branch is `sdlc/feature-x`**: not a loop kind; no rename asked.
- **An old run's branches under the default when the new run gets a derived format**: the new run's `list` and `parse` do not see them; the janitor leaves them; they are the user's to delete.
- **A literal part that makes an invalid ref**: `validate_format` rejects the format at pre-flight with `git check-ref-format`'s reason.
- **`e2e-area` with an area id containing dashes**: the regex's `(.+)` takes the whole rest; areas never contain `/`.

## Testing

**`test/branches.test.mjs`** (new; runs `branches.py` through `execFileSync` and imports it in a probe for the Python API)
- `name and parse round-trip every kind under the default, a prefixed and a lowercased format`: for each kind and the formats `sdlc/{name}`, `feature/PROJ-1-{name}`, `feature/PROJ-1-{name:lower}`.
- `parse returns null for a foreign branch and resolves ids against the ledger`: `main`, `feature/PROJ-1-foo`, `sdlc/feature-x` give `null`; `feature/proj-1-s-001` with ids `['S-001']` gives `S-001`, `known: true`.
- `parse keeps the table's precedence`: `S-fix-M-1-2` is a slice, `M-1-e2e-api` is an e2e area, `S-001-v0-http-api-0` is a verify branch with profile `http-api`.
- `validate_format rejects two placeholders, none, whitespace and an invalid ref`.
- `evaluate follows each operator, negate flips, and a bad regex gives null`.
- `derive follows the table and refuses regex, negate and several rules`.
- `preflight` on a fixture repo with `gh` and `glab` shims on `PATH` (shell scripts printing canned JSON): no rules gives `ok` with the default; a `starts_with feature/` ruleset derives `feature/sdlc/{name}`; a regex that the default fails gives exit 1 with a suggestion; a regex the default passes gives `ok`; a shim that exits 1 gives `ok` with `rules unknown` in `notes` and `unchecked` samples; `--mode mr --branch bad-name` against a GitLab regex fails the `working` sample; an invalid `--format` exits 2.
- `the loop script and the module name branches the same way`: `rt.I.branchName(tail)` equals `branches.py name` for the three formats and the verify tail, the way `git-modes.test.mjs` compares the mode lists.

**`test/next-action.test.mjs`**
- `the active slice branch, slice PR heads, the state PR, the e2e PR and the stack milestone hold are recognized under a custom format`: fixture with `branchFormat: "feature/PROJ-1-{name}"`; a `feature/PROJ-1-sdlc-foo`-style foreign head is ignored.
- The existing tests keep passing under the default.

**`test/scripts.test.mjs`**
- `state-write creates the slice and milestone branches under a custom format and finds the dependency branch`.
- `janitor sweeps verify branches under a custom format and never touches run or attempt branches`.

**`test/prompts.test.mjs`**
- `no prompt spells a loop branch literally`: for every prompt file and `SKILL.md`, no match for `(?<![.\w])sdlc/(?!tracker|STOP)` outside fenced blocks that quote `branches.py` output.
- `_common.md defines every branch placeholder and env-detector records the format`: the eight placeholders are present; `env-detector.md` matches `/branchFormat/`; `SKILL.md` matches `/--branch-format/` and `/branches\.py" preflight/`.
- The existing STE test covers every edited prompt.

## Files

| File | Change |
|---|---|
| `skills/sdlc/branches.py` | new: the owner module and its four commands |
| `skills/sdlc/next-action.py` | parse-based branch recognition (section 7) |
| `skills/sdlc/state-write.py` | name-based branch creation, parse-based classification (section 7) |
| `skills/sdlc/janitor.py` | parse-based sweep (section 7) |
| `skills/sdlc/sdlc-loop.js` | `BRANCH_FORMAT`, `branchName`, the verifier branch, the env-detector input, `INTERNALS` |
| `skills/sdlc/SKILL.md` | the flag, the pre-flight bullet, the run-branch naming, the launch arg |
| `skills/sdlc/prompts/_common.md` | the Branch names section |
| `skills/sdlc/prompts/env-detector.md` | the `branchFormat` input and config line |
| `skills/sdlc/prompts/state-schema.md` | `branchFormat`; branch fields described by kind |
| the prompts in the section 8 table | placeholders for literals |
| `README.md` | flag, Branch names paragraph, config mention, tree |
| `skills/sdlc/test/branches.test.mjs` (new), `next-action.test.mjs`, `scripts.test.mjs`, `prompts.test.mjs` | the cases above |
