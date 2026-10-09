# Verification plan S-016 round 0

Risk: medium. A wrong derivation or literal writes a format that the rule still rejects, and the run then launches with it.

## Scenarios

| Id | Title | Requirements | Profiles |
|---|---|---|---|
| VS-1 | A single starts_with, ends_with or contains rule with no format derives the table format and exits 0 | R-042, R-073 | cli, contract |
| VS-2 | Derivation is refused for a given format, a negated rule, a regex rule, several rules, zero rules and a non-string pattern | R-042, R-073 | contract, cli, security |
| VS-3 | The derivation guard: derive only when a loop-kind sample fails | R-042 | cli, contract |
| VS-4 | A derived format that still fails keeps the first verdict and suggests the derived format | R-087, R-042 | cli, security |
| VS-5 | A failing verdict always carries a suggestion; a working failure names the rename | R-043 | cli, contract |
| VS-6 | A regex rule gives a --branch-format literal that the rule accepts before S-001, with the pattern quoted | R-122, R-043 | cli, contract, security |
| VS-7 | Hostile rule and branch input never crashes preflight or breaks the suggestion | R-043, R-122, R-042 | security, cli |

## Notes per scenario

- VS-1: Risk: wrong operator mapping or wrong placement of the affix. Try feature/, -x, team, and affixes with a trailing slash. Output must hold ok true, derived true, the derived format, and second-verdict samples. Exit code 0. derive() must return the table format through the public entry point.
- VS-2: Risk: a wrong derivation writes a format the rule rejects. Each refusal gives derived false, the original format, exit 1. Try an unknown kind and a pattern that is a list or null in config. Config-supplied format must also block derivation.
- VS-3: Risk: derivation in mr or direct mode, where only the working sample exists. A bad --branch must give a rename suggestion, derived false, no format change. In pr and stack mode a loop-kind failure derives. Rule the default already passes must not derive.
- VS-4: Risk: a Fail from the second verdict escapes, or second-verdict names leak into the output. Try ends_with .lock and contains a..b, and other git-unsafe affixes such as a space, a tilde, a caret, a colon and a trailing dot. Exit must be 1, not 2. suggestion must equal the --branch-format line with the derived format. samples and rules must be those of the first verdict.
- VS-5: Risk: empty suggestion or wrong line order. Cover a negated rule, two rules, a given format, git check-ref-format with no rule, and a working-only failure in mr mode (rename line alone). A direct suggest() call with a loop-kind row and a working row gives two lines, format line first. Branch names with quotes, spaces or leading dashes must stay quoted safely in the rename line.
- VS-6: Risk: a literal the rule rejects, or a crash in the stdlib regex parser. Try alternation, classes, groups, repeats with minimum 0, dot, anchors, and lookahead, backreference, flags and unicode classes. Patterns that no candidate satisfies (^[a-z]+$) fall back to text with the pattern quoted. Invalid or very long or catastrophic patterns must not hang or raise. Substitute S-001 into the literal and check the pattern. Check pr and stack mode.
- VS-7: Risk: quotes, newlines, NUL and control characters in a pattern, label or branch name break the suggestion line or inject a second line. Use attack-corpus families injection, control-chars, flag-like-values, format-strings and oversized. Exit codes must stay 0, 1 or the documented error code. No traceback on stderr.

## Tools

| Id | Profile | Purpose | Exists |
|---|---|---|---|
| cli-runner | cli | Run branches.py preflight from a scratch cwd and record exit code, stdout, stderr and tree diff | True |
| stub-server | cli | gh shim that answers by sample name for pr and stack mode | True |
| glab-stub | cli | glab shim for mr mode | True |
| property | contract | Call derive, suggest and _regex_literal through the Python entry point with generated inputs | True |
| attack-corpus | security | Hostile pattern, label and branch-name inputs | True |

## Coverage

| Requirement | Scenarios |
|---|---|
| R-042 | VS-1, VS-2, VS-3, VS-4, VS-7 |
| R-043 | VS-5, VS-6, VS-7 |
| R-073 | VS-1, VS-2 |
| R-087 | VS-4 |
| R-122 | VS-6, VS-7 |

One CLI boundary (preflight) plus pure functions. Profiles are cli, contract and security, in that order of value. Round 0 plan. limits is not tagged: the spec states no number for this slice. The regex parser runs on user patterns, so catastrophic patterns are a concern in VS-6 and VS-7.


## Changes since the previous plan (round 2, after review fix)

The fix commit ea15f87 deleted the duplicate test T-R-073a. It changed no product code and no observable behavior. T-R-042b, T-R-042c and T-R-042f still cover the same cases. No scenario is added. All scenario ids stay as in round 0.
