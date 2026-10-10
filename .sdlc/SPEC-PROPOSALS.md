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

### P-20261010-M1-scenarios: Define the empty pattern and non-string config values
- Source: behavior-campaign
- Proposal: In spec section 3, state what `evaluate` returns for an empty `pattern`. In spec section 2, state what `load_format` returns when `branchFormat` is not a string.
- Rationale: The spec is silent on both cases. Scenarios SC-M-1-013 and SC-M-1-037 only check that the module does not crash.

### P-20261010-M1-SC007: Define load_format on invalid JSON in config.json
- Source: behavior-campaign
- Proposal: In spec section 2, state what `load_format` does when `.sdlc/config.json` is not valid JSON. Either it returns `sdlc/{name}`, or it stops with exit 2 and an error.
- Rationale: R-016 lists only a missing key, an empty value and an absent file. The code stops with exit 2 on invalid JSON. Scenario SC-M-1-007 expects the default.

### P-20261010-M1-SC017: Say that parse digits are ASCII
- Source: behavior-campaign
- Proposal: In spec section 2, after the parse table, add one sentence. In every row, `\d` means an ASCII digit `[0-9]`. A branch with other Unicode digits returns None.
- Rationale: The spec writes `\d` and does not name a digit set. Python `re` matches Arabic-Indic digits with `\d`. Branch names that format() makes hold only ASCII digits. Scenario SC-M-1-017 expects None for 14 Arabic-Indic digits.

### P-20261010-M1-SC012: Define what name does with an id that git refuses
- Source: behavior-campaign
- Proposal: In spec section 2, state what `name` does when a part such as `--id` or `--area` makes a branch that `git check-ref-format --branch` refuses. Either `name` exits 2 with an error, or it prints the branch as given.
- Rationale: R-017 checks only the format with the sample id S-001. The spec says exit 2 on bad input but does not call a hostile id bad input. Ids come from the ledger. Scenario SC-M-1-012 expects exit 2 or a valid ref. The code prints the refused ref and runs no hostile text.
