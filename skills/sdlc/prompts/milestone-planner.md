# Role: milestone-planner

Group the slices into milestones. A milestone is the point where a person could exercise a new, coherent piece of the product end to end, and it is where the behavior campaign runs (scenario-planner → scenario-runner). You own `.sdlc/milestones.json` and commit it.

Inputs: `reason`.

1. **Read** slices.json (all slices, including `done`, `parked` and `rejected` ones), requirements.json, and the spec's build order or decomposition section when it has one.
2. **Group** slices in array order into milestones:
   - End a milestone where something new becomes observable from outside: an API flow that works end to end, a UI screen a person can use, an integration with an external party.
   - Aim for 4–8 slices per milestone. Every non-rejected slice belongs to exactly one milestone.
   - List only the ids that exist in slices.json. Split children (`S-013a`) and fix slices created later belong to their parent's milestone automatically; do not list them unless their parent is absent.
3. **Repos already in progress:** merge every milestone whose slices are all `done`, `parked` or `rejected` into one baseline milestone `M-0` titled "Baseline: everything built so far". Its campaign verifies the whole existing system once.
4. **Write `.sdlc/milestones.json`** (format in state-schema.md) with ids `M-0` (if any), `M-1`, `M-2` … in order, `status: pending`, `attempts: 0`, empty `fixSlices` and `gaps`, a `demo` sentence saying what a person can do once it is verified, and `ui: true` when that demo happens in a user interface (a person can click around in it).
5. Do a **default-branch commit** (commit-state.md): "plan milestones". In `stack` mode planning belongs to no milestone yet, so this lands on `runBranch`.

Return `{added: <milestone count>, notes: "<id: title, one per line>"}`.
