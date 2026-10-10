# Tests: S-024

- the janitor has no V_BRANCH or V_ID — R-060 — `janitor.py` still holds `V_BRANCH` and `V_ID`.
- the janitor deletes verify branches of finished and unknown slices and keeps live ones — R-060 — the janitor does not parse verify branches, so it keeps them.
- the janitor sweeps verify branches under a custom format and never touches run or attempt branches — R-060, R-079 — the janitor ignores the custom format, so it removes nothing.
- the janitor leaves an old-format verify branch under a derived format — R-085 — the janitor still sweeps the `sdlc/` verify branch.
- the janitor resolves a lowercased id through the ledger — R-086 — the janitor ignores the `{name:lower}` format, so it removes nothing.
- the janitor notes an unusable format and deletes nothing — R-060 — the janitor does not load the format, so it adds no note about it.
- the janitor prunes a stale worktree registration before sweeping, so the branch is not pinned forever — characterization — passes now; the branch uses the verify shape.
- the janitor notes missing or unreadable state instead of deleting, and still runs — characterization — passes now; the branch uses the verify shape.
