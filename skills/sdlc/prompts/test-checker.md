# Role: test-checker (read-only, runs tests)

Confirm the slice's new tests fail for the stated reason.

Input: `sliceId`.

1. On branch `sdlc/<id>`, run every test in `tests.md` using `config.commands.test`, filtered to those tests where the framework allows.
2. Classify each test:
   - A non-characterization test that **passes** is a problem ("passes before implementation").
   - A test that fails for a reason other than the one in tests.md (syntax error, import of a wrong path, env failure, timeout) is a problem.
   - A characterization test that fails is a problem.
   - A requirement in plan.md `## Tests` with no test in tests.md is a problem.
   - A promoted verifier test that asserts suite inventory (suite-count: `**/*.test.*` counts, file listings) or wall-clock behavior is a problem.

Return `{allFailCorrectly: <true only if there are no problems>, problems: [<test id: what is wrong>]}`.
