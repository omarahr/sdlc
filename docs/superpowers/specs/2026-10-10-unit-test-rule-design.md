# Unit test rule: the committed suite holds unit tests only, written to one definition

Date: 2026-10-10
Status: approved design, implementation pending

## Intent

Two agents write the tests the loop commits to the suite: the `test-writer` writes a slice's failing tests before any implementation exists, and the `implementer` promotes verifier tests into the suite after a fix. Today their prompts constrain *what* a test asserts (observable behavior, the stated failure reason, no inventory or timing assertions) but not *how* a test is built. The last dogfood run shows the cost: tests reach for shared test-support code (a `testkit` directory with its own self-tests, corpus data and README, about 1,800 lines), the suite mixes unit and integration shapes, and a reader cannot tell from a test file alone what it exercises or what it replaces.

The plugin's owner wants one rule for every unit test an agent writes: mocks at the unit's boundary, Arrange-Act-Assert, each test file self-contained, no shared test-support code. The `test-checker` rejects violations.

**What the user asked for** (resolved in conversation): "any agent that writes unit tests should not build a testkit, rather should use mocking and follow clean code for unit tests, encapsulation and the AAA format." The verification side (profile verifiers, `verify-toolsmith`, the testkit they build, the e2e harness and the scenario runners) is explicitly out of scope: "I don't wanna change the loop structure."

**Decisions taken during brainstorming:**

| Question | Answer |
|---|---|
| Who the rule binds | `test-writer` and `implementer` (the two agents that commit suite tests); `planner` plans to it |
| What the suite holds | Unit tests only; integration behavior stays with the verifiers' evidence and the e2e suite, as today |
| Where the rule lives | One section in `_common.md`; the role files reference it and add their own clause |
| Shared test-support code | None created or extended by any agent; helpers that pre-date the run may be used |
| Framework setup | Framework config and the framework's own fixture mechanism are allowed; the scaffolding slice is unaffected |
| Enforcement before implementation | `test-checker` reads each new test file and reports a problem per violation |
| Enforcement after implementation | `reviewer`, `test-quality` lens, marks a committed test that breaks the rule `blocking: true` |
| Verifiers and the testkit | Unchanged |

**Assumptions:**

- A repo may already carry its own test helpers. Forbidding them would force duplication of what the repo already has, so pre-existing helpers remain usable. "Pre-existing" means present on the default branch before the run started.
- Plan.md `## Tests` entries that today name integration tests become unit tests of the unit that owns the behavior. The boundary tests those entries used to cover are the profile verifiers' job and already run on every slice.

### Non-goals

- Changing any `verify-*` prompt, `verify-toolsmith`, `verify-planner`, `e2e-harness` or `scenario-runner`.
- Changing where verifier evidence tests live or how promotion is triggered.
- Removing the testkit the verifiers build.
- A mechanical linter for the rule. The `test-checker` reads the tests; it does not parse them.
- Changing the e2e tests a fix slice lists in tests.md. The `test-writer` lists them; it does not write them.

## Design

### 1. The rule (`_common.md`)

A new section, `## Unit tests`, placed after the "No comments" rule. It applies to every test an agent commits to the repo's test suite (`config.commands.test`). It does not apply to verification evidence tests under `.sdlc/slices/<id>/verification/` or to the e2e suite.

The section states, in STE style:

- **One unit, in process.** A unit test exercises one unit: one module, class or function, as the repo's conventions define a unit. It runs in process. It starts no server, no browser, no container and no subprocess.
- **Doubles at the boundary.** Replace every collaborator that crosses the unit's boundary with a test double: the network, the database, the filesystem, the clock, randomness, process spawning, and other units that have side effects. Use the real thing for pure functions and value objects the unit owns. Do not double what has no side effect.
- **Arrange, act, assert.** Each test has the three phases in that order, visibly separated. One act per test. Assertions appear only in the assert phase. A test that needs two acts is two tests.
- **Self-contained files.** Everything a test needs is in its own file: builders, fakes, fixtures, sample data. Do not create or extend shared test-support code: no testkit, no helpers directory, no shared fixtures module, no test-support package. Helpers that already existed on the default branch before the run may be used. The framework's configuration and its own fixture mechanism (`beforeEach`, `t.Run` tables, pytest fixtures declared in the same file) are allowed.
- **Names state behavior.** A test name says what the unit does under which condition, not which function it calls.

The existing rules stay beside it: no comments in tests; never weaken, skip or delete a test; never special-case test inputs in product code.

### 2. `planner.md`

The `## Tests` bullet gains one sentence: every entry is a unit test, and it names the unit under test and the collaborators to double. The planner no longer lists integration tests in `## Tests`. The performance-benchmark sentence is unchanged.

### 3. `test-writer.md`

- Step 1 references the rule: "Write every test to the `## Unit tests` rule in `_common.md`."
- Step 2 keeps its content. It gains: "A test must not reach a real boundary to fail; it fails because the unit's behavior is missing."
- Step 5, the tests.md line format, gains the unit: `<test id> — <requirement id or improvement> — <unit under test> — <expected failure reason>`.
- A new clause after step 3: "If the repo has no test double mechanism yet and this is the scaffolding slice, set up the framework's own mocking support as the plan says. Do not write a shared helper for it."

### 4. `implementer.md`

- Step 4 is unchanged.
- The **Promotion** section gains: "A promoted test must meet the `## Unit tests` rule in `_common.md` after adaptation. Replace every testkit or shared-helper import with doubles defined in the test file. Rewrite it to arrange, act and assert. If the test cannot be made a unit test (it needs a running server, a browser, a container or a subprocess), do not promote it. Record in tests.md that it stays as evidence and why."
- The existing bar in that section (no suite-count or inventory assertions, no wall-clock assertions, no file-inventory dependence) is unchanged.

### 5. `test-checker.md`

A new classification group after the existing bullets, scoped to the tests the slice adds or changes (the diff of `sdlc/<id>` against its base branch). Each is a problem:

- a test that starts a server, a browser, a container or a subprocess, or that performs real network, database or filesystem I/O outside the framework's temp directory;
- a test file that imports from a test-support path the run created (a testkit, a helpers directory, a shared fixtures module);
- a new or extended shared test-support file in the slice diff;
- a test whose phases are not arranged, acted and asserted in that order, a test with more than one act, or a test whose assertions interleave with acts;
- a tests.md line with no unit under test.

The problem text names the test id and the violated clause, so the `test-writer` fixes it on the next attempt. The existing return shape `{allFailCorrectly, problems}` is unchanged. The checker stays read-only and keeps its `effort: 'low'` launch.

### 6. `reviewer.md`

The `test-quality` lens gains one bullet: a committed test that breaks the `## Unit tests` rule in `_common.md` is `blocking: true`, and the detail names the clause. This covers promoted tests, which the `test-checker` never sees.

### 7. Loop script

No change. `testsPhase` already runs `test-writer` then `test-checker` and feeds `problems` back; the new problem class flows through it.

## Edge cases

- **Characterization tests** (improvement slices) follow the same rule. Pinning current behavior does not need a boundary.
- **Fix slices from a behavior campaign** list e2e tests in tests.md. Those lines are exempt from the unit clause of the tests.md format; the `test-checker` identifies them by their scenario id, as today.
- **A unit whose only collaborator is the filesystem** (a config loader, a file parser) doubles the filesystem or uses the framework's temp directory. The temp directory is the one place the rule allows real filesystem I/O.
- **A repo with no mocking support** in its framework: the scaffolding slice's plan names the framework's own facility to enable (`vi.mock`, `unittest.mock`, interfaces in Go). Hand-written doubles inside the test file are always allowed.
- **A pre-existing helper that the slice must change** to make a test possible: that is extending shared test-support code and is a problem. The test defines what it needs locally instead.
- **A promoted test that drops a helper import and grows large** is still promoted. Size is not a rule; a second helper file is.

## Testing

In `skills/sdlc/test/prompts.test.mjs`, following the file's existing pattern of asserting that a prompt carries a rule:

- `_common.md` has a `## Unit tests` section with the five clauses, anchored on their key phrases (`in process`, `test double`, `Arrange, act, assert`, `shared test-support code`, `already existed on the default branch`).
- `planner.md` `## Tests` bullet names the unit under test and the collaborators to double.
- `test-writer.md` references the rule and its tests.md format has four fields.
- `implementer.md` Promotion section requires the rule after adaptation and names the not-promotable case.
- `test-checker.md` lists the five new problem classes.
- `reviewer.md` `test-quality` lens marks a rule violation `blocking: true`.
- The STE check that already gates the prompt files (`prompts.test.mjs`, the `ste-check.py` run over the prompt set) must stay green with the new text.

## Files

- `skills/sdlc/prompts/_common.md`: the `## Unit tests` section.
- `skills/sdlc/prompts/planner.md`: `## Tests` bullet.
- `skills/sdlc/prompts/test-writer.md`: steps 1, 2, 5 and the scaffolding clause.
- `skills/sdlc/prompts/implementer.md`: Promotion section.
- `skills/sdlc/prompts/test-checker.md`: the new problem classes.
- `skills/sdlc/prompts/reviewer.md`: `test-quality` lens bullet.
- `skills/sdlc/test/prompts.test.mjs`: the tests above.
