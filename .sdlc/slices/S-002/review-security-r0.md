# Review: S-002, lens security, round 0

Diff: `git diff sdlc/run-1...sdlc/S-002`. S-001 is on the run branch, so this range holds only the S-002 commits.

## Verdict

No blocking finding.

## Checks

- Command injection: `validate_format` calls `subprocess.run` with an argument list and no shell. The format cannot reach a shell.
- Option injection: git reads the argument after `--branch` as a name, never as an option. A probe with `--help{name}` and `-{name}` got a `Fail` with git's reason.
- `@{-N}` expansion: the brace check runs before git, so no `@{...}` form reaches `check-ref-format --branch`.
- Crash paths: a NUL raises `ValueError`, a lone surrogate raises `UnicodeEncodeError`, and a missing git raises `OSError`. Each one becomes a `Fail` and exit 2. I ran the surrogate probe and a 300 000-character format; neither gave a traceback.
- Control characters: git rejects `\x01` and `\x7f`. The whitespace check rejects `\xa0`.
- Secrets, deserialization, SSRF, authn and authz: the slice touches none of them.

## Non-blocking notes

- `name()` does not check the tail. An id such as `../x` gives `sdlc/../x`. Today only `validate_format` and the tests call `name`, with a fixed id. The slices that feed ledger ids or CLI input into `name` (S-004 and later) must check the result, or the tail, before git or a path uses it.
- `validate_format` accepts invisible characters that git allows, for example U+200B. Such a format gives branch names that look the same as other names. The spec gives this job to git and the forge rules, so this note is for information only.
