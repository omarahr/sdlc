# Tests S-036

- T-R-132 — R-132 — characterization: the prompt already holds the placeholders, so the test passes now. It fails if a loop branch literal returns.
- T-R-133 — R-133 — characterization: the prompt already holds three run branch placeholders, so the test passes now. It fails if a literal returns or a placeholder leaves.
- T-R-144 — R-144 — characterization: the prompt already holds the placeholders, so the test passes now. It fails if a literal returns or a placeholder leaves.
- T-R-148 — R-148 — characterization: the prompt already holds the placeholders, so the test passes now. It fails if a literal returns or a placeholder leaves.
- Fix round 1: T-R-144 removed. Its checks live in T-R-063a and T-R-080. T-R-132 and T-R-133 keep only their new assertions.
