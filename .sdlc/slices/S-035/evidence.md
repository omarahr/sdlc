# Evidence: S-035

The integrator, escalator and state-writer prompts use branch placeholders.
Changed file: `skills/sdlc/test/prompts.test.mjs`.
The gate receipt covers commit bbb1b37. The full suite passed on that code.

| Requirement | Result | Tests |
|---|---|---|
| R-131 | integrator.md finds attempt branches through `branches.py list --kind attempt`, filtered to the slice id. It has no `-attempt-*` glob. | T-R-131; TC-cli-1 to TC-cli-8, TC-contract-1, TC-security-1 to TC-security-5 |
| R-143 | integrator.md holds no `sdlc/` branch literal. It uses `<slice branch>` and `<run branch>`. | T-R-143; TC-contract-2, TC-security-6 to TC-security-8 |
| R-145 | escalator.md holds no `sdlc/` branch literal. It uses `<slice branch>`, `<attempt branch>` and `<run branch>`. | T-R-145; TC-contract-3, TC-security-9 |
| R-147 | state-writer.md holds no `sdlc/` branch literal. It uses `<slice branch>` and `<attempt branch>`. | T-R-147; TC-contract-4 |

All four tests are characterization tests. Slices S-027b and S-027c already fixed the prompts.
All cases of the final round (r0) pass.
No benchmark applies: this is a spec slice.
