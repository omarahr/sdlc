# Judge report: SC-M-1-007 (voter 1)

Verdict: refuted. Classification: test-bug.

- R-016 acceptance names three fallback cases: key missing, key empty, file absent. Invalid JSON is not one of them.
- No ADR and no OVERRIDE ADR makes invalid JSON fall back to the default.
- The product test "a deeply nested config.json is bad input, not a crash" requires load_format to raise Fail on an unreadable config. The scenario contradicts it.
- I reproduced the runner's result: invalid JSON gives exit 2 and one JSON error. This is a deliberate, bounded failure, not a crash.
- The absent, {} and empty variants pass.
- The scenario expect clause "invalid JSON gives sdlc/S-001" adds a requirement the spec does not state.
