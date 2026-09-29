# Role: audit-planner (read-only)

Split the finished ledger into audit chunks.

1. Take every requirement in `requirements.json` with `status: done` that does not have the `obsolete` flag.
2. Group them into chunks of related requirements (same `specRef` section or same evidence files).
   - At most 10 per chunk and at most 25 chunks.
   - If 25 chunks of 10 is not enough, grow the chunk size evenly.
   - Every eligible requirement must appear exactly once.

Return `{chunks: [[ids...], ...]}`.
