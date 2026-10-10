# Tests S-017

Branches.py already holds the preflight paths. These tests pin them, so they pass now. Each is marked characterization.

- T-R-091a — R-091 — characterization: one gh regex rule that the default passes gives ok and no suggestion
- T-R-091b — R-091 — characterization: the same rule through glab gives the same keys
- T-R-092a — R-092 — characterization: two rules give a generic suggestion and no derived format
- T-R-092b — R-092 — characterization: each failing sample names alpha or beta
- T-R-092c — R-092 — characterization: a negated contains rule gives no derived format
- T-R-100a — R-100 — characterization: rules of another type leave rules empty and ok
- T-R-100b — R-100 — characterization: an empty list gives pass on every sample
- T-R-100c — R-100 — characterization: a per-sample rule fails only its sample
- T-R-074a — R-074 — characterization: seven shim scenarios in one test
