# Decisions

### ADR-20261008-162858-slicer-S-001-d9f4: Duplicate requirements ride in their twins' slices
- Status: auto
- Context: The ledger holds 122 todo requirements. The extractor wrote near-duplicates: R-093 of R-010, R-094 of R-025, R-095 of R-033, R-096 of R-056, R-098 of R-013, R-119 of R-009, R-120 of R-007 and R-121 of R-047. The slicer must slice every todo requirement.
- Options: Leave the duplicates unsliced for the critic; slice them apart; place each beside its twin.
- Decision: Each duplicate is listed in the slice that implements or verifies its twin, so one review and one verification cover both.
- Consequences / how to reverse: The integrator marks each duplicate done with its twin's evidence. The critic can still flag a duplicate, and the state-writer can move it to another slice.
- Affects: S-001, S-005, S-006, S-010, S-011, S-019, S-022

### ADR-20261009-024036-decision-judge-S-001-8de8: S-001 owns the structural checks of validate_format
- Status: auto
- Context: R-014 needs an invalid --format to exit 2. validate_format belongs to S-002 under R-017. The S-001 plan already adds the placeholder, brace and whitespace checks. No OVERRIDE ADR covers this question.
- Options: (1) S-001 implements validate_format with the placeholder, brace and whitespace checks, and S-002 adds the git check-ref-format step; T-005 tests only structural rejections. (2) The same split, and S-001 does not mark R-017 done. (3) The same split, with the final signature and Fail contract from the start. All three proposals choose the same split.
- Decision: S-001 implements validate_format(fmt) in skills/sdlc/branches.py with its final signature and Fail contract. It holds only the placeholder, brace and whitespace checks. Every handler calls it, and a failure exits 2 with one JSON error. S-002 adds the git check-ref-format --branch step inside the same function and owns the invalid-ref case under R-017. T-005 tests only no placeholder, two placeholders, whitespace and an extra brace pair. S-001 does not mark R-017 done.
- Consequences / how to reverse: R-014 is verified with real bad input in S-001. S-002 extends the function and does not replace it. To reverse, move the three checks to S-002 and change the T-005 format cases to a different bad input. No public signature, CLI flag or state format changes.
- Affects: S-001, S-002, R-014, R-017

### ADR-20261009-024047-decision-judge-S-001-c046: S-001 verifies R-098 as a no-regression check from a scratch cwd
- Status: auto
- Context: The R-098 acceptance says branch recognition in the three scripts "still resolves". S-001 adds only the sys.path insertion and the branches import. Recognition through branches.py arrives in S-021, S-022 and S-024. R-098 duplicates R-013, and the slicer ADR puts it beside R-013 in S-001. No OVERRIDE ADR covers this question.
- Options: (1) Add T-010, which loads each script by path from a scratch cwd and calls its present recognition code on a default branch; close R-098 in S-001. (2) Add no recognition test; rely on T-008, T-009 and the existing suites. (3) Keep T-008 and T-009, run the existing suites unchanged, and add one test that runs a real recognition path per script from a scratch cwd, such as next-action.py on a state with an sdlc/S-* branch.
- Decision: Option 3. Read "still resolves" as no regression after the import line lands. S-001 keeps T-008 and T-009 and runs the existing next-action, state-write and janitor suites unchanged. S-001 adds one test that runs one recognition path per script through its CLI from a scratch cwd. The test asserts the same result as before the import. S-001 does not test recognition through branches.py. S-021, S-022 and S-024 own that under their own requirements. R-098 stays in S-001 beside R-013.
- Consequences / how to reverse: The new test runs the scripts through their CLI, so it survives when later slices move recognition into branches.py. The existing suites are not changed. To reverse, add R-098 to the S-024 requirements, or add one scratch-cwd recognition test to S-024. Neither change touches S-001 code.
- Affects: S-001, R-098, R-013

### ADR-20261009-024048-decision-judge-S-001-eb2f: S-001 interim command output echoes the resolved format and the parsed flags
- Status: auto
- Context: S-001 builds the branches.py skeleton. S-002 to S-017 build the real name, parse, list and preflight. R-014 and R-088 need every command to print one JSON object now. The plan does not fix the interim fields.
- Options: (1) Keep the plan's interim output: {ok: true, command, format, ...parsed flags}, exit 0; bad input gives {ok: false, error} and exit 2; no final result fields; no exit 1. (2) Print only {ok, command, format} from one shared helper, with no flag echo. (3) Print the plan's object with the parsed flags, with no final result fields, and assert the echoed flags in no test.
- Decision: Option 1. Each handler checks --repo and --kind or --mode, resolves the format and runs validate_format. On success it prints one JSON object {"ok": true, "command": <cmd>, "format": <resolved format>, ...parsed flags} and exits 0. The resolved format replaces the raw --format value under the key "format". Bad input prints {"ok": false, "error": <string>} and exits 2. The handlers emit no field that the spec's final output defines, such as samples, rules, derived, kind, tail, branch, known or branches. Tests T-003 to T-007 assert only one JSON object, ok, command, format and the exit-2 error shape. Scores (fit x3, reversibility x2, simplicity x1): option 1 = 29, option 3 = 29, option 2 = 27. Option 1 wins the tie because it matches the plan and states the exit codes and the validate_format check exactly. Option 2 loses on fit: the flag echo is the only output evidence that each command parses its R-088 flags.
- Consequences / how to reverse: The interim output lives in four handler bodies in skills/sdlc/branches.py. No consumer reads it in this slice. Each later slice replaces its handler body. To drop the flag echo, remove the parsed flags from the result dict; no test changes.
- Affects: S-001, R-013, R-098, R-014, R-088, R-016

### ADR-20261009-024229-decision-judge-S-001-39b5: S-001 nests the interim flag echo under one args key
- Status: auto
- Context: ADR-20261009-024048-decision-judge-S-001-eb2f gives the success object as {ok, command, format, ...parsed flags}. The same ADR forbids the top-level fields kind and branch. A flat echo of --kind (name, list) or --branch (parse, preflight) writes exactly those forbidden keys. No test reads the echoed flags. No OVERRIDE ADR covers this question.
- Options: (1) Nest the parsed flags except format under "args"; the top level holds only ok, command, format and args. (2) Nest the parsed flags without command and format under "args", built by one dict expression over the argparse namespace in one shared helper, as plan.md step 5 says; no per-command filter and no rename. (3) Nest as in option 1, apply the ADR's forbidden-key list to every command, and record the reading as a refinement of ADR-20261009-024048.
- Decision: Option 2. On success each S-001 handler prints {"ok": true, "command": <cmd>, "format": <resolved format>, "args": <parsed flags without command and format>} and exits 0. One shared helper builds "args" from the argparse namespace. The top level holds no key except ok, command, format and args, so kind and branch appear only inside args. Bad input keeps {"ok": false, "error": <string>} and exit 2. Tests T-003 to T-007 stay unchanged and do not read args. This decision refines ADR-20261009-024048: "...parsed flags" names the content of the echo, not its position. Scores (fit x3, reversibility x2, simplicity x1): option 2 = 30, option 1 = 29, option 3 = 29. Option 2 wins on simplicity: the plan already says it, so the implementer changes nothing, and one helper needs no special cases.
- Consequences / how to reverse: The echo lives in one shared helper in skills/sdlc/branches.py. No test, consumer or state file reads args. S-002 to S-017 replace each handler body, and the args key goes away with them. To make the echo flat, spread the args dict into the result and drop the colliding keys; this is a one-line change and no test changes.
- Affects: S-001, R-013, R-098, R-014, R-088, R-016

### ADR-20261009-034220-decision-judge-S-002-3cc6: S-002 adds tail as a one-row table and pins no other kind
- Status: auto
- Context: validate_format and name need a slice tail in S-002. The tail contract is R-018 in S-003. The other kind rows belong to S-004 to S-006. No OVERRIDE ADR covers this question.
- Options: (1) A table-driven tail with only the slice row; tests cover the slice row, the unknown-kind Fail and the missing-part Fail. (2) A plain function with one slice branch; no standalone tail test, T-016 covers the slice tail through name. (3) A table-driven tail with only the slice row; tests cover the slice tail through name and the missing-id Fail; no test pins that another kind fails.
- Decision: Option 3. S-002 adds tail(kind, **parts) in skills/sdlc/branches.py with its final signature and Fail contract. tail reads one table keyed by kind, and each row gives its required parts and a builder. The table holds only the slice row: tail("slice", id="S-001") is "S-001". A missing or empty id raises Fail. A kind not in the table raises Fail. S-002 tests only the slice tail through name and the missing-id Fail. S-002 adds no test that asserts another kind fails. S-002 does not mark R-018 done. S-003 owns the R-018 contract tests and the state timestamp default. S-004 to S-006 add rows to the same table. Scores (fit x3, reversibility x2, simplicity x1): option 3 = 28, option 1 = 25, option 2 = 25. Option 1 loses on reversibility: an unknown-kind test that uses a real kind breaks when a later slice adds that row. Option 2 loses on fit: a branch chain is harder to extend row by row than the single tail source in spec section 2.
- Consequences / how to reverse: Each later slice adds one row and its tests, and no S-002 test changes. This follows the pattern of ADR-20261009-024036-decision-judge-S-001-8de8. To reverse, add the other rows and the state timestamp default to the same table in S-002, and move the R-018 tests from S-003. No signature, CLI flag, config key or state format changes.
- Affects: S-002, R-017, R-001, R-019, R-020, R-071, R-018

### ADR-20261009-034215-decision-judge-S-002-feb0: S-002 keeps the interim echo in the CLI name handler
- Status: auto
- Context: R-019's acceptance names only the Python name function. In S-002, tail holds only the slice row. T-003 calls name --kind verify and expects exit 0. A real CLI output now works for slice only and needs a fail path for every other kind. No OVERRIDE ADR covers this question.
- Options: (1) Keep the interim echo of ADR-20261009-024048 with the args nesting of ADR-20261009-024229; prove R-019 through the Python API only (T-016); S-004 (R-003) replaces the handler body for every kind. (2) Keep the handler unchanged; T-014 covers only the invalid-ref exit-2 path; the tail slices S-004 to S-006 replace the handler. (3) Keep the echo; T-003 stays unchanged; S-004 to S-006 replace the handler and add the CLI output tests.
- Decision: Option 1. S-002 does not change the CLI name handler. It keeps {ok, command, format, args} on success and exit 2 with one JSON error on bad input. S-002 proves R-019 through the Python name(fmt, kind, **parts) only, in T-016. T-003 to T-007 stay unchanged. The first slice that holds the CLI-facing tail acceptance, S-004 under R-003, replaces the handler body and prints the real name for every kind. Scores (fit x3, reversibility x2, simplicity x1): option 1 = 30, option 2 = 30, option 3 = 30. All three choose the same behavior. Option 1 wins the tie because it names the slice and requirement that replace the handler.
- Consequences / how to reverse: The change lives in one handler body in skills/sdlc/branches.py. No consumer, test or state file reads the echo. To print the real name earlier, call name(fmt, kind, **parts) in the handler, add a result field and one CLI test, and change T-003 to use --kind slice.
- Affects: S-002, R-019, R-017, R-001, R-020, R-071, S-004, R-003

### ADR-20261009-034229-decision-judge-S-002-b015: S-002 checks the name half of R-019, and S-007 closes the parse-back clause
- Status: auto
- Context: The R-019 acceptance says "Every name output parses back to the same kind and parts". S-002 owns name and split, but parse arrives in S-007. R-068, the name/parse round-trip test, sits in S-006, which also comes before parse. No OVERRIDE ADR covers this question.
- Options: (1) S-002 tests what it owns; R-019 stays in_progress and closes with the R-068 round-trip test. (2) S-002 closes R-019 with T-016 alone; the R-068 test carries the parse-back clause and gets the R-019 tag. (3) S-002 keeps T-016 and does not close R-019; R-019 moves to the S-007 requirements beside R-069; S-007 adds one parse-back probe per T-016 format and closes R-019.
- Decision: Option 3. S-002 keeps T-016 as planned: the literal sdlc/S-001 example, the strip half through split, and the check that {name:lower} lowercases only the tail. S-002 adds no parse stub. The integrator does not mark R-019 done at S-002. It sets R-019 to in_progress, keeps the S-002 tests as partial evidence, and writes the note "parse-back clause closes in S-007". The state-writer adds R-019 to the S-007 requirements beside R-069. S-007 adds one probe: for each T-016 format, parse(name(fmt, "slice", id="S-001")) gives kind slice and id S-001. S-007 then closes R-019. Scores (fit x3, reversibility x2, simplicity x1): option 3 = 29, option 1 = 23, option 2 = 19. Option 2 loses on fit: it claims parse-back evidence that no test ran. Option 1 ties closure to R-068 in S-006, but parse does not exist until S-007.
- Consequences / how to reverse: No product code, signature or test in S-002 changes. Each ledger claim stays true at each commit. Flag for the integrator and the state-writer: R-068 in S-006 also needs parse, so its round-trip test cannot pass before S-007. Move R-068 to S-007, or make S-007 a dependency of the R-068 check. To reverse, set R-019 to done at S-002 and remove it from S-007, or merge the probe into the R-068 round-trip test. Neither change touches skills/sdlc/branches.py.
- Affects: S-002, S-007, S-006, R-019, R-068, R-017, R-001, R-020, R-071

### ADR-20261009-041704-decision-judge-S-003-9e7b: S-003 reads tail("state") as "state-" plus 14 UTC digits
- Status: auto
- Context: The R-018 acceptance says tail("state") "is 14 digits". Spec section 1 gives the state tail as state-<UTC timestamp, %Y%m%d%H%M%S>. Spec section 2 says tail returns the tail from that table. Parse row 5 matches the tail with ^state-(\d{14})$. R-008 expects name --kind state to print sdlc/state- plus 14 digits. No OVERRIDE ADR covers this question.
- Options: (1) tail("state") matches ^state-\d{14}$; keep the plan; correct the R-018 acceptance text in the ledger. (2) The same behavior; keep the plan; change nothing in the TAILS table; optionally correct the R-018 text in requirements.json. (3) The same behavior; tail("state", ts=X) is "state-X"; keep the plan; T-020 checks the 14 digits after "state-" against UTC time; append a SPEC-PROPOSALS note for the R-018 text.
- Decision: Option 3. tail("state") returns "state-" plus 14 UTC digits in %Y%m%d%H%M%S order and matches ^state-\d{14}$. tail("state", ts=X) returns "state-X". Read the R-018 phrase "is 14 digits" as the timestamp part of the tail. The S-003 plan stays as written: T-019 asserts ^state-\d{14}$, and T-020 checks the 14 digits after "state-". No agent edits requirements.json for this ADR. A SPEC-PROPOSALS entry carries the text fix. Scores (fit x3, reversibility x2, simplicity x1): option 3 = 29, option 2 = 27, option 1 = 23. All three choose the same behavior. Options 1 and 2 lose on fit because the judge role must not edit requirements.json while other judges run.
- Consequences / how to reverse: The "state-" literal lives in one TAILS row in skills/sdlc/branches.py and in the T-019 and T-020 assertions. No config key, CLI flag or state format depends on the choice. To give a bare 14-digit tail, drop "state-" from that row, add it in name and in parse row 5, and change both assertions. That reverse breaks R-008 and the round-trip test R-068 unless name and parse change too.
- Affects: S-003, R-018, R-099, R-015, R-012, R-002, R-008, R-068

### ADR-20261009-041711-decision-judge-S-003-4882: S-003 adds only the state and e2e-area TAILS rows
- Status: auto
- Context: R-018 says tail gives "the tail from the table in section 1". ADR-20261009-034220-decision-judge-S-002-3cc6 gives the run, milestone, e2e, verify and attempt rows to S-004 to S-006. The S-003 plan adds only the rows that the R-018 acceptance names. The name CLI now builds a real name, so it exits 2 for the other kinds until those slices land. No OVERRIDE ADR covers this question.
- Options: (1) Add only the state and e2e-area rows; S-004 and S-005 add the other rows with the R-003 to R-010 tests; add no stub rows. (2) Add only the state and e2e-area rows, as the plan says; S-004 to S-006 keep the other rows; name exits 2 with one JSON error and no traceback for those kinds; T-003 changes --kind verify to --kind slice and keeps every assertion; the git-modes test adds --id S-001. (3) Add only the state and e2e-area rows; S-004 and S-005 own the other rows; T-019 to T-023 cover only the new rows; add no test that asserts another kind fails.
- Decision: Option 2. S-003 adds the state and e2e-area rows to TAILS in skills/sdlc/branches.py. The run, milestone, e2e, verify and attempt rows stay with S-004 to S-006, per ADR-20261009-034220. Until then, name for those kinds exits 2 with one JSON error, "no branch name is defined for kind", and no traceback. T-003 changes its call from --kind verify to --kind slice and keeps every assertion. The git-modes test adds --id S-001 to its name call. No S-003 test asserts that another kind fails. The integrator may mark R-018 done at S-003, because its acceptance names only the slice, state and e2e-area tails. Scores (fit x3, reversibility x2, simplicity x1): option 2 = 30, option 1 = 27, option 3 = 26. All three choose the same rows. Option 2 wins on fit: it matches the plan and the earlier ADR exactly, and it names the two existing test calls that the real name handler changes.
- Consequences / how to reverse: Each missing row is one entry in the TAILS table. Each later slice adds its row and tests, and no S-003 test changes. To reverse, add the five rows and their tests in S-003, move the R-003 to R-010 tests forward from S-004 to S-006, and let T-003 go back to --kind verify. No signature, CLI flag, output shape, config key or state format changes.
- Affects: S-003, R-018, S-004, S-005, S-006

### ADR-20261009-041713-decision-judge-S-003-c3ba: S-003 CLI name prints {ok, command, format, kind, branch}
- Status: auto
- Context: R-099 and R-015 need the CLI name command to print the real name in S-003. The spec says only that every command prints one JSON object. It does not name the fields of the name output. This slice ends the interim args echo, which ADR-20261009-034215-decision-judge-S-002-feb0 allows. No OVERRIDE ADR covers this question.
- Options: (1) The plan's object plus a tail field: {ok, command, format, kind, tail, branch}. (2) The plan's object exactly: {ok, command, format, kind, branch}, with no other field. (3) The same object with the key "name" in place of "branch", to match the preflight sample objects.
- Decision: Option 2. On success the CLI name command prints {"ok": true, "command": "name", "format": <resolved format>, "kind": <kind>, "branch": <built name>} and exits 0. It prints no args echo, no tail and no parts. Bad input and a missing part print {"ok": false, "error": <string>} and exit 2 with no traceback. T-022 asserts all five fields. T-003 changes to --kind slice --id S-001. The bare name --kind slice call in the git-modes test gets --id S-001. Scores (fit x3, reversibility x2, simplicity x1): option 2 = 27, option 3 = 26, option 1 = 23. Option 2 matches the plan and uses the spec's own word for a branch name: parse takes --branch, and state-schema keeps the slice branch under "branch". Option 3 loses on simplicity: it moves away from the plan for a key that only the per-sample preflight objects use. Option 1 loses on reversibility: a field added now is a field a later reader can depend on, and tail can be added later with no break.
- Consequences / how to reverse: The output is one dict in the name handler in skills/sdlc/branches.py. Only T-003, T-022 and the git-modes call read it now. Flag for later slices: spec line 157 captures name's stdout as RUN_BRANCH, and spec line 265 compares rt.I.branchName(tail) with branches.py name. These consumers must read the "branch" field of the JSON object. To rename "branch" to "name", change one key in the handler and the T-022 assertions. To add tail, add one key; no reader breaks. No Python API, CLI flag, config key or state format changes. This ADR moves the handler replacement from S-004 (ADR-20261009-034215-decision-judge-S-002-feb0) to S-003.
- Affects: S-003, R-099, R-015, R-018, R-012, R-002, S-004, R-003

### ADR-20261009-041833-decision-judge-S-003-7312: S-003 proves the load_format half of R-002, and S-027 closes the fresh-run config clause
- Status: auto
- Context: The R-002 acceptance has two clauses. Clause 1: load_format returns sdlc/{name} when config.json has no branchFormat. T-006 and the T-023 default cases in S-003 prove it. Clause 2: a fresh run records branchFormat "sdlc/{name}" in config.json. The env-detector.md config line proves it, and R-064 in S-027 owns that line. No OVERRIDE ADR covers this question.
- Options: (1) S-003 proves clause 1 only; R-002 goes to in_progress with the note "fresh-run config clause closes in S-027"; the state-writer adds R-002 to S-027 beside R-064; S-027 adds one env-detector check and closes R-002. (2) Move R-002 out of S-003 into S-027 as one membership change; R-002 stays todo until S-027, which closes it once and cites the S-003 tests for clause 1. (3) The same split as option 1, plus a separate auto ADR that records R-002 in two slices for the final audit.
- Decision: Option 1. The integrator does not mark R-002 done at S-003. It sets R-002 to in_progress, keeps T-006 and the T-023 default cases as partial evidence, and writes the note "fresh-run config clause closes in S-027". The state-writer adds R-002 to the S-027 requirements beside R-064. S-027 adds one check: env-detector with a null branchFormat input and no existing config.branchFormat writes branchFormat "sdlc/{name}" to config.json. S-027 then closes R-002 with R-064. This ADR is also the record that option 3 asks for: the final audit must treat R-002 in S-003 and S-027 as intended. Scores (fit x3, reversibility x2, simplicity x1): option 1 = 28, option 3 = 27, option 2 = 27. Option 1 repeats the R-019 pattern of ADR-20261009-034229-decision-judge-S-002-b015, so the ledger stays consistent. Option 2 is simpler, but it hides the clause-1 progress and breaks that pattern. Option 3 adds a second ADR step that this ADR already covers.
- Consequences / how to reverse: Only ledger state changes: the R-002 status and the S-027 requirements list. No product code or test in S-003 changes, and skills/sdlc/branches.py does not change. To reverse, set R-002 to done at S-003 and remove it from S-027. To move R-002 fully to S-027, remove it from S-003; the clause-1 tests stay valid in both cases.
- Affects: S-003, S-027, R-002, R-064, R-018, R-099, R-015, R-012

### ADR-20261009-045048-decision-judge-S-004-7815: S-004 tail rows check only for a missing or empty part
- Status: auto
- Context: Spec section 1 gives only the tail shapes for the run, milestone and e2e rows. Spec section 2 gives tail one failure contract: "A missing part is a Fail." Parse rows 1-3 match only run-\d+ and M-\d+. The plan checks nothing beyond a missing or empty part, like the slice row (ADR-20261009-034220). No OVERRIDE ADR covers this question.
- Options: (1) Check only for a missing or empty part; tail("milestone", id="X-9") gives "X-9" and tail("run", n=-1) gives "run--1"; add no test that pins a malformed id or a negative n; S-007 proves the round trip with real ledger ids. (2) The same behavior; the TAILS table gets one builder per row, and each row lists its required parts. (3) The same behavior; also record in the ADR that name does not round-trip through parse for a non-M id or a negative n.
- Decision: Option 1. The run, milestone and e2e rows in TAILS in skills/sdlc/branches.py build the tail from the given part. They raise Fail only for a missing or empty part. They add no regex and no sign check. No S-004 test asserts that a non-M id or a negative n passes or fails. Scores (fit x3, reversibility x2, simplicity x1): option 1 = 30, option 3 = 29, option 2 = 27. All three choose the same behavior. Option 1 matches the plan and the spec's single Fail contract with the least extra text. Option 3 adds a gap note; this ADR carries that note below, so a separate step is not necessary. Option 2 adds a structure claim about the table that the question does not need.
- Consequences / how to reverse: Known gap: name does not round-trip through parse for a milestone or e2e id that is not M-<n>, or for a negative run n. The loop passes only ledger ids and run counters from 1, so this gap does not occur in practice. S-007 and the R-068 round-trip test use real ids only. To reverse, add re.fullmatch(r"M-\d+", id) to the milestone and e2e rows and n >= 0 to the run row, raise the existing Fail, and add one Fail test per row. No existing test, signature, CLI flag, output shape, config key or state format changes.
- Affects: S-004, R-003, R-004, R-005, R-006, R-007, S-007

### ADR-20261009-053051-decision-judge-S-005-d5e2: Integrator clean-up step 1 finds verify branches through branches.py list --kind verify
- Status: auto
- Context: Integrator Clean up step 1 sweeps the sdlc/<id>-v* and attempt globs in one sentence. The spec section 8 table names only the attempt glob for integrator.md. The S-005 plan moves both globs to branches.py list, so no sdlc/ glob stays in steps 1 to 3. No OVERRIDE ADR covers this question.
- Options: (1) List both kinds through the module and keep the plan; the ADR says the table omits the verify glob by oversight. (2) List verify beside attempt with the same id filter; keep the verify sweep and keep no sdlc/<id>-v* glob. (3) List both kinds as the plan says; keep the same behavior; read the section 8 table row as incomplete, not as a limit on what the integrator may sweep.
- Decision: Option 3. Clean up step 1 runs python3 "<skill>/branches.py" list --repo . --kind verify and --kind attempt. It keeps the entries whose id is <id> and deletes each one that its owner did not delete. No sdlc/ glob stays in steps 1 to 3. The T-R-093 prompts test asserts --kind verify. Scores (fit x3, reversibility x2, simplicity x1): option 3 = 30, option 1 = 29, option 2 = 29. All three choose the same behavior. Option 3 fits best: section 8 says every prompt that spells a branch uses the placeholder, and the spec prompts test bans every sdlc/ literal. A kept verify glob would fail that test later. Section 7 already sweeps verify branches through parse in janitor.py.
- Consequences / how to reverse: Under the default sdlc/{name} format, step 1 deletes the same branches as before. Under a custom branchFormat, step 1 now finds stale verify branches. To reverse, restore the sdlc/<id>-v* glob text in integrator.md and drop the --kind verify assertion in T-R-093. janitor.py still sweeps verify branches after a reversal. No script, CLI flag, config key or state format changes.
- Affects: S-005, R-008, R-009, R-010, R-119, R-093

### ADR-20261009-053055-decision-judge-S-005-f41b: branches.py list prints each entry as the parse dict plus "branch", under "branches"
- Status: auto
- Context: Spec section 2 says list_kind returns every branch "with its parts". It does not give the JSON shape of the CLI list output. The S-005 integrator prompt keeps "the entries whose `id` is `<id>`" for the R-093 attempt clean up. S-010 builds the list handler. No OVERRIDE ADR covers this question.
- Options: (1) {ok, kind, format, branches: [entry]}; each entry is the parse dict plus "name", the full branch name. (2) {ok, command: "list", format, kind, branches: [entry]}; each entry is {"branch": name, **parse(fmt, name)}. (3) {ok, command, format, entries: [entry]}; each entry is the parse dict plus "branch".
- Decision: Option 2. On success the CLI list command prints {"ok": true, "command": "list", "format": <resolved format>, "kind": <kind>, "branches": [entry, ...]} and exits 0. Each entry is {"branch": <full local branch name>, **parse(fmt, name)}: kind, tail, id, n, area, round, profile, part, ts and known. A part that does not apply keeps the value that parse gives it. The order follows spec section 2: by n for run and attempt, by name otherwise. The parsed slice id is in "id". The integrator keeps the entries whose id is <id> (and <parent> for a split slice) and deletes each entry's "branch". S-005 keeps its prompt text. S-010 must keep the keys "branches", "branch" and "id", and a test must pin them. Scores (fit x3, reversibility x2, simplicity x1): option 2 = 28, option 3 = 24, option 1 = 21. Option 2 matches the cmd_name envelope and its "branch" key (ADR-20261009-041713-decision-judge-S-003-c3ba), and uses the "branches" key that ADR-20261009-024048-decision-judge-S-001-eb2f names as a final output field. Option 3 loses on fit: "entries" is a second name for the field that ADR-024048 calls "branches". Option 1 loses on fit: it drops "command" and uses "name" where cmd_name uses "branch".
- Consequences / how to reverse: The shape lives in the list handler in skills/sdlc/branches.py, which S-010 builds. Readers today: the S-005 Clean up text in integrator.md and the T-R-093 regex. Later readers (the driver and the env-detector) read "n". To rename a key, change the handler, its test, one sentence in integrator.md and the T-R-093 regex. No config key, CLI flag or state format depends on the choice. The parse output does not change.
- Affects: S-005, R-008, R-009, R-010, R-119, R-093, S-010, R-025, R-094

### ADR-20261009-053059-decision-judge-S-005-23a9: Move R-093 from S-005 to S-027
- Status: auto
- Context: R-093 needs the integrator to find attempt branches through branches.py list --kind attempt, filtered to the slice, under a custom format too. S-010 implements list, and S-005 does not depend on S-010. In S-005, list prints no entries. The S-005 plan changes the integrator Clean up steps now and tests only the prompt text. The running loop reads the installed 0.4.2 prompts, so this run is safe with every option. No OVERRIDE ADR covers this question.
- Options: (1) Move R-093 to a slice that depends on S-010, such as S-010 or the slice that owns the attempt sort; test the prompt text and run list --kind attempt on a fixture. (2) Keep R-093 in S-005; change the integrator Clean up steps 1 to 3 now; test only the prompt text. (3) Move R-093 to S-027, which rewrites the integrator.md branch text per the spec section 4 table and depends on S-010 through S-026; S-005 keeps R-008, R-009, R-010 and R-119.
- Decision: Option 3. The state-writer moves R-093 from the S-005 requirements to the S-027 requirements. S-005 keeps R-008, R-009, R-010 and R-119: the verify and attempt TAILS rows and their tests. Drop plan step 4 and the T-R-093 prompts test change from the S-005 plan. Do not change integrator.md or its literal test in S-005. S-027 rewrites the integrator Clean up steps once, with list --kind attempt and list --kind verify. S-027 tests the prompt text and runs list --kind attempt on a fixture with attempt branches of two slices under a custom format. Scores (fit x3, reversibility x2, simplicity x1): option 3 = 29, option 1 = 25, option 2 = 19. Option 3 wins on fit: S-027 already owns the integrator.md branch text, so the file changes once and the behavioral acceptance can be proved. Option 1 is less precise: S-010 owns list, not prompt text, so the integrator rewrite would split from the prompt sweep. Option 2 loses on fit: a text-only test cannot prove the behavioral acceptance, and the default branch would carry a prompt that calls a command with no entries.
- Consequences / how to reverse: Only ledger state changes: the S-005 and S-027 requirements lists and the S-005 plan. No product code, prompt or test changes in S-005. The integrator.md attempt-branch text stays literal until S-027. To reverse, move R-093 back to S-005 and restore plan step 4 and the T-R-093 test. No commit needs a revert.
- Affects: S-005, S-027, R-093, R-008, R-009, R-010, R-119

### ADR-20261009-062918-decision-judge-S-005-7fbd: Apply the R-093 move from S-005 to S-027 in the ledger now
- Status: auto
- Context: ADR-20261009-053059-decision-judge-S-005-23a9 moves R-093 from S-005 to S-027. The S-005 plan follows that ADR and has no R-093 test. The ledger does not agree: slices.json lists R-093 under S-005 and not under S-027, and requirements.json has R-093 as in_progress. If the ledger stays as it is, the integrator finds R-093 with no evidence when it closes S-005. No OVERRIDE ADR covers this question.
- Options: (1) The state-writer moves R-093 now: remove it from the S-005 requirements, append it to the S-027 requirements, set R-093 to todo, add ADR-20261009-053059-decision-judge-S-005-23a9 to its adrs, keep evidence empty; change no S-005 code, test, plan or integrator.md. (2) The state-writer moves R-093 between the two requirements lists in slices.json only; change no code, prompt, test or plan. (3) The state-writer moves R-093 now: remove it from the S-005 requirements, append it to the S-027 requirements, set R-093 to todo because S-027 is todo, add ADR-20261009-053059-decision-judge-S-005-23a9 to its adrs; change no code, prompt or test; S-005 closes with R-008, R-009, R-010 and R-119.
- Decision: Option 3. Before the S-005 gate and integration, the state-writer removes R-093 from the S-005 requirements in slices.json and appends it to the S-027 requirements. It sets R-093 status to todo in requirements.json, adds ADR-20261009-053059-decision-judge-S-005-23a9 to the R-093 adrs list, and keeps the R-093 evidence empty. It changes no code, prompt, test, plan or integrator.md. Scores (fit x3, reversibility x2, simplicity x1): option 1 = 29, option 3 = 29, option 2 = 27. Options 1 and 3 are the same change; option 3 states why the status goes back to todo, so it wins the tie. Option 2 loses on fit: it leaves R-093 in_progress under a slice with status todo, and that state is not consistent.
- Consequences / how to reverse: Only ledger state changes: two requirements lists in slices.json and the R-093 record in requirements.json. S-005 closes with R-008, R-009, R-010 and R-119. S-027 plans and proves R-093. To reverse, move R-093 back to the S-005 requirements, set it to in_progress, and restore plan step 4 and the T-R-093 test. No commit needs a revert.
- Affects: S-005, S-027, R-093, R-008, R-009, R-010, R-119

### ADR-20261009-062930-decision-judge-S-005-388e: R-119 source check has a written scope; seed forms S1 to S5 never refute it
- Status: auto
- Context: Escalation step 1 for S-005. Three fix rounds failed, because each round the verifiers found a new push spelling. The R-119 acceptance says only "a source check over sdlc-loop.js and the skill scripts". It sets no bound on the forms that the check must catch. The product holds the "Pushed in: never" claim today; the defect is in the test. No OVERRIDE ADR covers this question.
- Options: (1) Bind R-119 to the plan's "R-119 scope" section. Write an exact refutation rule: a literal form in a scanned file, inside the covered scope, that leaves push_guard.py output equal to the pins. S1 to S5 are seeds. A new unlisted form is covered when it is a process or network call in a scanned file; any other new form is a seed. (2) Adopt the plan's scope without change; refute only with a form from the covered list; S1 to S5 are seeds; add no scanner parts. (3) Adopt the plan's scope; S1 to S5 are seeds in a seeds section; name one widening path through a later ADR or OVERRIDE and a new T-R-119e mutant; close R-119 with a note that S1 to S5 stay open.
- Decision: Option 1. The covered scope of R-119 is: every process, network and dynamic-code site in the scanned scripts; constant-folded wrapper verbs; opaque verbs; pinned push calls; the identifier ban in sdlc-loop.js; and the pinned list of scanned files. A verifier refutes R-119 only with a literal form in a scanned file that is inside the covered scope and that leaves push_guard.py output equal to the pins. A new form in neither list is covered when it is a process or network call in a scanned file. Any other new form is a seed. Seeds S1 (data flow into a reviewed push site), S2 (git config, alias or env state), S3 (attribute walks to a loader), S4 (agent prompts, owned by S-027) and S5 (files outside the scanned set) are never refutations. The verifier records each seed in its report. Keep every mutant from rounds 0 to 2 in T-R-119e. Write the scope in tests.md. Scores (fit x3, reversibility x2, simplicity x1): option 1 = 28, option 3 = 25, option 2 = 27. Option 1 fits best: its unlisted-form rule closes the race of new spellings and still treats any new process or network call as a defect. Options 2 and 3 leave an unlisted new spelling without a rule, so the next round can reopen the same dispute.
- Consequences / how to reverse: No product code, signature, CLI flag, config key or state format changes. The scope lives in the S-005 plan, tests.md and this ADR. S1 to S5 stay open seeds; a static source check cannot decide them. To widen the scope, a human appends an OVERRIDE ADR that names a seed. Then add that form as a T-R-119e mutant, extend push_guard.py, and set R-119 back to in_progress until the mutant fails the guard. A behavior test against a local bare remote and a fake gh stays available for S1 and S2.
- Affects: S-005, R-119, R-008, R-009, R-010, S-027

### ADR-20261009-063408-decision-judge-S-005-368d: Every gh api or glab api call with a graphql path is a forge violation for R-119
- Status: auto
- Context: gh api graphql can run a query or a mutation. A mutation such as createPullRequest is a forge write. The S-005 plan treats every graphql path as a violation, because the spec reads forge rules only through REST: rules/branches/<sample> on GitHub and push_rule on GitLab. The question is whether a graphql query must stay allowed. No OVERRIDE ADR covers this question.
- Options: (1) Ban every graphql path; keep the plan rule and the -F query=@q mutant; a later graphql read needs an ADR that names the call site and the fixed query text, adds a pin, and keeps the general ban. (2) Ban every graphql path without a check of query or mutation; add no GraphQL parser; keep the mutant run(repo, "gh", "api", "graphql", "-F", "query=@q") in T-R-119e; add one bare mutant, gh api graphql with no flags; a later graphql read needs an ADR that lifts the ban for one pinned site. (3) Ban every graphql path whatever the query text, method or fields; keep the plan rule and the mutant; a later ADR can narrow the rule, for example to a constant query with no "mutation" keyword.
- Decision: Option 2. push_guard.py counts every gh api or glab api call whose constant path holds "graphql" as a forge violation. It does not read the query text. Keep the -F query=@q mutant in T-R-119e and add the bare gh api graphql mutant. Write in the R-119 scope that a later graphql read needs an ADR that lifts the ban for one pinned (file, function) site and adds a query-only test case. Scores (fit x3, reversibility x2, simplicity x1): option 2 = 29, option 1 = 27, option 3 = 27. All three keep the same ban. Option 2 wins on reversibility: its bare mutant proves that the path token alone fails the guard, and its lift path is one exception for one pinned site. Option 1 costs more to reverse, because it binds the later ADR to extra conditions. Option 3 loses on fit: its example narrowing reads the query text, and a mutation can hide from that check through -F query=@file.
- Consequences / how to reverse: Only the test scanner (push_guard.py), the S-005 plan "R-119 scope" section, tests.md and T-R-119e change. No product code calls graphql today, so no product behavior, CLI flag, config key or state format changes. The rule fits the covered scope of ADR-20261009-062930-decision-judge-S-005-388e: a network call in a scanned file. To reverse, a later ADR removes "graphql" from the banned path parts or adds an exception for one pinned site, and adds a query-only test case. Keep the mutation mutants in T-R-119e after a reversal.
- Affects: S-005, R-119, R-008, R-009, R-010

### ADR-20261009-085138-implementer-S-005b-c3a1: TC-cli-13 asserts that the guard flags a pushing wrapper mutant
- Status: auto
- Context: TC-cli-13 in the S-005b cli-0 verifier tests loads a mutated state-write.py whose git wrapper pushes a verify branch. It asserted both that push_guard.py reports no breach and that the bare remote stays clean. The mutant pushes, so no fix can make both hold. The R-119 acceptance says "a verify branch stays local". ADR-20261009-062930-decision-judge-S-005-388e says the check must not leave the output equal to the pins for such a form.
- Options: (1) Leave the test as written; it can never pass. (2) Assert that the guard flags the tree or the remote stays clean.
- Decision: Option 2. The test now asserts that breaches(guardOut) is not empty, or that the remote has no verify ref. The fixed push_guard.py flags the mutant through the pushes and wrapperVerbs pins.
- Consequences / how to reverse: Only the verifier test file changes. No product code changes. To reverse, restore the two original assertions.
- Affects: S-005b, R-119

### ADR-20261009-120000-implementer-S-005b-5e7d: Seed probes TC-cli-24 and TC-cli-25 accept a guard that closes the seed
- Status: auto
- Context: TC-cli-24 and TC-cli-25 in the S-005b r1 cli-0 file push-guard.verify-cli.test.mjs assert that seed S1 forms leave every guard key equal. Fix round 2 pins the text of each non-constant argument of a wrapper call in `wrapperVerbs`. The S1 probe forms now change `wrapperVerbs`. ADR-20261009-062930-decision-judge-S-005-388e says seeds never refute R-119. It does not require the guard to miss a seed.
- Options: (1) Keep the probes; they fail on a stricter guard. (2) Let each probe accept the seed open or closed.
- Decision: Option 2. TC-cli-24 now asserts that only the two seed cases can push with every key equal. TC-cli-25 accepts an open or a closed seed for the variable option and keeps the `wrapperVerbs` check for the f-string option.
- Consequences / how to reverse: Only the verifier test file changes. No product code changes. To reverse, restore the two original assertions.
- Affects: S-005b, R-119

### ADR-20261009-152830-decision-judge-S-005b-2d39: Pin the wrapper bodies; remove forwarded-token logic (S-005b)
- Status: auto
- Context: Three fix rounds and a spike show that reading data flow inside the five pinned wrapper bodies leaves a new gap each round. No OVERRIDE ADR covers this question.
- Options: (1) Pin the token text of the five wrapper bodies in a wrapperBodies key, remove forwarded-token logic, add the seven spike mutants and TC-cli-18 to TC-cli-20, add an R-119 scope line, and write a fresh verify plan. (2) The same pin, described as the code change only: skip calls inside a body. (3) Pin every function that holds a process, network or dynamic-code site in a callSiteBodies key.
- Decision: Option 1. Options 1 and 2 are one design; option 1 also names the tests.md line and the fresh plan. The spike showed 7 of 7 mutants caught, the clean tree unchanged and 95 of 95 mutant rows still caught. Option 3 pins more code, so each ordinary edit needs a pin update, and it has no spike evidence. Scores (fit x3, reversibility x2, simplicity x1): option 1 = 14+10+5 = 29, option 3 = 12+8+3 = 23. 
- Consequences / how to reverse: Only push_guard.py, push-guard.test.mjs and a tests.md line change. Data flow from a caller into a pinned site stays seed S1 under ADR-20261009-062930-decision-judge-S-005-388e. To reverse, revert the commit or replace the pin with a stricter scanner.
- Affects: S-005b, R-119

### ADR-20261009-164238-decision-judge-S-006-a3a8: R-068 stays in S-006 as in_progress; S-007 adds the parse assertion and closes it
- Status: auto
- Context: R-068 requires name and parse to round-trip every kind. Parse arrives in S-007, which depends on S-006. The S-006 tests can prove only the name and split half. No OVERRIDE ADR covers this question.
- Options: (1) Keep R-068 in S-006 as partial evidence. The integrator sets in_progress with the note "parse half closes in S-007". The state-writer adds R-068 to S-007. S-007 adds the parse assertion to the same round-trip test and closes R-068. (2) The same plan, worded as a repeat of ADR-20261009-034229 for R-019. (3) The same plan, with no parse stub in S-006. A fourth path, to move R-068 to S-007 only, was also considered.
- Decision: Option 1. The three proposals describe one design; option 1 names the note text, the ledger edits and the closing slice. S-006 adds no parse stub and never marks R-068 done. S-007 closes R-068 only after the parse assertion runs. Scores (fit x3, reversibility x2, simplicity x1): option 1 = 15+10+4 = 29. Moving R-068 to S-007 only = 12+10+5 = 27, because it hides the S-006 evidence and breaks the R-019 precedent.
- Consequences / how to reverse: Only the R-068 status and the S-007 requirements list change. No product code, test or signature changes. To reverse, remove R-068 from S-006 and keep it only in S-007. The S-006 tests stay valid in both cases.
- Affects: S-006, S-007, R-068, R-019, R-002

### ADR-20261009-164239-decision-judge-S-006-ec63: Scan by kind name and -e2e- tail satisfies R-120 for S-006
- Status: auto
- Context: R-120 asks for a source check by parsed kind e2e-area. The parse function does not exist yet. The S-005b push guard is parked. No OVERRIDE ADR covers this question.
- Options: (1) Scan by kind name and -e2e- tail with a planted-violation test; record that S-009 and S-021 to S-024 must tighten it to the parsed kind. (2) The same scan, with no record of the later tightening. (3) The same scan; record the later tightening in the plan.
- Decision: Option 1. The scan checks the push and pull-request sites in sdlc-loop.js and the skill scripts for the e2e-area kind name and the -e2e- tail. Keep the planted-violation test T-R-120b so the scan can fail. Record in the slice notes that S-009 and S-021 to S-024 must tighten the scan to the parsed kind. Scores (fit x3, reversibility x2, simplicity x1): option 1 = 15+10+4 = 29, option 3 = 15+10+4 = 29, option 2 = 12+10+5 = 27. Option 1 wins the tie because the slice notes are where the next slices look first. Known gap: a branch built through a variable that the scan cannot read passes.
- Consequences / how to reverse: Only one helper and its tests in branches.test.mjs change. No product code changes. To reverse, replace the name match with a parse call once parse exists. Keep the planted-violation test.
- Affects: S-006, R-120

### ADR-20261009-164239-decision-judge-S-006-db35: Build S-006 on main without S-005b; the dependency is soft
- Status: auto
- Context: S-006 dependsOn S-005b, which is parked after failed fix rounds. The S-006 plan branches from origin/main, which holds S-005a. The plan does not use push_guard.py. No OVERRIDE ADR covers this question.
- Options: (1) Build S-006 on main with S-005a only; treat the S-005b link as soft; record that R-120 does not use the push guard. (2) The same build, described as a tests-only slice; seed gaps in R-120 stay in the plan Risks. (3) Build on main now, keep the dependsOn link, and add a note that the push guard may tighten R-120 later.
- Decision: Option 1. The plan needs only name, split and the eight TAILS rows, which S-002 to S-005a supply. Its R-120 check is a source scan that does not call push_guard.py. S-005b guards R-119, a different requirement. Scores (fit x3, reversibility x2, simplicity x1): option 1 = 15+10+5 = 30, option 2 = 30, option 3 = 15+10+3 = 28. Options 1 and 2 are one design; option 1 wins the tie. Option 3 keeps a dependency link that no longer blocks anything and so misleads the scheduler.
- Consequences / how to reverse: Only tests in branches.test.mjs change. No product code, flag or state format changes. If S-005b lands later, a follow-up can add a push-guard cross-check to R-120. To reverse, restore the dependency note and rebase onto S-005b.
- Affects: S-006, R-011, R-068, R-120, S-005b

### ADR-20261009-170811-decision-judge-S-007-275e: known value for a kind with no id part
- Status: auto
- Context: The spec defines known only for an id. A run or state branch has no id part. The plan sets known to None for these kinds. No OVERRIDE ADR covers this question.
- Options: (1) Return None for run and state, even when ids is given; keep the plan. (2) The same rule, worded as "do not use false". (3) The same rule, worded as "keep the plan's rule". All three proposals describe one design.
- Decision: Option 1. Scores (fit x3, reversibility x2, simplicity x1): option 1 = 15+10+5 = 30, option 2 = 30, option 3 = 30. The options are one design; option 1 wins the tie. None means "not applicable". False would claim a failed lookup. True would claim a match that never happened.
- Consequences / how to reverse: The rule is one branch in parse and one test assertion. To change it to False, edit that line and that test. Only callers that read known on run or state branches notice.
- Affects: S-007, R-021, R-022, R-023, R-024, R-069

### ADR-20261009-170812-decision-judge-S-007-35cd: Under lower, parse resolves every id kind through ids, milestones included
- Status: auto
- Context: The spec says ids are ledger ids and parse replaces id with the ledger spelling. The question is whether milestone ids take the same step. No OVERRIDE ADR covers this question.
- Options: (1) Resolve every parsed id through ids, milestone kinds included. (2) The same rule, worded as one case-insensitive lookup that sets known. (3) The same rule, listing all six id kinds, with no milestone special case.
- Decision: Option 1. The three proposals describe one design. The spec has no kind exception, and a lowercased sdlc/m-1 must give M-1 to match the ledger. Scores (fit x3, reversibility x2, simplicity x1): option 1 = 15+10+5 = 30, option 2 = 30, option 3 = 30. Option 1 wins the tie because it names the milestone kinds and the known flag. R-068 needs the uniform rule for the round trip.
- Consequences / how to reverse: One lookup step inside parse changes. To limit it to slice kinds, add a kind check there and update the milestone tests. No signature or stored state changes.
- Affects: S-007, R-068

### ADR-20261009-170814-decision-judge-S-007-5aab: parse prints one flat JSON object with kind null for a foreign branch
- Status: auto
- Context: The spec says parse prints its kind and ids, or null. The spec also says every command prints one JSON object. The plan prints the keys flat. No OVERRIDE ADR covers this question.
- Options: (1) Flat object {ok, command, format, branch, kind, ...parts}; kind is null and no part keys for a foreign branch. (2) The same shape, with the part keys named: id, n, area, round, profile, part, ts, tail, known. (3) The same shape, with the same part keys added only when kind is not null.
- Decision: Option 2. The three proposals describe one design; option 2 names the part keys. Print exit 0 for a foreign branch. Python parse() still returns None. Scores (fit x3, reversibility x2, simplicity x1): option 2 = 15+10+5 = 30, option 1 = 15+10+5 = 30, option 3 = 15+10+4 = 29. Option 2 wins the tie because it lists the keys that tests read.
- Consequences / how to reverse: Only cmd_parse in skills/sdlc/branches.py and its tests change. Later slices S-018 and S-021 to S-024 read kind from the flat keys. To reverse, nest the parts or print a bare null in that one handler.
- Affects: S-007, R-068

### ADR-20261009-171409-implementer-S-007-f520: parse matches the literal prefix and suffix without case under {name:lower}
- Status: auto
- Context: The spec testing section and T-R-024a parse `feature/proj-1-s-001` under `feature/PROJ-1-{name:lower}`. The prefix there has capitals, so an exact prefix test gives null.
- Options: Exact prefix and suffix test; case-insensitive test under lower.
- Decision: Under `{name:lower}`, compare the prefix and suffix without case. Other formats compare exactly.
- Consequences / how to reverse: Restore the exact startswith and endswith test and change the spec example.
- Affects: R-021, R-024, R-069, S-007

### ADR-20261009-173303-decision-judge-S-008-a88a: parse keeps the e2e-area tail as is and does not reject a slash
- Status: auto
- Context: Spec section 2 row 4 uses (.+), which matches a slash. R-105 and the edge-case list say areas never contain a slash. The spec gives no check. No OVERRIDE ADR covers this question.
- Options: (1) Add no slash check; keep the S-007 behavior; add no test. (2) The same rule, worded as "do not reject". (3) The same rule, with the note that e2e-area branches are never pushed. All three proposals describe one design.
- Decision: Option 1. Scores (fit x3, reversibility x2, simplicity x1): option 1 = 15+10+5 = 30, option 2 = 30, option 3 = 30. Option 1 wins the tie. The edge-case line states a fact about inputs, not a rule for parse. A reject rule would add behavior the spec does not describe.
- Consequences / how to reverse: To reject a slash, add one guard after the row 4 match in parse and one test. No stored data depends on the current behavior.
- Affects: S-008, R-105

### ADR-20261009-182641-decision-judge-S-010-e3f4: list fails on a non-git repo and gives an empty list for a repo with no commits
- Status: auto
- Context: The spec is silent on list in a directory that is not a git repository. Spec section 2 says every command exits 2 with a JSON error on bad input. No OVERRIDE ADR covers this question.
- Options: (1) Fail with exit 2 and "not a git repository: <repo>"; detect it with rev-parse --git-dir; a repo with no commits gives "branches": [] and exit 0. (2) The same rule, taken from the for-each-ref failure through the shared Fail path. (3) The same rule, worded for branches.py list through Fail.
- Decision: Option 1. The three proposals describe one design. Scores (fit x3, reversibility x2, simplicity x1): option 1 = 15+10+4 = 29, option 2 = 15+10+5 = 30, option 3 = 15+10+4 = 29. Option 1 is chosen because it names the error text and detects the case from git, not from empty output. A wrong --repo must not look like "no branches".
- Consequences / how to reverse: One check in the list handler and one test. To return an empty list, delete the check and flip the test. No config key, flag or state format depends on it.
- Affects: S-010

### ADR-20261009-182645-decision-judge-S-010-bd10: list prints {ok, command, format, kind, branches} with parse-shaped entries plus branch
- Status: auto
- Context: The spec says every command prints one JSON object. It does not name the fields of the list output. S-018 and S-027 read branches[].branch and branches[].id. No OVERRIDE ADR covers this question.
- Options: (1) Entries use the parse result plus branch, known is null, order follows list_kind (by n for run and attempt, else by name). (2) The same, but sort by name only and echo kind or null. (3) Omit known; also define the error output.
- Decision: Option 1. Scores (fit x3, reversibility x2, simplicity x1): option 1 = 15+10+5 = 30, option 2 = 13+10+5 = 28 (name-only order ignores list_kind), option 3 = 14+10+4 = 28 (a varying key set makes entries differ from parse). Option 1 keeps list and parse entries in one shape. Bad input follows the shared error rule: ok false and exit 2.
- Consequences / how to reverse: The shape lives in one handler in skills/sdlc/branches.py and its test. Adding a key breaks no reader. To rename a key, change that line, its test and the S-018 and S-027 reads.
- Affects: S-010

### ADR-20261009-182640-decision-judge-S-010-7c1e: list_kind breaks equal-n ties by full branch name, ascending
- Status: auto
- Context: The spec says list_kind sorts run and attempt branches by n, and gives no order for equal n. Attempts of different slices can share n. The plan breaks ties by branch name. No OVERRIDE ADR covers this question.
- Options: (1) Sort by n, then full branch name ascending. (2) The sort key (n, branch name) for run and attempt, other kinds sorted by name alone. (3) Sort by n, then full branch name ascending, as a secondary key only.
- Decision: Option 1. The three proposals describe one design: the key (n, branch name), ascending. Scores (fit x3, reversibility x2, simplicity x1): option 1 = 15+10+5 = 30, option 2 = 30, option 3 = 30. Option 1 wins the tie because it states the rule without extra claims about other kinds or git ref order. Other kinds keep their existing order.
- Consequences / how to reverse: One sort key in list_kind and one test change. No stored data or CLI output format depends on the tie order.
- Affects: S-010, R-025, R-094

### ADR-20261009-191759-decision-judge-S-011-6e23: evaluate returns None with a note for a rule of unknown kind
- Status: auto
- Context: The spec defines only the four rule kinds. The plan returns None for any other kind. make_rule rejects such a kind earlier. No OVERRIDE ADR covers this question.
- Options: (1) Return None; the sample is unevaluated with the note "cannot evaluate <label>: unknown kind <kind>"; do not raise. (2) Return None with no note and no validation branch. (3) Return None as the plan says; do not raise and do not return False.
- Decision: Option 1. The three proposals share one result: None, no raise, no False. Scores (fit x3, reversibility x2, simplicity x1): option 1 = 15+10+4 = 29, option 2 = 14+10+5 = 29, option 3 = 14+10+5 = 29. Option 1 wins the tie because it matches the invalid-regex handling and tells the user why the sample is unevaluated. An unreadable rule must not block a launch.
- Consequences / how to reverse: One fallback branch in evaluate and one test. To raise or to return another result, edit that branch and flip the test. No stored data or caller depends on it.
- Affects: S-011

### ADR-20261009-191800-decision-judge-S-011-b582: S-012 builds the "cannot evaluate" note; S-011 adds regex_error and evaluate stays pure
- Status: auto
- Context: The spec says a pattern that re.compile rejects gives None and the sample is unevaluated with a note. It does not say which function writes the note. evaluate returns only True, False or None. No OVERRIDE ADR covers this question.
- Options: (1) S-012 builds "cannot evaluate <label>: <re.error>" when the verdict is None; the helper regex_error(pattern) gives the error text or None. (2) The same rule, taken from the S-011 plan. (3) The same rule, with the note that only S-012 knows the label.
- Decision: Option 1. The three proposals describe one design. Scores (fit x3, reversibility x2, simplicity x1): option 1 = 15+10+5 = 30, option 2 = 30, option 3 = 30. Option 1 wins the tie. It states the owner of the note text and the source of the error text with no extra claims.
- Consequences / how to reverse: S-011 adds evaluate and regex_error only. To make evaluate return the note, change its return shape, drop the helper and update one S-012 call site. No stored data depends on this.
- Affects: S-011, S-012, R-072, R-035

### ADR-20261009-191805-decision-judge-S-011-6a5c: R-026 rule shape is enforced at one choke point, make_rule
- Status: auto
- Context: R-026 says every rule from read_rules has exactly five keys. read_rules does not exist until S-013 and S-014, so S-011 cannot test it. No OVERRIDE ADR covers this question.
- Options: (1) make_rule with RULE_KEYS, RULE_SOURCES and RULE_KINDS in S-011; S-013 and S-014 must build every rule through make_rule and test read_rules output against RULE_KEYS. (2) make_rule only, with no stated rule for callers. (3) make_rule as planned, with the caller rule stated in the slice and no validator.
- Decision: Option 1. Scores (fit x3, reversibility x2, simplicity x1): option 1 = 15+10+4 = 29, option 2 = 13+10+5 = 28, option 3 = 14+10+5 = 29. Option 1 wins the tie because it forbids hand-built rule dicts and so makes the shape true for GitHub and GitLab rules alike. It also names the read_rules check that closes R-026.
- Consequences / how to reverse: One function and three constants in branches.py, plus T-R-026a and T-R-026b. To move the check into read_rules, add a validation pass there and keep or delete make_rule. No stored data or CLI output depends on it.
- Affects: S-011, R-026

### ADR-20261009-191845-decision-judge-S-011-8da6: S-012 writes the "cannot evaluate" note; evaluate returns None for an unknown kind
- Status: auto
- Context: The question asks which function writes the note and what evaluate returns for an unknown kind. ADRs 6e23 and b582 settle it. No OVERRIDE ADR covers this question.
- Options: (1) Follow both ADRs. S-012 builds the note when the verdict is None. S-011 adds evaluate and regex_error(pattern). evaluate returns None for an unknown kind and does not raise. (2) The same rule, stated as the least code in S-011. (3) The same rule, with the note that make_rule rejects unknown kinds earlier.
- Decision: Option 1. The three proposals describe one design. Scores (fit x3, reversibility x2, simplicity x1): option 1 = 15+10+5 = 30, option 2 = 30, option 3 = 30. Option 1 wins the tie. It names the owner of the note, the helper and the unknown-kind result in full. Where ADR 6e23 says evaluate returns the note, ADR b582 and this ADR place the note text in S-012.
- Consequences / how to reverse: One fallback branch in evaluate, one regex_error helper and one test. To move the note into evaluate, change its return shape, drop the helper and update one S-012 call site. No stored data depends on it.
- Affects: S-011, S-012, R-072, R-035

### ADR-20261010-r026-open: R-026 stays open after S-011 until S-013 and S-014 test read_rules
- Status: auto
- Context: R-026 requires that every rule read_rules returns has exactly five keys, a valid kind and a valid source. read_rules does not exist in S-011. S-011 tests only make_rule and the constants. slices.json lists R-026 only under S-011. No OVERRIDE ADR covers this question.
- Options: (1) Plan a read_rules test in S-011. This is not possible. (2) Keep R-026 open. Add R-026 to S-013 and S-014 so their plans test the read_rules output. (3) Leave the link to ADR 6a5c only.
- Decision: Option 2. It is the only option that forces a real test of the acceptance. Do not mark R-026 verified when S-011 passes.
- Consequences / how to reverse: The orchestrator edits slices.json: add R-026 to S-013 and S-014. Remove it from them to reverse. No code depends on it.
- Affects: S-011, S-013, S-014, R-026

### ADR-20261009-191959-decision-judge-S-011-77b2: The orchestrator adds R-026 to S-013 and S-014; the planner does not edit slices.json
- Status: auto
- Context: slices.json lists R-026 only under S-011. The R-026 acceptance needs read_rules, which S-013 and S-014 build. ADR 20261010-r026-open already decides this. No OVERRIDE ADR contradicts it.
- Options: (1) The orchestrator or escalator adds R-026 to S-013 and S-014 as a state edit; R-026 stays unverified after S-011. (2) The same rule, stated as the smallest change: two list entries. (3) The same rule, with an interim note in the S-011 plan that R-026 is partly covered and links to the ADR.
- Decision: Option 1. The three proposals describe one design. Scores (fit x3, reversibility x2, simplicity x1): option 1 = 15+10+4 = 29, option 2 = 15+10+5 = 30, option 3 = 15+10+4 = 29. Option 2 scores highest on simplicity, but it omits the owner role and the verification rule. Option 1 states both and follows ADR 20261010-r026-open without change. The planner proceeds with S-011 tests for make_rule and the constants only.
- Consequences / how to reverse: Two array entries in slices.json. Remove R-026 from S-013 and S-014 to undo it. No code depends on the link.
- Affects: S-011, S-013, S-014, R-026

### ADR-20261009-192109-planner-S-011-4032: S-011 drops make_rule and the rule constants; R-026 needs a state edit
- Status: auto
- Context: The spec asks only for evaluate and the four operators. The R-026 acceptance needs read_rules, which S-013 and S-014 build. The revision 1 builder tested no part of that acceptance.
- Options: (1) Keep make_rule and the constants. (2) Cut them, keep regex_error and the unknown-kind None, and ask the orchestrator to move R-026 to S-013 and S-014.
- Decision: Option 2. It adds no behavior the spec did not ask for and does not hide the R-026 gap behind a builder test. It supersedes the make_rule parts of ADRs 6a5c, r026-open and 77b2. Those ADRs still hold on the R-026 state edit.
- Consequences / how to reverse: slices.json needs R-026 removed from S-011 and added to S-013 and S-014. To reverse, add the builder back and its tests.
- Affects: S-011, S-013, S-014, R-026

### ADR-20261009-192242-escalator-S-011-9094: R-026 moves from S-011 to S-014
- Status: auto
- Context: R-026 tests the keys of rules that read_rules returns. S-011 has no read_rules. Three plans failed to cover R-026 without extra code.
- Options: (1) Keep R-026 in S-011 and add make_rule. (2) Move R-026 to S-013. (3) Move R-026 to S-014, the slice that completes read_rules.
- Decision: Option 3. S-014 finishes read_rules for both sources, so one test can check every rule shape.
- Consequences / how to reverse: Edit the requirements lists of S-011 and S-014 in slices.json. S-013 tests may also assert the rule keys.
- Affects: S-011, S-014, R-026

### ADR-20261009-194831-decision-judge-S-012-8681: S-015 owns the preflight half of R-035
- Status: auto
- Context: R-035 is owned by S-012, but cmd_preflight is only a stub until S-015. S-012 tests the judge half (T-R-035a to d). The clause "the preflight still returns ok: true" has no owner test. No OVERRIDE ADR covers this question.
- Options: (1) S-015 owns the preflight half; require a named test on a fixture repo with one bad regex and nothing else failing. (2) S-012 tests judge only; S-015 adds an unnamed test. (3) Add test id T-R-035e to the S-015 plan; keep ownership with S-012.
- Decision: Option 1. Scores (fit x3, reversibility x2, simplicity x1): option 1 = 15+10+4 = 29, option 2 = 12+10+5 = 27, option 3 = 15+10+4 = 29. Options 1 and 3 tie; option 1 states the test content (ok: true and one "cannot evaluate" note), so the clause cannot be lost. S-012 adds no preflight stub test. R-035 stays todo until S-015 passes that test.
- Consequences / how to reverse: The S-015 planner must add the named test. Move the test to another slice by editing the S-015 plan. No product code depends on it.
- Affects: S-012, S-015, R-035

### ADR-20261009-194834-decision-judge-S-012-f284: A forge rule label wins over git check-ref-format
- Status: auto
- Context: Spec section 3 says the ref check applies besides the forge rules. Section 4 says rule is the label of the first failing rule. The plan puts git check-ref-format last. A sample can fail both. No OVERRIDE ADR covers this question.
- Options: (1) Keep the plan order; forge label wins; report the ref check only when no forge rule failed. (2) Same rule, stated as the first failure in a fixed list. (3) Same rule, with the wording "passed or was unevaluated".
- Decision: Option 1. The three proposals describe one design. Scores (fit x3, reversibility x2, simplicity x1): option 1 = 15+10+4 = 29, option 2 = 15+10+5 = 30, option 3 = 15+10+3 = 28. Option 2 scores highest on simplicity, but it leaves out why the ref check is an addition. Option 1 gives that reason and matches the plan. Use option 1.
- Consequences / how to reverse: Move the ref check call to the front of the list and update one test. No stored data depends on it.
- Affects: S-012

### ADR-20261009-203948-decision-judge-S-013-74ec: S-015 closes R-084; S-013 tests only the gh read_rules half
- Status: auto
- Context: R-084 has a GitHub half, a glab half and a preflight half. cmd_preflight is a stub until S-015. glab arrives in S-014. No OVERRIDE ADR covers this question.
- Options: (1) No slice closes R-084 in S-013; S-014 adds the glab test; S-015 adds the preflight test and closes R-084; list R-084 under S-013, S-014 and S-015. (2) The same rule, without the preflight test content. (3) The same rule, with the last slice to land a half marking R-084 done.
- Decision: Option 1. The three proposals describe one design. Scores (fit x3, reversibility x2, simplicity x1): option 1 = 15+10+4 = 29, option 2 = 15+10+4 = 29, option 3 = 12+10+4 = 26. Options 1 and 2 tie. Option 1 names the owner and the test content: gh or glab absent gives ok true, one note, all samples unchecked. This follows ADR 20261009-194831 for R-035. S-013 tests only the gh read_rules half. R-084 stays todo until S-015 passes.
- Consequences / how to reverse: Add R-084 to S-014 and S-015 in slices.json. Remove those entries to undo it. No code depends on the link.
- Affects: S-013, S-014, S-015, R-084

### ADR-20261009-203949-decision-judge-S-013-f2cc: read_rules returns a per-sample map and a union
- Status: auto
- Context: Spec section 3 says the GitHub endpoint applies ruleset targeting per branch name, so rules differ by sample. The plan returns {forge, rules, by_sample, notes, unchecked}. S-015 judges each sample, and S-014 must return the same shape. No OVERRIDE ADR covers this question.
- Options: (1) Plan shape; read_rules takes the samples; by_sample maps each sample to its rules; rules is the deduplicated union; unchecked is true when no rule was read. (2) Same shape; first-seen order for the union; a sample in unchecked gets no by_sample key. (3) Same shape; S-014 uses an empty list per sample for no rule.
- Decision: Option 1. The three proposals describe one design. Scores (fit x3, reversibility x2, simplicity x1): option 1 = 15+10+4 = 29, option 2 = 15+10+3 = 28, option 3 = 15+10+4 = 29. Option 1 states the argument and the unchecked rule most clearly. Add a test T-R-028f for the per-sample behavior. S-015 judges a sample only against by_sample[sample]. S-014 puts the one push rule under every sample.
- Consequences / how to reverse: The shape is internal to branches.py. To change it, edit read_rules, S-014 and one S-015 lookup. No stored data depends on it.
- Affects: S-013, S-014, S-015, R-028

### ADR-20261009-203948-decision-judge-S-013-c4f0: gh fills owner and repo in the read_rules path
- Status: auto
- Context: The spec writes repos/{owner}/{repo} for the gh api call. It does not say how the code finds owner and repo. No OVERRIDE ADR covers this question.
- Options: (1) Keep the literal placeholders and run gh with cwd=repo. (2) The same design, worded around the github_rule function. (3) The same design, with quoted gh api syntax and a note on the test shims.
- Decision: Option 1. The three proposals describe one design. Scores (fit x3, reversibility x2, simplicity x1): option 1 = 15+10+5 = 30, option 2 = 15+10+5 = 30, option 3 = 15+10+5 = 30. Tie. Option 1 is the plan and states the no-remote failure rule. Pass the literal path repos/{owner}/{repo}/rules/branches/<quoted sample> and run gh with cwd=repo. Do not parse the remote in Python. A gh failure gives the note "rules unknown on github: <stderr>" and unchecked samples.
- Consequences / how to reverse: Replace the placeholders with computed values in the path build and drop cwd=repo. Tests that assert the logged api path need an update. No stored data depends on it.
- Affects: S-013, R-027, R-028, R-029, R-084

### ADR-20261009-211639-decision-judge-S-014-f2c2: A failed glab call is a note with unchecked samples
- Status: auto
- Context: Spec section 3 says a glab "error" means no rule. It also says a glab failure gives the note "rules unknown on gitlab" and unchecked samples. No OVERRIDE ADR covers this question.
- Options: (1) A non-zero exit or non-JSON output is a failure; "an error" in the no-rule clause means a successful JSON error body; fix the spec wording. (2) The same rule, worded as a successful response with no push rule. (3) The same rule, with tests T-R-031a to T-R-031c named.
- Decision: Option 1. The three proposals describe one design. Scores (fit x3, reversibility x2, simplicity x1): option 1 = 15+10+4 = 29, option 2 = 15+10+4 = 29, option 3 = 15+10+4 = 29. Tie. Option 1 also states the spec fix. A non-zero exit (403, 404) or non-JSON output gives the note "rules unknown on gitlab: <stderr>" and unchecked samples. A successful null body, an object without branch_name_regex, or an empty regex means no rule, with unchecked false. This follows R-031 and the gh decision.
- Consequences / how to reverse: Change one branch in the glab parser and its test shims. No stored data depends on it.
- Affects: S-014, R-031

### ADR-20261009-211706-decision-judge-S-014-e148: A successful glab read with no rule gives unchecked false
- Status: auto
- Context: Spec section 3 says a null body or an empty branch_name_regex means no rule. It lists unchecked only for a glab failure and for no forge. No OVERRIDE ADR covers this question. ADR 20261009-211639 already sets unchecked false for this case.
- Options: (1) Unchecked false when glab succeeds and finds no rule; true only on glab failure or no forge. (2) The same rule, listing the null body, the object without branch_name_regex and the empty regex. (3) The same rule, with true listed as: glab missing, non-zero exit, bad JSON, timeout, or no forge.
- Decision: Option 3. The three proposals describe one design. Scores (fit x3, reversibility x2, simplicity x1): option 1 = 15+10+5 = 30, option 2 = 15+10+5 = 30, option 3 = 15+10+4 = 29. Option 3 names every failure path, so the rule is complete and testable. Use unchecked false for a null body, a body with no branch_name_regex, a null regex and an empty regex. Use unchecked true, with the note "rules unknown on gitlab: <stderr>", when glab is missing, exits non-zero, gives bad JSON or times out. Use unchecked true with no note for no forge. This matches S-013 for an empty gh list.
- Consequences / how to reverse: Change one boolean in the read_rules return path of S-014 and test T-R-030c. S-015 only reads the flag.
- Affects: S-014, S-015, R-031

### ADR-20261009-211807-decision-judge-S-014-6a1c: Fix the spec glab wording as a separate spec proposal
- Status: auto
- Context: Spec section 3 says a glab "error" means no rule, and also that a glab failure gives unchecked samples. ADR f2c2 already settled the behavior. The slice must not edit the spec. No OVERRIDE ADR covers this question.
- Options: (1) Fix line 107 as a separate spec-fix item, with exact new wording, and file it in SPEC-PROPOSALS. (2) The same fix, with shorter wording. (3) The same fix, with the failure sentence merged into the no-rule sentence.
- Decision: Option 1. The three proposals describe one design. Scores (fit x3, reversibility x2, simplicity x1): option 1 = 15+10+4 = 29, option 2 = 15+10+4 = 29, option 3 = 15+10+3 = 28. Tie between options 1 and 2. Option 1 gives exact replacement text and keeps the failure sentence unchanged. Keep the plan and code on ADR f2c2. Do not edit the spec in S-014.
- Consequences / how to reverse: The change is one sentence of spec text. No code or stored data depends on it. Reject the proposal to keep the old wording.
- Affects: S-014, R-031

### ADR-20261009-212039-decision-judge-S-014-b204: File the glab spec fix once, in the existing proposals
- Status: auto
- Context: Spec section 3 says a glab "error" means no rule. R-031 and ADR f2c2 say a failed glab call gives a note. SPEC-PROPOSALS.md already holds P-20261009-211639 and P-20261009-211807 for this sentence. No OVERRIDE ADR covers this question.
- Options: (1) File the proposal from ADR 6a1c with exact replacement text for line 107; add no third entry; keep the plan on f2c2. (2) File one new entry with new wording. (3) File a separate item with exact replacement text.
- Decision: Option 1. Scores (fit x3, reversibility x2, simplicity x1): option 1 = 15+10+5 = 30, option 2 = 15+10+3 = 28, option 3 = 15+10+3 = 28. Two entries already fix the same sentence, so a new entry would only add noise. Keep both entries. Do not edit the spec in S-014. Keep the plan and code on ADR f2c2.
- Consequences / how to reverse: Merge or reject the two proposals later. No code or stored data depends on them.
- Affects: S-014, R-031

### ADR-20261009-212053-decision-judge-S-014-8081: List R-084 under S-014 as the glab half
- Status: auto
- Context: ADR 74ec says to add R-084 to S-014 and S-015 in slices.json. slices.json lists only R-030, R-031, R-032 and R-026 for S-014. The planner does not own slices.json. No OVERRIDE ADR covers this question.
- Options: (1) List R-084 under S-014; keep T-R-084b as the glab-half test; do not change the R-084 status. (2) Leave slices.json unchanged; T-R-084b stays as extra evidence. (3) Do not edit slices.json now; S-015 adds R-084 to its own list.
- Decision: Option 1. Scores (fit x3, reversibility x2, simplicity x1): option 1 = 15+8+4 = 27, option 2 = 6+10+5 = 21, option 3 = 12+10+3 = 25. Option 1 follows ADR 74ec. Treat T-R-084b as a test for a slice requirement. Do not change the R-084 status; S-015 closes R-084. The planner does not edit slices.json. This ADR's Affects line is the link; the slicer or integrator applies it.
- Consequences / how to reverse: The link is one list entry in slices.json. Remove it to undo it. No code depends on it.
- Affects: S-014, R-084

### ADR-20261010-000000-planner-S-015-3a7c: S-015 keeps the echo keys and leaves derivation to S-016
- Status: auto
- Context: Spec section 4 lists the output keys without `command`, `args` or `given`. Earlier tests need those three keys. Derivation and the suggestion text belong to R-042 and R-043 in S-016.
- Options: (1) Keep the three keys, set `derived` false and `suggestion` empty in S-015. (2) Remove the keys and edit the old tests. (3) Build derivation in S-015.
- Decision: Option 1. It is the easiest to reverse and breaks no test.
- Consequences / how to reverse: S-016 fills `derived` and `suggestion`. Remove the extra keys later if the spec stays without them.
- Affects: R-044, S-015, S-016

### ADR-20261009-215604-decision-judge-S-015-ba66: Keep command, args and given in the S-015 preflight output
- Status: auto
- Context: Spec section 4 lists the output keys without command, args and given. Earlier tests need those three keys. ADR 3a7c keeps them. No OVERRIDE ADR covers this question.
- Options: (1) Keep the three keys; set derived false and suggestion empty in S-015; S-016 fills both. (2) The same, with a shorter rationale. (3) The same, with the spec read as an example output.
- Decision: Option 1. Scores (fit x3, reversibility x2, simplicity x1): option 1 = 15+10+4 = 29, option 2 = 15+10+4 = 29, option 3 = 15+10+4 = 29. The three proposals describe one design. Choose option 1 because it ties its rationale to the spec goal and to ADR 3a7c. Section 4 shows an example output and does not forbid extra keys.
- Consequences / how to reverse: Delete three fields from the output builder and update the tests that read them. S-016 changes only the values of derived and suggestion.
- Affects: S-015, S-016, R-044

### ADR-20261009-215607-decision-judge-S-015-251f: R-084 stays with S-015 as the preflight half
- Status: auto
- Context: The spec test list names a test where preflight with a gh shim that exits 1 gives ok. requirements.json may already show R-084 as done. ADR 74ec gives S-015 the preflight half. No OVERRIDE ADR covers this question.
- Options: (1) Keep R-084 with S-015; keep T-R-084a for both forges; leave the status done; the ADR Affects line is the link. (2) The same, with no slices.json edit and no new link. (3) The same, citing ADR 74ec and ADR 8081 as the link.
- Decision: Option 1. The three proposals describe one design. Scores (fit x3, reversibility x2, simplicity x1): option 1 = 15+10+4 = 29, option 2 = 15+10+5 = 30, option 3 = 15+10+4 = 29. Option 2 wins by simplicity but drops the explicit link that ADR 8081 set for S-014. Take option 1 for that reason. Keep T-R-084a for both forges and the gh-shim-exits-1 preflight test. Do not reopen R-084 and do not change its status. The judge does not edit slices.json; the integrator copies the link.
- Consequences / how to reverse: The link is one list entry and one test. Remove them to undo it. No code depends on the link.
- Affects: S-015, R-084

### ADR-20261010-000100-planner-S-015-r1f0: Ref-format failure beats unchecked
- Status: auto
- Context: Spec section 3 says every sample must pass `git check-ref-format --branch`. It also says that no forge, or a failed forge read, makes samples unchecked and that unchecked never blocks.
- Options: (1) Run the ref-format check always; an invalid name gives fail. (2) Skip the check when samples are unchecked.
- Decision: Option 1. The check is local and git refuses the name, so no push can succeed. Unchecked applies to the forge rules only.
- Consequences / how to reverse: Call `judge` only for checked samples. Update tests T-R-044e and T-R-044f.
- Affects: S-015, R-044

### ADR-20261009-215738-decision-judge-S-015-33cd: Invalid ref name gives fail when forge rules are unknown
- Status: auto
- Context: Spec section 3 says every sample must pass git check-ref-format. It also says unchecked never blocks. The question is which verdict an invalid ref name gets when the forge rules are unknown. No OVERRIDE ADR covers this question.
- Options: (1) Fail on an invalid ref name. Run the ref-format check on every sample, whatever the forge state. Use unchecked only when the forge rules are unknown. (2) Fail on an invalid ref name. Run the ref-format check first. Give unchecked only to the forge-rule part. (3) Same as option 2, with the cost argument: a false block is cheap to fix and a wrong pass fails at push.
- Decision: Option 1. The three options give the same verdict and match ADR-20261010-000100-planner-S-015-r1f0. The ref-format check is local and needs no forge. Git refuses the name, so no push can succeed. The spec text on unchecked speaks only of the forge rules.
- Consequences / how to reverse: Skip the ref-format step when the forge is unknown, and update tests T-R-044e and T-R-044f. No state or data format depends on this choice.
- Affects: S-015, R-044, R-084

### ADR-20261009-223042-decision-judge-S-016-d001: Working-only failure in mr mode does not derive a format
- Status: auto
- Context: Spec section 4 step 5 does not say what happens in mr mode when only the working sample fails. A format cannot change the user's own branch. No OVERRIDE ADR covers this question.
- Options: (1) Do not derive. Return ok false with the rename suggestion. (2) Derive only when a loop-kind sample fails. Otherwise return ok false with the rename suggestion. (3) Same as option 2, with the argument that a derived format would leave the push failing.
- Decision: Option 1. All three options give the same verdict. Step 6 already names the rename for a working failure. Step 5 would re-check the working sample and fail again, so a derived format could never give ok true. When a loop-kind sample also fails, the planner derives as step 5 says, and the working failure still blocks.
- Consequences / how to reverse: Remove one guard in the planner derive step and update one test. No state, config or format depends on this choice.
- Affects: S-016, R-042, R-043, R-087, R-122, R-073

### ADR-20261009-223044-decision-judge-S-016-b19f: Failed derivation reports the original format and first-verdict samples
- Status: auto
- Context: The spec is silent on the failed output when derivation was tried and still failed. Section 4 step 6 says suggestion holds the derived format. Step 5 sets derived true only on success. No OVERRIDE ADR covers this question.
- Options: (1) Keep the original format, derived false, first-verdict samples and rules; derived format only in suggestion. (2) The same, with suggestion as a --branch-format line. (3) The same, and state that second-evaluation samples are never output.
- Decision: Option 1. The three proposals describe one design and match the plan. Scores (fit x3, reversibility x2, simplicity x1): option 1 = 15+10+5 = 30, option 2 = 15+10+4 = 29, option 3 = 15+10+4 = 29. Write suggestion as a --branch-format line, and omit second-evaluation samples. Both details are compatible with option 1.
- Consequences / how to reverse: Only the failure branch of the output builder and its tests change. No state depends on it. To change it, swap in the second-evaluation values.
- Affects: S-016, R-042, R-043, R-087, R-122, R-073

### ADR-20261009-223051-decision-judge-S-016-13d6: Regex suggestion literal comes from one helper checked with evaluate
- Status: auto
- Context: Spec says only that the suggestion holds a literal that the rule accepts. The plan builds the shortest match from the parsed pattern and tries prefixes cut at slashes. No OVERRIDE ADR covers this question.
- Options: (1) Keep the plan's method; fallback text "<literal>/{name}" with the quoted pattern. (2) One helper _regex_literal; return None on parse error or when no candidate passes; the suggestion is a --branch-format line with the quoted pattern. (3) The plan's method with prefixes tried longest first.
- Decision: Option 2. Scores (fit x3, reversibility x2, simplicity x1): option 1 = 15+10+4 = 29, option 2 = 15+10+5 = 30, option 3 = 12+10+4 = 26. Try candidates shortest first, then the whole string. Use evaluate on all samples for each candidate. Never print an unchecked literal as valid. The --branch-format line matches ADR-20261009-223044-decision-judge-S-016-b19f. Option 3 is lower because longest first keeps less of the "{name}" tail free.
- Consequences / how to reverse: The helper is one private function in branches.py. Only the suggestion text depends on it. Replace the helper, or reduce it to the fallback text, with no format or config change.
- Affects: S-016, R-044

### ADR-20261009-223305-planner-S-016-1227: Suggestion text for each failing cause
- Status: auto
- Context: Spec section 4 step 6 names the suggestion for a derivable rule, a regex rule and a working failure. It is silent on a given format, a negated rule, several rules, a regex rule with a working failure, and a derived format that git refuses.
- Options: (1) Give each case a defined --branch-format line, with a placeholder text where no literal exists. (2) Leave the suggestion empty in those cases.
- Decision: Option 1. A derivable rule gives its table format as the suggestion, also when a format was given. A derived format that git refuses is a failed derivation with exit 1. A regex literal is checked only against the S-001 tail. Other cases give a placeholder line that names the rule labels. A working failure adds a rename line.
- Consequences / how to reverse: Only the suggest function and its tests change. No state depends on the text.
- Affects: S-016, R-042, R-043, R-087, R-122

### ADR-20261009-225010-implementer-S-016-a7f3: Two earlier tests assumed a rule that preflight now derives from
- Status: auto
- Context: T-R-044c used a starts_with rule and expected a failed verdict. T-R-073a used a negated starts_with feature/ rule, which the default format satisfies. Spec section 4 says preflight derives a format from one starts_with rule, so the first test cannot fail. The second test never fails.
- Options: leave the tests failing; change the rule in each test.
- Decision: T-R-044c uses a regex rule, which is never derived. T-R-073a negates starts_with sdlc/, which the default format fails.
- Consequences / how to reverse: restore the old rules and drop the derivation. The tests keep their original intent.
- Affects: R-042, R-044, S-016

### ADR-20261010-005045-human-S-005b-1073: R-119 is verified by a runtime check, not a source scan
- Status: OVERRIDE
- Context: S-005b tried to prove R-119 ("a verify branch stays local") by scanning the Python scripts for push calls. Three attempts and nine fix rounds ended parked. Each pinned argument form left another open: a bytes option, an int argument and a double-star argument leave every key equal, and one mutant pushed a verify branch to a bare remote while the guard stayed green. A static scan of call arguments cannot cover every way to write an argument.
- Options: (A) check the effect at runtime: run the push paths against a local bare remote and assert that no verify branch arrives. (B) narrow R-119 to the push sites in sdlc-loop.js. (C) make the push wrapper refuse a branch that parses as verify.
- Decision: Option A. The acceptance of R-119 becomes a behavior check. A test builds a fixture repo with a local bare remote and local verify branches named by `branches.py name --kind verify`, under the default format and under one custom format. It runs every script path that can push or open a pull request, with a `gh` shim that records its calls. It asserts that the remote holds no branch that `branches.py parse` classifies as verify, and that the shim saw no pull-request creation with a verify head. Do not build a scanner of call arguments. Do not pin wrapper bodies. Do not restore push_guard.py or push-guard.test.mjs from the archived attempt branches.
- Consequences / how to reverse: The check covers the paths the test drives, so the test must drive each push site of state-write.py and any other script that pushes. A new push site needs a new case. To reverse, restore the source-scan acceptance of R-119.
- Affects: R-119, S-005b

### ADR-20261010-012348-planner-S-018-d35c: Mismatch check is its own bullet, and one old assertion changes
- Status: auto
- Context: Spec section 5 puts the worktree format check in the Run worktree bullet, which comes before FMT exists. The old first-run-only assertion pins text that the spec removes.
- Options: (1) Put the check in a new bullet after the Branch format bullet. (2) Edit the Run worktree bullet now. (3) Keep the old assertion.
- Decision: Option 1, and rewrite the old assertion to the new bullet. The Run worktree bullet belongs to S-019.
- Consequences / how to reverse: Move the sentence into the Run worktree bullet when S-019 restructures it.
- Affects: S-018, R-048

### ADR-20261010-012412-decision-judge-S-018-fd46: Mismatch sentence goes in its own bullet after the Branch format bullet
- Status: auto
- Context: Spec section 5 puts the worktree branchFormat mismatch check in the Run worktree bullet, which comes before FMT. The check needs FMT. ADR-20261010-012348-planner-S-018-d35c already records the plan. No OVERRIDE ADR covers this question.
- Options: (1) Own bullet after the Branch format bullet; leave the Run worktree bullet unchanged. (2) Same, with an opening clause that names the Run worktree step. (3) Same, and trim the Run worktree bullet to the branch name and worktree creation.
- Decision: Option 1. The Branch format bullet defines FMT, so the new bullet uses FMT after its definition. The Run worktree bullet stays unchanged for S-019.
- Consequences / how to reverse: One sentence moves in one file. S-019 can move it into the Run worktree bullet. The one rewritten assertion must follow the move.
- Affects: S-018, R-048

### ADR-20261010-012416-decision-judge-S-018-b1c1: Rewrite the first-run-only assertion to pin the new Branch format bullet
- Status: auto
- Context: Spec section 5 deletes the "Branch name (first run only)" bullet. The old assertion in prompts.test.mjs matches "first run only" followed by runBranch, so it pins deleted text. No OVERRIDE ADR covers this question. ADR-20261010-012348-planner-S-018-d35c already chose to rewrite it.
- Options: (1) Rewrite the assertion to pin the new bullet with "first run only" and the resume wording, and drop the runBranch match. (2) Same rewrite, with the change only noted in an ADR. (3) Same rewrite of one assertion, kept strict, with an ADR of Status: auto.
- Decision: Option 3. Rewrite only that one assertion. It must require "first run only" and "on a resume the current branch is normally the run branch" in the Branch format bullet. Keep it strict. Do not edit other assertions.
- Consequences / how to reverse: One regex in skills/sdlc/test/prompts.test.mjs changes. Restore the old regex or tighten the new one in one commit. The resume guarantee stays tested.
- Affects: S-018, R-048

### ADR-20261010-014120-planner-S-019-4003: Run worktree bullet moves after the Branch format bullet
- Status: auto
- Context: Spec section 5 names the run branch with FMT in the Run worktree bullet. FMT exists only after the Branch format bullet. The Run worktree bullet now comes first.
- Options: (1) Move the Run worktree bullet and the specPath bullet after the Branch format bullet. (2) Keep the order and refer forward to FMT. (3) Move the Branch format bullet before the Run worktree bullet.
- Decision: Option 1. The Branch format bullet reads only $REPO and the flags, so it needs no worktree. The mismatch sentence joins the Run worktree bullet.
- Consequences / how to reverse: Move the two bullets back and compute RUN_BRANCH in a later step. Update the order assertions.
- Affects: R-047, R-121, S-019

### ADR-20261010-014200-decision-judge-S-019-b1d3: Git mode bullet reads config.json from REPO only
- Status: auto
- Context: Spec section 5 leaves the bullet order open. The Run worktree bullet needs FMT, which the Branch format bullet defines. The spec does not say whether the Git mode bullet reads config.json from REPO or WT. ADR-20261010-014120-planner-S-019-4003 moves the bullets. No OVERRIDE ADR covers this question.
- Options: (1) Move the bullets. Read config.json from WT when WT exists, else from REPO, in Git mode and in the Branch format resume read. (2) Move the bullets. Git mode reads WT when its config exists, else REPO. (3) Move the bullets. Read config.json from REPO only. Add no WT fallback.
- Decision: Option 3. Move the Run worktree bullet and the specPath bullet after the Branch format bullet. The Git mode bullet reads config.json from $REPO/.sdlc/config.json. The Branch format bullet already reads REPO, so both bullets use one source.
- Consequences / how to reverse: One reorder and one path qualifier in skills/sdlc/SKILL.md, plus the matching assertions. Revert the slice commit, or add a WT fallback in one edit.
- Affects: S-019, R-047, R-121

### ADR-20261010-014356-planner-S-019-7374: Git mode keeps the WT-first read and WT is set before it
- Status: auto
- Context: ADR-20261010-014200-decision-judge-S-019-b1d3 makes the Git mode bullet read only $REPO/.sdlc/config.json. The run state lives in the worktree. A resumed stack run keeps gitMode: stack and runBranch only in $WT/.sdlc/config.json. A REPO-only read can fall back to pr and lose runBranch. The Run worktree bullet moves after the Branch format bullet, so WT would be unset when the Git mode bullet runs.
- Options: (1) Follow b1d3: REPO-only read. (2) Set WT in its own bullet before the Git mode bullet. The Git mode bullet reads $WT/.sdlc/config.json when that file exists, else $REPO/.sdlc/config.json.
- Decision: Option 2. This supersedes b1d3. Add a short bullet that sets WT=$REPO/.claude/worktrees/sdlc-run before the Git mode bullet. The Run worktree bullet keeps the gitignore check, the creation and the checkout, and stays after the Branch format bullet.
- Consequences / how to reverse: One new bullet and one path qualifier in skills/sdlc/SKILL.md, with matching assertions. To reverse, change the qualifier to REPO only and accept the lost stack resume.
- Affects: S-019, R-047, R-121

### ADR-20261010-030412-implementer-S-021-985f: Merged head test uses an awaiting-merge slice
- Status: auto
- Context: Test "a lowercased head resolves to the ledger id" used a todo slice for its merged-head case. The script records a merged pull request only for a slice in awaiting-merge status, as the existing test for a human merge shows.
- Options: (1) Change the script to treat a todo slice as merged. (2) Give the merged case an awaiting-merge slice.
- Decision: Option 2. Option 1 would change the default-format behavior that R-077 keeps.
- Consequences / how to reverse: One fixture line in next-action.test.mjs. To reverse, restore the todo slice and change the script.
- Affects: S-021, R-054

### ADR-20261010-034158-decision-judge-S-022-cb4c: S-022 adds a format_of helper for fmt
- Status: auto
- Context: R-059 (S-023) derives fmt once in main(). S-022 needs fmt now. No OVERRIDE ADR covers this question.
- Options: (1) Add format_of(repo, config). Call it from patch_slice and the base-branch arm. Do not copy the derivation inline. S-023 moves the call into main(). (2) Same helper. S-023 replaces the calls with the single derivation in main(). (3) Same helper. S-022 does not touch main(). S-023 moves the call.
- Decision: Option 1. The three options are the same change. Option 1 forbids an inline copy, so one function derives fmt. S-022 does not edit main().
- Consequences / how to reverse: The helper has two call sites. S-023 moves the call into main() and can inline or delete the helper in one edit. No stored state changes.
- Affects: S-022, S-023, R-059

### ADR-20261010-034202-decision-judge-S-022-f0a0: branch_run stays unchanged; R-057 is met in the prune loop
- Status: auto
- Context: R-057 says branch_run classifies with parse. In state-write.py, branch_run holds no branch regex. It only reads runBranch from config.json on a given branch. Its callers already pass classified branches. No OVERRIDE ADR covers this question.
- Options: (1) Leave branch_run unchanged. Read R-057 as "classify milestone branches with parse" and meet it in the prune loop. (2) Same change, and record the gap in the ADR. (3) Same change, and record that branch_run has no regex to replace.
- Decision: Option 1. Replace MILESTONE_BRANCH with a parse check in the prune loop only. Add no parse check in branch_run.
- Consequences / how to reverse: A parse check in branch_run would repeat the filter of its callers and change its return value for non-milestone branches. To reverse, add one parse call at the top of branch_run that returns an empty string for a non-milestone branch, and add one test. No caller or data format changes.
- Affects: S-022, R-057

### ADR-20261010-035538-implementer-S-022-11cb: Run branch test compares the milestone tip, not its parent
- Status: auto
- Context: Test "a run branch with a custom format is advanced and kept as a full name" compared the parent of the milestone branch with the run branch. R-058 says the milestone branch is cut from the advanced run branch. The cut makes the milestone tip equal to the run tip. The parent of the tip is an older commit.
- Options: (1) Change the test to compare the milestone tip with the run tip. (2) Add a commit to the milestone branch so its parent is the run tip.
- Decision: Option 1. The spec text fixes the cut point, and the existing default-format test compares tips.
- Consequences / how to reverse: One assertion changes in scripts.test.mjs. To reverse, restore the parent comparison and add a commit on the milestone branch.
- Affects: S-022, R-058

### ADR-20261010-043504-decision-judge-S-023-770f: Build only the parse-based helper for R-083
- Status: auto
- Context: R-083 names ship-prune and collect-verification in state-write.py. Neither command exists in the code. The loop-economy spec defines them and has not landed.
- Options: (1) Build no command. Add only slice_side_branches(repo, fmt, slice_id) with tests. (2) Same as 1, stated as a matcher-only slice. (3) Same as 1, and record the gap in an ADR.
- Decision: Option 1. Do not build ship-prune or collect-verification. Add slice_side_branches(repo, fmt, slice_id) on branches.list_kind for verify and attempt branches. Test it under a custom format. Keep the source test that bans local -attempt- and -v patterns.
- Consequences / how to reverse: The helper is small and has no caller yet. The loop-economy slices call it later. To build the commands now, add a later slice on top of the helper.
- Affects: R-083, S-023

### ADR-20261010-051408-decision-judge-S-024-b707: The janitor does not sweep old-shape verify branches
- Status: auto
- Context: The spec replaces V_BRANCH with parse. Old-shape branches sdlc/<id>-v<n> no longer parse as verify. The spec edge case says the janitor leaves branches that the format does not see. R-060 bans V_BRANCH in janitor.py. No OVERRIDE ADR covers this question.
- Options: (1) Sweep only branches that parse to verify. Add no fallback regex. (2) Same change, with a short rationale. (3) Same change, with the by-hand delete noted.
- Decision: Option 1. Remove V_BRANCH with no fallback. Rewrite the existing tests to the verify shape.
- Consequences / how to reverse: Old-shape branches stay on disk. The user deletes them with git branch -D. To reverse, add one legacy check in sweep_branches and one test. No state or config changes.
- Affects: S-024, R-060

### ADR-20261010-051411-decision-judge-S-024-9f6d: Janitor keeps a verify-shaped branch whose id ends in -attempt-<n>
- Status: auto
- Context: The name sdlc/S-004-attempt-1-v0-http-api-0 parses as verify with id S-004-attempt-1. The ledger does not know that id. Spec section 7 sweeps verify branches with an unknown id. The old janitor kept every -attempt- branch. No OVERRIDE ADR covers this question.
- Options: (1) Keep the branch, as the plan says. (2) Follow spec section 7 literally and sweep it. (3) Keep a verify branch whose parsed id ends in -attempt-<n>. Sweep every other verify branch with an unknown id.
- Decision: Option 3. Add one suffix check in sweep_branches. The ledger has no attempt ids, so an unknown id here comes from the name pattern and does not show a dead slice. Options 1 and 3 give the same result.
- Consequences / how to reverse: A kept stale branch costs only clutter. A swept branch loses work. To follow the spec literally, delete the suffix check and its test. The janitor then sweeps these branches on its next run.
- Affects: S-024

### ADR-20261010-052311-implementer-S-024-c8a1: branches test uses the verify branch shape
- Status: auto
- Context: The branches test for script resolution made the janitor sweep `sdlc/S-1-v1`. R-060 says the janitor sweeps only branches that `parse` classes as verify. That name is not a verify branch.
- Options: Keep the old name and a fallback in the janitor; rename the branch in the test.
- Decision: Rename the test branch to `sdlc/S-1-v1-http-api-0`. The test still proves that the janitor resolves from a scratch directory.
- Consequences / how to reverse: Restore the old name and add a fallback in `janitor.py`.
- Affects: R-060, S-024

### ADR-20261010-064552-decision-judge-S-027a-9642: S-027a carries R-002 clause 2
- Status: auto
- Context: R-002 clause 2 (a fresh run records branchFormat sdlc/{name} in config.json) was to close in S-027 under ADR-20261009-041833-decision-judge-S-003-7312. No S-027 slice lists R-002. No OVERRIDE ADR covers this question.
- Options: (1) S-027a carries R-002 beside R-064; S-027b and S-027c do not list it. (2) Same, with the rationale that S-027a writes config.branchFormat. (3) Same, beside R-064, R-065 and R-061.
- Decision: Option 1. The state-writer adds R-002 to the S-027a requirements, beside R-064. S-027a closes it with T-R-002c. The S-003 tests stay as clause 1 evidence.
- Consequences / how to reverse: Only the S-027a requirements list changes. To reverse, remove R-002 from S-027a and add it to another S-027 slice. T-R-002c stays valid there. R-002 in both S-003 and S-027a is intended.
- Affects: R-002, R-064, S-027a

### ADR-20261010-144554-decision-judge-S-027a-c3e7: state-schema.md slice example uses a placeholder branch value
- Status: auto
- Context: The state-schema.md slice example holds "branch": "sdlc/S-001". The spec table replaces the literal in the field description. It does not name the example value. R-063 bans any sdlc/ literal outside branches.py output blocks. No OVERRIDE ADR covers this question.
- Options: (1) Use "<slice branch>" as the example value and keep the description "the slice branch under config.branchFormat". (2) Same value, with a description that says the value comes from the branch format. (3) Same value, with the note that other examples use placeholders.
- Decision: Option 1. Set the example value to "<slice branch>". The three options give the same result. Option 1 is the smallest edit.
- Consequences / how to reverse: No code reads the example. To use a concrete sample, edit one line. The new value must not contain the sdlc/ literal, or the R-063 scan fails.
- Affects: S-027a, R-063

### ADR-20261010-071940-decision-judge-S-027b-af8c: integrator filters attempt branches by slice id ignoring case
- Status: auto
- Context: branches.py list prints the format's spelling of the id, for example s-001 under {name:lower}. It takes no ledger ids. R-093 says the list is filtered to the slice. No OVERRIDE ADR covers this question.
- Options: (1) The integrator filters the listed attempt branches by the slice id, ignoring case; no --ids option. (2) Same rule, worded as keeping branches whose id equals the slice id. (3) Same rule, worded as a case-insensitive comparison.
- Decision: Option 1. The three options give the same result. Add the phrase "ignoring case" to integrator.md. T-R-093c runs a lowercase format and asserts the two S-001 attempt branches in order. Add no --ids option to branches.py.
- Consequences / how to reverse: The change is one phrase in integrator.md plus its test. To use exact ledger ids, add an --ids option to branches.py and change the phrase. No data or state depends on it.
- Affects: R-093, S-027b

### ADR-20261010-071945-decision-judge-S-027b-d798: S-027b changes only the attempt half of integrator Clean up step 1
- Status: auto
- Context: Step 1 of the integrator Clean up sweeps sdlc/<id>-v* and sdlc/<id>-attempt-* in one sentence. The spec table lists only the attempt literal for integrator.md. An existing test asserts sdlc/<id>-v*. No OVERRIDE ADR covers this question.
- Options: (1) Change only the attempt half in S-027b. Leave the verify half for S-027c. (2) Same, and write the sentence so each half reads on its own. (3) Same, with the note that the half-edited sentence is harmless.
- Decision: Option 1. Replace only the sdlc/<id>-attempt-* literal with the format-based attempt phrase. Leave sdlc/<id>-v* and its test unchanged. S-027c rewrites the verify half. The three options give the same result.
- Consequences / how to reverse: The change is one phrase in one prompt line. To reverse, restore the attempt literal, or fold the verify edit into S-027b with its test update.
- Affects: S-027b

### ADR-20261010-071945-decision-judge-S-027b-e7d5: attempt cleanup uses local list and tolerant remote delete
- Status: auto
- Context: R-093 says the integrator deletes attempt branches locally and on the remote, found through list. list reads refs/heads only, so a remote-only attempt branch is not found. The old prompt had the same limit. No OVERRIDE ADR covers this question.
- Options: (1) Keep list local-only. Delete remotely only when the local branch and its remote copy both exist. (2) Keep list local-only. Delete the remote copy only when its name matches a listed branch. (3) Keep list local-only. Delete each listed branch locally, then run git push origin --delete for it and tolerate a missing remote ref.
- Decision: Option 3. Do not change branches.py. It matches the R-093 acceptance text with the fewest steps and no remote existence check. Record the remote-only case as a known limit.
- Consequences / how to reverse: A remote-only attempt branch stays on the remote. It is never merged or reused. To cover it, add a --remote option to branches.py list in a later slice and change the cleanup line in the prompt.
- Affects: R-093, S-027b

### ADR-20261010-074453-decision-judge-S-027c-1782: R-063 and R-080 scan skips the sdlc/{name placeholder
- Status: auto
- Context: The scan regex (?<![.\w])sdlc/(?!tracker|STOP) also matches sdlc/{name}. Spec sections 5 and 8 and tests T-R-062, T-R-064a and T-R-065a require that text in _common.md, env-detector.md, state-schema.md and SKILL.md. No OVERRIDE ADR covers this question.
- Options: (1) Add \{name to the negative lookahead. (2) Same, with the regex written out in full. (3) Same, with the note that the required text stays unchanged.
- Decision: Option 2. Set the scan regex to (?<![.\w])sdlc/(?!tracker|STOP|\{name). The three options give the same result. Do not change the required text or any test.
- Consequences / how to reverse: Only the exact prefix sdlc/{name passes. Literals such as sdlc/S-001 still fail the scan. To reverse, remove |\{name from the lookahead. The contradiction then returns.
- Affects: R-063, R-080, S-027c

### ADR-20261010-074457-decision-judge-S-027c-44f1: S-027c sweep covers every omitted sdlc/ literal
- Status: auto
- Context: Spec section 8 omits some literals in verify-toolsmith.md, test-reporter.md, state-reader.md, verify-collector.md, the integrator verify sweep and SKILL.md lines 14, 31, 67. R-063 bans any sdlc/ literal outside branches.py output blocks. No OVERRIDE ADR covers this question.
- Options: (1) Extend the sweep to every omitted literal with the nearest placeholder; use "branches that parse as kind verify" for the integrator sweep. (2) Same, with a final grep for sdlc/ literals. (3) Same, citing ADR-20261010-071945 (S-027b).
- Decision: Option 1. The three options give the same result. The section 8 table lists known literals, not the limit of the sweep. Use the placeholders <slice branch>, <state branch>, <e2e branch> or <verify branch>. For the integrator sweep, use branches.py list --kind verify. Run the scan test for sdlc/ literals to prove no literal stays.
- Consequences / how to reverse: Each change is a text edit in one prompt line. To reverse, restore the literal on that line and update its test. Keep the integrator test in step with the new phrase.
- Affects: R-063, S-027c

### ADR-20261010-074458-decision-judge-S-027c-6e34: spike scratch branch is named from the slice branch with -spike added
- Status: auto
- Context: The escalator names a scratch branch sdlc/<id>-spike. The spec table lists no kind or placeholder for it. The branch is never pushed and no kind parses it. No OVERRIDE ADR covers this question.
- Options: (1) Keep the plan's wording: the slice branch name with -spike added. (2) Same, worded as "a scratch branch named like <slice branch> with -spike added". (3) Same, as prose built from the printed <slice branch> name.
- Decision: Option 2. In escalator.md, replace sdlc/<id>-spike with "a scratch branch named like <slice branch> with -spike added". Add no kind, placeholder or spec row. The three options give the same result.
- Consequences / how to reverse: The change is one phrase in escalator.md. To add a spike kind, add a spike row to the branches.py table and a <spike branch> placeholder, then swap the phrase. No pushed branch or stored state depends on the name.
- Affects: R-063, S-027c

### ADR-20261010-074536-decision-judge-S-027c-a719: Confirm scan skips the sdlc/{name placeholder
- Status: auto
- Context: The plan asks again whether the R-063 and R-080 scan skips sdlc/{name. ADR-20261010-074453-decision-judge-S-027c-1782 already settles it. No OVERRIDE ADR conflicts.
- Options: (1) Skip the placeholder with the regex from the settled ADR. (2) Same, as the smallest change. (3) Same, noting the required text and tests stay unchanged.
- Decision: Option 1. Use (?<![.\w])sdlc/(?!tracker|STOP|\{name). Change no required text and no test. The three options give the same result. Scores: fit 5, reversibility 5, simplicity 5.
- Consequences / how to reverse: Remove |\{name from the lookahead. The contradiction then returns. Literals such as sdlc/S-001 still fail the scan. SPEC-PROPOSALS entry P-20261010-074453 already covers the spec text fix.
- Affects: R-063, R-080, S-027c

### ADR-20261010-074611-decision-judge-S-027c-5027: Confirm S-027c sweep covers every omitted sdlc/ literal
- Status: auto
- Context: The plan asks again whether the sweep covers literals that spec section 8 omits. ADR-20261010-074457-decision-judge-S-027c-44f1 already settles it. No OVERRIDE ADR conflicts.
- Options: (1) Extend the sweep to every omitted literal with the nearest placeholder; use branches.py list --kind verify for the integrator sweep. (2) Same, with no new placeholder. (3) Same, in one commit per file group and with section 8 unchanged.
- Decision: Option 1. Use the placeholders <slice branch>, <state branch>, <e2e branch> or <verify branch>. Run the scan test for sdlc/ literals to prove none stays. Scores: fit 5, reversibility 5, simplicity 4.
- Consequences / how to reverse: Each change is a text edit on one prompt line. To reverse, restore the literal and update its test.
- Affects: R-063, S-027c

### ADR-20261010-112624-decision-judge-S-034-c5f8: Keep the resume sentence for branchFormat; no conflict with spec section 5
- Status: auto
- Context: The plan keeps the sentence "On a resume, the config.json branchFormat gives the same value without --branch-format". Spec section 5 does not state it. Test T-R-097 pins it. No OVERRIDE ADR covers this question.
- Options: (1) No conflict; keep the sentence as a restatement of the spec. (2) Same; make no spec change. (3) Same; do not edit the spec.
- Decision: Option 1. There is no conflict. Spec section 1 (line 61) sets the order: flag, else config.branchFormat on resume. Section 5 reads $REPO/.sdlc/config.json and gives the same value. Keep the sentence. Edit no spec text. The three options give the same result. Scores: fit 5, reversibility 5, simplicity 5.
- Consequences / how to reverse: The sentence is one line in skills/sdlc/SKILL.md. To remove it, delete the line and update test T-R-097. The Run worktree mismatch check still catches a wrong format on a resume.
- Affects: S-034

### ADR-20261010-113004-decision-judge-S-034-be85: End the driver on a resume when a working sample fails
- Status: auto
- Context: On a resume, a failed working sample still makes preflight set ok to false. R-130 only forbids the parse check and the rename ask on a resume. No OVERRIDE ADR covers this question.
- Options: (1) End on a resume when a sample failed; keep the ok-false rule; print the samples. (2) Same, as the simplest option. (3) Same, with no continue carve-out.
- Decision: Option 1. The driver ends on a resume with the printed samples. It asks for no rename and runs no parse check. Add no carve-out. The three options give the same result. Scores: fit 5, reversibility 5, simplicity 5.
- Consequences / how to reverse: The rule is one clause in the Branch format bullet of skills/sdlc/SKILL.md, pinned in prompts.test.mjs. To let a resume continue, change the clause and its pin. No script or state depends on it.
- Affects: R-130, S-034

### ADR-20261010-143858-decision-judge-S-fix-M-1-1-b796: Treat the e2e files as absent in S-fix-M-1-1
- Status: auto
- Context: The slice notes name e2e/tests/names.test.mjs, e2e/tests/parse-list.test.mjs and e2e/pending.json. The repo has no e2e directory. No OVERRIDE ADR covers this question.
- Options: (1) Treat the e2e files as absent; put tests in skills/sdlc/test. (2) Same, as the least code. (3) Same, as the notes come from another repo.
- Decision: Option 1. Put the new tests in skills/sdlc/test/*.test.mjs. Create no e2e directory and no e2e/pending.json. Skip the pending.json edit. Name SC-M-1-076 and SC-M-1-080 in the test titles. The three options give the same result. Scores: fit 5, reversibility 5, simplicity 5.
- Consequences / how to reverse: Nothing is created. To add e2e tests later, add e2e/ and pending.json in one commit.
- Affects: S-fix-M-1-1

### ADR-20261010-143901-decision-judge-S-fix-M-1-1-ea04: Accept n=02 in name; compare integer parts by value
- Status: auto
- Context: The plan compares integer parts by value, so n=02 is accepted. The spec says only that every name output parses back to the same kind and parts. No OVERRIDE ADR covers this question.
- Options: (1) Accept n=02; compare by value; add no canonical-text check. (2) Same, with a test that pins parse of n=02 equal to n=2. (3) Same, as the plan says, with no canonical-form refusal.
- Decision: Option 1. The printed name parses back to the same kind and parts, so the guarantee holds. Add no leading-zero rule. The three options give the same result. Scores: fit 5, reversibility 5, simplicity 5.
- Consequences / how to reverse: To refuse 02 later, add one check in name that compares str(int(value)) with the given text, and one test. No signature, CLI flag or state format changes. Branches with leading zeros still parse.
- Affects: S-fix-M-1-1

### ADR-20261010-144331-decision-judge-S-fix-M-1-1-a2e0: Confirm the e2e ruling for S-fix-M-1-1
- Status: auto
- Context: The slice notes name e2e/tests files and e2e/pending.json. The repo has no e2e directory. ADR-20261010-143858-decision-judge-S-fix-M-1-1-b796 already settles this. No OVERRIDE ADR contradicts it.
- Options: (1) Follow that ADR; put tests in skills/sdlc/test/branches.test.mjs; skip the pending.json edit. (2) Same, as the simplest option. (3) Same, with the same file.
- Decision: Option 1. Treat the e2e files as absent. Create no e2e directory and no e2e/pending.json. Name SC-M-1-076 and SC-M-1-080 in the test titles. The three options give the same result. Scores: fit 5, reversibility 5, simplicity 5.
- Consequences / how to reverse: Nothing is created. To add e2e tests later, add e2e/ and pending.json in one commit.
- Affects: S-fix-M-1-1

### ADR-20261010-144335-decision-judge-S-fix-M-1-1-9b5c: Allow re.ASCII and ASCII-only lowercase in parse
- Status: auto
- Context: Spec section 2 says parse compiles with re.IGNORECASE under lower. R-024 and SC-M-1-080 need look-alike unicode tails to return None. Unicode IGNORECASE lets U+212A match k and U+017F match s. No OVERRIDE ADR covers this question.
- Options: (1) Add re.ASCII to the lower-mode regexes; use an ASCII-only lowercase. (2) Add re.ASCII to every parse regex; use an ASCII-only compare. (3) Same, scoped to the tail matchers in one small function.
- Decision: Option 1. Treat it as a refinement of spec section 2, not a conflict. Valid ids and tails are pure ASCII, so only look-alikes change. Keep re.IGNORECASE. Scores: fit 5, reversibility 5, simplicity 5.
- Consequences / how to reverse: The change is one flag and one lowercase helper in branches.py. To reverse, remove both and review the look-alike tests. No stored data or branch name changes.
- Affects: R-024, S-fix-M-1-1
