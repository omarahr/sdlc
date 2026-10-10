# Review S-021, lens architecture, round 1

Result: no blocking finding.

## Non-blocking
- `head_is` in `decide` keeps a fallback for state heads that `branches.parse` rejects. The fallback accepts any `state-*` head and reads `branches.split` directly. R-054 says state heads parse to `state`. Delete the fallback, or move the tolerance into `branches.py`.
- `head_kind` is a one-line wrapper over `branches.parse`. Call `branches.parse(fmt, ...)` directly, or keep the wrapper for every call.
- The milestone check was `sdlc/M-[^/]+`. It is now `M-\d+`. The change is correct for ledger ids and has no test for a non-numeric milestone head.
