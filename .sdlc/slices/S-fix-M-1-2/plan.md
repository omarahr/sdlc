# Plan: S-fix-M-1-2 (revision 1)

## Approach
Change `_run_forge_cli` in `skills/sdlc/branches.py` so a failing `gh` or `glab` never puts its stderr in the note. When the tool exits with a non-zero status, the error becomes `<tool> exited with status <n>`. When stderr holds an HTTP status such as `HTTP 403`, the error adds ` (HTTP 403)`. The code takes only the three digits from stderr, so no other stderr text reaches stdout. The code also limits the error that comes from a launch failure or a timeout to its first line and 200 characters. The note keeps its prefix `rules unknown on <forge>: `. One note stays the rule, and the samples stay `unchecked`. A 10 MB stderr gives a note of under 100 characters. The slice changes no signature, flag or state format. The spec text `<stderr>` names the note's tail. ADR-20261010-172007-decision-judge-S-fix-M-1-2-91a8 settles this: the tail is the status and the HTTP code.

## Files
- Modify `skills/sdlc/branches.py`: `_run_forge_cli` builds the bounded error. Add a helper `_forge_failure(tool, returncode, stderr)` and a helper `_bounded(text)`.
- Modify `skills/sdlc/test/branches.test.mjs`: change the two note expectations that name the raw stderr `boom`, and add the tests below.
- Modify `e2e/pending.json`: remove `SC-M-1-059`, `SC-M-1-061` and `SC-M-1-064` in the test phase. The tests already exist in `e2e/tests/faults.test.mjs`. Create no new e2e file.
- Do not edit the spec. The decision judge recorded proposal P-20261010-172007 in `.sdlc/SPEC-PROPOSALS.md`.

## Tests
- T-R-029-secret (R-029, SC-M-1-059), `branches.test.mjs`: a gh shim that writes `token ghp_SECRET123` and `HTTP 403` on stderr and exits 1 gives one note. The note starts with `rules unknown on github:`, includes `403` and does not include `ghp_SECRET123`. Every sample is `unchecked`.
- T-R-029-bounded (R-029, SC-M-1-064), `branches.test.mjs`: a gh shim that writes 10 MB on stderr, with the secret in the first line, exits 1. The note is shorter than 200 characters and holds no secret. The preflight stdout is shorter than 20000 characters.
- T-R-029a (R-029), `branches.test.mjs`: the existing test changes. A gh shim with stderr `boom` that exits 1 gives the note `rules unknown on github: gh exited with status 1`. The other assertions stay.
- T-R-029b (R-029), unchanged: an empty stderr still gives a reason.
- T-R-031-secret (R-031, SC-M-1-061), `branches.test.mjs`: a glab shim that writes `token ghp_SECRET123` and `HTTP 401` on stderr and exits 1 gives one note. The note starts with `rules unknown on gitlab:`, includes `401` and does not include `ghp_SECRET123`. Every sample is `unchecked`.
- T-R-031a (R-031), `branches.test.mjs`: the existing test changes. The note for stderr `boom` is `rules unknown on gitlab: glab exited with status 1`.
- T-R-084-launch (R-084), `branches.test.mjs`: a missing `gh` and a missing `glab` still give one note that starts with the forge prefix. The note is one line of at most 200 characters.
- T-R-084-multiline (R-084), `branches.test.mjs`: an error text of several lines and 5000 characters from a launch failure gives a note of one line and at most 200 characters plus the prefix.
- SC-M-1-059, SC-M-1-061, SC-M-1-064 (`e2e/tests/faults.test.mjs`): after the test phase removes them from `e2e/pending.json`, they fail first and pass after the fix.
- Existing tests: run `npm test`. The suite loses no assertion. Only the two `boom` expectations change, because the spec's `<stderr>` text no longer holds the raw stderr.

## Steps
1. Remove `SC-M-1-059`, `SC-M-1-061` and `SC-M-1-064` from `e2e/pending.json`. Write the tests above. Run them and confirm they fail because the note holds the secret or the full stderr.
2. Add `_bounded(text)`: take the first non-empty line, strip it, cut it to 200 characters.
3. Add `_forge_failure(tool, returncode, stderr)`: return `<tool> exited with status <returncode>`. When `re.search(r"\bHTTP(?:/\d(?:\.\d)?)? (\d{3})\b", stderr)` matches, append ` (HTTP <code>)`.
4. In `_run_forge_cli`: return `_bounded(str(e))` for the launch and timeout branch, with `type(e).__name__` as the fallback. Return `_forge_failure(...)` for a non-zero exit.
5. Run `npm test` and `node e2e/run.mjs`. Run the three e2e scenarios by hand and confirm no output holds `ghp_SECRET123`.
6. Do not append a second spec proposal. P-20261010-172007 already holds it.

## Risks
- The user loses the tool's own words for the failure, such as `not signed in`. The status and HTTP code keep the main signal. A person can run `gh auth status` for more.
- The HTTP pattern can match text that a secret contains, such as `HTTP 123` inside a token line. The code takes only three digits, so the risk is a wrong number, not a leak.
- `subprocess.run` with `capture_output` still reads 10 MB into memory. The slice does not change that. `FORGE_TIMEOUT` bounds the time.
- The timeout and launch error text can hold a path. `_bounded` limits it to one line of 200 characters. No test of the e2e suite checks the path, and `noHomePath` stays green because the argv holds no home path.

## Critique responses
- ADR-20261010-172007-decision-judge-S-fix-M-1-2-91a8 (Option 2): the prefix stays `rules unknown on <forge>: `. The tail is `<tool> exited with status <n>`, plus ` (HTTP <code>)` when stderr holds a three-digit status. The code never copies raw stderr. T-R-029a and T-R-031a expect the new tail. The spec stays unedited, and the SPEC-PROPOSALS.md entry already exists.
