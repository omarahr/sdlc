# Review: S-005a, lens security, round 0

Scope: the slice commits on `sdlc/S-005a` after `cd4371d`. The local `main` is behind `origin/main`, so `git diff main...sdlc/S-005a` also shows S-001 to S-004. The slice code is two new rows in `TAILS` in `skills/sdlc/branches.py` and new cases in `skills/sdlc/test/branches.test.mjs`.

## Checks

- Injection: the `verify` and `attempt` rows build strings with f-strings. No row runs a shell or git command. `cmd_name` prints the result through `json.dumps`, so a hostile `--id` or `--profile` cannot break the JSON output.
- CLI input: `--round`, `--part` and `--n` are `type=int`, so they hold only digits and a sign. `--id` and `--profile` are free strings.
- Argument injection: under the default format, every name starts with `sdlc/`. A plain `{name}` format with a flag-like `--id` can give a name that starts with `-`. No consumer calls `name` for these kinds in this slice.
- Path traversal: `name` only builds a string. It opens no file and makes no ref.
- Secrets, authn and authz, deserialization, SSRF, XSS, tokens: the diff touches none of these.
- Tests: the new tests use the existing `run`, `probe` and `CALL` helpers. They add no shell call and no network call.

## Findings

1. Non-blocking. `name` does not run `git check-ref-format` on its output, and `tail` checks only for a missing or empty part. A `--profile` or `--id` that holds `..`, `~`, `:`, a space or a leading `-` gives a name that is not a valid ref, or that reads as a flag. The loop passes only ledger ids and planner profile names, so the risk is low now. This is the same open point as the S-004 security review. The fix: when S-008 wires consumers, pass names to git after `--`, or check the output of `name` with `git check-ref-format --branch`.

## Verdict

No blocking finding. `needsVerify` stays false: the slice is rated medium, so the verification battery already runs.
