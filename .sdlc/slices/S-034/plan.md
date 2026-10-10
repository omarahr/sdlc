# Plan S-034: SKILL.md orders the format sources and the preflight command

## Approach
S-018 and S-019 put most of the Branch format bullet into SKILL.md. This slice makes four things explicit in that bullet and pins them with tests. First, the order of the format sources: the flag, then the `branchFormat` in the repo's `config.json` when the file exists, else none. Second, with no format, the preflight call has no `--format` argument. Third, `--branch "$BASE_BRANCH"` goes to preflight in `mr` mode only. Fourth, on a resume the driver runs no `parse` check and asks for no rename. A failed `working` sample needs care: `branches.py` sets `ok` false for it (line 528), and the bullet says to end when `ok` is false. So the plan puts a resume carve-out into the `ok`-false sentence itself: on a resume, when the only failed sample is `working`, treat `ok` as true and take `format` from the result. The bullet also says a fresh run with no format ends with `sdlc/{name}` recorded in `config.json`. That is true because preflight reports the default as `format`, the launch passes it to env-detector, and env-detector writes it. No script changes. The edit is prose in one bullet.

## Files
- Modify `skills/sdlc/SKILL.md`: edit only the Branch format bullet. Keep it on one line.
  - Keep the existing "else none" wording of the source order.
  - After "with `--format "<format>"` when you have one", add: "With no format, give preflight no `--format` argument."
  - After the `--branch "$BASE_BRANCH"` clause, say "in `mr` mode only" and add: "No other mode gets `--branch`."
  - Change "A `working` sample that failed names the user's own branch: ask them to rename it and end." to "On a first run, a `working` sample that failed names the user's own branch: ask them to rename it and end."
  - Edit the `ok`-false sentence to start: "When `ok` is false, print its `samples` that failed ... and end, except on a resume: when the only failed sample is `working`, treat `ok` as true and use its `format`." Keep the rest of that sentence.
  - Replace the last sentence with: "This check is first run only: on a resume the current branch is normally the run branch, so run no `parse` check and ask for no rename."
  - Add after the derived sentence: "A fresh run with no format ends with `sdlc/{name}` recorded as `branchFormat` in `config.json`."
- Modify `skills/sdlc/test/prompts.test.mjs`: add the tests below. Keep every existing assertion.

## Tests
- T-R-128 (prompts.test.mjs): in the Branch format bullet, the index of `--branch-format` is lower than the index of `$REPO/.sdlc/config.json`, which is lower than the index of "else none". The bullet says the `config.json` source applies "when that file exists". The bullet contains "give preflight no `--format` argument".
- T-R-129a: the bullet contains `--format "<format>"` followed by "when you have one". This is a regression pin only; it passes before the edit.
- T-R-129b: the bullet matches `--branch "$BASE_BRANCH"` followed by "in `mr` mode only", and contains "No other mode gets `--branch`". No negative check on mode names.
- T-R-130: the bullet contains "On a first run, a `working` sample that failed". The bullet contains "on a resume the current branch is normally the run branch, so run no `parse` check, ignore a failed `working` sample and ask for no rename". The `git branch -m <new-name>` ask still follows a `parse` kind.
- T-R-002d: the bullet says a fresh run with no format records `sdlc/{name}` as `branchFormat` in `config.json`. A second assertion reads the `env-detector.md` rule and checks `else \`sdlc/{name}\`` (link to T-R-002c).
- Regression: `npm test` stays green. The existing pins stay: T-R-046a, T-R-097, T-R-101b, T-R-118b and the stack-flag test at prompts.test.mjs line 68 (`first run only` ... `on a resume the current branch is normally the run branch`). The new last sentence keeps that exact clause.

## Steps
1. Write the failing tests first. T-R-128, T-R-129b, T-R-130 and T-R-002d must fail before the edit.
2. Edit the Branch format bullet in SKILL.md as listed in Files.
3. Check the new sentences against ste-style.md: at most 20 words, active voice.
4. Run `npm test`.

## Risks
- The bullet is one very long line. Pin phrases, not single words, and avoid negative checks.
- The sentence "On a resume, the `config.json` `branchFormat` gives the same value without `--branch-format`" stays, because T-R-097 pins it.
- The "fresh run records the default" claim depends on env-detector. T-R-002c pins that rule; T-R-002d links to it.
- The last sentence is longer than 20 words. Split it into two sentences if the STE test or review objects, and keep the line-68 clause intact.

## Critique responses
- Spec-fidelity: the plan now limits the `working` rename ask to a first run. On a resume the driver ignores a failed `working` sample and asks for no rename. T-R-130 pins both phrases. T-R-129a is marked a regression pin only.
- Architecture 1: the new last sentence keeps the exact clause "on a resume the current branch is normally the run branch" after "first run only". The plan lists the line-68 test as pinned.
- Architecture 2: T-R-129b asserts the positive phrases "in `mr` mode only" and "No other mode gets `--branch`". It has no negative mode-name check.
- Architecture 3: the plan keeps "else none" and T-R-128 pins that one phrase.
- Architecture (second critique, failed `working` sample): the plan now carves the resume case out of the `ok`-false sentence, so the two sentences no longer contradict. T-R-130 asserts the ordering of the carve-out between the `ok`-false and `ok`-true rules. The last sentence no longer says "ignore a failed `working` sample"; the carve-out says it.
- Spec-fidelity (second critique): all four requirements stay covered. The minor STE point stays: split the long sentences while keeping the line-68 clause.
