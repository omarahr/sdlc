Verdict: HELD

Checked in a scratch worktree at the head of sdlc/S-009 (commit d29cba7). The scratch worktree is removed.

## Requirement checks

| Requirement | Spec says | Checked how | Tests | Result |
|---|---|---|---|---|
| R-106 | `^state-(\d{14})$`, gives `ts` | Read PARSE_ROWS. Ran tests. Mutation: `\d+` in the state row fails T-R-106b. | skills/sdlc/test/branches.test.mjs:1139, :1151, :1248 | holds |
| R-107 | `^(.+)-v(\d+)-([a-z0-9-]+?)-(\d+)$`, gives id, round, profile, part | Read PARSE_ROWS. Mutations: slice row before verify fails T-R-107a/b/c. `\d*` round fails T-R-107c. | skills/sdlc/test/branches.test.mjs:1163, :1182, :1194, :1248, :1267 | holds |
| R-108 | `^(.+)-attempt-(\d+)$`, gives id, n | Read PARSE_ROWS. Mutation: slice row before attempt fails T-R-108a/b. | skills/sdlc/test/branches.test.mjs:1205, :1218, :1248, :1267 | holds |
| R-109 | `^(S-[A-Za-z0-9-]+)$`, gives id | Read PARSE_ROWS. Ran boundary cases. Slice row after verify and attempt. | skills/sdlc/test/branches.test.mjs:1227, :1239, :1248, :1267 | holds |

Plan check: every requirement has a scenario in plan-r0.json. Each scenario has the contract and cli profiles.

## Defects

None. One mutation survived: a greedy profile group (`[a-z0-9-]+`). It gives the same parse for every input, because the part group takes the last digits. It is an equivalent mutant.

## Commands
- `node --test skills/sdlc/test/branches.test.mjs`: 66 pass, 0 fail.
