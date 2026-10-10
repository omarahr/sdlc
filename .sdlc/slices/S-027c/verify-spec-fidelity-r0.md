Verdict: HELD

Checked worktree `$TMPDIR/sdlc-S-027c-sf-r0` at commit afe9bbe (branch sdlc/S-027c).

## Requirement checks
| Requirement | Spec says | Checked how | Tests | Result |
|---|---|---|---|---|
| R-063 | "Every prompt that spells a branch today uses the placeholder instead." | Independent Python scan of all prompts and SKILL.md. Counted placeholders per file against the section 8 table. Read the diff of the sensitive files. | skills/sdlc/test/prompts.test.mjs:1306, :1328 | holds |
| R-080 | "`no prompt spells a loop branch literally`" | Ran `npm test`: 745 pass, 0 fail, 1 skipped. Read the test diff: old literal assertions now assert placeholders. | skills/sdlc/test/prompts.test.mjs:1344 | holds |

## Defects
None. The scan finds only the default format text `sdlc/{name}` in _common.md, env-detector.md, state-schema.md and SKILL.md. Spec sections 5 and 8 require that text (ADR-20261010-074453-decision-judge-S-027c-1782).
