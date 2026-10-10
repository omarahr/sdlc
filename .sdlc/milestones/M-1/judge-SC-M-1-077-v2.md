# Judge report: SC-M-1-077, voter 2

Verdict: refuted. Class: test-bug.

- R-008 says: "An explicit ts part is used as given." It does not say to refuse a 13-digit ts.
- The spec gives no rule for a bad ts. The API stays as given: tail('state', ts='2026123123595') returns state-2026123123595.
- I ran it: the result is the same as the runner saw. The code in _state_tail keeps any non-empty ts.
- The CLI has no --ts flag (NAME_PARTS holds id, n, area, round, profile, part). The runner's exit 2 comes from an unknown argument, not from ts validation.
- The scenario expects exit 2 and ok false for 13 digits. The spec does not require that.
