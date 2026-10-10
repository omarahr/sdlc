# Review: architecture, round 0

Verdict: no blocking finding.

The change stays inside `parse` in `skills/sdlc/branches.py`, as the plan says. One helper holds the ASCII lowering.

Non-blocking notes:
- `ASCII_LOWER_TABLE` is a public name and `_ascii_lower` is private. Make the table private, or keep both public.
- `name` at line 306 still uses `str.lower()`. Slice S-fix-M-1-1b owns that change.
- `next-action.py` line 207 compares ids with `str.lower()`. The parsed id is ASCII now, so the risk is low. Use the shared helper in a later slice.
