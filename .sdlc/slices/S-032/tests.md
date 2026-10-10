No new tests in this slice.
Existing tests cover R-136 and R-137.
T-R-039 and T-R-040 pin the exact sampled kind list for each mode, with and without --branch.
R-136 maps to T-R-039 and T-R-040: only the pr mode samples a state branch.
R-137 maps to T-R-039 and T-R-040: only stack samples run and milestone, only pr samples e2e. The exact lists exclude e2e-area, verify and attempt.
