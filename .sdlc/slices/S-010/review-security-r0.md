# Security review, S-010, round 0

The slice adds `list_kind` to `branches.py`. It runs two git commands with fixed arguments.
The `--repo` value follows `-C`, so git reads it as a path, never as an option.
The call uses an argument list and no shell. No input reaches a shell, a file write or the network.
Branch names come from `for-each-ref` and go only to `parse`, then to JSON output. The JSON encoder escapes odd characters.
`rev-parse` and `for-each-ref` run no hooks and no fsmonitor, so an untrusted repo cannot run code.
A missing git or a bad path gives a `Fail` with no traceback.
No blocking finding.
