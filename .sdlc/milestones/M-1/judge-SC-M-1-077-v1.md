# Judge report: SC-M-1-077, voter 1

Verdict: refuted. Class: test-bug.

- R-008 says: "An explicit ts part is used as given." The spec gives no rule that refuses a 13-digit ts.
- Spec section 2 says tail returns the tail from the section 1 table. Only parse row 5 needs 14 digits.
- I ran tail("state", ts="2026123123595"). It returned state-2026123123595. This is the "used as given" behavior.
- The CLI has no --ts flag. NAME_PARTS holds id, n, area, round, profile and part. The spec lists no ts flag.
- The scenario step and the expected exit 2 for a 13-digit ts come from the scenario author. The spec does not say them.
- The UTC digits and the 14-digit ts checks pass, so no product defect remains.
