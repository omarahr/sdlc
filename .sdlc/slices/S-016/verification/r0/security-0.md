# verify-security S-016 round 0, part 0

- Slice: S-016
- Profile: security
- Round: 0
- Commit: e55f687
- Verdict: REFUTED (1 failing case: TC-security-4)

## Environment
Python 3.14.7, Node test runner, gh shim on PATH (testkit stub-server), one scratch git repo per case. Test file: `.sdlc/slices/S-016/verification/r0/tests/security-0/branch-derive.verify-security.test.mjs`. Run log: `.sdlc/slices/S-016/verification/r0/logs/security-0-run.txt`. Attack log: `.sdlc/slices/S-016/verification/r0/logs/security-0-attacks.json`.

## Charter and threat model
- VS-2: explore the refusal rules with rule-shape and config attacks to find a derivation that writes a format the rule rejects (R-042: given format, negated, regex, several rules never derive).
- VS-4: explore the failed-derivation path with git-unsafe affixes to find a leaked second verdict or exit 2 (R-087, ADR b19f).
- VS-6: explore the regex literal with pattern syntax and pathological patterns to find a literal the rule rejects, a hang or a raise (R-122).
- VS-7: explore hostile text with the attack corpus to find a crash or a broken suggestion line (R-043).
- Trusted: the repo admin who sets forge rules and the user who runs preflight. Not trusted: nothing reaches this CLI from a submitter. Attacks that need hostile rule text are therefore seeds, not blockers.

## TC-security-4 (fail): a derived ok true format that validate_format refuses
- Given: one `starts_with "{"` rule, no format given, `--mode pr`.
- When: preflight runs, then `branches.py name --format <derived>` runs.
- Then expected: ok false (derivation failed), or a format that validate_format accepts.
- Actual: `ok true`, `derived true`, `format "{sdlc/{name}"`, exit 0. The next command exits 2: "holds a brace outside its placeholder".
- Same for 21 affixes: `{`, `}`, NBSP, U+0085, U+2003, U+3000, `a<NBSP>b`, for all three operators.
- Spec source: R-042; spec section 2 `validate_format`; plan risk "a wrong derivation writes a format the rule rejects".
- Test: `.sdlc/slices/S-016/verification/r0/tests/security-0/branch-derive.verify-security.test.mjs:137`

```
preflight: starts_with '{' -> ok true derived true format '{sdlc/{name}' exit 0
branches.py name --format '{sdlc/{name}' --kind slice --id S-001
-> {"ok": false, "error": "the branch format '{sdlc/{name}' holds a brace outside its placeholder"} exit 2
```

## Cases that held
- TC-security-1 (VS-2): given flag, given config, negated, regex and two-rule refusals. Derived false, original format, exit 1, tree unchanged, gh calls read-only.
- TC-security-2 (VS-2): unknown kind, null kind, zero rules, empty pattern, mr and direct mode.
- TC-security-3 (VS-4): 132 affix and operator pairs. Failing derivations give exit 1, original format, first-verdict samples and rules, and the exact derived `--branch-format` line.
- TC-security-5 (VS-6): 38 regex patterns in pr and stack mode. Every literal passes at `<literal>/S-001`. Patterns with no fit give the text fallback.
- TC-security-6 (VS-6): 20 invalid, deep, long and catastrophic patterns. No hang, no traceback.
- TC-security-7 (VS-7): corpus in pattern, label, --branch, --format and config. No traceback, exit in 0, 1, 2.

## Attacks
742 automated attacks: 738 held, 1 broke, 3 out of scope after the manual probes below. See the JSON file for the full list.

| Id | Attack | Result |
|---|---|---|
| ATK-90 | derived format with brace or Unicode whitespace | broke |
| ATK-M1 | repeat count `a{99999}` nested: 4 GB to 10 GB memory | out-of-scope |
| ATK-M2 | non-string pattern: TypeError traceback (S-015 code) | out-of-scope |
| ATK-M3 | newline, quote, `$(id)` in the suggestion | out-of-scope |

## Seeds
- suggestion line embeds rule text unescaped: A pattern or affix with a newline gives a multi-line suggestion that can start a second --branch-format line. A quote or $(id) in a derived affix or regex literal is printed raw inside double quotes, so a pasted line runs a command. Rule text comes from the repo admin's forge settings, a trusted party. Quote with shlex or JSON-escape the value, and keep to one line.
- non-string rule pattern crashes preflight with a traceback: A GitHub rule whose pattern is null, a list, a number or a dict raises TypeError in evaluate (startswith, endswith, in). Exit is 1 with no JSON. The crash is in S-015 code. Treat a non-string pattern as an unevaluated rule with a note.
- verify-limits: regex literal builder expands repeat counts in memory: _shortest multiplies the inner string by the minimum repeat count. A 35 byte pattern uses 4 GB to 10 GB. The spec states no limit. Cap the built length and return None above it.
- FutureWarning on stderr for a regex with a nested set: The pattern ^[[:alpha:]]+/ makes re._parser warn 'Possible nested set' on stderr. It is not a traceback. Suppress warnings around the parse.
