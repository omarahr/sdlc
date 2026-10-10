# Judge report: SC-M-1-009, voter 1

Verdict: refuted. Class: test-bug.

- The spec says only: "A missing part is a Fail." (R-018, R-099). It sets no sign rule for `--n`.
- An accepted ADR (decision-judge, S-004) chooses to check only for a missing or empty part. It names `tail("run", n=-1)` giving `run--1` as intended. It lists the round-trip gap as known.
- I ran `name --kind attempt --id S-001 --n=-1` three times in a fresh git repo. Each run exits 0 and prints `sdlc/S-001-attempt--1`. The other bad calls exit 2 as expected.
- Step 6 of the scenario asserts a rule that the spec and the ADR do not set.
