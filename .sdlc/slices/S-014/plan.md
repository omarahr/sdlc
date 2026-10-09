# S-014 plan: read_rules reads the GitLab push rule and the no-forge case (revision 1)

## Approach
This slice finishes `read_rules(repo, samples)` in `skills/sdlc/branches.py`. S-013 built the GitHub branch. This slice adds the GitLab branch and tests the no-forge case. It adds no command. S-015 calls the function from `cmd_preflight`.
For `gitlab`, `read_rules` runs `glab api projects/:fullpath/push_rule` once, with `cwd=repo`. The call does not depend on the samples, because the push rule applies to every branch name. `glab` fills `:fullpath` from the repo it runs in, as `gh` does for `{owner}` and `{repo}` (ADR c4f0).
A successful call with a JSON object that has a non-empty string `branch_name_regex` gives one rule from `make_rule("gitlab", "regex", <regex>, False, "push rule")`. The body `null`, an object with no `branch_name_regex`, and an empty `branch_name_regex` give no rules. That is a successful read, so `unchecked` is false.
The shape stays the S-013 shape: `{"forge", "rules", "by_sample", "notes", "unchecked"}` (ADR f2cc). The one push rule goes under every sample in `by_sample`. `rules` holds it once.
A missing `glab`, a non-zero exit, output that is not JSON, or a timeout gives one note, `rules unknown on gitlab: <reason>`. The reason is the trimmed stderr text, or a short fixed text. `rules` and `by_sample` are empty and `unchecked` is true.
For `forge` equal to `""` (or any other value), `read_rules` makes no call and returns no rules, no notes, empty `by_sample` and `unchecked` true. The code already does this. This slice adds its test.
The call code is shared with S-013: one helper runs a forge CLI with the S-013 options (`capture_output`, `errors="replace"`, `stdin=DEVNULL`, timeout, `GH_PROMPT_DISABLED=1`). `_gh_branch_rules` keeps its behavior. The slice changes about 50 lines of product code and about 150 lines of tests.

## Files
- Modify `skills/sdlc/branches.py`: extract the subprocess part of `_gh_branch_rules` into `_run_forge_cli(argv, repo)`, which returns `(stdout, error)`. Rename `GH_TIMEOUT` to `FORGE_TIMEOUT` (no other file uses it), because both forges use it now. Add `gitlab_rule(body)` and `_glab_push_rule(repo)`. Add the `gitlab` branch to `read_rules`.
- Modify `skills/sdlc/test/branches.test.mjs`: add a `glab` shim helper beside `ghShim` and the tests below.
- No other file changes.

## Tests
All tests are in `skills/sdlc/test/branches.test.mjs` and run with `node --test skills/sdlc/test/branches.test.mjs`. A `glab` shim is a shell script at the front of `PATH`. It logs its cwd and argv, one line per call. It prints a canned body or exits 1. A repo for these tests has `forge: "gitlab"` in its config.
- T-R-030a (R-030) "one glab call for many samples": three samples give one logged call. The argv is `api projects/:fullpath/push_rule`. The logged cwd equals the repo.
- T-R-030b (R-030) "a regex gives one regex rule": body `{"branch_name_regex": "^feat/.*$"}` gives `rules` with one rule: `source` `gitlab`, `kind` `regex`, `pattern` `^feat/.*$`, `negate` false, `label` `push rule`. `by_sample` holds that rule under each sample. `unchecked` is false. No note.
- T-R-030c (R-030) "no rule cases": body `null`, body `{}`, body `{"branch_name_regex": ""}` and body `{"branch_name_regex": null}` each give no rules, no note and `unchecked` false. Each `by_sample` entry is an empty list.
- T-R-030e (R-030) "a JSON error body is no rule": glab exits 0 and prints `{"message": "404 Project Not Found"}`. The result has no rules, no note and `unchecked` false. A glab exit of 1 (a 403 or 404 from `glab api`) is a failure and gives the note (T-R-031a). ADR f2c2 is the basis for that split.
- T-R-030d (R-030) "other push rule fields are ignored": a body with `commit_message_regex` and `branch_name_regex` set gives only the branch rule.
- T-R-031a (R-031) "a failing glab gives one note and unchecked samples": a shim that prints `boom` on stderr and exits 1 gives one note `rules unknown on gitlab: boom`, no rules, empty `by_sample` and `unchecked` true. The shim logs one call.
- T-R-031b (R-031) "an empty stderr still gives a reason": exit 1 with no stderr gives a note that starts with `rules unknown on gitlab: ` and has text after it.
- T-R-031c (R-031) "bad output is a failure": output that is not JSON gives the same single note shape and `unchecked`.
- T-R-031d (R-031) "a timeout is a failure": the test runs its own `python3 -c` snippet, like the `readRules` helper. The snippet imports `branches`, sets `branches.FORGE_TIMEOUT = 1`, then calls `read_rules`. A glab shim that sleeps 5 seconds then gives one note that starts with `rules unknown on gitlab:`, no rules and `unchecked` true. `_run_forge_cli` reads `FORGE_TIMEOUT` at call time for both `gh` and `glab`.
- T-R-032a (R-032) "no forge makes no call": with `forge: ""`, a `gh` shim and a `glab` shim log no call. The result has no rules, no notes, empty `by_sample` and `unchecked` true. A config with no `forge` key gives the same result.
- T-R-026a (R-026) "every rule has exactly the spec keys": run the GitHub cases (two operators, `negate` true and false) and the GitLab case. Each rule has exactly the keys `source`, `kind`, `pattern`, `negate`, `label`. `kind` is one of `starts_with`, `ends_with`, `contains`, `regex`. `source` is `github` or `gitlab`. `negate` is a boolean and `label` is a string.
- T-R-084b (R-084, glab half) "glab absent does not crash": `PATH` holds `python3` and `git` only. `read_rules` on a gitlab repo returns one note that starts with `rules unknown on gitlab:`, no rules and `unchecked` true. It does not raise.
- Existing S-013 `gh` tests must stay green with no edit. Step 2 runs them.
- Each test can fail: Step 5 breaks the code on purpose.

This slice owns R-030, R-031, R-032 and R-026. It tests the glab half of R-084 (ADR 74ec). R-084 is already `done` in requirements.json, and slices.json does not list it under S-014. T-R-084b is extra evidence for R-084. The planner cannot edit slices.json, so the plan lists the missing link as an ambiguity.

## Steps
1. Test-writer: add the `glab` shim helper and the tests. Run them. They fail because the `gitlab` branch does not exist.
2. Refactor: extract `_run_forge_cli`. Run the S-013 tests. They stay green.
3. Add `gitlab_rule`, `_glab_push_rule` and the `gitlab` branch of `read_rules`. Run `node --test skills/sdlc/test/branches.test.mjs`, then `npm test`.
4. Check that `read_rules` for `github` is unchanged: the S-013 tests pass with no edit.
5. Show that the tests can fail, in a scratch copy only: call `glab` once per sample and see T-R-030a fail. Treat an empty regex as a rule and see T-R-030c fail. Use label `regex` and see T-R-030b fail. Return `unchecked` false on failure and see T-R-031a fail. Do not commit these edits.

## Risks
- `glab api` exits non-zero for an HTTP error such as 403 or 404. Those give the `rules unknown` note and `unchecked` samples. The spec line "an error ... means no rule" conflicts with this. The plan follows R-031: a failed call is a note.
- `glab` fills `:fullpath` from the git remote of the cwd. A repo with no GitLab remote makes `glab` fail. That gives the note, which is the intended result.
- GitLab runs Go RE2 on `branch_name_regex`. Python `re` may reject or read a pattern differently. `judge` already handles an uncompilable pattern as `unevaluated`.
- The push rule is a Premium feature. A free-tier project may return an error. That gives the note, and the run goes on with `unchecked` samples.

## Critique responses
- Critique (ADR 6a1c): fix the spec wording of section 3 (line 107) as a separate spec proposal, not in S-014. The plan and the code stay on ADR f2c2. This slice does not edit the spec. The proposal text: "A glab failure (missing glab, non-zero exit, output that is not JSON, timeout) gives the note and unchecked samples. A successful null body, a body with no branch_name_regex, or an empty branch_name_regex means no rule." The orchestrator files it in SPEC-PROPOSALS.md.
- ADR e148 (unchecked on a successful read): the plan now fixes both values of `unchecked`.
  - `unchecked` is false when glab succeeds and finds no rule. This covers the body `null`, an object with no `branch_name_regex`, a null regex and an empty regex.
  - `unchecked` is true, with the note `rules unknown on gitlab: <stderr>`, when glab is missing, exits non-zero, gives bad JSON or times out.
  - `unchecked` is true with no note when there is no forge.
  - T-R-030c asserts the false cases. T-R-031a to T-R-031c and T-R-084b assert the true cases. T-R-032a asserts no forge.
  - Add one test, T-R-031d: a glab shim that sleeps longer than the timeout gives the note and `unchecked` true. The test sets the timeout low as T-R-031d describes.
- ADR f2c2 (a failed glab call is a note): a non-zero exit (403, 404) or non-JSON output is a failure. A successful JSON error body is not a failure. A successful JSON object with no `branch_name_regex` means no rule. The plan keeps this reading of R-030 and R-031. The spec wording "an error" in section 3 is wrong. The spec fix is not part of this slice. The spec fix is a separate proposal (ADR 6a1c).
- ADR f2cc (per-sample map and union): the one push rule goes under every sample in `by_sample`. `rules` holds it once.
- ADR c4f0 (owner and repo): `glab` runs with `cwd=repo` and the literal `:fullpath`. The code does no remote parsing.
- ADR 74ec (R-084): this slice tests only the glab half (T-R-084b). requirements.json already shows R-084 as done. The missing link in slices.json is an ambiguity for the orchestrator.
- Critique spec-fidelity point 1: T-R-030e adds the JSON error body case. The plan states that a non-zero glab exit gives a note, not no rules. ADR f2c2 (auto) is the basis. Spec proposal 6a1c fixes the spec wording.
- Critique spec-fidelity point 3 and architecture note: `GH_TIMEOUT` becomes `FORGE_TIMEOUT`. T-R-031d patches it in its own python snippet.
- ADR 9094 (R-026): this slice owns R-026 and tests the keys of every rule from both sources (T-R-026a).
- Critique "Resolved by pending: pending": the text names no defect and no ADR. The plan needs no change for it. The earlier critiques above already cover every concrete point.
- Critique "Resolved by ADR-pending: x": the text names no ADR id and no defect. The plan needs no change for it. ADRs f2c2, e148, f2cc, c4f0, 74ec, 9094 and 6a1c stay the basis.
