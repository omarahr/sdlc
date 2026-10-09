## Escalation step 1 (replan)
- Why: plan refuted 3 times.
- Attempts: plan.md is at revision 2. Revision 1 added make_rule, RULE_SOURCES, RULE_KINDS and RULE_KEYS. Spec-fidelity critique called these extra behavior. Revision 2 cut them and kept evaluate and regex_error.
- Failing evidence: R-026 reads "Every rule read_rules returns has exactly these keys". S-011 has no read_rules, so no S-011 test can check it. Each plan revision either added unrequested code to reach R-026 or left R-026 untested.
- Cause: R-026 sits in the wrong slice. read_rules belongs to S-013 and S-014.
- Action taken: R-026 moves from S-011 to S-014, the slice that completes read_rules. S-011 now owns R-033, R-095, R-034 and R-072 only.
- Notes for the new plan: build only evaluate and regex_error. Add no make_rule and no constants. Do not write the "cannot evaluate" note here; S-012 writes it (R-035). Read the ADRs for S-011 in DECISIONS.md.
