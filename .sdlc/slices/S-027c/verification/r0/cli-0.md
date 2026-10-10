# Verify cli, S-027c, round 0

Commit: afe9bbe. Verdict: verified (4 cases, 4 pass).

Environment: node test runner, python3 ste-check.py through cli-runner, scratch cwd.

## TC-cli-1 (VS-1): Each of 22 table-row files holds its mapped placeholders and no literal

- Given: worktree of sdlc/S-027c at afe9bbe
- When: the check runs from a scratch cwd with a controlled env
- Then: 22 files, 0 missing placeholders, 0 literals outside fences
- Result: pass
- Spec source: R-063 acceptance, spec section 8 table
- Test: .sdlc/slices/S-027c/verification/r0/tests/cli-0/prompts.verify-cli.test.mjs:50
- Evidence: .sdlc/slices/S-027c/verification/r0/logs/cli-0-vs1.txt

## TC-cli-2 (VS-3): Independent scan over 55 .md files finds no loop branch literal

- Given: worktree of sdlc/S-027c at afe9bbe
- When: the check runs from a scratch cwd with a controlled env
- Then: 55 files scanned, 0 hits; positive and negative fixtures behave
- Result: pass
- Spec source: R-063, R-080
- Test: .sdlc/slices/S-027c/verification/r0/tests/cli-0/prompts.verify-cli.test.mjs:64
- Evidence: .sdlc/slices/S-027c/verification/r0/logs/cli-0-vs3.txt

## TC-cli-3 (VS-6): ste-check.py exits 0 with empty stdout on 23 edited prompts; unreadable file exits 1

- Given: worktree of sdlc/S-027c at afe9bbe
- When: the check runs from a scratch cwd with a controlled env
- Then: exit 0, no violations
- Result: pass
- Spec source: R-063 (STE rule, _common.md)
- Test: .sdlc/slices/S-027c/verification/r0/tests/cli-0/prompts.verify-cli.test.mjs:83
- Evidence: .sdlc/slices/S-027c/verification/r0/logs/cli-0-ste.txt

## TC-cli-4 (VS-6): Git commands keep one placeholder per argument and the worktree rule stays

- Given: worktree of sdlc/S-027c at afe9bbe
- When: the check runs from a scratch cwd with a controlled env
- Then: 0 malformed commands; worktree add line keeps <slice branch>
- Result: pass
- Spec source: R-063 plan Risks
- Test: .sdlc/slices/S-027c/verification/r0/tests/cli-0/prompts.verify-cli.test.mjs:98
- Evidence: .sdlc/slices/S-027c/verification/r0/logs/cli-0-cmds.txt

## Seeds

- SKILL.md is outside the STE linter gate and holds 57 violations: The slice adds three long-sentence lines (stack bullet, default-branch line) by swapping literals for words. Base had 56. The prompts test lints only prompts/. Not required by the spec.
