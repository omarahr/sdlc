Verdict: HELD

Worktree: `$TMPDIR/sdlc-S-002-spec-fidelity-r0` (detached). Commit: `8138c9f649f113bceee7f2c03b5610eaecf87794` (sdlc/S-002).

## Requirement checks

| Requirement | Spec says | Checked how | Tests | Result |
|---|---|---|---|---|
| R-001 | "`config.branchFormat` is a string with exactly one placeholder, `{name}` or `{name:lower}`, and literal text around it." | Read `validate_format` and `split`. Probed 35 formats: no placeholder, two placeholders, mixed placeholders, stray `{` or `}`, ASCII and unicode whitespace with a valid placeholder, non-string input. Each bad format raised `Fail`. | skills/sdlc/test/branches.test.mjs:356, :362; S-001 CLI whitespace case :130 | holds |
| R-017 | "`validate_format(fmt)`: raises `Fail` unless the format contains exactly one of `{name}` or `{name:lower}`, no other `{` or `}`, no whitespace, and `name(fmt, \"slice\", id=\"S-001\")` passes `git check-ref-format --branch`." | Read the code: the git step runs on `name(fmt, "slice", id="S-001")` with an argument list. Probed `..`, trailing `/`, `//`, `.lock`, leading `.` and `-`, `?`, `*`, `[`, `:`, `\`, DEL, `@{u}`. Each raised `Fail`. The `..` message carries git's reason `is not a valid branch name`. An empty PATH raises `Fail`. | branches.test.mjs:356, :362, :370, :374, :419 | holds |
| R-019 | "`name(fmt, kind, **parts)`: the format with the placeholder replaced by the tail, lowercased for `{name:lower}`." | Probed `name("Feature/X-{name:lower}", "slice", id="S-001")`: the result is `Feature/X-s-001`, so the literal keeps its case. A property check over 2000 random formats and ids confirmed `name == prefix + tail(lowered when lower) + suffix`. The parse-back clause stays open for S-007 (ADR-20261009-034229). | branches.test.mjs:393 | holds (partial by ADR) |
| R-020 | "`split(fmt)`: `(prefix, suffix, lower)`, the literal text before and after the placeholder and whether it lowercases." | Probed both acceptance examples. The property check confirmed `split` returns the generated prefix, suffix and flag for 2000 random formats. | branches.test.mjs:385 | holds |
| R-071 | "`validate_format rejects two placeholders, none, whitespace and an invalid ref`." | Read the test: it asserts `Fail` for `{name}{name}`, `sdlc/`, `sdlc/{ name }` and `sdlc/{name}..`, plus the git reason text. | branches.test.mjs:362 | holds |

Verification plan r0: every requirement maps to at least one scenario (VS-1 to VS-8). The profiles (contract, cli, security) can falsify each scenario. No gap.

Slice tests: `node --test skills/sdlc/test/branches.test.mjs` exit 0, 21 pass, 0 fail. `npm test` exit 0, 497 pass, 0 fail, 1 skipped.

## Defects

None.

## Seeds (out of scope)

- `sdlc/{ name }` fails at the placeholder count, not at the whitespace check. The S-002 tests reach the whitespace branch only through the S-001 CLI case `sdlc/ {name}`. A direct Python case would pin that branch.
- `tail` accepts extra parts without a `Fail` (`id="S-1", extra=1`). The spec does not say whether extra parts are an error.
