# Security review: S-003, round 1

Diff: `git diff main...sdlc/S-003`. The S-003 product change is in `skills/sdlc/branches.py`. The fix round 1 commit `1921d70` adds tests only. It does not change product code.

## Scope checked

- Injection: `branches.py` calls no shell. The only subprocess is `git check-ref-format` with an argument list. S-003 adds no subprocess call.
- Path traversal: `_config_format` reads only `<repo>/.sdlc/config.json`. No path comes from a part.
- Unsafe deserialization: the config goes through `json.load`. Invalid JSON, deep nesting, invalid UTF-8, a directory and an unreadable file give `Fail`. The new test pins these cases when `--format` is absent.
- Format resolution: `given` evaluates `ns.format is not None` first. Thus a broken config cannot fail a run that gives `--format`. The new test pins this order.
- Secrets, authn, authz, SSRF, XSS, tokens and signatures: none of these apply to this diff.
- Timestamp: `_state_tail` uses UTC. The CLI does not expose `ts`, so a caller cannot inject it.

## Findings

1. Non-blocking, carried from round 0. `name` does not check the parts it puts in the branch name. I ran `name --kind slice --id=-c --format '{name}'`. It printed the branch `-c` with exit 0. I ran `name --kind e2e-area --id M-1 --area '../x y'`. It printed `sdlc/M-1-e2e-../x y` with exit 0. The spec does not ask for a check of the parts, and the parts come from ledger ids. Fix: in `cmd_name`, run the built branch through `git check-ref-format --branch`. Consumers must put `--` before a branch name in git commands.

## Verdict

No blocking finding. The `medium` risk rating fits this slice, so `needsVerify` stays false.
