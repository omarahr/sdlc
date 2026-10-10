# verify-cli S-030 round 0 part 0

Commit: ac20dc6. Verdict: pass (18 of 18 tests, 8 cases, 0 failures).

Environment: Python 3 branches.py run through testkit cli-runner in scratch git repos; gh shim from stub-server returns the rule list; Node test runner.
Command: `VERIFY_LOG=$PWD/.sdlc/slices/S-030/verification/r0/logs/cli-0 node --test .sdlc/slices/S-030/verification/r0/tests/cli-0/derive.verify-cli.test.mjs`

## TC-cli-1 (VS-1): starts_with feature/ gives feature/sdlc/{name}; samples prefixed; name prints feature/sdlc/S-001

- Given: scratch git repo, gitMode pr, forge github, gh shim returning the rule
- When: branches.py preflight --mode pr (and name where noted)
- Then / expected: exit 0, ok, derived, format feature/sdlc/{name}, slice/e2e samples exact, state sample prefix + 14 digits
- Actual: as expected; name --format prints branch feature/sdlc/S-001
- Result: pass
- Spec source: R-123 acceptance
- Test: .sdlc/slices/S-030/verification/r0/tests/cli-0/derive.verify-cli.test.mjs:20
- Evidence:
  - all transcripts: `.sdlc/slices/S-030/verification/r0/logs/cli-0.transcripts.txt`

## TC-cli-2 (VS-1): Prefix corners: regex chars, space, no trailing slash

- Given: scratch git repo, gitMode pr, forge github, gh shim returning the rule
- When: branches.py preflight --mode pr (and name where noted)
- Then / expected: literal concatenation; a prefix with a space is not derivable
- Actual: f.+(a)/ -> f.+(a)/sdlc/{name} derived; feature -> featuresdlc/{name} derived; 'my team/' -> derived false, exit 1
- Result: pass
- Spec source: R-123 acceptance
- Test: .sdlc/slices/S-030/verification/r0/tests/cli-0/derive.verify-cli.test.mjs:29
- Evidence:
  - all transcripts: `.sdlc/slices/S-030/verification/r0/logs/cli-0.transcripts.txt`
  - corner results: `.sdlc/slices/S-030/verification/r0/logs/cli-0.corner-space.txt`

## TC-cli-3 (VS-2): ends_with -dev gives sdlc/{name}-dev, exit 0, slice sample sdlc/S-001-dev

- Given: scratch git repo, gitMode pr, forge github, gh shim returning the rule
- When: branches.py preflight --mode pr (and name where noted)
- Then / expected: ok true, derived true, format sdlc/{name}-dev, exit 0
- Actual: as expected
- Result: pass
- Spec source: R-124 acceptance
- Test: .sdlc/slices/S-030/verification/r0/tests/cli-0/derive.verify-cli.test.mjs:52
- Evidence:
  - all transcripts: `.sdlc/slices/S-030/verification/r0/logs/cli-0.transcripts.txt`

## TC-cli-4 (VS-2): Suffix corners .x, -, _dev

- Given: scratch git repo, gitMode pr, forge github, gh shim returning the rule
- When: branches.py preflight --mode pr (and name where noted)
- Then / expected: derived and every sample ends with suffix and passes
- Actual: as expected
- Result: pass
- Spec source: R-124 acceptance
- Test: .sdlc/slices/S-030/verification/r0/tests/cli-0/derive.verify-cli.test.mjs:58
- Evidence:
  - all transcripts: `.sdlc/slices/S-030/verification/r0/logs/cli-0.transcripts.txt`

## TC-cli-5 (VS-3): contains team-a gives sdlc/team-a/{name}, exit 0

- Given: scratch git repo, gitMode pr, forge github, gh shim returning the rule
- When: branches.py preflight --mode pr (and name where noted)
- Then / expected: ok true, derived true, format sdlc/team-a/{name}
- Actual: as expected
- Result: pass
- Spec source: R-125 acceptance
- Test: .sdlc/slices/S-030/verification/r0/tests/cli-0/derive.verify-cli.test.mjs:71
- Evidence:
  - all transcripts: `.sdlc/slices/S-030/verification/r0/logs/cli-0.transcripts.txt`

## TC-cli-6 (VS-4): Derived format passes every sample; rule null; no fail; repo tree unchanged

- Given: scratch git repo, gitMode pr, forge github, gh shim returning the rule
- When: branches.py preflight --mode pr (and name where noted)
- Then / expected: every sample pass with rule null, no fail sample, no file written
- Actual: as expected
- Result: pass
- Spec source: R-126 acceptance
- Test: .sdlc/slices/S-030/verification/r0/tests/cli-0/derive.verify-cli.test.mjs:80
- Evidence:
  - all transcripts: `.sdlc/slices/S-030/verification/r0/logs/cli-0.transcripts.txt`

## TC-cli-7 (VS-5): No derivation: flag, config, two rules, negated starts_with, regex, negated ends_with, negated contains

- Given: scratch git repo, gitMode pr, forge github, gh shim returning the rule
- When: branches.py preflight --mode pr (and name where noted)
- Then / expected: derived false, ok false, exit 1; format team/{name} for flag and config, sdlc/{name} otherwise; tree unchanged
- Actual: as expected in all 7 cases
- Result: pass
- Spec source: R-126 acceptance
- Test: .sdlc/slices/S-030/verification/r0/tests/cli-0/derive.verify-cli.test.mjs:104
- Evidence:
  - all transcripts: `.sdlc/slices/S-030/verification/r0/logs/cli-0.transcripts.txt`

## TC-cli-8 (VS-5): Empty rule list and unknown operator

- Given: scratch git repo, gitMode pr, forge github, gh shim returning the rule
- When: branches.py preflight --mode pr (and name where noted)
- Then / expected: derived false, format sdlc/{name}
- Actual: empty: exit 0 ok; unknown operator: exit 0, samples unevaluated, note 'cannot evaluate r: unknown kind frobnicate', derived false
- Result: pass
- Spec source: R-126 acceptance
- Test: .sdlc/slices/S-030/verification/r0/tests/cli-0/derive.verify-cli.test.mjs:114
- Evidence:
  - all transcripts: `.sdlc/slices/S-030/verification/r0/logs/cli-0.transcripts.txt`
  - unknown operator: `.sdlc/slices/S-030/verification/r0/logs/cli-0.unknown-op.txt`

## Attacks

None.

## Seeds

- preflight suggests a format that validate_format rejects: A starts_with rule with prefix 'my team/' gives derived false and suggestion --branch-format "my team/sdlc/{name}", which contains a space and is not a valid format. A prefix with no trailing slash derives featuresdlc/{name}, which is valid but probably not what the user wants.
