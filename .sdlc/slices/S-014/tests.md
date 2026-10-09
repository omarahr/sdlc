# S-014 tests

All tests are in skills/sdlc/test/branches.test.mjs.

- T-R-030a — R-030 — read_rules makes no glab call for gitlab yet, so the call count is 0, not 1
- T-R-030b — R-030 — the gitlab forge returns no rule, so the regex rule is missing
- T-R-030c — R-030 — the gitlab forge returns unchecked true and an empty by_sample, not unchecked false
- T-R-030d — R-030 — the gitlab forge returns no rule, so the branch rule is missing
- T-R-030e — R-030 — the gitlab forge returns unchecked true, not false
- T-R-031a — R-031 — the gitlab forge gives no note, so the note `rules unknown on gitlab: boom` is missing
- T-R-031b — R-031 — the gitlab forge gives no note
- T-R-031c — R-031 — the gitlab forge gives no note
- T-R-031d — R-031 — the gitlab forge gives no note
- T-R-032a — R-032 — passes now: the code already makes no call without a forge; the test pins that behavior (characterization)
- T-R-026a — R-026 — the gitlab case returns no rule, so the key check has no gitlab rule to inspect
- T-R-084b — R-084 — the gitlab forge gives no note when glab is missing
