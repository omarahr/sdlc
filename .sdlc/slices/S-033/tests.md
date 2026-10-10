# Tests S-033

- the prune treats only branches that parse to milestone as milestone branches under a custom format — R-138 — characterization, passes now
- branch_run takes a run branch only when it parses to kind run — R-138 — branch_run takes no fmt argument yet (TypeError)
- a foreign branch is not taken as the run branch — R-138 — branch_run returns "main" and the refusal "belongs to run" fires
- a repo whose config holds feature/PROJ-1-{name} makes the janitor sweep under that format — R-139 — characterization, passes now
- a repo with no branchFormat makes the janitor sweep under sdlc/{name} — R-139 — characterization, passes now
- janitor.py takes its format from load_format — R-139 — characterization, passes now
