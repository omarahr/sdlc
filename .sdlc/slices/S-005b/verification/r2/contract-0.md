# S-005b verify contract, part 0, round 2

Slice: S-005b. Profile: contract. Round: 2. Plan round: 1. Commit: 39aa68f. Verdict: refuted (3 of 5 cases pass; VS-13 fails on a bytes option).

## Environment

macOS, node --test, git 2.50.1 (Apple Git-155), python 3.14.7 (homebrew), 3.12.14 (uv), 3.9.6 (/usr/bin); scratch copies of skills and hooks; module-loader with a local bare remote.

## Surface

The surface listing is in `logs/contract-0-surface.txt`. The contract is the `push_guard.py` JSON output (14 keys). The fix adds `value_nodes()` and a `value` entry in `wrapperVerbs` for each non-constant wrapper argument.

## TC-contract-29 (VS-13): A literal option after a known wrapper verb, in any spelling, changes wrapperVerbs, opaque or pushes

- Given: state-write.py, suite-receipt.py and next-action.py at 39aa68f, and a reference model from the VS-13 title: each option token after a wrapper verb is recorded or opaque.
- When: A seeded generator appends a new function with one wrapper call: a known verb, then an option in 15 spellings; the scanner runs on the file.
- Then: wrapperVerbs, opaque or pushes differs from the clean scan of that file.
- Expected: 0 counterexamples.
- Actual: 0 counterexamples in 1000 runs on python 3.14.7, 3.12.14 and 3.9.6. The 412 round 1 counterexamples (f-string, strip, str, format, join, percent) now change wrapperVerbs. The seed S1 forms (variable, starred list, leading variable) also change wrapperVerbs.
- Result: pass.
- Spec source: R-119 acceptance; ADR-20261009-062930-decision-judge-S-005-388e (a new form that is a process call refutes when the output stays equal to the pins); spec-fidelity r1 D-1.
- Test: `.sdlc/slices/S-005b/verification/r2/tests/contract-0/options.verify-contract.test.mjs:54`.
- Command: `VERIFY_ROOT=<slice worktree> node --test .sdlc/slices/S-005b/verification/r2/tests/contract-0/options.verify-contract.test.mjs --test-name-pattern TC-contract-29`.

r1 option spellings after a known verb (property-run):

```
seed 20261009, runs 1000, python 3.14.7 / 3.12.14 / 3.9.6: failures 0 on each
all literal kinds hit on every run: const, two-tokens, concat-const, whitespace-pad, fstring-leading-expr, strip-call, str-call, format-call, join-call, percent
seed S1 kinds (not counted): variable 65/65, starred-list 70/70, fstring-leading-var 64/64, concat-var-first 63/63
observation (not counted): confusable dash 69/16; git does not read it as an option
```

property on three pythons (log): `.sdlc/slices/S-005b/verification/r2/logs/contract-0-pythons.txt`.

node test run, 8 pass, 4 fail (log): `.sdlc/slices/S-005b/verification/r2/logs/contract-0-run.txt`.

## TC-contract-30 (VS-13): Five hidden-option mutants push a verify branch only when the guard flags them

- Given: A scratch copy of skills and hooks at 39aa68f, and a work repo with a bare origin and a local branch sdlc/S-001-v0-cli-0.
- When: A function with one wrapper call (m1, m2, a format call, m3, a join call) is appended to state-write.py or next-action.py; push_guard.py scans the copy; module-loader calls the function.
- Then: The guard output differs from the clean output, or the bare remote holds no verify ref.
- Expected: A changed key, or no verify ref on the remote.
- Actual: Each mutant still pushes the verify ref, but each one now changes wrapperVerbs, so the guard fails
- Result: pass.
- Spec source: R-119 acceptance; ADR-20261009-062930-decision-judge-S-005-388e (a new form that is a process call refutes when the output stays equal to the pins); spec-fidelity r1 D-1.
- Test: `.sdlc/slices/S-005b/verification/r2/tests/contract-0/options.verify-contract.test.mjs:68`.
- Command: `VERIFY_ROOT=<slice worktree> node --test .sdlc/slices/S-005b/verification/r2/tests/contract-0/options.verify-contract.test.mjs --test-name-pattern TC-contract-30`.

guard keys and remote refs per mutant (transcript):

```
git 2.50.1 (Apple Git-155); python 3.14.7
m1 state-write.py f"{''}--upload-pack=..." -> changed keys: wrapperVerbs; refs added: refs/heads/sdlc/S-001-v0-cli-0
m2 state-write.py "--upload-pack=...".strip() -> changed keys: wrapperVerbs; refs added: refs/heads/sdlc/S-001-v0-cli-0
   state-write.py "{}".format(...) -> changed keys: wrapperVerbs; refs added: refs/heads/sdlc/S-001-v0-cli-0
m3 next-action.py str("--upload-pack=...") -> changed keys: wrapperVerbs; refs added: refs/heads/sdlc/S-001-v0-cli-0
   next-action.py "".join([...]) -> changed keys: wrapperVerbs; refs added: refs/heads/sdlc/S-001-v0-cli-0
```

node test run, 8 pass, 4 fail (log): `.sdlc/slices/S-005b/verification/r2/logs/contract-0-run.txt`.

## TC-contract-31 (VS-13): The clean tree has no opaque entry and no command-running option in wrapperVerbs

- Given: The clean tree at 39aa68f.
- When: push_guard.py scans it.
- Then: opaque is empty; no option entry and no value entry in wrapperVerbs names a command-running option.
- Expected: opaque [], 0 command-running options.
- Actual: opaque []; 91 wrapperVerbs entries (was 63): the new entries are value pins of existing non-constant arguments; none names --upload-pack, --receive-pack, --exec, --config, -c, or -u outside push
- Result: pass.
- Spec source: R-119 acceptance; plan-r1 VS-13 notes.
- Test: `.sdlc/slices/S-005b/verification/r2/tests/contract-0/options.verify-contract.test.mjs:75`.
- Command: `VERIFY_ROOT=<slice worktree> node --test .sdlc/slices/S-005b/verification/r2/tests/contract-0/options.verify-contract.test.mjs --test-name-pattern TC-contract-31`.

surface listing at 39aa68f (log): `.sdlc/slices/S-005b/verification/r2/logs/contract-0-surface.txt`.

node test run, 8 pass, 4 fail (log): `.sdlc/slices/S-005b/verification/r2/logs/contract-0-run.txt`.

## TC-contract-35 (VS-13): More literal option spellings after a known wrapper verb change wrapperVerbs, opaque or pushes

- Given: state-write.py, suite-receipt.py and next-action.py at 39aa68f, and the same reference model as TC-contract-29.
- When: A seeded generator appends a new function with one wrapper call: a known verb, then an option in 12 new spellings (bytes literal, bytes in two tokens, starred constant list and tuple, conditional, subscript, walrus, bytes decode, os.fspath, tab, newline and no-break-space padding).
- Then: wrapperVerbs, opaque or pushes differs from the clean scan of that file.
- Expected: 0 counterexamples.
- Actual: 162 counterexamples in 1000 runs on each python. Every one is a bytes literal: bytes-const 76 of 92 leave every key equal, bytes-two-tokens 86 of 110. The hits are runs whose verb is new for the file or is push. All other new spellings change wrapperVerbs.
- Result: fail.
- Spec source: R-119 acceptance; ADR-20261009-062930-decision-judge-S-005-388e (a new form that is a process call refutes when the output stays equal to the pins); plan-r1 VS-13 (a new option after a known wrapper verb, in any spelling).
- Test: `.sdlc/slices/S-005b/verification/r2/tests/contract-0/options.verify-contract.test.mjs:86`.
- Command: `VERIFY_ROOT=<slice worktree> node --test .sdlc/slices/S-005b/verification/r2/tests/contract-0/options.verify-contract.test.mjs --test-name-pattern TC-contract-35`.

r2 option spellings after a known verb (property-run):

```
seed 20261009, runs 1000, python 3.14.7 / 3.12.14 / 3.9.6: failures 162 on each
kinds (runs/hits): bytes-const 92/16, bytes-two-tokens 110/24
starred-const-list 76/76, starred-const-tuple 67/67, ifexp 92/92, subscript 86/86, walrus 76/76
bytes-decode 72/72, fspath 84/84, tab-pad 79/79, newline-pad 87/87, nbsp-pad 79/79
first counterexample: git(repo, 'checkout', 'origin', b'-u', b'git push origin sdlc/S-001-v0-cli-0;:', check=False) -> changed keys []
second: suite-receipt.py git(repo, 'rev-parse', 'origin', b'--config=git push origin sdlc/S-001-v0-cli-0;:') -> changed keys []
cause: pieces() reads a bytes Constant as const text "b'--...'"; value_nodes() skips it and classify() sees no leading dash
```

property on three pythons (log): `.sdlc/slices/S-005b/verification/r2/logs/contract-0-pythons.txt`.

node test run, 8 pass, 4 fail (log): `.sdlc/slices/S-005b/verification/r2/logs/contract-0-run.txt`.

## TC-contract-36 (VS-13): A bytes option after a known wrapper verb pushes a verify branch while the guard output equals the clean output

- Given: A scratch copy of skills and hooks at 39aa68f, and a work repo with a bare origin and a local branch sdlc/S-001-v0-cli-0.
- When: A function with one wrapper call that passes b"--upload-pack=git push origin sdlc/S-001-v0-cli-0;:" after fetch is appended; push_guard.py scans the copy; module-loader calls the function.
- Then: The guard output differs from the clean output, or the bare remote holds no verify ref.
- Expected: A changed key, or no verify ref on the remote.
- Actual: Three of four mutants leave every key equal and create refs/heads/sdlc/S-001-v0-cli-0 on the bare remote: state-write.py one token, state-write.py two tokens, next-action.py one token. The suite-receipt.py mutant changes wrapperVerbs only because fetch is a new verb in that file.
- Result: fail.
- Spec source: R-119 acceptance; ADR-20261009-062930-decision-judge-S-005-388e (a new form that is a process call refutes when the output stays equal to the pins); plan-r1 VS-13 (a form that pushes a verify branch with every key equal refutes R-119).
- Test: `.sdlc/slices/S-005b/verification/r2/tests/contract-0/options.verify-contract.test.mjs:99`.
- Command: `VERIFY_ROOT=<slice worktree> node --test .sdlc/slices/S-005b/verification/r2/tests/contract-0/options.verify-contract.test.mjs --test-name-pattern TC-contract-36`.

guard keys and remote refs per bytes mutant (transcript):

```
git 2.50.1 (Apple Git-155); python 3.14.7
state-write.py git(repo, "fetch", "origin", b"--upload-pack=git push origin sdlc/S-001-v0-cli-0;:", check=False)
   changed keys: <none>; outcome: return; refs added: refs/heads/sdlc/S-001-v0-cli-0
state-write.py git(repo, "fetch", b"--upload-pack", b"git push origin sdlc/S-001-v0-cli-0;:", "origin", check=False)
   changed keys: <none>; outcome: return; refs added: refs/heads/sdlc/S-001-v0-cli-0
suite-receipt.py git(repo, "fetch", "origin", b"--upload-pack=...")
   changed keys: wrapperVerbs (new verb fetch); outcome: exception TypeError; refs added: refs/heads/sdlc/S-001-v0-cli-0
next-action.py run(repo, "git", "fetch", "origin", b"--upload-pack=git push origin sdlc/S-001-v0-cli-0;:")
   changed keys: <none>; outcome: return; refs added: refs/heads/sdlc/S-001-v0-cli-0
```

node test run, 8 pass, 4 fail (log): `.sdlc/slices/S-005b/verification/r2/logs/contract-0-run.txt`.

## Attacks

None.

## Seeds

- push_guard.py: value pins dedupe on (function, expression) text (`skills/sdlc/test/push_guard.py`): wrapperVerbs value entries are keyed by file, program, function name and argument text. A new wrapper call in an existing function that reuses a pinned argument text (for example a new git(repo, 'fetch', 'origin', path) in shipped_into, where 'path' is already pinned) adds no new entry. A rebind of that name before the call is seed S1 (data flow), so it does not refute. Not run as a behavior case.
- suite-receipt.py and state-write.py git(): error path joins args with ' '.join (`skills/sdlc/suite-receipt.py`): A bytes argument raises TypeError in the error message path. This is product robustness only; no product code passes bytes today.
