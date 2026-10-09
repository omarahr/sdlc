# Review: S-002, lens security, round 1

Diff: `git diff sdlc/run-1...sdlc/S-002`. S-001 is on the run branch, so this range holds only the S-002 commits.

Fix round 1 (commit 1b90e38) adds one test for Unicode whitespace. It does not change `branches.py`. The round 0 checks still apply.

## Verdict

No blocking finding.

## Checks

- Command injection: `validate_format` calls `subprocess.run` with an argument list and no shell.
- Option injection: I ran `--help{name}`. Git got the name as a branch name and refused it. The result was a `Fail`.
- `@{-N}` expansion: I ran `@{-1}{name}`. The brace check refused it before git ran.
- Path traversal in the format: I ran `../{name}`. Git refused it.
- Unicode whitespace: I ran `sdlc/ {name}`. The whitespace check refused it. The new test pins this case and three others.
- Secrets, deserialization, SSRF, authn and authz: the slice touches none of them.

## Non-blocking notes

- Shell characters pass. I ran `sdlc/{name}$(id)` and `sdlc/{name};rm`, and `validate_format` accepted both. Git allows these characters. A later slice that puts a branch name into a shell string must quote it, or use an argument list.
- `name()` does not check the tail. An id such as `../x` gives `sdlc/../x`. The slices that feed ledger ids or CLI input into `name` (S-004 and later) must check the result before git or a path uses it.
- `validate_format` accepts invisible characters that git allows, for example U+200B. I ran `sdlc/​{name}` and it passed. The spec gives this job to git and the forge rules, so this note is for information only.
