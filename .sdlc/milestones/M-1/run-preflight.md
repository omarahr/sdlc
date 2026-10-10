# Run: preflight (M-1)

Test file: e2e/tests/preflight.test.mjs on branch sdlc/M-1-e2e-preflight. Command: node --test e2e/tests/preflight.test.mjs. Result: 19 pass, 1 fail.

Harness note: the module reads the forge from `.sdlc/config.json` key `forge`, not from the git remote. Each test sets `forge` in config and uses the gh and glab fakes. Where a scenario says "remote origin", the test also adds the remote.

Test fixes: SC-M-1-028 first compared state-sample names across two runs one second apart. The test now masks the timestamp. SC-M-1-078 first expected the `git check-ref-format` label under a regex rule. The ADR for S-012 gives the label `push rule` there, so the test accepts both labels with a regex and requires `git check-ref-format` without a rule.

## Status pass
SC-M-1-025, 026, 027, 028, 029, 030, 031, 032, 033, 034, 035, 036, 037, 038, 072, 073, 079, 081, 083. Each one met every expected channel (exit code, JSON fields, empty stderr, fake request log, byte-equal repo state).

## SC-M-1-078: fail
Expected: for each hostile `--branch` value, one JSON object whose working sample fails; the hostile text appears at most once per output; no secret leaks.
Observed (secrets never leaked; no Traceback; no git usage text; repo state unchanged):
- `--branch -x` and `--branch --help` (separate argument): exit 2, `{"ok": false, "error": "argument --branch: expected one argument"}`. No working sample. With `--branch=-x` the sample fails correctly.
- `--branch ""`: `ok: true`, no working sample. The empty name is not checked.
- `--branch @` with no forge rule: `ok: true`, working sample `unchecked`. Git accepts `@` through `check-ref-format --branch`.
- For `a b`, `a\nb`, `-x` and `--help` (equals form), the name appears 4 times in stdout (args echo, sample name, suggestion twice).
Evidence: `git for-each-ref` and config were byte-equal before and after. The name of 300 `x` characters and the right-to-left override name are valid git names. They pass with no rule, which is correct, and fail only through the `push rule` regex.
