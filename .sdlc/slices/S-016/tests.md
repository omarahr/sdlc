# Tests for S-016

All tests are in `skills/sdlc/test/branches.test.mjs`.

- T-R-042a — R-042 — `derived` is false and the verdict fails because no derivation exists
- T-R-042b — R-042 — `derived` is false and the verdict fails because no derivation exists
- T-R-042c — R-042 — suggestion is empty because `suggest` is missing
- T-R-042d — R-042 — characterization: the default format already passes, so the test passes now
- T-R-042e — R-042 — suggestion is empty because `suggest` is missing
- T-R-042f — R-042 — `derive` is missing (AttributeError names `derive`)
- T-R-042g — R-042 — suggestion is empty because `suggest` is missing
- T-R-042h — R-042 — preflight does not derive a second format
- T-R-042i — R-042 — the suggestion assertion fails because `suggest` is missing (suggestion is empty); the sample and rule checks pin the kept first verdict
- T-R-087a — R-087 — suggestion is empty because `suggest` is missing
- T-R-043a — R-043 — suggestion is empty because `suggest` is missing
- T-R-043b — R-043 — suggestion is empty because `suggest` is missing
- T-R-043c — R-043 — suggestion is empty because `suggest` is missing
- T-R-043d — R-043 — suggestion is empty because `suggest` is missing
- T-R-043e — R-043 — suggestion is empty because `suggest` is missing
- T-R-043f — R-043 — suggestion is empty because `suggest` is missing
- T-R-043g — R-043 — `suggest` is missing (AttributeError names `suggest`)
- T-R-043h — R-043 — `suggest` is missing (AttributeError names `suggest`)
- T-R-122a — R-122 — suggestion is empty, so no literal exists
- T-R-122b — R-122 — suggestion is empty, so no literal exists
- T-R-122c — R-122 — suggestion is empty, so no fallback text exists
- R-073 — covered by T-R-042b, T-R-042c and T-R-042f. T-R-073a was a duplicate and is deleted.
- T-R-073b — R-042 — a derived format that validate_format refuses stays a failed derivation (promoted from verify-security TC-security-4)
