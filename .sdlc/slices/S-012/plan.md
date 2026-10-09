# S-012 plan: sample verdicts, bad patterns and check-ref-format (revision 1)

## Approach
This slice adds two functions to `skills/sdlc/branches.py`: `ref_format_error(sample)` and `judge(rules, sample)`. It adds no command and no rule reader. S-013 to S-015 call them.
`ref_format_error(ref)` is the only place that runs `git check-ref-format --branch <ref>`. It returns `None` when git accepts the ref. Otherwise it returns the reason text: git's stderr, or `exit <code>` when stderr is empty. It raises `Fail` when git cannot run. The call sets no cwd, and no test depends on a repo.
`validate_format` stops running git itself. It calls `ref_format_error(name(fmt, "slice", id="S-001"))`. It raises `Fail` with its existing messages, for the refusal and for git that cannot run. A later fix to the git flags or to the leading-dash seed then happens in one place.
`judge` returns `{"result", "rule", "notes"}`. It calls `evaluate` for each rule, in order. A `False` result fails the sample, and the first failing rule gives `rule` its label. A `None` result marks the sample unevaluated. When the rule is a `regex`, `judge` builds the note `cannot evaluate <label>: <re.error>` from `regex_error`. For another `None` (an unknown kind), the note is `cannot evaluate <label>: unknown kind <kind>`, as ADR 8da6 and the S-011 ADRs say.
After the forge rules, `judge` runs `ref_format_error`. A refusal counts as a failed rule with the label `git check-ref-format`. It comes last, so a forge rule that fails keeps the first-failing label. A failure always beats `unevaluated`.
`judge` with no rules still runs the ref check. A caller that has no rules (no forge) reports `unchecked` itself, in S-013 and S-015. This slice does not own `unchecked`.
`judge` returns one note per rule that gave `None`. A caller that judges many samples gets the same note for each sample, so S-015 must remove duplicate notes across samples.
The slice changes about 50 lines of product code and about 130 lines of tests.

## Files
- Modify `skills/sdlc/branches.py`: add `ref_format_error` and `judge`. Change `validate_format` to call `ref_format_error` and keep its messages.
- Modify `skills/sdlc/test/branches.test.mjs`: add the tests below. They use the existing `probe` and `CALL` helpers, as `evaluateEach` does.
- No other file changes.

## Tests
All tests are in `skills/sdlc/test/branches.test.mjs`. Run them with `node --test skills/sdlc/test/branches.test.mjs`. Rules are hand-written dicts with the five keys.
- T-R-035a (R-035) "a pattern Python cannot compile gives an unevaluated sample": `judge([regex "("], "sdlc/S-001")` has result `unevaluated`, `rule` null, and one note that starts with `cannot evaluate push rule: `. The text after it equals `regex_error("(")`.
- T-R-035b (R-035) "the note carries the rule label": a rule labelled `ruleset 7` with pattern `[a-` gives the note `cannot evaluate ruleset 7: ` followed by the `re.error` text.
- T-R-035c (R-035) "a bad pattern never blocks": a bad pattern beside a passing rule gives `unevaluated`, never `fail`. A negated bad pattern gives `unevaluated` too.
- T-R-035d (R-035) "judge does not raise on a bad pattern": `judge` returns a dict for `(`, `[a-` and `*` and never raises. The `ok: true` half of the acceptance belongs to S-015 (ADR 8681).
- T-R-036a (R-036) "one False fails the sample": rules `[True, False, True]` (built from `starts_with`) give `fail`, and `rule` is the label of the False rule. Two failing rules give the label of the first.
- T-R-036b (R-036) "all True passes": three passing rules give `pass`, `rule` null, and no notes. The empty rule list also gives `pass`.
- T-R-036c (R-036) "no failure plus one None is unevaluated": `[True, bad regex]` gives `unevaluated`.
- T-R-036d (R-036) "a failure beats a None": `[bad regex, False]` gives `fail` with the label of the False rule. The spec sets no rule for notes on a failed sample, so this test asserts only `result` and `rule`.
- T-R-036e (R-036) "negate counts": a negated rule that matches gives `fail`. A negated rule that does not match gives `pass`.
- T-R-037a (R-037) "an invalid ref fails with the git rule": a `working` sample `bad..name` against zero rules gives `fail` with `rule` `git check-ref-format`. The same holds for `a~b`, `a^b`, `a:b`, `a?b`, `a*b`, `a[b`, `a\b`, `/lead` and `x.lock`.
- T-R-037b (R-037) "a valid sample passes the ref check": `sdlc/S-001` and `feature/PROJ-1-sdlc-foo` give `pass`. `ref_format_error` returns `None` for them and a non-empty string for `bad..name`.
- T-R-037c (R-037) "a forge rule keeps the first label": `bad..name` against a failing `starts_with feature/` rule gives `fail` with the forge rule label. A passing forge rule plus `bad..name` gives `git check-ref-format`.
- Existing `validate_format` tests in the same file must stay green with no edit. Step 3 runs them.
- Each test can fail: Step 4 breaks the code on purpose.

The slice owns R-035, R-036 and R-037. Each has a test above.

## Steps
1. Test-writer: add the tests. Run them. They fail because `judge` and `ref_format_error` do not exist.
2. Add `ref_format_error` and `judge` to `branches.py`. Keep the aggregation in one loop. Move the git call out of `validate_format` into `ref_format_error`, and make `validate_format` call it.
3. Run `node --test skills/sdlc/test/branches.test.mjs`, which includes the existing `validate_format` tests. Then run `npm test`.
4. Show that the tests can fail, in a scratch copy only: let `None` count as `False` and see T-R-035c and T-R-036c fail. Check "any None" before "any False" and see T-R-036d fail. Drop the ref check and see T-R-037a fail. Do not commit these edits.

## Risks
- `git check-ref-format --branch` also expands `@{-1}` and refuses a leading `-`. A sample never starts that way, so the risk is small. A sample `@{-1}` would pass or fail by repo state; the tests run outside any repo.
- The refactor of `validate_format` could change its error text. The existing tests guard it.
- A failed `git` call (missing binary) raises `Fail` from `ref_format_error`. The preflight then exits 2, which is correct bad input handling.
- Order of the ref check: ADR f284 fixes it. The forge label wins and git comes last. Reverse by moving one block.
- Python `re` and RE2 differ for rare patterns. The spec accepts this.

## Critique responses
- ADR f284 (forge label wins): the plan keeps the order. Forge rules run first. When both fail, the first failing forge rule gives `rule`. The ref check reports `git check-ref-format` only when no forge rule failed. T-R-037c asserts both cases.
- ADR 8681 (S-015 owns the preflight half of R-035): S-012 tests the judge only. S-012 adds no preflight stub test. S-015 must add a named test: a fixture repo, one bad regex, nothing else failing, and the result `ok: true` with one "cannot evaluate" note. R-035 stays todo until that test passes.
- Architecture (duplicate git call): the plan no longer copies the git call. `ref_format_error` is the only place that runs git, and `validate_format` calls it. Existing `validate_format` tests run in Step 3.
- Architecture (duplicate notes): the Approach says `judge` returns one note per `None` rule, and S-015 must remove duplicates across samples.
- Spec fidelity (loose cwd claim): the plan now says the call sets no cwd, and no test depends on a repo.
- Spec fidelity (notes on failure): T-R-036d now asserts only `result` and `rule`.
