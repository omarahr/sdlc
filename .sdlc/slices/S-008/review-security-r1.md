# Review S-008 security r1

Verdict: no blocking finding.

- The slice adds tests only for rows 1 to 4. The diff to `branches.py` is the S-007 parse code.
- `parse` runs no shell and no file write. The CLI echoes the branch as JSON. Hostile tails give a kind or null.
- `sys.set_int_max_str_digits(0)` removes the int limit. A very long digit tail then costs more time. Git limits ref length, so the risk is low.
- `$` accepts a trailing newline and `\d` accepts Unicode digits. The spec gives these regexes. Git refuses a newline in a ref name. Impact is low.
- Row 4 accepts a slash in the area. ADR-20261009-173303-decision-judge-S-008-a88a keeps this behavior.
