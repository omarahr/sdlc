# Review: S-005, lens security, round 0

Scope: the S-005 commits on `sdlc/S-005` after `41de37e`. The product change is two new rows in `TAILS` in `skills/sdlc/branches.py`: `verify` and `attempt`. The test change adds T-R-008a to T-R-119 in `skills/sdlc/test/branches.test.mjs`.

## Checks

- Injection: the new rows build strings with f-strings. No row runs a shell or a git command. `cmd_name` prints the result through `json.dumps`, so a hostile part cannot break the JSON output.
- Argument injection: under the default format, every name starts with `sdlc/`. A format of plain `{name}` with a flag-like `--id` gives a name that starts with `-`. This is the carried finding from S-003 and S-004.
- Path traversal: `name` only builds a string. It opens no file and makes no ref.
- Input validation: `--round`, `--part` and `--n` go through argparse `type=int`. `--profile` is a free string. The rows check only for a missing or empty part.
- Secrets, authn and authz, deserialization, SSRF, XSS, tokens and signatures: the diff touches none of these.
- Tests: the new tests read files in `SKILL_DIR` and call the existing `run` and `probe` helpers. They add no shell string and no network call. T-R-119 is a source scan. It runs no git push.

## Findings

1. Non-blocking. The `verify` and `attempt` rows accept parts that give names that are not valid refs or that `parse` cannot read back. I ran `name --kind verify --id S-001 --round=-1 --profile '../X y' --part=-2`. It printed `sdlc/S-001-v-1-../X y--2` with exit 0. I ran `name --kind attempt --id=-c --n=-1 --format '{name}'`. It printed `-c-attempt--1` with exit 0. The spec's `parse` row 6 needs `\d+` for `round` and `part` and `[a-z0-9-]+?` for `profile`. Thus the janitor cannot recognize or sweep such a verify branch. The loop passes only ledger ids, profile names from the verify plan and counters, so the risk is low now. Fix: in `tail`, refuse a negative `round`, `part` or `n`, and refuse a `profile` outside `[a-z0-9-]+`. Alternatively, when S-008 wires consumers, check the output of `name` with `git check-ref-format --branch`, and put `--` before a branch name in git commands.

## Verdict

No blocking finding. The slice is rated `medium`, so the verification battery already runs. `needsVerify` stays false.
