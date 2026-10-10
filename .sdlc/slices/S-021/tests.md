# Tests S-021

All tests are in `skills/sdlc/test/next-action.test.mjs`.

- active slice branch is found by parse under a custom format — R-053 — the script matches only `sdlc/` branches, so `checkout` is null
- state, e2e, slice and milestone heads are recognized under a custom format — R-054 — the script matches only `sdlc/` heads, so no merge, no awaiting-merge and no milestone hold
- a lowercased head resolves to the ledger id — R-054 — the lowercased head matches no `sdlc/` id, so the slice is not awaiting-merge and the merged head is not found
- a missing or empty branchFormat falls back to sdlc/{name} — R-055 — characterization: passes now and pins the default
- the active slice branch, slice PR heads, the state PR, the e2e PR and the stack milestone hold are recognized under a custom format — R-076 — the script ignores every custom-format branch and head
- R-077 — the existing next-action tests and `npm test` with no `branchFormat` are the proof; they pass now
- Changed the merged case of the lowercased-head test to an awaiting-merge slice (ADR in DECISIONS.md).
- Promoted from the security verifier into `skills/sdlc/test/next-action.test.mjs`: a slice-shaped branch without an in-progress entry stays inactive (TC-security-2)
- Promoted from the security verifier into `skills/sdlc/test/next-action.test.mjs`: the checked-out branch wins over another in-progress branch (TC-security-3)
