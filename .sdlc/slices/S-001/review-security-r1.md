# Review: S-001, lens security, round 1

Scope: `git diff main...sdlc/S-001`. Product code: `skills/sdlc/branches.py` and the import lines in `next-action.py`, `state-write.py` and `janitor.py`. Test kit: `skills/sdlc/test/testkit/`.

## Checks

- Injection: `branches.py` starts no subprocess and calls no shell. The format and the flags never reach git or a shell in this slice.
- Output encoding: every result and every error goes through `json.dumps` with ASCII escapes. Hostile values stay inert text inside one JSON object.
- Deserialization: `load_format` and `load_git_modes` use `json.load` only. They catch `ValueError`, `RecursionError` and `OSError` and raise `Fail`. No traceback reaches stdout.
- Path traversal: `--repo` is a local path the caller owns. The module reads only `<repo>/.sdlc/config.json` and `git-modes.json` beside the script. It writes nothing.
- Module shadowing: the three scripts insert `os.path.dirname(os.path.realpath(__file__))` at `sys.path[0]`. A symlinked script now imports the real `branches.py`, not a decoy beside the symlink. The fix of round 1 closes TC-security-20.
- Authn, authz, secrets, SSRF, XSS, tokens and signatures: not in scope for this code. No network, no credentials.

## Findings

1. Non-blocking. `validate_format` accepts a format that starts with `-`, and it accepts control and bidi characters. No caller passes the format to git in this slice. S-002 adds `git check-ref-format --branch` inside `validate_format`. That check rejects these values. Keep the check inside `validate_format`, and pass every later git argument after `--` or as a full ref name.
