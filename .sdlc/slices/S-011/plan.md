# S-011 plan: evaluate applies one rule to a sample (revision 2)

## Approach
This slice adds the function `evaluate(rule, sample)` and the helper `regex_error(pattern)` to `skills/sdlc/branches.py`. It adds no command, no rule builder and no constant. S-012 to S-014 call it.
`evaluate` computes a raw result per kind. `starts_with` uses `sample.startswith(pattern)`, `ends_with` uses `sample.endswith(pattern)` and `contains` uses `pattern in sample`. All three are case-sensitive. `regex` compiles the pattern with `re.compile`. An `re.error` gives `None`. Otherwise the result is `search(sample) is not None`.
`negate` then flips `True` and `False`. `None` stays `None`.
A kind outside the four gives `None` and does not raise. This keeps the "never blocks" rule of R-035.
`evaluate` does not write the note `cannot evaluate <label>: <re.error>`. S-012 writes it (R-035). `regex_error(pattern)` returns the `re.error` text, or `None` when the pattern compiles. S-012 needs the text for the note.
R-026 is not tested here. Its acceptance needs `read_rules`, which S-013 and S-014 build. See Risks and Critique responses.
No comment goes in the code. The slice changes about 25 lines of product code and about 70 lines of tests.

## Files
- Modify `skills/sdlc/branches.py`: add `regex_error` and `evaluate`.
- Modify `skills/sdlc/test/branches.test.mjs`: add the tests below. They use the existing `callEach` helper, which calls a module function through a Python probe.
- No other file changes.

## Tests
All tests are in `skills/sdlc/test/branches.test.mjs`. Run them with `node --test skills/sdlc/test/branches.test.mjs`. Rules in the tests are hand-written dicts with the five keys of the spec.
- T-R-033a (R-033) "each operator follows its definition": `starts_with` `feature/` is `true` for `feature/x` and `false` for `bugfix/x`. `ends_with` `-e2e` is `true` for `sdlc/M-1-e2e` and `false` for `sdlc/M-1`. `contains` `/S-` is `true` for `sdlc/S-001` and `false` for `sdlc/M-1`.
- T-R-033b (R-033) "starts_with is case-sensitive": pattern `Feature/` on `feature/x` is `false`.
- T-R-033c (R-033) "regex uses search, not match": `^sdlc/` on `sdlc/S-001` is `true`. `S-001` on `sdlc/S-001` is `true`, because search finds it mid-string. `^S-001` on `sdlc/S-001` is `false`.
- T-R-095a (R-095) "ends_with is case-sensitive": pattern `-E2E` on `sdlc/M-1-e2e` is `false`, and on `sdlc/M-1-E2E` is `true`.
- T-R-095b (R-095) "contains is case-sensitive": pattern `Feature` on `feature/x` is `false`, and on `Feature/x` is `true`.
- T-R-034a (R-034) "negate flips a boolean": a negated `starts_with` rule that matches (`feature/` on `feature/x`) returns `false`. A negated rule that does not match returns `true`.
- T-R-034b (R-034) "negate keeps None": a negated `regex` rule with the pattern `(` returns `null`, as the un-negated rule does.
- T-R-035a (R-035) "unknown kind gives None": a rule of kind `equals` returns `null`, with `negate` true and false. `evaluate` does not raise.
- T-R-035b (R-035) "regex_error gives the compile error": `regex_error("(")` returns a non-empty string. `regex_error("^a")` returns `null`.
- T-R-072a (R-072) "evaluate follows each operator, negate flips, and a bad regex gives null": one test with the name the spec gives. It asserts one result per operator, the negate flip for each of the four kinds, and `null` for the patterns `(` and `[a-`.
- Each test can fail: Step 4 breaks the code on purpose.

R-026 has no test in this slice. Its acceptance reads "Every rule read_rules returns has exactly these keys". No S-011 code can check that. The requirement must move to S-013 and S-014 before S-011 can close (see Risks).

## Steps
1. Test-writer: add the tests. Run them. They fail because `evaluate` and `regex_error` do not exist.
2. Add `regex_error` and `evaluate` to `branches.py`. Keep the raw result and the negate flip in two separate steps.
3. Run `node --test skills/sdlc/test/branches.test.mjs`, then `npm test`.
4. Show that the tests can fail, in a scratch copy only: change `search` to `match` and see T-R-033c fail. Lower-case both sides and see T-R-033b, T-R-095a and T-R-095b fail. Drop the `None` guard in negate and see T-R-034b fail. Do not commit these edits.

## Risks
- R-026 is listed only under S-011 in `slices.json`. This plan cannot test it. The orchestrator must remove R-026 from S-011 and add it to S-013 and S-014 before S-011 verifies. Until then, nobody may mark R-026 verified for S-011. The plan reports this as a contradiction in `ambiguities`.
- Python `re` and RE2 differ for rare patterns. The spec accepts this. A pattern Python compiles but a forge rejects gives a wrong verdict; the push still reports the real result.
- A `regex` pattern that backtracks without end could hang `evaluate`. Rule patterns come from the forge and are short. The plan adds no timeout.
- Python `re` also raises `RecursionError` or `OverflowError` for some odd patterns. `evaluate` catches only `re.error`, as the spec says.

## Critique responses
- Critique spec-fidelity, point 1 (R-026): the plan drops the builder and its tests T-R-026a and T-R-026b. They tested `make_rule`, not `read_rules`. The plan cannot write a real R-026 test in this slice. It does not rely on an ADR note. It states the state edit in Risks and returns it as a contradiction in `ambiguities`, so the orchestrator moves R-026 in `slices.json`. The planner does not own that file.
- Critique spec-fidelity, point 2 (extra behavior): the plan cuts `make_rule`, `RULE_SOURCES`, `RULE_KINDS`, `RULE_KEYS` and the empty-pattern assertion. It keeps `regex_error` and the unknown-kind `None`. R-035 needs the first for the note text and the second for the "never blocks" rule. Tests T-R-035a and T-R-035b tie both to R-035.
- Critique architecture: no change needed. `evaluate` stays pure and adds no command. The note on `make_rule` and unknown operators no longer applies, because the builder is gone. S-013 must still map a GitHub operator outside the four kinds without a crash. S-011 gives it `None` from `evaluate` for such a kind.
