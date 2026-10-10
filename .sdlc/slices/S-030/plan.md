# Plan for S-030

## Approach

`branches.py` already holds `derive(rules)` and the derivation step of `cmd_preflight`. Slice S-016 built them. The tests T-R-042a to T-R-042i cover the general behavior.
This slice pins the exact acceptance of R-123, R-124, R-125, R-126 and R-141 with new tests. The tests use the exact rule values from the acceptance text.
Run the new tests first. If one fails, fix `derive` or `cmd_preflight` in `skills/sdlc/branches.py`, and change nothing else.
If every test passes, the tests are characterization tests and the product code stays unchanged.
The tests reuse the helpers in `skills/sdlc/test/branches.test.mjs`: `prRun`, `startsWith`, `endsWith`, `containsRule`, `regexRule`, `probeJson`. Code inside `probeJson` uses the Python-side rule (`SPEC_RULE_PY`). The JS `rule` constant is not used.

## Files

- Modify `skills/sdlc/test/branches.test.mjs`: add the new tests after T-R-042i. Add no comments.
- Modify `skills/sdlc/branches.py` only if a new test fails. `derive` and `cmd_preflight` are the only candidates.

## Tests

All tests are in `skills/sdlc/test/branches.test.mjs`.

- T-R-123a (R-123): `derive` for one `starts_with feature/` rule returns `feature/sdlc/{name}`. Then `name --kind slice --id S-001 --format feature/sdlc/{name}` prints `feature/sdlc/S-001`. A preflight in `pr` mode with that rule prints samples `feature/sdlc/S-001`, `feature/sdlc/state-<timestamp>` and `feature/sdlc/M-1-e2e`, all with the prefix.
- T-R-124a (R-124): `derive` for one `ends_with -dev` rule returns `sdlc/{name}-dev`. Preflight with that rule and no format prints `ok` true, `derived` true and format `sdlc/{name}-dev`, with exit 0. The slice sample is `sdlc/S-001-dev`.
- T-R-125a (R-125): `derive` for one `contains team-a` rule returns `sdlc/team-a/{name}`. Preflight with that rule and no format prints `ok` true, `derived` true and format `sdlc/team-a/{name}`, with exit 0.
- T-R-126a (R-126): when the derived format passes every sample, the output has format `feature/sdlc/{name}` and `derived` true. Every sample has result `pass` and `rule` null. No sample has result `fail`.
- T-R-126b (R-126): `derived` stays false, exit is 1 and `ok` is false in five cases. The cases are: a format given by the flag, a format given by the config, two rules, a negated rule and a regex rule. The output format is `team/{name}` in the flag and config cases (the given format). The output format is `sdlc/{name}` in the other three cases (the default). The test runs the five cases in one loop with the expected format per case.
- T-R-141a (R-141): `derive` returns `feature/sdlc/{name}`, `sdlc/{name}-dev` and `sdlc/team-a/{name}` for the three non-negated operators.
- T-R-141b (R-141): `derive` returns `None` for a regex rule, a negated rule of each of the three operators, and two rules.

Expected failure reason before implementation: none. All seven tests are characterization tests, because S-016 built the code.

## Steps

1. Read T-R-042a to T-R-042i and the helper definitions in `branches.test.mjs`.
2. Add the seven tests with the exact literals above.
3. Run `node --test skills/sdlc/test/branches.test.mjs`.
4. If a test fails, read the failure, then fix `derive` or `cmd_preflight`. Do not weaken a test.
5. Run `npm test` and confirm the full suite passes.

## Risks

- The new tests can duplicate T-R-042a to T-R-042f. The literals differ (`-dev`, `team-a`, negated per operator), so each test pins a new value.
- The state sample name holds a timestamp. Assert its prefix, never its full value.
- A negated rule of each operator needs the fake GitHub shim to return `negate` true. Use the existing `containsRule(label, pattern, true)` helper and `ghObj` for the other operators.

## Critique responses

- spec-fidelity: T-R-126b now asserts format `team/{name}` for the flag and config cases and `sdlc/{name}` for the other three. It keeps `derived` false, exit 1 and `ok` false in all five.
- architecture: no structural change. The plan keeps all tests in the one existing file. It now names the Python-side rule for use inside `probeJson` code and drops the JS `rule` constant.
