# Judge report: SC-M-1-009, voter 2

Verdict: refuted. Class: test-bug.

- R-099 and R-018 say only "A missing part is a Fail." They set no sign rule for `--n`.
- An accepted ADR (decision-judge, S-004) checks only for a missing or empty part. It names `tail("run", n=-1)` giving `run--1` as intended.
- I ran `name --kind attempt --id S-001 --n=-1` three times in a fresh git repo. Each run exits 0 and prints `sdlc/S-001-attempt--1`. The behavior is stable.
- Step 6 of the scenario asserts a rule that the spec and the ADR do not set.
