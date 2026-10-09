# Review: S-001, lens security, round 2

Scope: `git diff main...sdlc/S-001`. Round 2 adds one commit, `90d3251`. It changes only `skills/sdlc/test/branches.test.mjs` and `tests.md`. No product code changed since round 1.

## Checks

- Injection: `branches.py` starts no subprocess and calls no shell. The format and the flags do not reach git or a shell in this slice. The test kit calls `git` and `python3` through `execFileSync` and `spawnSync` with argument arrays, not through a shell.
- Output encoding: every result and every error goes through `json.dumps` with ASCII escapes. Hostile values stay inert text inside one JSON object.
- Deserialization: `load_format` and `load_git_modes` use `json.load` only. They catch `ValueError`, `RecursionError` and `OSError` and raise `Fail`. No traceback goes to stdout.
- Path traversal: `--repo` is a local path that the caller owns. The module reads only `<repo>/.sdlc/config.json` and `git-modes.json` beside the script. It writes nothing.
- Module shadowing: the three scripts insert `os.path.dirname(os.path.realpath(__file__))` at `sys.path[0]`. A symlinked script imports the real `branches.py`.
- Authn, authz, secrets, SSRF, XSS, tokens and signatures: this code has no network access and no credentials.

## Findings

1. Non-blocking. `validate_format` accepts a format that starts with `-`. It also accepts control and bidi characters. No caller gives the format to git in this slice. S-002 adds `git check-ref-format --branch` inside `validate_format`, and that check rejects these values. Keep the check inside `validate_format`. Give every later git argument after `--` or as a full ref name.
2. Non-blocking. `GIT_MODES_PATH` in `branches.py` uses `os.path.abspath(__file__)`. The three scripts use `os.path.realpath`. A symlinked `branches.py` reads the `git-modes.json` beside the symlink, not the real file. Use `realpath` here too, for one rule.
