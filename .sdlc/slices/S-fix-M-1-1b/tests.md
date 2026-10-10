T-R-019-roundtrip — R-019 — name returns sdlc/S-001-attempt-2 and sdlc/S-001-v0-cli-0 instead of raising Fail; the CLI exits 0
T-R-019-nonascii — R-019 — name returns a branch for a non-ASCII id (U+212A, é) instead of raising Fail
T-R-019-lower-nonascii-area — R-019 — str.lower() turns area É into é, and the round-trip check is missing (fails until name uses _ascii_lower)
T-R-053-active — R-053 — active_branch matches slice id S-00K (U+212A) to the ASCII branch s-00k through str.lower()
SC-M-1-076 — R-019 — e2e: name prints branches that parse reads as kinds attempt and verify
T-R-019-valid — R-019 — characterization: valid parts keep their names and parse back
T-R-019-int-value — R-019 — characterization: n="02" parses back as 2
T-R-019-lower — R-019 — characterization: lowering touches only the tail
T-R-019-e2e-id — R-019 — characterization: id S-001-e2e stays valid
- T-R-019-trailing-newline, T-R-019-parse-newline, T-R-019-state-ts — R-019 — promoted from verify-contract r0 (TC-contract-7, TC-contract-8): line feed at the end of a part is refused
