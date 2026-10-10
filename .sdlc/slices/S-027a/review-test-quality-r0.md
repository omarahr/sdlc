# Review S-027a, lens test-quality, round 0

Verdict: no blocking findings.

- The new tests read prompt text and run the scripts. They use no sleeps, no network and no nested suite run.
- T-R-061b is a behavior test. It compares outputs for original, garbage and removed `branch` values.
- The new test code has no comments.
- The verifier tests in `verification/r0/tests/cli-0/` add nothing that committed tests miss. `branches.test.mjs` already pins the default format. No promotion is needed.

Non-blocking:
- T-R-002c checks a substring of the sentence that T-R-064a already pins. The ADR keeps it as separate R-002 evidence.
