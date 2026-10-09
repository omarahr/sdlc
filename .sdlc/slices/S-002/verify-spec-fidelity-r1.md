Verdict: HELD

Worktree: `$TMPDIR/sdlc-S-002-spec-fidelity-r1` (detached, removed after the run). Commit: `1b90e38a3a6aaf5be0e8a061eb9b06db68fa41e0` (sdlc/S-002).

Round 1 follows the review fix. Commit 1b90e38 adds test T-018 and changes no product code. `branches.py` is the same as in round 0.

## Requirement checks

| Requirement | Spec says | Checked how | Tests | Result |
|---|---|---|---|---|
| R-001 | "`config.branchFormat` is a string with exactly one placeholder, `{name}` or `{name:lower}`, and literal text around it." | Read `validate_format` and `split`. Probed `sdlc/{name}` and `sdlc/{name:lower}` (accepted), and `sdlc/`, `{name}{name}`, `sdlc/{name}}`, `sdlc/{{name}`, `sdlc/ {name}`, `sdlc/ {name}` (each raised `Fail`). | skills/sdlc/test/branches.test.mjs:356, :362, :370; S-001 CLI case :124 | holds |
| R-017 | "`validate_format(fmt)`: raises `Fail` unless the format contains exactly one of `{name}` or `{name:lower}`, no other `{` or `}`, no whitespace, and `name(fmt, \"slice\", id=\"S-001\")` passes `git check-ref-format --branch`." | Probed the four acceptance rejections and two acceptances. The `sdlc/{name}..` message carries git's reason `is not a valid branch name`. Mutation: with the `\s` check disabled, T-018 fails; so the new test pins the whitespace clause. | branches.test.mjs:356, :362, :370, :376, :380, :425 | holds |
| R-019 | "`name(fmt, kind, **parts)`: the format with the placeholder replaced by the tail, lowercased for `{name:lower}`." | Probed `name("sdlc/{name}", "slice", id="S-001")` = `sdlc/S-001`, and `name("Feature/X-{name:lower}", ...)` = `Feature/X-s-001`. The parse-back clause stays open for S-007 (ADR-20261009-034229). | branches.test.mjs:399 | holds (partial by ADR) |
| R-020 | "`split(fmt)`: `(prefix, suffix, lower)`, the literal text before and after the placeholder and whether it lowercases." | Probed both acceptance examples: `("a/", ".x", False)` and `("a/", "", True)`. | branches.test.mjs:391 | holds |
| R-071 | "`validate_format rejects two placeholders, none, whitespace and an invalid ref`." | Read the tests. T-012 asserts the four acceptance cases. T-018 now pins the whitespace branch directly with U+00A0, U+3000, U+2028 and a tab. | branches.test.mjs:362, :370 | holds |

Verification plan r1: every requirement maps to a scenario (VS-1 to VS-8). The contract, cli and security profiles can falsify each scenario. Round 1 adds no scenarios, because the fix changes only tests. No gap.

Slice tests: `node --test skills/sdlc/test/branches.test.mjs` exit 0, 22 pass, 0 fail.

## Defects

None.

## Seeds (out of scope)

- The T-012 case `sdlc/{ name }` fails at the placeholder count, not at the whitespace check. T-018 now covers the whitespace branch, so only the test name is misleading.
- `tail` accepts extra parts without a `Fail`. The spec does not say whether extra parts are an error.
