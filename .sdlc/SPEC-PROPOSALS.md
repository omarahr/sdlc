# Spec proposals

### P-20261009-041704: State the full state tail in the tail contract
- Source: contradiction ADR-20261009-041704-decision-judge-S-003-9e7b
- Proposal: In spec section 2, extend the tail line: "tail("state") returns state- plus a 14-digit UTC timestamp, for example state-20261008101500; tail("state", ts=X) returns state-X." Change the R-018 acceptance from "tail("state") is 14 digits" to "tail("state") matches ^state-\d{14}$".
- Rationale: The section 1 table, parse row 5 and R-008 all put "state-" in the tail. The R-018 acceptance shortens this to "14 digits", and later checks can read it as a bare timestamp. One explicit example removes the question.

### P-20261009-164238: Name the slice that closes the round-trip requirement
- Source: contradiction ADR-20261009-164238-decision-judge-S-006-a3a8
- Proposal: In the R-068 acceptance, state that the name and split half runs before parse exists. State that the parse assertion joins the same round-trip test once parse exists.
- Rationale: The slice order puts the round-trip test before parse. Two ADRs now handle this split for R-019 and R-068. One explicit sentence removes the conflict.
