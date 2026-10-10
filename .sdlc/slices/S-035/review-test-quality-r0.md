# Review S-035, lens test-quality, round 0

Verdict: blocking findings.

- T-R-145 and T-R-147 repeat T-R-063a. T-R-063a already checks, for escalator.md and state-writer.md, that no loop branch literal remains and that the same placeholders are present. Delete both tests, or fold in only what is new.
- T-R-131 repeats T-R-093a. T-R-093a already checks the list command, the slice id filter and the absence of `-attempt-*` in the Clean up section. Delete it, or fold in only what is new.
- T-R-143 mostly repeats T-R-063a and T-R-080 for integrator.md. Only the NAMED_LITERALS check is new. Keep that check alone.
- No comments found in the added code. The tests are deterministic. The bad-sample asserts prove the scans detect a literal.
