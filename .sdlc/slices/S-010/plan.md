# S-010 plan: list enumerates local branches of one kind (revision 1)

## Approach
`list` is a stub today: it checks `--kind` and echoes its arguments. This slice adds the Python function `list_kind(repo, fmt, kind)` to `skills/sdlc/branches.py` and makes `cmd_list` call it.
`list_kind` runs `git for-each-ref --format=%(refname:short) refs/heads/` in the repo. It parses each name with `parse(fmt, branch)` and keeps the names whose kind equals the requested kind. Foreign branches give `None` and drop out.
The sort key is `(n, branch name)` for `run` and `attempt`, with `n` as an integer, and the branch name for every other kind (ADR 7c1e). A numeric sort puts `attempt-2` before `attempt-10`. Equal `n` sort by full branch name, ascending.
`cmd_list` prints one flat object: `{ok, command, format, kind, branches}`. Each entry in `branches` holds `branch` and the parts that `parse` returns (ADR bd10) (`kind`, `tail`, `id`, `n`, and so on). Use `known: null`, as parse does without `ids`.
Before it lists, `list_kind` runs `git rev-parse --git-dir` in the repo (ADR e3f4). A non-zero exit, or a missing git, is a `Fail`: exit 2 with `{"ok": false, "error": "not a git repository: <repo>"}`. A repo with no commits gives `"branches": []` and exit 0.
Later slices (run numbering in S-018, the integrator text in S-027) read this output. This slice adds no caller.

## Files
- Modify `skills/sdlc/branches.py`: add `list_kind`, change `cmd_list`. About 25 lines.
- Modify `skills/sdlc/test/branches.test.mjs`: add the tests below, with a helper that builds a fixture repo with branches. About 110 lines.
- No other file changes.

## Tests
All tests are in `skills/sdlc/test/branches.test.mjs`. Run them with `node --test skills/sdlc/test/branches.test.mjs`. The helper makes one commit in a `gitRepo()` fixture and creates branches with `git branch`.
- T-R-025a (R-025) "list returns one kind, sorted by name": the fixture holds `sdlc/S-002`, `sdlc/S-001`, `sdlc/S-fix-M-1-2`, `sdlc/M-1`, `sdlc/run-1`, `sdlc/state-20261008101500`, `sdlc/S-001-attempt-1`, `sdlc/S-001-v0-http-api-0`, `sdlc/feature-x`, and `main`. `list --kind slice` returns exactly `sdlc/S-001`, `sdlc/S-002`, `sdlc/S-fix-M-1-2` in that order. Each entry has `kind` `slice` and `id` equal to the tail. `main` and `sdlc/feature-x` are absent. The CLI and `list_kind` through the Python probe agree.
- T-R-025b (R-025) "list works for each kind": on the same fixture, `milestone`, `run`, `state`, `verify`, `attempt` each return their one branch with the parts `parse` gives (for example `round` 0, `profile` `http-api`, `part` 0 for verify; `ts` for state). `e2e` and `e2e-area` return `[]` on a fixture that has none, and one entry each once `sdlc/M-1-e2e` and `sdlc/M-1-e2e-api` exist.
- T-R-025c (R-025) "run sorts by n": branches `sdlc/run-10`, `sdlc/run-2`, `sdlc/run-1` give `n` order 1, 2, 10 as integers.
- T-R-025d (R-025) "list honors the format": under `--format feature/PROJ-1-{name}`, only `feature/PROJ-1-S-001` shows for `slice`; `sdlc/S-001` is absent. The repo's `config.branchFormat` applies when `--format` is absent. `--format` overrides the config. Under `{name:lower}`, `feature/proj-1-s-001` is a slice.
- T-R-025e (R-025) "list reads local branches only": a remote-tracking ref (`refs/remotes/origin/sdlc/S-009`, made with `git update-ref`) is absent. A tag named `sdlc/S-008` is absent.
- T-R-025f (R-025) "empty and bad repos": a repo with no commit gives `branches: []` and exit 0. A directory that is not a git repository gives exit 2 and JSON `{"ok": false, "error": "not a git repository: <repo>"}` with no traceback. An unknown `--kind` still gives exit 2.
- T-R-094a (R-094) "attempt sorts by n numerically": `sdlc/S-001-attempt-10`, `sdlc/S-001-attempt-2` and `sdlc/S-001-attempt-1`, created in that order, list as 1, 2, 10. `sdlc/S-001-attempt-2` precedes `sdlc/S-001-attempt-10`. Attempts of `S-002` mixed in sort by `n`, then by full branch name, so `sdlc/S-001-attempt-2` precedes `sdlc/S-002-attempt-2`. Each entry keeps its `id` so a caller can filter.
- T-R-094b (R-094) "the sort is not a string sort": the result differs from the sorted list of branch names for the 2 and 10 case. The test asserts the `n` values are integers.
- The existing output test for `list` (ok, command, format) and the extra-flag and missing-repo tests stay green.

## Steps
1. Test-writer: add the fixture helper and the tests. Run them. They fail because `list` returns no `branches`.
2. Implement `list_kind` in `branches.py`. Run `git rev-parse --git-dir`, then `git for-each-ref`, with `subprocess.run`, `-C` set to the repo, `check=False`. Turn a non-zero `rev-parse` or an `OSError` into `Fail` with `not a git repository: <repo>`.
3. Sort with key `(entry["n"], entry["branch"])` for `run` and `attempt`, and `entry["branch"]` otherwise.
4. Change `cmd_list` to print `{ok, command, format, kind, branches}`. Drop the argument echo for `list`.
5. Show that each test can fail: in a scratch copy of `branches.py`, sort `attempt` by name and see T-R-094a fail. Drop the kind filter and see T-R-025a fail. Do not commit these edits.
6. Run `node --test skills/sdlc/test/branches.test.mjs`, then `npm test`.

## Risks
- `for-each-ref` output has one name per line. A branch name cannot hold a newline in git, so a line split is safe.
- `%(refname:short)` can shorten a name when a tag has the same short name. Git then prints the full `heads/...` form for the branch. T-R-025e covers a tag named `sdlc/S-008`; if the output differs, use `--format=%(refname)` and strip `refs/heads/`. Prefer the full-ref form if the test fails, and say so in the evidence.
- Equal `n` for two attempts of different slices has no spec order. ADR 7c1e breaks the tie by full branch name, ascending.
- `list` output keys are new. S-018 and S-027 read `branches[].branch` and `branches[].id`. ADR bd10 records this shape.

## Critique responses
- "Resolved by pending: pending": the text names no concrete defect. The plan changes nothing for it.
- ADR 7c1e (tie order): the sort key is `(n, branch name)` for `run` and `attempt`. T-R-094a asserts the tie order.
- ADR e3f4 (non-git repo): `list_kind` runs `rev-parse --git-dir` first and fails with the named error. T-R-025f asserts exit 2, the JSON error and the empty list for a repo with no commits.
