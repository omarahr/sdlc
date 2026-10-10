# S-032 evidence

R-136: only the pr preflight samples a state branch.
Tests: T-R-039a, T-R-039b, T-R-039c, T-R-040c. The cli verification case TC-cli-1 also checks it.

R-137: only the stack preflight samples run and milestone. Only the pr preflight samples e2e.
Tests: T-R-039a, T-R-039b, T-R-039c, T-R-040c. The security verification cases check it with 130 hostile entries.

The slice changed no product code. The gate receipt covers commit b22252e.
