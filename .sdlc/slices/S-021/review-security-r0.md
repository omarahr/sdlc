# Review S-021, lens security, round 0

No blocking finding.

- Branch and head names pass through branches.parse before any use. Only parsed heads reach git commands.
- The merge command uses the PR number from gh, not the head name.
- A foreign branch or an sdlc/ branch is ignored under a custom format. The tests pin this.
- The state-PR fallback in head_is uses string prefix and suffix checks. It builds no pattern from the format.
- The slice stays low risk. The change reads refs and PR lists only. It writes no data.
