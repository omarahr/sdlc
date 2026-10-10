# verify-contract part 0: S-024 round 0

Slice: S-024. Profile: contract. Round: 0. Commit: d23dd8a. Verdict: pass (12 of 12 cases).

Environment: Python 3 stdlib, Node test runner, scratch git repos through cli-runner, branches.parse called through property.mjs callPython; seed 424242.

Surface: `janitor.py` is a command. Consumers run it as `python3 janitor.py --repo DIR`. They read one JSON object with `removedDirs`, `removedBranches` and `notes`. The module exports no new names.

## TC-contract-1 (VS-4): Old-format verify branch stays under derived format; parse of sdlc/S-001 gives null kind; list omits it

- Result: pass
- Spec source: R-085 acceptance
- Test: `.sdlc/slices/S-024/verification/r0/tests/contract-0/janitor.verify-contract.test.mjs:17`

parse and list (transcript):
```
PARSE {"ok": true, "command": "parse", "branch": "sdlc/S-001", "kind": null}
LIST branches: [feature/sdlc/S-001] only
janitor removedBranches: []
```

## TC-contract-2 (VS-4): Property: parse under feature/sdlc/{name} returns null for every name without the prefix

- Result: pass
- Spec source: R-085 acceptance
- Test: `.sdlc/slices/S-024/verification/r0/tests/contract-0/janitor.verify-contract.test.mjs:40`

parse-derived-prefix (property-run):
```
property parse seed=424242 runs=1000 violations=0
model: a name without the prefix feature/sdlc/ parses to null
```

## TC-contract-3 (VS-4): Janitor leaves 40 random old-format verify branches of done, rejected and todo slices

- Result: pass
- Spec source: R-085 acceptance
- Test: `.sdlc/slices/S-024/verification/r0/tests/contract-0/janitor.verify-contract.test.mjs:59`

janitor-old-format (property-run):
```
seed=424242 runs=40 removedBranches=[] refs unchanged
```

## TC-contract-4 (VS-5): Lowercase example: s-001 done removed, s-999 unknown removed, s-002 todo and feature/p-1-run-1 stay

- Result: pass
- Spec source: R-086 acceptance
- Test: `.sdlc/slices/S-024/verification/r0/tests/contract-0/janitor.verify-contract.test.mjs:77`

janitor output (transcript):
```
removedBranches: [feature/p-1-s-001-v0-http-api-0, feature/p-1-s-999-v0-http-api-0]
remaining: feature/p-1-run-1, feature/p-1-s-002, feature/p-1-s-002-v0-http-api-0, main
```

## TC-contract-5 (VS-5): Property: parse with ledger ids resolves any case of a mixed-case ledger id to the ledger spelling with known true

- Result: pass
- Spec source: R-086 acceptance
- Test: `.sdlc/slices/S-024/verification/r0/tests/contract-0/janitor.verify-contract.test.mjs:92`

lower-resolve (property-run):
```
property parse seed=424242 runs=1000 violations=0
model: the id equals the ledger id that matches case-insensitively; unknown id gives known false
```

## TC-contract-6 (VS-5): Mixed-case ledger ids S-Ab1 done, S-Cd2 in_progress, S-eF3 rejected: done and rejected branches go, in_progress stays

- Result: pass
- Spec source: R-060 quote
- Test: `.sdlc/slices/S-024/verification/r0/tests/contract-0/janitor.verify-contract.test.mjs:117`

janitor output (transcript):
```
removed s-ab1 and s-ef3 verify branches; s-cd2 stays
```

## TC-contract-7 (VS-5): Determinism: second run removes nothing more; ledger file is not changed

- Result: pass
- Spec source: R-060 quote
- Test: `.sdlc/slices/S-024/verification/r0/tests/contract-0/janitor.verify-contract.test.mjs:131`

two runs (transcript):
```
run 1 removes 1 branch; run 2 removes none; slices.json bytes equal
```

## TC-contract-8 (VS-7): janitor.py text has no V_BRANCH or V_ID, calls branches.load_format(repo) and branches.parse, py_compile passes

- Result: pass
- Spec source: R-060 acceptance
- Test: `.sdlc/slices/S-024/verification/r0/tests/contract-0/janitor.verify-contract.test.mjs:146`

py_compile (type-check):
```
python3 -m py_compile skills/sdlc/janitor.py exit 0
```

## TC-contract-9 (VS-7): Every import in janitor.py is used; imports are standard library or branches only

- Result: pass
- Spec source: R-060 quote
- Test: `.sdlc/slices/S-024/verification/r0/tests/contract-0/janitor.verify-contract.test.mjs:156`

ast import check (log):
```
['argparse','branches','json','os','re','shutil','subprocess','sys','tempfile','time']
unused []
```

## TC-contract-10 (VS-7): Docstring names branches.parse, verify, done, rejected, the -attempt-<n> rule and the format; no V_BRANCH

- Result: pass
- Spec source: R-060 quote
- Test: `.sdlc/slices/S-024/verification/r0/tests/contract-0/janitor.verify-contract.test.mjs:181`

docstring check (log):
```
all expected terms present
```

## TC-contract-11 (VS-7): Consumer view: unusable formats (no placeholder, two placeholders, mixed placeholders) give a note, delete nothing, exit 0

- Result: pass
- Spec source: R-060 quote
- Test: `.sdlc/slices/S-024/verification/r0/tests/contract-0/janitor.verify-contract.test.mjs:190`

three formats (transcript):
```
exit 0, removedBranches [], refs unchanged, notes name the format
```

## TC-contract-12 (VS-7): Format with whitespace (a b/{name}): nothing deleted

- Result: pass
- Spec source: R-060 quote
- Test: `.sdlc/slices/S-024/verification/r0/tests/contract-0/janitor.verify-contract.test.mjs:206`

output (transcript):
```
{"removedDirs":0,"removedBranches":[],"notes":[]}
```

## Seeds

- janitor accepts a whitespace format without a note: janitor.py checks the format with branches.split only, not validate_format. A format such as 'a b/{name}' gives no note. It deletes nothing, because git refuses such branch names.
- janitor docstring summary line is stale: The first line still says 'leftover slice branches'. The sweep now deletes verify branches only.

Full run log: `.sdlc/slices/S-024/verification/r0/logs/contract-0-run.txt`.
