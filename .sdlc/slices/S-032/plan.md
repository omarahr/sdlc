# Plan for S-032

## Approach

`SAMPLE_KINDS` in `skills/sdlc/branches.py` already maps each mode to its sampled kinds. S-016 built it.
The `pr` mode lists slice, state and e2e. The `stack` mode lists run, milestone and slice. The `mr` and `direct` modes list none.
This slice pins R-136 and R-137 with new tests that check each kind against each mode. The tests use the kind table in section 1 of the spec.
Write the tests first and run them. If one fails, fix `SAMPLE_KINDS` or `build_samples` and change nothing else.
If all tests pass, they are characterization tests and the product code stays unchanged.
The tests reuse the helpers in `skills/sdlc/test/branches.test.mjs`: `preflight`, `withConfig`, `kinds`, `names`.

## Files

- Modify `skills/sdlc/test/branches.test.mjs`: add the new tests at the end of the file. Add no comments.
- Modify `skills/sdlc/branches.py` only if a new test fails. The candidates are `SAMPLE_KINDS` and `build_samples`.

## Tests

All tests are in `skills/sdlc/test/branches.test.mjs`.

- T-R-136a (R-136): `preflight --mode pr` samples kind `state`, and its name matches `^sdlc/state-\d{14}$`. `preflight --mode stack` has no sample of kind `state`.
- T-R-136b (R-136): `preflight --mode mr` and `--mode direct` have no sample of kind `state`, also when `--branch` is given.
- T-R-137a (R-137): `preflight --mode stack` samples kinds `run` and `milestone`, with names `sdlc/run-1` and `sdlc/M-1`. `preflight --mode pr` has no sample of kind `run` or `milestone`.
- T-R-137b (R-137): `preflight --mode pr` samples kind `e2e` with name `sdlc/M-1-e2e`. `preflight --mode stack` has no sample of kind `e2e`.
- T-R-137c (R-137): across the modes `pr`, `stack`, `mr` and `direct`, no sample has kind `e2e-area`, `verify` or `attempt`, since the loop never pushes those kinds.

Expected failure reason before implementation: none. All tests are characterization tests, because S-016 built the code.

## Steps

1. Read `T-R-039a` to `T-R-039d` and the `preflight` helper in `branches.test.mjs`.
2. Add the tests with the literals above.
3. Run `node --test skills/sdlc/test/branches.test.mjs`.
4. If a test fails, read the failure, then fix the named function. Do not weaken a test.
5. Run `npm test` and confirm the full suite passes.

## Risks

- The state sample name holds a timestamp. Match it with a regex, never a literal.
- Tests that overlap T-R-039a to c add little. Keep the new tests on the per-kind exclusion, which T-R-039 does not state by kind.
- The `mr` mode adds a `working` sample with `--branch`. Check by kind, so that sample does not break the assertions.

## Critique responses

- None. The input holds no critiques.
