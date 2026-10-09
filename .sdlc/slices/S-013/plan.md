# S-013 plan: read_rules reads GitHub branch name patterns (revision 1)

## Approach
This slice adds `read_rules(repo, samples)` to `skills/sdlc/branches.py`, with the GitHub branch only. It adds no command. S-014 adds the GitLab and no-forge branches. S-015 calls the function from `cmd_preflight`.
`read_rules` reads `forge` from `<repo>/.sdlc/config.json` through a small `_config_value` helper. `_config_format` calls the same helper, so config errors keep one message. For `github`, `read_rules` runs one `gh api` call per sample. The path is `repos/{owner}/{repo}/rules/branches/<quoted sample>`. The quote is `urllib.parse.quote(sample, safe="")`, so every `/` becomes `%2F`. The literal `{owner}` and `{repo}` stay in the path. `gh` fills them from the repo it runs in, so the call runs with `cwd=repo`.
`github_rule(obj)` turns one API object into a rule. It returns `None` for any object whose `type` is not `branch_name_pattern`. Every rule comes from one constructor, `make_rule(source, kind, pattern, negate, label)`, so each rule has exactly the five keys of the spec. `negate` defaults to `false`. The label falls back from `parameters.name` to `ruleset <ruleset_id>` to `branch_name_pattern`.
The first failed call ends the read. A missing `gh`, a non-zero exit, output that is not a JSON list, or a timeout gives one note, `rules unknown on github: <reason>`. The reason is the trimmed stderr text, or a short fixed text when stderr is empty. No sample is judged then, and the result says `unchecked`.
The result is a dict: `{"forge", "rules", "by_sample", "notes", "unchecked"}`. `by_sample` maps each sample to the rules that GitHub returned for it. `rules` holds the same rules with duplicates removed. A rule that applies to one sample must not judge another sample, because GitHub applies targeting per branch name.
For a forge other than `github`, this slice returns the same shape with no rules, no notes and `unchecked` true. S-014 replaces that line.
The slice changes about 70 lines of product code and about 200 lines of tests.

## Files
- Modify `skills/sdlc/branches.py`: add `RULE_KEYS`, `make_rule`, `_config_value`, `github_rule` and `read_rules`. Make `_config_format` call `_config_value`.
- Modify `skills/sdlc/test/branches.test.mjs`: add the tests below. They use `probe`, `CALL` and `withConfig`, and a `gh` shim helper kept in the same file.
- No other file changes.

## Tests
All tests are in `skills/sdlc/test/branches.test.mjs` and run with `node --test skills/sdlc/test/branches.test.mjs`. A `gh` shim is a shell script in a scratch directory at the front of `PATH`. It appends its argv and its cwd, one line per call, to a log file. It prints canned JSON or exits 1.
- T-R-027a (R-027) "one gh call per sample with the encoded path": samples `sdlc/S-001`, `sdlc/state-20260101000000` and `M-1-e2e` give three logged calls. Each call is `api repos/{owner}/{repo}/rules/branches/<sample>`. Every `/` in the sample is `%2F`. No raw `/` follows `branches/`.
- T-R-027b (R-027) "the call runs in the repo and reads the forge from config": the logged cwd equals the repo. A config with forge `""` makes no call.
- T-R-027c (R-027) "odd samples stay one path segment": a sample with a space, `%`, `?` and `#` is quoted with `safe=""`. The logged path equals `urllib.parse.quote(sample, safe="")`.
- T-R-028a (R-028) "only branch_name_pattern objects become rules": canned JSON with `branch_name_pattern`, `creation`, `pull_request` and `required_status_checks` gives exactly the pattern rules.
- T-R-028b (R-028) "field mapping and negate default": `kind` is `parameters.operator`. `pattern` is `parameters.pattern`. A missing `negate` gives `false`. `negate: true` gives `true`. `source` is `github`.
- T-R-028c (R-028) "label fallback": `parameters.name` wins, also when a ruleset id exists. Else `ruleset <ruleset_id>`. Else `branch_name_pattern`.
- T-R-028d (R-028) "an empty list gives no rules and no notes": `[]` gives `rules` empty, `unchecked` false and no note.
- T-R-028e (R-028) "rule shape": every rule from the cases above has exactly the keys `source`, `kind`, `pattern`, `negate`, `label`. `source` is `github`. `kind` is one of the four operators. This is the GitHub half of R-026. S-014 owns R-026 (ADR 9094).
- T-R-028f (R-028) "rules stay with their sample": two samples get different canned bodies. `by_sample` holds each body's rules under its own sample. `rules` holds both with no duplicate.
- T-R-029a (R-029) "a failing gh gives one note and unchecked samples": a shim that prints `boom` on stderr and exits 1 gives one note `rules unknown on github: boom`, no rules and `unchecked` true. The shim logs one call, not three.
- T-R-029b (R-029) "an empty stderr still gives a reason": exit 1 with no stderr gives a note that starts with `rules unknown on github: ` and has text after it.
- T-R-029c (R-029) "bad output is a failure": output that is not JSON, and JSON that is an object not a list, each give the same single note shape and `unchecked`.
- T-R-084a (R-084, GitHub half) "gh absent does not crash": `PATH` holds `python3` and `git` only. `read_rules` on a github repo returns one note that starts with `rules unknown on github:`, no rules and `unchecked` true. It does not raise.
- Existing `_config_format` and `load_format` tests must stay green with no edit. Step 4 runs them.
- Each test can fail: Step 5 breaks the code on purpose.

The slice owns R-027, R-028 and R-029. It owns the GitHub half of R-084 only. The preflight half needs `cmd_preflight` (S-015). The glab half needs S-014. R-084 stays todo after this slice.

## Steps
1. Test-writer: add the shim helper and the tests. Run them. They fail because `read_rules` does not exist.
2. Add `RULE_KEYS` and `make_rule`. Add `_config_value` and make `_config_format` use it. Run the existing tests.
3. Add `github_rule` and `read_rules`. Use `subprocess.run` with a list argument, `capture_output=True`, `text=True`, `errors="replace"`, `cwd=repo`, `stdin=subprocess.DEVNULL` and a timeout of 60 seconds. Set `GH_PROMPT_DISABLED=1`. Catch `OSError`, `ValueError` and `subprocess.TimeoutExpired`.
4. Run `node --test skills/sdlc/test/branches.test.mjs`, then `npm test`.
5. Show that the tests can fail, in a scratch copy only: drop the `%2F` encoding and see T-R-027a fail. Accept every `type` and see T-R-028a fail. Default `negate` to `true` and see T-R-028b fail. Continue after a failed call and see T-R-029a fail. Do not commit these edits.

## Risks
- `gh api` fills `{owner}` and `{repo}` from the git remote of the cwd. A repo with no GitHub remote makes `gh` fail. That gives the `rules unknown` note, which is the intended result.
- A GitHub operator outside the four known ones becomes a rule with that `kind`. `judge` then gives `unevaluated` with a note, so a new operator never blocks the run.
- The test shim is a shell script, so the suite needs `sh`. The existing tests need it already.
- The per-sample result shape (`by_sample`) is a design choice the spec leaves open. S-015 must judge each sample against `by_sample[sample]`.

## Critique responses
- ADR f2cc (per-sample map and union): the plan already follows option 1. `read_rules` takes the samples. `by_sample` maps each sample to its rules. `rules` is the deduplicated union. T-R-028f tests this. `unchecked` is true when the read did not happen: a failed call, or a forge other than `github`. A successful read that returns `[]` is a read, so `unchecked` stays false (T-R-028d).
- Critique "pending": the critique text holds no content, so nothing can be addressed. The plan makes no change for it.
- ADR c4f0 (owner and repo): the plan keeps the literal `repos/{owner}/{repo}/rules/branches/<quoted sample>` path and runs `gh` with `cwd=repo`. The code does no remote parsing. T-R-027a and T-R-027b test the path and the cwd. A `gh` failure gives the `rules unknown on github` note (T-R-029a).
- ADR 74ec (R-084 ownership): this slice tests only the `gh` half (T-R-084a). R-084 stays todo until S-015.
