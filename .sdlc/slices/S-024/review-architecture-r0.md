# Architecture review: S-024, round 0

The change fits the spec. The janitor drops its own branch regexes and uses `branches.parse`.
It deletes only the kind `verify`. It keeps every other kind and every name that does not parse.
An unreadable format becomes a note, and the scratch reaping still runs first.

Findings (none blocking):
- `main()` calls `branches.split(fmt)` only to validate the format. Call `branches.validate_format(fmt)` instead, if it exists, to name the intent.
- The `-attempt-<n>` guard is a janitor rule that duplicates knowledge of the attempt shape in `branches.py`. Move it into `branches.py` later.
- Old comments in the janitor stay. The role rules ask for no comments in new code. The change adds none.
