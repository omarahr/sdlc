# Judge report: SC-M-1-076, voter 1

Verdict: not refuted. This is a product bug.

## Expectation
- R-019 acceptance: "Every name output parses back to the same kind and parts."
- No OVERRIDE ADR covers this case. The known-gap ADR (DECISIONS.md line 104) has Status auto. It names milestone and e2e ids and negative run n, not slice ids.

## Reproduction
Three runs in a fresh scratch repo with `branches.py name --kind slice --id <id>`, then `parse` on the printed branch.
- `S-001-attempt-2` exits 0, prints `sdlc/S-001-attempt-2`. `parse` gives kind `attempt`.
- `S-001-v0-cli-0` exits 0, prints `sdlc/S-001-v0-cli-0`. `parse` gives kind `verify`.
- `S-001-e2e` round-trips as a slice.
The result was the same on every run. The command neither refuses nor round-trips.
