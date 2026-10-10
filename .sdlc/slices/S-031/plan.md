# Plan for S-031

## Approach

`branches.py` already holds `evaluate`, `validate_format`, `name`, `read_rules` and `cmd_preflight`. Slices S-012 to S-016 built them.
This slice pins the exact acceptance of R-127, R-140, R-142, R-150 and R-151 with new tests. The tests use the literals from the acceptance text.
Write the tests first and run them. If one fails, fix the named function in `skills/sdlc/branches.py` and change nothing else.
If all tests pass, they are characterization tests and the product code stays unchanged.
The tests reuse the helpers in `skills/sdlc/test/branches.test.mjs`: `probeJson`, `SPEC_RULE_PY`, `preflight`, `gitlabRepo`, `glabShim`, `withConfig`, `gitRepo`, `run`, `oneObject`, `sampleOf`. Code inside `probeJson` uses the Python-side `rule(kind, pattern)` from `SPEC_RULE_PY`.

## Files

- Modify `skills/sdlc/test/branches.test.mjs`: add the new tests at the end of the file. Add no comments.
- Modify `skills/sdlc/branches.py` only if a new test fails. The candidates are `evaluate`, `validate_format`, `name`, `_glab_push_rule` and `cmd_preflight`.

## Tests

All tests are in `skills/sdlc/test/branches.test.mjs`.

- T-R-127a (R-127): `evaluate(rule("regex", "feature"), "x/feature/y")` is `True`. `evaluate(rule("regex", "^feature/"), "sdlc/S-001")` is `False`. The same pattern `^feature/` gives `True` for `feature/S-001`. The first pair proves the match is unanchored.
- T-R-127b (R-127): a `pr` mode preflight with a GitHub regex rule `^feature/` and `--format 'feature/{name}'` gives exit 0 and sample results `pass`. The same rule with the default format gives exit 1 and the slice sample result `fail`, because the rule has no derivation.
- T-R-140a (R-140): `preflight --mode pr` on a `gitlabRepo()` with `glabShim` makes exactly one glab call. Its argv is `api projects/:fullpath/push_rule`. No recorded argv contains `group`.
- T-R-140b (R-140): `preflight --mode stack` on a GitLab repo with a `branch_name_regex` body records the same single path. The verdict lists one rule with source `gitlab` and label `push rule`.
- T-R-142a (R-142): `name --kind slice --id S-001 --format 'feature/PROJ-123-{name}'` prints branch `feature/PROJ-123-S-001`. `validate_format('feature/PROJ-123-{name}')` returns without `Fail`. A `preflight --mode pr --format 'feature/PROJ-123-{name}'` prints `ok` true, format `feature/PROJ-123-{name}`, `given` true and the slice sample `feature/PROJ-123-S-001`.
- T-R-150a (R-150): `preflight --repo <repo> --mode pr --format 'sdlc/{name}..'` exits 2. Stdout is one JSON object with `ok` false. The `error` string contains `check-ref-format` and `not a valid branch name`.
- T-R-151a (R-151): on a repo with no config format and no forge, `preflight --mode pr` exits 0. The output has `ok` true, format `sdlc/{name}`, `derived` false and `rules` empty.
- T-R-151b (R-151): the same holds for modes `stack`, `mr` and `direct`, and with a GitHub shim that returns an empty list. Every sample result is `pass` or `unchecked`.

Expected failure reason before implementation: none. All tests are characterization tests, because earlier slices built the code.

## Steps

1. Read the helper definitions and T-R-030a, T-R-044d and T-R-123a in `branches.test.mjs`.
2. Add the tests with the literals above.
3. Run `node --test skills/sdlc/test/branches.test.mjs`.
4. If a test fails, read the failure, then fix the named function. Do not weaken a test.
5. Run `npm test` and confirm the full suite passes.

## Risks

- The new tests can duplicate T-R-030a and T-R-044d. They add the preflight path for R-140 and the exact literals for R-142 and R-150.
- The state sample name holds a timestamp. Assert its prefix, never its full value.
- The `git check-ref-format` message differs between git versions. Assert only the stable words `check-ref-format` and `not a valid branch name`.
- The gh shim ignores the sample path. A rule that depends on the sample needs `bodies`, as `ghShim` supports.

## Critique responses

- No critiques in this revision.
