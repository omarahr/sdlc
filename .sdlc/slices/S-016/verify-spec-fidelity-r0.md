Verdict: HELD

Checked in a detached worktree of sdlc/S-016 at commit e55f687.

## Requirement checks

| Requirement | Spec says | Checked how | Tests | Result |
|---|---|---|---|---|
| R-042 | "derive `fmt2` from the table below, evaluate the samples again under it, and when they all pass, `ok` is `true` with `fmt2` and `derived` `true`" | Read `derive` and `cmd_preflight`. Derivation runs only for one non-negated simple rule with a string pattern, no given format, and a failed loop-kind sample (ADR d001). Table formats match. | skills/sdlc/test/branches.test.mjs:2290, 2303, 2316, 2334, 2343, 2352, 2380, 2392, 2419 | holds |
| R-043 | "`suggestion` is a `--branch-format` line ... for a `working` failure, the rename" | Read `suggest`. Every failing verdict gets a `--branch-format` line, a working failure adds a rename line. Regex line quotes the pattern. | branches.test.mjs:2438, 2443, 2450, 2460, 2467, 2476, 2482, 2500 | holds |
| R-087 | "for a derivable rule whose derivation still failed, the derived format" | Failed second verdict keeps the first verdict, `ok` false, suggestion holds the derived format as a `--branch-format` line (ADR b19f). | branches.test.mjs:2429, 2419, 2343 | holds |
| R-122 | "`--branch-format \"<literal that your rule accepts>/{name}\"` with the pattern quoted beside it" | Ran `_regex_literal` on 10 patterns. Every literal returned accepts `<literal>/S-001`. A pattern that `S-001` cannot match (uppercase against `[a-z0-9-]+`) falls back to quoted text, as ADR 13d6 states. | branches.test.mjs:2517, 2522, 2528 | holds |
| R-073 | "`derive follows the table and refuses regex, negate and several rules`" | The test asserts three derived formats and the refusals for regex, negate and several rules. | branches.test.mjs:2352, 2537 | holds |

## Defects

None. `node --test skills/sdlc/test/branches.test.mjs`: 168 tests, 168 pass, 0 fail.

The verification plan covers each requirement with at least one scenario. The profiles per scenario match the risk.
