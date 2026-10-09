# S-005a tests

File: `skills/sdlc/test/branches.test.mjs`. Run: `node --test skills/sdlc/test/branches.test.mjs`.

- T-R-008a "name --kind state prints sdlc/state- and the current UTC time" — R-008 — characterization: passes now, the state row exists since S-003.
- T-R-008b "an explicit state ts is used as given under a prefixed format, and an empty ts generates one" — R-008 — characterization: passes now.
- T-R-009a verify rows in "name prints the default branch for the run, slice, milestone, e2e, e2e-area, verify and attempt kinds" — R-009 — fails now: exit 2, no branch name is defined for kind 'verify'.
- T-R-009b verify keys in "tail builds the run, milestone, e2e, verify and attempt tails and fails on a missing part" and verify_lower in "name for the run, milestone, e2e, verify and attempt kinds follows a prefixed and a lowercased format and fails without its part" — R-009 — fails now: tail and name raise Fail for kind 'verify'.
- T-R-009c row "verify without --profile" in "name without a required part exits 2 with one JSON error and no traceback" — R-009 — fails now: the error names the kind, not profile.
- T-R-010a attempt rows in the T-R-009a test — R-010 — fails now: no tail row for kind 'attempt'.
- T-R-010b attempt keys in the T-R-009b tail test and attempt_lower in the format test — R-010 — fails now: no tail row for kind 'attempt'.
- T-R-010c row "attempt without --n" in the T-R-009c test — R-010 — fails now: the error names the kind, not n.
