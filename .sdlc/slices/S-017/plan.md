# Plan S-017: preflight edge cases and the forge shim suite

## Approach
S-015 and S-016 built the preflight code path: `verdict`, `derive`, `suggest` and `cmd_preflight` in `skills/sdlc/branches.py`. This slice adds tests that pin the edge cases and the seven shim scenarios of the spec. The tests run `preflight` on a fixture repo with `gh` and `glab` shims on `PATH`. The shim helpers `ghShim`, `glabShim`, `githubRepo`, `gitlabRepo`, `preflight`, `prRun` and the rule builders already exist in `skills/sdlc/test/branches.test.mjs`. The plan reuses them and adds no helper except one small canned-response builder. The plan expects no change to `branches.py`. The tests go in first. If a test fails, the implementer fixes the smallest cause in `branches.py` and records it in `evidence.md`. The shim suite is one test that walks all seven scenarios, so a wrong pass in any scenario fails one named test (R-074).

## Files
- Modify `skills/sdlc/test/branches.test.mjs`: add the tests below after T-R-073b. Add no comments.
- Check only, change nothing unless a test fails: `skills/sdlc/branches.py`, functions `judge`, `read_rules`, `verdict`, `derive`, `suggest`, `cmd_preflight`.

## Tests
All tests are in `skills/sdlc/test/branches.test.mjs`. Each test without a mode uses `--mode pr`.
- R-091:
  - T-R-091a: gh shim with one regex rule `^[a-z]+/.+` and no format. Assert exit 0, `ok` true, `format` `sdlc/{name}`, `derived` false, `suggestion` empty, and no sample with result `fail`.
  - T-R-091b: the same rule through a glab shim with `branch_name_regex` `^[a-z]+/.+` in `--mode pr`. Assert the same keys.
- R-092:
  - T-R-092a: gh shim with two rules (a `starts_with feature/` rule labelled `alpha` and an `ends_with -x` rule labelled `beta`) and no format. Assert exit 1, `ok` false, `derived` false, `format` `sdlc/{name}`, and `suggestion` contains `--branch-format`.
  - T-R-092b: the same run. Assert that every sample with result `fail` has a `rule` equal to `alpha` or `beta`, and that at least one failing sample exists. Assert the `rules` list holds both labels.
  - T-R-092c: gh shim with one negated `contains` rule that the default fails, and no format. Assert `derived` false, every failing sample carries the rule label, and `suggestion` contains `--branch-format`.
- R-100:
  - T-R-100a: gh shim whose body is a list holding only objects of another type (for example `{"type":"pull_request","parameters":{}}`), and no `branch_name_pattern` object, for every sample. Assert `rules` is an empty list, no sample has result `fail`, `ok` true, `derived` false, and exit 0.
  - T-R-100b: gh shim body `[]` gives the same result. Assert every sample has result `pass`, not `unchecked`, because the forge answered.
  - T-R-100c: the shim has a rule for one sample name only (shim `bodies` keyed by the slice sample) and an empty list for the other samples. Assert that only the matching sample can fail and `rules` holds the one rule. This pins the per-sample reading.
- R-074: T-R-074a is named `preflight through gh and glab shims covers the seven scenarios` and asserts, in order, in one test:
  1. no rules: exit 0, `ok` true, `format` `sdlc/{name}`, `derived` false;
  2. a `starts_with feature/` ruleset: exit 0, `format` `feature/sdlc/{name}`, `derived` true;
  3. a regex rule that the default fails (`^zzz/`): exit 1, `ok` false, `suggestion` starts with `--branch-format`;
  4. a regex rule that the default passes (`^[a-z]+/.+`): exit 0, `derived` false;
  5. a gh shim that exits 1: exit 0, `ok` true, `notes` holds a string with `rules unknown`, and every sample has result `unchecked`;
  6. `--mode mr --branch bad-name` against a glab shim with regex `^feat/`: exit 1, the `working` sample has result `fail`;
  7. `--format feature/x` (no placeholder): exit 2 with one JSON error object.
  The test uses the same fixture and shim helpers as the other tests. It adds no new scenario to `branches.py`.

## Steps
1. Add the tests above. Run `npm test` and confirm the new tests either pass or fail for a real reason.
2. If a test fails for a code reason, fix the smallest cause in `branches.py`. Record the reason in `evidence.md`.
3. Run `npm test` for the full suite and confirm all S-001 to S-016 tests still pass.

## Risks
- The new tests may pass at once, because S-015 and S-016 built the paths. A test that cannot fail proves nothing. Mutate one behaviour per scenario (for example make `derive` return a format for a regex rule) to confirm that the matching test fails.
- The shim must answer per sample name. The `bodies` option in `ghShim` handles that. T-R-100c depends on the sample name of the slice kind, `sdlc/S-001`.
- A shim that exits 1 also fails the second `verdict`. Scenario 5 never reaches a derivation, so the risk is low.
- `branches.test.mjs` is large (about 2500 lines). The new tests add about 120 lines, which is under the size limit.

## Critique responses
None. This is revision 0 and no critique was given.
