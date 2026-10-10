Verdict: HELD

Checked commit b67230c on branch sdlc/S-017, in a detached worktree. The worktree is removed.

## Requirement checks
| Requirement | Spec says | Checked how | Tests | Result |
|---|---|---|---|---|
| R-091 | "The default already satisfies the rule (a regex like `^[a-z]+/.+`): `ok` with the default, nothing derived." | Read the tests and ran them. They assert exit 0, ok, format, derived false, empty suggestion, no failing sample, for gh and glab. | skills/sdlc/test/branches.test.mjs:2552, :2563 | holds |
| R-092 | "Several rules, or a negated one, and no format given: no derivation; the verdict lists each failing sample with the rule, and the suggestion asks for a format." | Read the tests and ran them. They assert ok false, derived false, the rule label on each failing sample, and `--branch-format` in the suggestion. | skills/sdlc/test/branches.test.mjs:2574, :2583, :2592 | holds |
| R-100 | "A rule that targets only the default branch: the GitHub endpoint returns no `branch_name_pattern` for the samples; `ok`." | Read the tests and ran them. They assert empty rules, pass on every sample, ok, derived false, exit 0, and per-sample reading. | skills/sdlc/test/branches.test.mjs:2602, :2612, :2619 | holds |
| R-074 | "`preflight` on a fixture repo with `gh` and `glab` shims on `PATH` ... an invalid `--format` exits 2." | Read the one test and ran it. It asserts all seven scenarios through the shims. | skills/sdlc/test/branches.test.mjs:2632 | holds |

## Defects
None.

## Notes
- Ran `node --test skills/sdlc/test/branches.test.mjs`: 177 tests, 177 pass, 0 fail.
- Mutation try 1: removed the negate check in `derive`. T-R-092c still passes. The second verdict rejects the derived format, so the behavior is the same. This is no defect.
- Mutation try 2: let `derive` accept several rules. T-R-092a still passes for the same reason.
- The verification plan covers every requirement with a scenario and with the profiles that can falsify it.
