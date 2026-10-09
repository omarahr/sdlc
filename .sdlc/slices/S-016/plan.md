# Plan S-016: preflight derives a format from one simple rule

## Approach
Add pure functions to `skills/sdlc/branches.py`. `derive(rules)` returns the table format for exactly one non-negated `starts_with`, `ends_with` or `contains` rule with a string pattern. It returns `None` in every other case. `cmd_preflight` runs the first verdict. It tries a derivation only when that verdict fails, `given` is false, at least one loop-kind sample (not `working`) fails, and `derive` returns `fmt2` (ADR d001). It runs `verdict` again under `fmt2`. It does not call `validate_format` on `fmt2`. The second `verdict` already fails a bad ref through `judge` and `git check-ref-format`. It wraps the second pass in `try/except Fail` and treats a `Fail` as a failed derivation. When the second verdict is `ok`, the output carries `format` = `fmt2`, `derived` true, and the second verdict's `rules`, `samples` and `notes`. A `working` failure still blocks, so `ok` stays false then. When the derivation fails, the output keeps the original format, `derived` false and the first-verdict values (ADR b19f). A failed derivation never raises, so the exit code is 1. `suggest` builds the suggestion for every failing verdict. For a regex rule, `_regex_literal` builds a literal from the pattern. It accepts a candidate when the rule accepts `<literal>/S-001` and the candidate makes a valid format. It uses only that one tail, as R-122 says. It reads the pattern with the stdlib regex parser (`re._parser`, fallback `sre_parse`) inside `try/except`, because that is the only way to build a match for a class, a group or a repeat without a new dependency. Any error gives `None` and the text fallback. The loop-kind guard is reachable only in `pr` and `stack` mode, because `SAMPLE_KINDS` gives `mr` and `direct` no loop-kind samples; their only sample is the `working` one from `--branch`. In `mr` mode no derivation happens, so a bad `working` branch never triggers one. No mode gives a loop-kind failure and a `working` failure together, so the two-line suggestion is reachable only through a direct call to `suggest`. The S-015 output keys stay.

## Files
- Modify `skills/sdlc/branches.py`:
  - `derive(rules)`: the table in section 4.
  - `_regex_literal(rule)`: input is one rule dict. Output is a string or `None`.
    - It builds the shortest match string from the parsed pattern. It handles literal, class (first member), branch (first alternative), group, repeat (the minimum count, at least 0), `.` (the letter `a`) and anchors. Any other node gives `None`.
    - The candidates are the parts of that string before each `/`, shortest first. When the string holds no `/`, the whole string is the only candidate.
    - A candidate is valid when `evaluate(rule, candidate + "/S-001")` is `True` (for a negated rule: the negated result) and `validate_format(candidate + "/{name}")` does not raise `Fail`.
    - The first valid candidate wins. When none is valid, the function returns `None` (ADR 13d6).
  - `suggest(rules, rows, derived)`: `rules` is the first verdict's rules. `rows` is the first verdict's sample rows. `derived` is `derive(rules)` or `None`. It returns one string of lines joined with a newline.
  - `cmd_preflight`: first verdict, the derive step, the second verdict, and the final output.
- Modify `skills/sdlc/test/branches.test.mjs`: new tests. Reuse `ghShim`, `glabShim`, `githubRepo`, `gitlabRepo`, `preflight`.

## Suggestion rules
`suggest` has one line per cause. A verdict from the CLI never has both causes, because no mode has both sample kinds. A direct call to `suggest` with hand-built rows can have both.
1. A loop-kind sample failed (any mode, `given` or not) gives a format line, chosen in this order:
   - `derived` is not `None`: `--branch-format "<derived>"`. This also holds when `given` is true and when the second verdict failed. Example: `--branch-format "sdlc/{name}.lock"`.
   - Exactly one rule, `kind` regex, `negate` false, and `_regex_literal` returns `lit`: `--branch-format "<lit>/{name}" (rule "<label>": regex "<pattern>")`.
   - Exactly one rule, `kind` regex, and `_regex_literal` returns `None`: `--branch-format "<literal>/{name}" (rule "<label>": regex "<pattern>"; choose a literal that the pattern accepts before S-001)`.
   - Any other case (negated rule, several rules, no rule with a `git check-ref-format` failure): `--branch-format "<format>" (every branch name must pass: <label>; <label>)`. The labels are those of all rules, or `git check-ref-format` when there are none.
2. A `working` sample failed gives: `rename the branch "<name>" (rule "<label>"), for example: git branch -m <name> <new-name>`.
The format line comes first. A suggestion is non-empty in every failing verdict.

## Tests
All tests are in `skills/sdlc/test/branches.test.mjs`. Each names its mode. A test without a mode uses `--mode pr`.
- R-042:
  - T-R-042a: gh shim, one `starts_with feature/` rule, no format. Output is `ok` true, `format` `feature/sdlc/{name}`, `derived` true, exit 0. The samples are the second verdict's names such as `feature/sdlc/S-001` with `pass`.
  - T-R-042b: `ends_with -x` gives `sdlc/{name}-x`. `contains team` gives `sdlc/team/{name}`. Both are `ok` and `derived`.
  - T-R-042c: no derivation when `--format` is given, when the config holds a format, when the rule is negated, when the rule is `regex`, and when there are two rules. Each case exits 1 with `derived` false and the original format.
  - T-R-042d: a rule the default already passes gives `ok`, `derived` false and the default format.
  - T-R-042e: `--mode pr`, one `contains a..b` rule, no format. The derived `sdlc/a..b/{name}` fails `git check-ref-format`. Output is `ok` false, exit 1 (not 2), `derived` false, `format` `sdlc/{name}`, and `suggestion` equals `--branch-format "sdlc/a..b/{name}"`.
  - T-R-042f: `derive` through a Python probe returns the three table formats and `None` for regex, negate, two rules, zero rules, an unknown kind and a non-string pattern.
  - T-R-042g: `--mode mr`, one derivable `starts_with feature/` rule, `--branch bad-name` fails. `mr` mode has no loop-kind samples, so the guard stops the derivation. Output is `ok` false, `derived` false, the original format, exit 1. The `samples` list holds only the `working` row. The suggestion is one line and starts with `rename the branch "bad-name"`.
  - T-R-042h: Python probe of the guard in `pr` mode: a derivable rule with a failing loop-kind sample derives. The same rule in `mr` mode with only a failing `working` row does not derive.
  - T-R-042i: a failed derivation keeps the first-verdict `samples` and `rules`, and the output holds no second-verdict sample name.
- R-087: T-R-087a: `--mode pr`, gh shim with one `ends_with .lock` rule, no format. Output is `ok` false, exit 1, `format` `sdlc/{name}`, `derived` false, and `suggestion` equals exactly `--branch-format "sdlc/{name}.lock"`. R-087 says the suggestion is the derived format. Spec section 4 step 6 and ADR b19f say it is a `--branch-format` line that carries that format. The test asserts the line, and the line holds the derived format.
- R-043:
  - T-R-043a: the T-R-087a verdict. `suggestion` starts with `--branch-format`.
  - T-R-043b: a regex rule the default fails (`--mode pr`): `suggestion` starts with `--branch-format` and quotes the pattern.
  - T-R-043c: `--mode mr`, GitLab regex, `--branch bad-name`: `suggestion` is one rename line that names `bad-name`. It holds no `--branch-format` line, because `mr` mode has no loop-kind sample.
  - T-R-043d: `--mode pr`, two rules, no format: `suggestion` starts with `--branch-format "<format>"` and names both labels.
  - T-R-043e: `--mode pr`, `--format feature-x/{name}` given and a `starts_with release/` rule: `ok` false, `suggestion` equals `--branch-format "release/sdlc/{name}"`.
  - T-R-043f: `--mode pr`, one negated `starts_with sdlc/` rule: `suggestion` starts with `--branch-format "<format>"` and names the rule label.
  - T-R-043g: Python probe of `suggest` with one regex rule and hand-built rows: one failing `slice` row and one failing `working` row. The suggestion has two lines, the `--branch-format` line first and the rename second. A second probe with only the `working` row gives the rename line alone.
  - T-R-043h: `suggest` through a Python probe with no rules and one failing `git check-ref-format` row gives the generic line with `git check-ref-format`.
- R-122:
  - T-R-122a: `--mode pr`, a regex rule `^(feature|bugfix)/[A-Z]+-\d+$`, no format. The suggestion holds `--branch-format "feature/{name}"`. The test substitutes `S-001` into the literal and checks that the pattern accepts `feature/S-001`.
  - T-R-122b: `--mode pr`, the same check for `^(user|team)-[a-z]+/.*` and for `^[a-z]+/S-\d+$`. In `--mode stack`, the same check for the first pattern. The tests check only the `S-001` tail, not the other sample names.
  - T-R-122c: `--mode pr`, a pattern that no candidate satisfies, `^[a-z]+$`. The suggestion holds `--branch-format "<literal>/{name}"` as text and the quoted pattern. A second case uses a pattern that the parser cannot build (a lookahead): the same text.
- R-073: T-R-073a is named `derive follows the table and refuses regex, negate and several rules`, the exact spec test name. It asserts the three derived formats and the three refusals through the CLI and a Python probe.

## Steps
1. Write the failing tests above.
2. Add `derive`.
3. Add `_regex_literal` and `suggest`.
4. Change `cmd_preflight`: first verdict, derive when allowed, second verdict inside `try/except Fail`, final output and exit code.
5. Run `npm test`. Confirm the S-015 tests still pass, in particular T-R-044a.

## Risks
- The second `verdict` calls `gh` again for the new sample names. A shim that answers by sample name must handle both name lists.
- `re._parser` is private API and its constants differ between Python versions. A wrapper catches any exception and falls back to the text. The tests cover a `None` result.
- Python `re` and RE2 differ on rare patterns. `_regex_literal` checks the candidate with `evaluate`, the same function the verdict uses. The literal is a suggestion, and the next preflight run checks it with every sample.
- The accepted literal is checked only against the tail `S-001`. A pattern that rejects `state-<digits>` or `M-1-e2e` still fails the next preflight run. The suggestion is then a first step, not a guarantee. S-017 can refine it.
- `branches.py` grows by about 100 lines. The size is acceptable for the pure functions and stays in one unit.

## Critique responses
- Spec-fidelity 1 (candidate acceptance): `_regex_literal` now accepts a candidate when the rule accepts `<literal>/S-001`, as R-122 says. It no longer needs every sample to pass. Each test names its mode. T-R-122c adds a case where no candidate can pass (`^[a-z]+$`) and the text fallback appears.
- Spec-fidelity 2 (suggestion string): the suggestion is a `--branch-format` line. T-R-087a asserts `--branch-format "sdlc/{name}.lock"`, and T-R-043a asserts the prefix of the same output. The two tests now agree.
- Spec-fidelity 3 (`contains a..b`): the plan catches `Fail` and does not call `validate_format` on `fmt2`. T-R-042e asserts `ok` false, exit 1 and the exact `--branch-format "sdlc/a..b/{name}"` suggestion.
- Spec-fidelity secondary gap: the section "Suggestion rules" defines a suggestion for a given format (T-R-043e), a negated rule (T-R-043f), a regex rule with a `working` failure (T-R-043g), and several rules (T-R-043d).
- Architecture 1: same as spec-fidelity 3. One path covers `.lock` and `a..b`. `validate_format` on `fmt2` is dropped.
- Architecture 2: `suggest(rules, rows, derived)` and `_regex_literal(rule)` now have inputs and outputs. `names_for` is gone. `_regex_literal` does not use `build_samples`, because it checks only the `S-001` tail.
- Architecture 3: the plan keeps the stdlib parser and gives the reason in the Approach and Risks. The alternative of cutting literal text from the raw pattern cannot build a match for `^(feature|bugfix)/[A-Z]+-\d+$`. The builder handles a fixed small node set and falls back to text.
- ADR d001: derivation runs only when a loop-kind sample fails. T-R-042g tests the `mr` no-derive case through the CLI. T-R-042h tests the guard through a probe.
- Spec-fidelity (mr has no loop-kind samples): T-R-042g, T-R-042h, T-R-043c and T-R-043g no longer claim loop-kind samples in `mr` mode. The combined two-line suggestion is tested only by a direct `suggest` probe with hand-built rows (T-R-043g). The Approach explains that the guard is `pr` and `stack` only.
- Spec-fidelity (R-087 wording): the reconciliation sits next to T-R-087a.
- Architecture: no change needed. The plan keeps the pure functions and the stdlib parser with its fallback.
- ADR b19f: a failed derivation returns the original format, `derived` false and the first-verdict values. T-R-042i and T-R-087a test it.
