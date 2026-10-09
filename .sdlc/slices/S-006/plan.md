# S-006 plan: lowercase tails and the cross-format round-trip (revision 1)

## Approach
`name` and `split` already lowercase the tail for `{name:lower}` and keep the literal text as written (S-002 to S-005a). All eight `TAILS` rows exist. So R-011 and the name half of R-068 need tests, not new product code.
`parse` does not exist yet: S-007 adds it. The round-trip test therefore covers the half that exists: for every kind and the three formats, `name` builds the branch, `split` strips the prefix and suffix, and the middle equals the tail (lowercased under `{name:lower}`). The `parse` half joins the same test in S-007 (ADR-20261009-034229 gives the same partial-evidence rule for R-019). This slice adds no `parse` stub.
R-120 is a source check. Today no loop script names an `e2e-area` branch for a push or a pull request. The new test scans `sdlc-loop.js`, `next-action.py`, `state-write.py`, `janitor.py`, `suite-receipt.py` and `impact.py`. It finds every `git push` and pull-request creation site and fails when a site names the `e2e-area` kind or a `-e2e-` tail. The scan uses the kind name because `parse` is not available. The slice notes record that S-009 and S-021 to S-024 must tighten it to the parsed kind.
Product code does not change. The slice adds about 120 lines of tests to `skills/sdlc/test/branches.test.mjs`.

## Files
- Modify `skills/sdlc/test/branches.test.mjs`: add the R-011 case, the round-trip case and the R-120 source check. No new test file; R-068 names this file.
- No change to `skills/sdlc/branches.py` unless a new test finds a defect.

## Tests
All tests are in `skills/sdlc/test/branches.test.mjs`. Run them with `node --test skills/sdlc/test/branches.test.mjs`.
- T-R-011a "name lowercases only the tail under {name:lower}": `name("feature/PROJ-1-{name:lower}", "slice", id="S-001")` is `feature/PROJ-1-s-001`. `name("Feat/PROJ-{name:lower}-X", "slice", id="S-001")` is `Feat/PROJ-s-001-X`: prefix and suffix keep their case. The CLI `name --format feature/PROJ-1-{name:lower} --kind slice --id S-001` prints the same branch. Passes now (characterization).
- T-R-068a "name and split round-trip every kind under the default, a prefixed and a lowercased format": for each of the eight kinds and the formats `sdlc/{name}`, `feature/PROJ-1-{name}`, `feature/PROJ-1-{name:lower}` (24 cases), build the branch with sample parts (run n=1; slice S-001; milestone M-1; e2e M-1; e2e-area M-1 and area `api-v2`; state ts 20261008101500; verify S-001, round 0, profile http-api, part 0; attempt S-001, n=1). Assert the branch starts with the prefix, ends with the suffix, and the middle equals `tail(...)`, lowercased for the lowercased format. Assert the branch passes `git check-ref-format --branch`. Passes now (characterization). S-007 adds the `parse` assertion to the same test.
- T-R-068b "the CLI name matches the Python name for all 24 cases": run `branches.py name` with `--format` and compare `branch` with `mod.name`. Passes now (characterization).
- T-R-120a "no push or pull-request site names an e2e-area branch": read the six source files. For each line that holds `git push`, `"push"`, `'push'`, `pr create` or `pulls`, take the statement (the line and the next 3 lines). Assert the statement holds neither `e2e-area` nor `-e2e-`. Assert that the scan finds at least one push site (state-write.py), so the scan cannot pass on an empty match. Passes now.
- T-R-120b "a planted e2e-area push is caught": run the same scanner function on a string with `git(repo, "push", "-u", "origin", name(fmt, "e2e-area", id=m, area=a))`. Assert it reports a violation. This proves that T-R-120a can fail.

## Steps
1. Test-writer: add T-R-011a, T-R-068a, T-R-068b, T-R-120a and T-R-120b to `branches.test.mjs`. Put the scanner in a helper function in the same file so T-R-120b can call it.
2. Run `node --test skills/sdlc/test/branches.test.mjs`. All new tests pass at once, because they characterize existing behavior. Record "characterization" for each in tests.md.
3. Mutation check by hand: change `lower` handling in `name` (drop `.lower()`), and add an `e2e-area` push line to a scratch copy of `state-write.py`. Confirm T-R-011a, T-R-068a and T-R-120b catch each change. Revert both.
4. Run `npm test`.

## Risks
- R-068 stays partial: the `parse` half comes in S-007. The integrator marks R-068 `in_progress` with the note "parse half closes in S-007". The state-writer adds R-068 to S-007. S-007 adds the parse assertion and closes R-068. This slice never marks R-068 done.
- R-120 names the kind, not the parsed kind. A push that builds an e2e-area branch through a variable the scan cannot read passes. R-120 does not use the push guard (S-005b, parked). The S-005b dependency is soft: this slice builds on main with S-005a only. A later follow-up can add a push-guard cross-check.
- The statement window of 4 lines can miss a push that spans more lines. The test pins at least one real site so a window change shows up.
- A comment line that mentions `e2e-area` near a push would raise a false violation. The scanner skips lines that start with `#` or `//`.

## Critique responses
- ADR-20261009-164238 (R-068): R-068 stays in S-006 as `in_progress` with the note "parse half closes in S-007". The state-writer adds R-068 to S-007. This plan adds no parse stub (see Risks).
- ADR-20261009-164239 (ec63, R-120): the scan uses the kind name and the `-e2e-` tail. T-R-120b is the planted-violation test. The slice notes record that S-009 and S-021 to S-024 must tighten the scan to the parsed kind.
- ADR-20261009-164239 (db35, S-005b): build on main with S-005a only. The S-005b dependency is soft. The plan records that R-120 does not use the push guard.
