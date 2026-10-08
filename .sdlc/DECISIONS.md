# Decisions

### ADR-20261008-162858-slicer-S-001-d9f4: Duplicate requirements ride in their twins' slices
- Status: auto
- Context: The ledger holds 122 todo requirements. The extractor wrote near-duplicates: R-093 of R-010, R-094 of R-025, R-095 of R-033, R-096 of R-056, R-098 of R-013, R-119 of R-009, R-120 of R-007 and R-121 of R-047. The slicer must slice every todo requirement.
- Options: Leave the duplicates unsliced for the critic; slice them apart; place each beside its twin.
- Decision: Each duplicate is listed in the slice that implements or verifies its twin, so one review and one verification cover both.
- Consequences / how to reverse: The integrator marks each duplicate done with its twin's evidence. The critic can still flag a duplicate, and the state-writer can move it to another slice.
- Affects: S-001, S-005, S-006, S-010, S-011, S-019, S-022
