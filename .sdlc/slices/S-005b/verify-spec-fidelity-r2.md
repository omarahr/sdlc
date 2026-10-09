Verdict: REFUTED

Worktree: `$TMPDIR/sdlc-S-005b-spec-fidelity-r2` (detached, removed after the check). Commit: `80f5b0cdde7420d26299c9c06c72fc52244d64a4` on `sdlc/S-005b`. Base: `main`.

## Requirement checks

| Requirement | Spec says | Checked how | Tests | Result |
|---|---|---|---|---|
| R-119 | "\| `verify` \| `<sliceId>-v<round>-<profile>-<part>` \| `sdlc/S-001-v0-http-api-0` \| never \|" - acceptance: "A source check over `sdlc-loop.js` and the skill scripts finds no `git push` or pull-request creation for a branch whose parsed kind is `verify`. A verify branch stays local." | Ran `node --test skills/sdlc/test/push-guard.test.mjs` (7 of 7 pass). Ran `push_guard.py` on the clean tree. Added 11 mutants to scratch copies and compared the output with the clean output. Ran the bytes mutant against a local bare remote. | `skills/sdlc/test/push-guard.test.mjs` (T-R-119a to T-R-119g) | refuted |

Mutants that change the output (guarded): parenthesized option, starred tuple, conditional expression, implicit concatenation, split option, `push` verb, `--receive-pack`.

## Defects

### D-1: a `bytes` constant argument to a pinned wrapper leaves every key equal and pushes a verify branch

Spec source: R-119 acceptance; ADR-20261009-062930-decision-judge-S-005-388e (a new process-call form that leaves the output equal to the pins refutes R-119); tests.md scope "in any spelling of the constant arguments".

Steps to reproduce:
1. Copy `skills` and `hooks` to a scratch directory.
2. Append to `state-write.py`: `def sf_m1(repo): return git(repo, "fetch", "origin", b"--upload-pack=git push origin sdlc/S-001-v0-cli-0;:", check=False)`.
3. Run `python3 skills/sdlc/test/push_guard.py <scratch>` and compare with the clean output.
4. In a work repo with a bare `origin` and a local branch `sdlc/S-001-v0-cli-0`, call `subprocess.run(["git","fetch","origin",b"--upload-pack=git push origin sdlc/S-001-v0-cli-0;:"])`.

Expected: the output differs from the pins (a `wrapperVerbs`, `value` or `opaque` entry). The verify branch stays local.
Actual: no key changes. The same result holds for `run(repo, "git", "fetch", "-q", "origin", b"--upload-pack=x")` in `next-action.py` and for `git(repo, "rev-parse", 5)` in `suite-receipt.py`. The bare remote then holds `sdlc/S-001-v0-cli-0`.

Cause: a non-`str` constant is not read as an option and is not treated as a non-constant value.
Fix hint: make any non-`str` constant argument of a wrapper or direct call opaque, or decode `bytes` to text. Add the mutants to T-R-119e.

## Test gap
- `verification/plan-r2.json` does not exist. I could not check the round 2 plan.

## Seeds
- `git(repo, "fetch", "origin", **{...})` leaves every key equal. A double-star argument is likely the same class as D-1. (`skills/sdlc/test/push_guard.py`)
- tests.md holds duplicate "Fix round 2 rows" sections. Document gap only. (`.sdlc/slices/S-005b/tests.md`)
