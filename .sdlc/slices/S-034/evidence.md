# Evidence: S-034

SKILL.md orders the format sources and the preflight command.
Changed files: `skills/sdlc/SKILL.md`, `skills/sdlc/test/prompts.test.mjs`.
The gate receipt covers commit 83ae96f. The full suite passed on that code.

| Requirement | Result | Tests |
|---|---|---|
| R-128 | Format sources run in this order: flag, config.json `branchFormat` when the file exists, else none. | T-R-128; TC-contract-1, TC-contract-2 |
| R-129 | `--format` goes to preflight only when a format is known. `--branch "$BASE_BRANCH"` goes only in `mr` mode. | T-R-129; TC-contract-3, TC-contract-4, TC-contract-5 |
| R-130 | A resume runs no `$BASE_BRANCH` parse check and asks for no rename. | T-R-130; TC-contract-6, TC-contract-7, TC-contract-8 |
| R-002 | Characterization: env-detector source order for `branchFormat`. | T-R-002d; TC-contract-9 |

All contract cases of the final round (r1) pass.
No benchmark applies: this is a spec slice.
