# Security review: S-003, round 0

Diff: `git diff main...sdlc/S-003`. The S-003 product change is in `skills/sdlc/branches.py`. The test change is in `skills/sdlc/test/branches.test.mjs`.

## Scope checked

- Injection: `branches.py` calls no shell. The only subprocess is `git check-ref-format` with an argument list, from S-002. S-003 adds no subprocess call.
- Path traversal: `_config_format` reads only `<repo>/.sdlc/config.json`. `--repo` is the caller's own target repo. No path comes from a part.
- Unsafe deserialization: the config goes through `json.load`. Invalid JSON, deep nesting and a non-dict top level give `Fail` or the default. No traceback leaks.
- Secrets, authn, authz, SSRF, XSS, tokens and signatures: none of these apply to this diff.
- Error output: a missing part gives one JSON error and exit 2. I ran the CLI to confirm this.
- Timestamp: `_state_tail` uses UTC. The CLI does not expose `ts`, so a caller cannot inject it.

## Findings

1. Non-blocking. `name` does not check the parts it puts in the branch name. I ran `name --kind e2e-area --id M-1 --area '../../x y'`. It printed `sdlc/M-1-e2e-../../x y` with `ok: true`. I ran `name --kind slice --id=-c --format '{name}'`. It printed the branch `-c`, which git can read as an option. `validate_format` checks only the sample `S-001`. The spec does not ask for a check of the parts, and today the parts come from ledger ids. Thus this is hardening, not a spec violation. Fix: in `cmd_name`, run the built branch through `git check-ref-format --branch`, or reject a part that holds `/`, whitespace or a leading `-`. Consumers must also put `--` before a branch name in git commands.

## Verdict

No blocking finding. The risk rating `medium` fits this slice, so `needsVerify` stays false.
