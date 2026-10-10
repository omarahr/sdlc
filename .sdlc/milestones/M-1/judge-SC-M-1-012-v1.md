# Judge report: SC-M-1-012 (voter 1)

Verdict: refuted. Class: out-of-scope.

## Spec check
R-017 and R-142 cover validate_format and literal text in the format. They say nothing about the values of --id or --area.
R-014 requires one JSON object and exit 2 on bad input. No requirement says name must check the built branch with git check-ref-format.
The scenario source quotes "no whitespace" from the format rule. The spec does not apply that rule to ids.
No OVERRIDE ADR covers this.

## Reproduction
I ran name on a scratch repo with three hostile ids. Each call exited 0 and printed one JSON object.
The ids were 'S-001; touch /tmp/p', 'S-001' newline 'S-002', and '../../etc/passwd'.
The branch holds the hostile text, as the runner says. No file was created and no second object was printed.
The real contract holds: one JSON object, no shell run, no leak.

## Decision
Slice, milestone and area ids come from the orchestrator, not from a user. A check on ids is hardening beyond the spec.
Fix, if wanted: call ref_format_error on the built branch in cmd_name.
