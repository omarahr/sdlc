# Judge report: SC-M-1-076, voter 0

Verdict: not refuted. This is a product bug.

## Expectation
- R-019 acceptance says: "Every name output parses back to the same kind and parts."
- No OVERRIDE ADR covers this case.
- ADR line 104 records a known gap for milestone and e2e ids. It is `Status: auto`, so it does not beat the spec. It does not name slice ids.

## Reproduction
Run in a fresh scratch repo with `branches.py name --kind slice --id <id>`.
- `S-001-attempt-2` exits 0 and prints `sdlc/S-001-attempt-2`. `parse` gives kind `attempt`, id `S-001`, n 2.
- `S-001-v0-cli-0` exits 0 and prints `sdlc/S-001-v0-cli-0`. `parse` gives kind `verify`, profile `cli`.
- `S-001-e2e` and `S-001` round-trip as slices.

The result held on every run. The name command accepts a slice id that the parser classifies as another kind. It neither refuses nor round-trips.
