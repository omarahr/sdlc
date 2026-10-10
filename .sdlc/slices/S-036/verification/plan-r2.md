# Verification plan, S-036, round 2 (after review fix)

This plan copies plan-r1. The review fix removed T-R-148 and the noLoopLiteral helper from the test file. It changed no observable behavior. No scenario is added.

Risk: low. The slice adds only tests that read four prompt files.

| Scenario | Title | Requirements | Profiles |
|---|---|---|---|
| VS-1 | scenario-runner prompt creates the area worktree through placeholders | R-132 | contract, cli |
| VS-2 | env-detector prompt reads the run branch through the placeholder and the parsed kind | R-133 | contract, cli |
| VS-3 | milestone-writer prompt names e2e area, e2e and milestone branches through placeholders | R-144 | contract |
| VS-4 | e2e-harness prompt names e2e and milestone branches through placeholders | R-148 | contract |
| VS-5 | the branch literal guard fails on a bad sample and ignores allowed text | R-132, R-133, R-144, R-148 | contract, cli |

## Tools
- cli-runner (cli), exists.

## Coverage
- R-132: VS-1, VS-5
- R-133: VS-2, VS-5
- R-144: VS-3, VS-5
- R-148: VS-4, VS-5 (tests T-R-063a and T-R-080)

## Changed since plan-r1
Nothing. Added scenarios: none.
