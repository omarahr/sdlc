# Security review of S-015, round 0

No blocking finding.

- Subprocess calls use argument lists. No shell runs. The sample name goes into the `gh api` path after `urllib.parse.quote(safe="")`. No path traversal or injection is possible.
- A branch name that starts with a dash fails `git check-ref-format --branch` with status 128. The result is `fail`. No option injection occurs.
- Rule patterns from the forge are only compiled and matched. They are never executed. A bad regex gives a note, not a crash.
- Non-blocking: the branch `@{-1}` passes `git check-ref-format --branch`. Git expands it using the previous branch of the current directory. Run `ref_format_error` with `--` and reject names that hold `@{`.
