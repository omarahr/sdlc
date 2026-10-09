# Review: S-004, lens security, round 0

Scope: `git diff main...sdlc/S-004`. The slice code is three new rows in `TAILS` in `skills/sdlc/branches.py` and T-025 to T-027 in `skills/sdlc/test/branches.test.mjs`.

## Checks

- Injection: the new rows build strings with f-strings. No row runs a shell or git command. `cmd_name` prints the result through `json.dumps`, so a hostile `--id` cannot break the JSON output.
- Argument injection: under the default format, every name starts with `sdlc/`, so a flag-like `--id` cannot give a name that starts with `-`. A format of plain `{name}` can give such a name. No consumer calls `name` before S-008, so this slice adds no exposure.
- Path traversal: `name` only builds a string. It opens no file and makes no ref.
- Input validation: the rows check only for a missing or empty part. ADR-20261009-045048-decision-judge-S-004-7815 accepts this. The `slice` row from S-002 does the same.
- Secrets, authn and authz, deserialization, SSRF, XSS, tokens: the diff touches none of these.
- Tests: the new tests use the existing `run` and `CALL` helpers. They add no shell call and no network call.

## Findings

1. Non-blocking. `name` does not run `git check-ref-format` on its output. A `--id` that holds `..`, `~`, `:`, a space or a leading `-` gives a name that is not a valid ref or that reads as a flag. The loop passes only ledger ids, so the risk is low now. The fix: when S-008 wires consumers, pass names to git after `--`, or check the output of `name` with `git check-ref-format --branch`.

## Verdict

No blocking finding. `needsVerify` stays false: the slice is rated medium, so the verification battery already runs.
