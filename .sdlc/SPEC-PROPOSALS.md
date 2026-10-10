# Spec proposals

### P-20261009-041704: State the full state tail in the tail contract
- Source: contradiction ADR-20261009-041704-decision-judge-S-003-9e7b
- Proposal: In spec section 2, extend the tail line: "tail("state") returns state- plus a 14-digit UTC timestamp, for example state-20261008101500; tail("state", ts=X) returns state-X." Change the R-018 acceptance from "tail("state") is 14 digits" to "tail("state") matches ^state-\d{14}$".
- Rationale: The section 1 table, parse row 5 and R-008 all put "state-" in the tail. The R-018 acceptance shortens this to "14 digits", and later checks can read it as a bare timestamp. One explicit example removes the question.

### P-20261009-164238: Name the slice that closes the round-trip requirement
- Source: contradiction ADR-20261009-164238-decision-judge-S-006-a3a8
- Proposal: In the R-068 acceptance, state that the name and split half runs before parse exists. State that the parse assertion joins the same round-trip test once parse exists.
- Rationale: The slice order puts the round-trip test before parse. Two ADRs now handle this split for R-019 and R-068. One explicit sentence removes the conflict.

### P-20261009-211639: Remove "an error" from the glab no-rule list
- Source: contradiction ADR-20261009-211639-decision-judge-S-014-f2c2
- Proposal: In spec section 3, remove "an error" from the list of glab results that mean no rule. State that a non-zero glab exit or non-JSON output gives the note "rules unknown on gitlab: <stderr>" and unchecked samples.
- Rationale: The no-rule list and the failure sentence overlap for a 403 or 404. A failed read must not report samples as checked.

### P-20261009-211807: Reword the glab no-rule sentence in spec section 3
- Source: contradiction ADR-20261009-211807-decision-judge-S-014-6a1c
- Proposal: In spec section 3 (line 107), replace "The literal `null` body, an error, or an empty `branch_name_regex` means no rule" with "A successful `null` body, a JSON object without `branch_name_regex`, or an empty `branch_name_regex` means no rule." Keep the glab failure sentence: a non-zero exit, missing glab, non-JSON output or timeout gives the note `rules unknown on gitlab: <stderr>` and unchecked samples.
- Rationale: The word "error" conflicts with the failure sentence in the same paragraph. ADR f2c2 and e148 already set the behavior. Only the wording is wrong.

### P-20261010-012416: State the test impact of the deleted Branch name bullet
- Source: contradiction ADR-20261010-012416-decision-judge-S-018-b1c1
- Proposal: In spec section 5, add one sentence. It says that the assertion on the deleted "Branch name (first run only)" bullet moves to the Branch format bullet. It keeps the first-run-only and resume wording.
- Rationale: The spec deletes text that an existing test pins. One sentence removes the conflict for later slices.

### P-20261010-074453: Exempt the format placeholder from the sdlc/ literal scan
- Source: contradiction ADR-20261010-074453-decision-judge-S-027c-1782
- Proposal: In the R-063 and R-080 scan text, state that the scan skips sdlc/{name. Write the regex as (?<![.\w])sdlc/(?!tracker|STOP|\{name).
- Rationale: The spec requires the default format text sdlc/{name} in four files. The scan must not flag required text.
