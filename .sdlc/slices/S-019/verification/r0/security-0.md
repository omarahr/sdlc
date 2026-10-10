# Verification security-0

Slice S-019 · profile security · round 0 · commit f22f644 · verdict: verified (no in-scope case failed)

Environment: Node 24 test runner, python3, scratch git repos from cli-runner; no network

Threat model: the branch format and branch names come from the user and the forge. They are untrusted input for the script. The driver is trusted.

## TC-security-1 (VS-1): name --n count+1 matches the format; older-format run branches are not counted

- Expected: list returns 0, 1 and 3 run branches; name prints run-<count+1>; the tree does not change
- Actual: held for default and custom format wip/{name}-x; old/run-9 not counted; treeUnchanged true
- Result: pass
- Spec source: R-047 acceptance
- Test: `.sdlc/slices/S-019/verification/r0/tests/security-0/branches.verify-security.test.mjs:13`

```
list/name on 0,1,3 run branches: counts 0/1/3, names run-1/2/4
```

## TC-security-2 (VS-1): Hostile --format values fail clearly and change no tree

- Expected: corpus values (flag-like, traversal, injection, control chars, whitespace, format strings, {name}/../../x, empty) give exit 0 or JSON error exit 2; no unsafe branch name; no tree change
- Actual: all held on name and list; no unsafe name accepted
- Result: pass
- Spec source: R-047 acceptance (scenario notes)
- Test: `.sdlc/slices/S-019/verification/r0/tests/security-0/branches.verify-security.test.mjs:24`

```
about 90 values x 2 commands, treeUnchanged true for each, no unsafe branch printed
```

## TC-security-3 (VS-1): NUL in --format cannot reach the script

- Expected: spawn fails before the script runs; no tree change
- Actual: spawnError, status null, tree unchanged
- Result: pass
- Spec source: R-047 acceptance (scenario notes)
- Test: `.sdlc/slices/S-019/verification/r0/tests/security-0/branches.verify-security.test.mjs:44`

```
spawnError on NUL argument
```

## TC-security-4 (VS-1): Hostile --n integer forms

- Expected: exit 0 with a numeric run name or exit 2; no tree change
- Actual: held; negative n gives sdlc/run--5000 (seed)
- Result: pass
- Spec source: R-047 acceptance (scenario notes)
- Test: `.sdlc/slices/S-019/verification/r0/tests/security-0/branches.verify-security.test.mjs:52`

```
unicode-digits, huge-integers, integer-forms families
```

## TC-security-5 (VS-3): Near misses do not parse as a loop kind

- Expected: none of 22 near misses prints a kind (feature-x, run-, feature-S-002, case changes, trailing slash, double slash, fullwidth digits in S-, run-1x)
- Actual: held
- Result: pass
- Spec source: R-101 acceptance
- Test: `.sdlc/slices/S-019/verification/r0/tests/security-0/branches.verify-security.test.mjs:60`

```
22 branches, kind null each
```

## TC-security-6 (VS-3): Characterization of accepted lookalikes

- Expected: sdlc/feature-x has no kind; documented lookalikes parse as loop kinds
- Actual: sdlc/feature-x null; sdlc/S-002x slice; unicode digits after run- parse as run; a trailing newline parses as run
- Result: pass
- Spec source: R-101 acceptance
- Test: `.sdlc/slices/S-019/verification/r0/tests/security-0/branches.verify-security.test.mjs:65`

```
see seeds
```

## TC-security-7 (VS-4): feature/PROJ-1-S-002 parses as slice; near misses and regex-character prefixes

- Expected: slice S-002 for the example; null for foo, repeated prefix, empty tail, wrong case; regex characters in the prefix stay literal; stderr empty; exit 0
- Actual: held
- Result: pass
- Spec source: R-118 acceptance
- Test: `.sdlc/slices/S-019/verification/r0/tests/security-0/branches.verify-security.test.mjs:74`

```
parse exit 0, stderr empty, kind slice id S-002; prefixes a.b(c)+, p[1]*, x|y, a^b, a$b, (?i)
```

## Attacks

- A-1 held: Explore the run-branch count with generated repos to find a wrong n (R-047). Input: 0, 1, 3 run branches; custom format; old/run-9. Observed: correct.
- A-2 held: Explore --format with the attack corpus to find an unsafe branch name or a tree change (R-047). Input: flag-like, traversal, injection, control-chars, unicode-whitespace, format-strings, {name}/../../x, ../{name}, {name}.lock, {name}{name}, empty. Observed: exit 2 JSON errors or safe names, tree unchanged.
- A-3 held: Explore NUL in --format. Input: a\0{name}. Observed: argv cannot carry NUL.
- A-4 out-of-scope: Explore --n with integer forms. Input: unicode digits, huge, negative. Observed: --n -5000 gives sdlc/run--5000.
- A-5 held: Explore parse near misses to find an accidental loop kind (R-101). Input: 22 near misses. Observed: no kind.
- A-6 out-of-scope: Explore unicode digits and suffix lookalikes (R-101). Input: sdlc/run-<unicode digit>, sdlc/S-002x, newline tail. Observed: parse as run or slice.
- A-7 held: Explore regex characters and repeated prefix in the format (R-118). Input: feature/PROJ-1-feature/PROJ-1-S-002 and 6 prefixes. Observed: literal match.

## Seeds

- branches.py name accepts negative --n: name --kind run --n -5000 prints sdlc/run--5000, which parse does not read back as a run (regex needs digits only). The driver computes n from the list count, so it cannot reach this path.
- parse treats non-ASCII digits and S-<anything> as loop kinds: sdlc/run-٣ parses as run n=3 and sdlc/S-002x parses as slice. A user branch of that shape would ask for a rename or count as a run branch. The spec names only sdlc/feature-x. Python \d and a permissive slice id cause this.
- parse accepts a trailing newline: re.search with $ matches before a final newline, so sdlc/run-1<LF> parses as run. Git refuses such names, so no real branch reaches it.
