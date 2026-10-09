Verdict: HELD

Checked in the run worktree at commit ea15f87 (branch sdlc/S-016).

## Requirement checks

| Requirement | Spec says | Checked how | Tests | Result |
|---|---|---|---|---|
| R-042 | "derive `fmt2` from the table, evaluate the samples again, and when they all pass, `ok` is `true` with `fmt2` and `derived` `true`" | Read the round 2 diff. It deletes one test and changes no product code. | skills/sdlc/test/branches.test.mjs:2290, 2303, 2316, 2537 | holds |
| R-043 | "`suggestion` is a `--branch-format` line" | Product code unchanged since round 1. | branches.test.mjs:2438 | holds |
| R-087 | "for a derivable rule whose derivation still failed, the derived format" | Product code unchanged. | branches.test.mjs:2429, 2537 | holds |
| R-122 | "`--branch-format \"<literal that your rule accepts>/{name}\"`" | Product code unchanged. | branches.test.mjs:2517, 2522, 2528 | holds |
| R-073 | "`derive follows the table and refuses regex, negate and several rules`" | The deleted test T-R-073a was a duplicate. T-R-042b, T-R-042c and T-R-042f assert the three formats and the three refusals. The acceptance text holds. | branches.test.mjs:2303, 2316, 2352 | holds |

## Defects

None. `node --test skills/sdlc/test/branches.test.mjs`: 168 tests, 168 pass, 0 fail.
No test now carries the exact spec title for R-073. The acceptance holds, so this is a seed only.
