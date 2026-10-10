# Verification plan S-027c, round 0

Risk: medium. The sweep rewrites about twenty prompts; a wrong replacement misdirects one role at run time.

## Scenarios
| id | title | requirements | profiles |
|---|---|---|---|
| VS-1 | Every file row of the section 8 table uses its mapped placeholders and no literal | R-063 | contract, cli |
| VS-2 | The six extra literals are gone from commit-state, verify-toolsmith, test-reporter, state-reader, verify-collector, escalator and SKILL.md | R-063 | contract |
| VS-3 | The prompt scan finds no loop branch literal outside fenced blocks that quote branches.py output | R-063, R-080 | contract, cli |
| VS-4 | The scan resists false passes and false failures at fence boundaries | R-080 | contract |
| VS-5 | Each placeholder stands for the right branch kind at its place | R-063 | contract |
| VS-6 | Edited prompts still pass the STE linter and keep their commands whole | R-063 | cli |
| VS-7 | The updated old assertions still check the same sentences | R-063, R-080 | contract |

## Notes per scenario
- VS-1: Check all 20 or so files of the table. Each file must hold each mapped placeholder at least once and no loop branch literal. Try the files whose row has several placeholders: commit-state, integrator, milestone-writer, escalator, verify-collector.
- VS-2: Check the e2e line and state line of commit-state, the spike phrase of escalator, and sdlc/run- and sdlc/M- in SKILL.md. The default format text sdlc/{name} must stay in SKILL.md and state-schema.md.
- VS-3: Run the scan pattern over every .md under prompts and SKILL.md with an independent script, not the test helper. Inputs: git checkout sdlc/S-001 must match. .sdlc/slices, sdlc/tracker, sdlc/STOP and sdlc/{name} must not match. The scan must read more than 20 files.
- VS-4: Try fenced blocks that quote branches.py output next to an unfenced literal, an unclosed fence, tilde fences and a literal in an inline code span. The unfenced literal must fail the scan. An empty file set must fail.
- VS-5: Read each edited sentence. A verify branch must not read as a slice branch. A run branch must not read as a milestone branch. The state and e2e placeholders must sit in the state and e2e steps. Compare the meaning with the helper names in _common.md.
- VS-6: Run ste-check.py on every edited prompt. Sentences stay at most 20 words. Each git command keeps one placeholder per argument, and the worktree path rule in verify-profile-common.md stays.
- VS-7: Read the diff of prompts.test.mjs. No test is weakened, skipped or deleted. Each assertion that held a literal now holds the placeholder in the same sentence. The verify sweep assertion checks the list phrase.

## Tools
| id | profile | purpose | exists |
|---|---|---|---|
| cli-runner | cli | Run ste-check.py and an independent literal scan from a scratch cwd | True |
| property | contract | Generate fence and literal edge cases for the scan | True |
| attack-corpus | contract | Supply branch-like strings for the scan negative checks | True |

## Coverage
| requirement | scenarios |
|---|---|
| R-063 | VS-1, VS-2, VS-3, VS-5, VS-6, VS-7 |
| R-080 | VS-3, VS-4, VS-7 |

The slice edits prompt text and one test file only. No script changes. A wrong replacement misdirects one role at run time, so review the meaning of each placeholder.
