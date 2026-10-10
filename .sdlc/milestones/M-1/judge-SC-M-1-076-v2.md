# Judge report: SC-M-1-076, voter 2

Verdict: not refuted. This is a product bug.

Spec: R-019 acceptance says "Every name output parses back to the same kind and parts."

Reproduction, two runs each, in a scratch git repo:

- `branches.py name --repo D --kind slice --id S-001-attempt-2` exits 0 and prints `sdlc/S-001-attempt-2`.
- `branches.py parse --repo D --branch sdlc/S-001-attempt-2` gives kind `attempt`, id `S-001`, n 2.
- `name --kind slice --id S-001-v0-cli-0` exits 0 and prints `sdlc/S-001-v0-cli-0`, which is a verify name.
- `name --kind slice --id S-001-e2e` round-trips correctly.

The name command must refuse these ids, or print a name that parses back to kind slice.
