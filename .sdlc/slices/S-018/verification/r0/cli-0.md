# Verification: cli, part 0

- Slice: S-018
- Round: 0
- Commit: 460d3b3
- Verdict: verified (8 of 8 cases pass)

Environment: node test runner, python3 branches.py, cli-runner scratch git repos, no network, no gh or glab

## TC-cli-1 (VS-1): Commands line and flag bullet place --branch-format after --commit-format

- Given: SKILL.md and branches.py at commit 460d3b3
- When: the test reads SKILL.md and runs the documented commands through cli-runner
- Then / expected: flag after --commit-format and before --max-iterations; bullet between the commit-format and bar-raiser bullets; names {name}, sdlc/{name}, config.json
- Actual: all order and wording checks hold
- Result: pass
- Spec source: R-045 acceptance
- Test: .sdlc/slices/S-018/verification/r0/tests/cli-0/skillmd.verify-cli.test.mjs:27

```
see .sdlc/slices/S-018/verification/r0/logs/cli-0.txt
```

## TC-cli-2 (VS-1): Mutated SKILL.md (flag missing, flag before --commit-format) is rejected by the check

- Given: SKILL.md and branches.py at commit 460d3b3
- When: the test reads SKILL.md and runs the documented commands through cli-runner
- Then / expected: both mutants fail the check
- Actual: both mutants produce findings
- Result: pass
- Spec source: R-045 acceptance
- Test: .sdlc/slices/S-018/verification/r0/tests/cli-0/skillmd.verify-cli.test.mjs:32

```
see .sdlc/slices/S-018/verification/r0/logs/cli-0.txt
```

## TC-cli-3 (VS-2): Branch format bullet sits after Git mode, before STOP removal; old text gone

- Given: SKILL.md and branches.py at commit 460d3b3
- When: the test reads SKILL.md and runs the documented commands through cli-runner
- Then / expected: bullet order holds; no Branch name (first run only), branch_name_regex, push_rule; bullet holds all required wording
- Actual: holds
- Result: pass
- Spec source: R-046 acceptance
- Test: .sdlc/slices/S-018/verification/r0/tests/cli-0/skillmd.verify-cli.test.mjs:39

```
see .sdlc/slices/S-018/verification/r0/logs/cli-0.txt
```

## TC-cli-4 (VS-2): The preflight and parse commands in the bullet run against branches.py

- Given: SKILL.md and branches.py at commit 460d3b3
- When: the test reads SKILL.md and runs the documented commands through cli-runner
- Then / expected: preflight exits 0 with ok, format, derived, samples (a working sample in mr mode), notes, suggestion; parse prints kind slice for sdlc/S-001 and null for main; no tree change
- Actual: preflight ok true format sdlc/{name}; parse kind slice; main kind null; trees unchanged
- Result: pass
- Spec source: R-046 acceptance
- Test: .sdlc/slices/S-018/verification/r0/tests/cli-0/skillmd.verify-cli.test.mjs:56

```
see .sdlc/slices/S-018/verification/r0/logs/cli-0.txt
```

## TC-cli-5 (VS-2): Preflight with an invalid format reports ok false

- Given: SKILL.md and branches.py at commit 460d3b3
- When: the test reads SKILL.md and runs the documented commands through cli-runner
- Then / expected: JSON ok false with an error
- Actual: ok false: the branch format 'nofield' must hold exactly one {name} or {name:lower}, found 0
- Result: pass
- Spec source: R-046 acceptance
- Test: .sdlc/slices/S-018/verification/r0/tests/cli-0/skillmd.verify-cli.test.mjs:74

```
see .sdlc/slices/S-018/verification/r0/logs/cli-0.txt
```

## TC-cli-6 (VS-2): Preflight without a flag takes the config.json branchFormat

- Given: SKILL.md and branches.py at commit 460d3b3
- When: the test reads SKILL.md and runs the documented commands through cli-runner
- Then / expected: format feature/{name}
- Actual: format feature/{name}
- Result: pass
- Spec source: R-097 acceptance
- Test: .sdlc/slices/S-018/verification/r0/tests/cli-0/skillmd.verify-cli.test.mjs:83

```
see .sdlc/slices/S-018/verification/r0/logs/cli-0.txt
```

## TC-cli-7 (VS-4): The mismatch bullet follows the Branch format bullet and reports both formats

- Given: SKILL.md and branches.py at commit 460d3b3
- When: the test reads SKILL.md and runs the documented commands through cli-runner
- Then / expected: bullet directly after Branch format, before STOP removal, with report both, end, a run in progress keeps its names
- Actual: holds
- Result: pass
- Spec source: R-048 acceptance
- Test: .sdlc/slices/S-018/verification/r0/tests/cli-0/skillmd.verify-cli.test.mjs:90

```
see .sdlc/slices/S-018/verification/r0/logs/cli-0.txt
```

## TC-cli-8 (VS-4): A worktree value and a flag value that differ are both readable by the commands

- Given: SKILL.md and branches.py at commit 460d3b3
- When: the test reads SKILL.md and runs the documented commands through cli-runner
- Then / expected: preflight returns the flag value team/{name} while config.json holds feature/{name}
- Actual: values differ and both are readable
- Result: pass
- Spec source: R-048 acceptance
- Test: .sdlc/slices/S-018/verification/r0/tests/cli-0/skillmd.verify-cli.test.mjs:101

```
see .sdlc/slices/S-018/verification/r0/logs/cli-0.txt
```

## Seeds

- cli: the tests cannot run the driver's end-the-run decisions. The forge-rule ok false path needs a gh or glab stub.
