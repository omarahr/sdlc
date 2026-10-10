# Plan S-034: SKILL.md orders the format sources and the preflight command

## Approach
The Branch format bullet in SKILL.md already orders the sources: flag, then the repo's `config.json` `branchFormat`, else none. It already says "first run only" for the parse check. This plan changes the fewest clauses. It makes three small insertions and appends one sentence at the end. It rewrites no existing sentence except one prefix. It does not touch the `ok`-false sentence. It does not touch the last sentence, so the pin in prompts.test.mjs line 68 holds. Each requirement gets one test that pins one phrase. The edit is prose only. No script changes.

## Files
- Modify `skills/sdlc/SKILL.md`, Branch format bullet only. Keep it on one line.
  1. After "else none." insert: "With none, give preflight no `--format` argument."
  2. Change "and with `--branch "$BASE_BRANCH"` in `mr` mode." to "and with `--branch "$BASE_BRANCH"` in `mr` mode only." Then add: "No other mode gets `--branch`."
  3. Change "A `working` sample that failed" to "On a first run, a `working` sample that failed".
  4. Append after the last sentence: "On a resume, run no `parse` check and ask for no rename."
  The bullet gets no sentence about what `config.json` records. The env-detector owns that write.
- Modify `skills/sdlc/test/prompts.test.mjs`: add the tests below. Keep every existing assertion.

## Tests
All tests extract the Branch format bullet from SKILL.md and assert on it.
- T-R-128 (prompts.test.mjs): the index of `--branch-format` is lower than the index of `$REPO/.sdlc/config.json`, which is lower than the index of "else none". The bullet contains "when that file exists" and "give preflight no `--format` argument".
- T-R-129: the bullet matches `--format "<format>"` followed by "when you have one". It matches `--branch "$BASE_BRANCH"` followed by "in `mr` mode only". It contains "No other mode gets `--branch`".
- T-R-130: the bullet contains "On a first run, a `working` sample that failed" and "On a resume, run no `parse` check and ask for no rename".
- T-R-002d (trace only, no SKILL.md change): `prompts/env-detector.md` says `branchFormat` is the input, else the existing value, else `sdlc/{name}`. It passes before the edit. It records where R-002 closes.
- Regression: `npm test` stays green. The pins T-R-046a, T-R-097, T-R-101b, T-R-118b, T-R-002c and the line-68 test stay unchanged, because no pinned clause changes.

## Steps
1. Read the existing pins named above.
2. Write the four tests. The new-phrase assertions of T-R-128, T-R-129 and T-R-130 must fail before the edit.
3. Apply the four insertions to SKILL.md.
4. Check each new sentence for at most 20 words and active voice.
5. Run `npm test`.

## Risks
- The bullet is one long line. Each test pins a full phrase, not one word, and makes no negative check.
- Insertion 3 changes the start of a sentence that T-R-118b may pin. Read T-R-118b first. Match its regex.
- On a resume, a failed `working` sample still makes `ok` false, so the driver ends with the printed samples. The driver asks for no rename. The spec does not say more.

## Critique responses
- [spec-fidelity]: no defect. The plan keeps the new-phrase assertions apart from the ones that already pass.
- [architecture]: the second sentence of insertion 4 is gone. A derived format makes it false, and the env-detector owns the write. T-R-002d now pins the env-detector rule. The first sentence stays. The T-R-128, T-R-129 and T-R-130 tests pin only new phrases.
- (earlier) "Resolved by pending: pending": this critique names no defect. The plan stays the simplest approach. It makes four small insertions. It leaves the `ok`-false sentence and the last sentence unchanged. The line-68 pin and the T-R-101b and T-R-118b pins still hold, because no pinned clause changes. A failed `working` sample on a resume still ends the driver (ADR-20261010-113004-decision-judge-S-034-be85).
