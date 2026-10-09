# S-013 security review, round 0

No blocking finding.

- The `gh` call uses a list argument, so no shell parses it. The sample is quoted with `safe=""` and sits after a fixed `repos/` prefix, so it cannot become a flag.
- `stdin` is closed and `GH_PROMPT_DISABLED=1` is set, so `gh` cannot wait for input. A 60 second timeout bounds the call.
- Failure notes carry gh stderr. They hold no secret that the code reads.

Non-blocking:
- `github_rule` copies `pattern` from the API without a type check. A `regex` rule with a missing pattern makes `re.compile(None)` raise `TypeError` in `evaluate`. Fix: in `github_rule`, give `None` as the kind when the pattern is not a string.
- `.` and `..` samples are not encoded by `quote`. Format validation refuses them, so this is not reachable now.
