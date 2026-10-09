# S-014 · read_rules reads the GitLab push rule and the no-forge case
Verdict: RELEASED
Commit under test: c1b5dff (verified); branch head c69c64b (state commits only) · Rounds: 1 (round 0) · Attempts: 1 · Risk: medium · Written: 2026-10-10 UTC

| Requirements | Scenarios | Cases | Passed | Failed | Blocked | Blocking defects found / fixed | Open seeds |
|---|---|---|---|---|---|---|---|
| 4 | 9 | 50 | 50 | 0 | 0 | 0 / 0 | 12 |

## Summary
The slice finishes `read_rules(repo, samples)` in `skills/sdlc/branches.py`. For a GitLab repo it runs `glab api projects/:fullpath/push_rule` once. A `branch_name_regex` becomes one regex rule with the label `push rule`. A null body, a missing regex and an empty regex give no rule. A failed `glab` call gives one note and unchecked samples. With no forge, the function makes no call. Three profiles ran in round 0 against a `glab` shim: contract (24 cases), security (14 cases, 58 attacks) and cli (12 cases). All 50 cases passed, and the full suite and the Gate passed. The verifiers found no blocking defect. Their seeds concern raw stderr in notes and a spaces-only regex.

## Open risks
- R-084 stays open after this slice. The slice proves the `glab` half (T-R-084b, TC-cli-4, TC-security-7). S-015 adds the preflight half and closes it (ADR 74ec, ADR 8081).
- A failure note keeps the whole `glab` stderr, with line breaks, NUL and escape codes, at any length (2 MB tested). S-015 prints the note. Collapse control characters and cap the length before it does. The spec states no limit.
- `read_rules` raises `Fail` for a `config.json` that is not valid JSON. The spec states no behavior. S-015 must catch `Fail`.
- A forked grandchild of `glab` stays alive after the timeout. The code kills only the direct process (TC-security-10 probe).
- A spaces-only `branch_name_regex` becomes a rule that matches names with spaces. The spec treats only an empty regex as no rule.
- The spec sentence "an error means no rule" conflicts with R-031. ADR f2c2 resolves it: exit 0 with a JSON error body is no rule, and a non-zero exit is a note. The spec text is not edited; proposals P-20261009-211639 and P-20261009-211807 hold the fix.
- The 60 second timeout is a plan choice. The spec states no number. A committed test (T-R-031d) covers the timeout path with `FORGE_TIMEOUT` set to 1.
- The spec names `read_rules(repo)`. The code takes `(repo, samples)` (ADR f2cc). The one push rule goes under every sample in `by_sample`.

## Traceability
| Requirement | Spec says | Scenarios | Cases | Result |
|---|---|---|---|---|
| R-030 | `glab api "projects/:fullpath/push_rule"` once. The literal `null` body, an error, or an empty `branch_name_regex` means no rule. Otherwise one rule, `kind` `regex`, `pattern` the regex, `label` `push rule`. | VS-1, VS-2, VS-3, VS-4, VS-5, VS-7, VS-8 | TC-contract-1/p0, TC-contract-2/p0, TC-contract-3/p0, TC-contract-4/p0, TC-contract-5/p0, TC-contract-6/p0, TC-contract-11/p0, TC-contract-1/p1, TC-contract-2/p1, TC-contract-3/p1, TC-contract-5/p1, TC-contract-6/p1, TC-contract-13/p1, TC-security-1, TC-security-2, TC-security-5, TC-security-13, TC-cli-11 | pass |
| R-031 | A `glab` failure is the note `rules unknown on gitlab: <stderr>` and the samples are `unchecked`. | VS-2, VS-4, VS-5, VS-7, VS-8, VS-9 | TC-contract-6/p0, TC-contract-7/p0, TC-contract-8/p0, TC-contract-11/p0, TC-contract-4/p1, TC-contract-5/p1, TC-contract-9/p1, TC-security-2, TC-security-3, TC-security-4, TC-security-7, TC-security-8, TC-security-9, TC-security-10, TC-security-13, TC-cli-4, TC-cli-5, TC-cli-6, TC-cli-7, TC-cli-8, TC-cli-9, TC-cli-10 | pass |
| R-032 | **No forge** (`forge` is `""`): no rules; every sample is `unchecked`. | VS-6 | TC-contract-9/p0, TC-contract-10/p0, TC-security-11, TC-security-12, TC-cli-1, TC-cli-2, TC-cli-3, TC-cli-12 | pass |
| R-026 | A rule is `{"source": "github" \| "gitlab", "kind": "starts_with" \| "ends_with" \| "contains" \| "regex", "pattern": str, "negate": bool, "label": str}`. | VS-1, VS-2, VS-7, VS-9 | TC-contract-3/p0, TC-contract-11/p0, TC-contract-1/p1, TC-contract-2/p1, TC-contract-7/p1, TC-contract-8/p1, TC-contract-9/p1, TC-contract-10/p1, TC-contract-11/p1, TC-contract-12/p1, TC-security-5, TC-security-6, TC-security-14 | pass |

The committed tests `T-R-030a` to `T-R-084b` in `skills/sdlc/test/branches.test.mjs:1900-2020` also guard these requirements. The regression verifier ran that file: 124 pass, 0 fail.

## Scenarios
### VS-1 · One glab call serves many samples, run in the repo
Profiles: contract, security. Risk: one call per sample, a wrong argv, or a wrong cwd. Try 1, 3 and 50 samples. The argv must be api projects/:fullpath/push_rule. The cwd must be the repo. A branch name in the samples must never reach the argv.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-contract-1/p0 | One glab call for 0, 1, 3 and 50 samples | PASS | `.sdlc/slices/S-014/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs:70` |
| TC-contract-2/p0 | Property: call count and argv over random sample sets | PASS | `.sdlc/slices/S-014/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs:82` |
| TC-security-1 | One glab call for 1, 3, 50 and hostile samples | PASS | `.sdlc/slices/S-014/verification/r0/tests/security-0/read-rules.verify-security.test.mjs:65` |
| TC-security-14 | gh path: sample is percent-encoded in the path; FORGE_TIMEOUT applies to gh | PASS | `.sdlc/slices/S-014/verification/r0/tests/security-0/read-rules.verify-security.test.mjs:313` |

<details>
<summary>Case detail (4 cases)</summary>

#### TC-contract-1/p0 · One glab call for 0, 1, 3 and 50 samples · PASS
- **Given** A scratch repo with forge set as the case says and a glab shim that logs cwd and argv **When** read_rules(repo, samples) runs through python3 -I, with the shim first on PATH **Then** One call per read_rules. Argv is api projects/:fullpath/push_rule. Cwd is the repo. No branch name reaches argv.
- **Expected** One call per read_rules. Argv is api projects/:fullpath/push_rule. Cwd is the repo. No branch name reaches argv. **Actual** One call per read_rules. Argv is api projects/:fullpath/push_rule. Cwd is the repo. No branch name reaches argv. (observed)
- **Spec source:** R-030 acceptance · **Run:** `S014_MODULE=<worktree>/skills/sdlc/branches.py S014_TESTKIT=<worktree>/skills/sdlc/test/testkit TESTKIT_SEED=20261010 node --test .sdlc/slices/S-014/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs`
- Evidence (log): [run log](../../slices/S-014/verification/r0/logs/contract-0-run.txt)
- Evidence (file-tree): public surface (python3 -I import by path)

```text
def read_rules(repo, samples); def gitlab_rule(body); def github_rule(obj); def make_rule(source, kind, pattern, negate, label); def evaluate(rule, sample); def judge(rules, sample); const RULE_KEYS; const FORGE_TIMEOUT. GH_TIMEOUT is gone and no file uses it.
```

- Full text: [verification/r0/contract-0.md](../../slices/S-014/verification/r0/contract-0.md)

#### TC-contract-2/p0 · Property: call count and argv over random sample sets · PASS
- **Given** A scratch repo with forge set as the case says and a glab shim that logs cwd and argv **When** read_rules(repo, samples) runs through python3 -I, with the shim first on PATH **Then** 1000 runs, each with 0 to 7 samples: exactly one call with the fixed argv and cwd equal to the repo.
- **Expected** 1000 runs, each with 0 to 7 samples: exactly one call with the fixed argv and cwd equal to the repo. **Actual** 1000 runs, each with 0 to 7 samples: exactly one call with the fixed argv and cwd equal to the repo. (observed)
- **Spec source:** R-030 acceptance · **Run:** `S014_MODULE=<worktree>/skills/sdlc/branches.py S014_TESTKIT=<worktree>/skills/sdlc/test/testkit TESTKIT_SEED=20261010 node --test .sdlc/slices/S-014/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs`
- Evidence (property-run): property VS-1

```text
seed=20261010 runs=1000 result=pass
```

- Full text: [verification/r0/contract-0.md](../../slices/S-014/verification/r0/contract-0.md)

#### TC-security-1 · One glab call for 1, 3, 50 and hostile samples · PASS
- **Given** stub glab, forge gitlab, samples of 1, 3, 50 names and 7 hostile names **When** read_rules(repo, samples) **Then** one call, argv api projects/:fullpath/push_rule, cwd is the repo, no sample in argv
- **Expected** one call, argv api projects/:fullpath/push_rule, cwd is the repo, no sample in argv **Actual** 1 call each time; argv fixed; cwd equal to the repo; by_sample keyed by every sample
- **Spec source:** R-030 acceptance · **Run:** `node --test .sdlc/slices/S-014/verification/r0/tests/security-0/read-rules.verify-security.test.mjs`
- Evidence (attack): argv and cwd

```text
samples ['; rm -rf /','--hostname=evil','$(touch pwn)','`id`','../../etc/passwd','a b\nc','-h']\ncalls: 1\nargv: ['api','projects/:fullpath/push_rule']\ncwd: <repo>
```

- Evidence (log): [attack log](../../slices/S-014/verification/r0/logs/security-0-attacks.jsonl)
- Full text: [verification/r0/security-0.md](../../slices/S-014/verification/r0/security-0.md)

#### TC-security-14 · gh path: sample is percent-encoded in the path; FORGE_TIMEOUT applies to gh · PASS
- **Given** gh stub **When** sample a/b c?x=1&y#z; stalled gh with timeout 1 **Then** one encoded path; timeout gives a github note
- **Expected** one encoded path; timeout gives a github note **Actual** as expected
- **Spec source:** R-026 acceptance · **Run:** `node --test .sdlc/slices/S-014/verification/r0/tests/security-0/read-rules.verify-security.test.mjs`
- Evidence (attack): [attack log](../../slices/S-014/verification/r0/logs/security-0-attacks.jsonl)
- Full text: [verification/r0/security-0.md](../../slices/S-014/verification/r0/security-0.md)

</details>

### VS-2 · A branch_name_regex gives one regex rule with the spec keys
Profiles: contract. Risk: Body with branch_name_regex gives one rule with exactly source, kind, pattern, negate, label. Values: gitlab, regex, the regex text, false, push rule. by_sample holds the rule under every sample. rules holds it once. unchecked is…

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-contract-3/p0 | A branch_name_regex gives one rule with five keys | PASS | `.sdlc/slices/S-014/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs:98` |
| TC-contract-11/p0 | Property: result equals a reference model written from the spec | PASS | `.sdlc/slices/S-014/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs:208` |

<details>
<summary>Case detail (2 cases)</summary>

#### TC-contract-3/p0 · A branch_name_regex gives one rule with five keys · PASS
- **Given** A scratch repo with forge set as the case says and a glab shim that logs cwd and argv **When** read_rules(repo, samples) runs through python3 -I, with the shim first on PATH **Then** rules holds one rule {source gitlab, kind regex, pattern, negate false, label push rule}. by_sample holds it under each sample. unchecked false. notes empty. Other push rule fields are ignored.
- **Expected** rules holds one rule {source gitlab, kind regex, pattern, negate false, label push rule}. by_sample holds it under each sample. unchecked false. notes empty. Other push rule fields are ignored. **Actual** rules holds one rule {source gitlab, kind regex, pattern, negate false, label push rule}. by_sample holds it under each sample. unchecked false. notes empty. Other push rule fields are ignored. (observed)
- **Spec source:** R-030 acceptance; R-026 · **Run:** `S014_MODULE=<worktree>/skills/sdlc/branches.py S014_TESTKIT=<worktree>/skills/sdlc/test/testkit TESTKIT_SEED=20261010 node --test .sdlc/slices/S-014/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs`
- Evidence (log): [run log](../../slices/S-014/verification/r0/logs/contract-0-run.txt)
- Full text: [verification/r0/contract-0.md](../../slices/S-014/verification/r0/contract-0.md)

#### TC-contract-11/p0 · Property: result equals a reference model written from the spec · PASS
- **Given** A scratch repo with forge set as the case says and a glab shim that logs cwd and argv **When** read_rules(repo, samples) runs through python3 -I, with the shim first on PATH **Then** 1500 runs over bodies (null, {}, arrays, scalars, regex strings, non-string regexes, JSON error bodies, invalid JSON), exits 0 to 255, stderr variants: result equals the model, one call, rules have exactly the five keys and a string pattern.
- **Expected** 1500 runs over bodies (null, {}, arrays, scalars, regex strings, non-string regexes, JSON error bodies, invalid JSON), exits 0 to 255, stderr variants: result equals the model, one call, rules have exactly the five keys and a string pattern. **Actual** 1500 runs over bodies (null, {}, arrays, scalars, regex strings, non-string regexes, JSON error bodies, invalid JSON), exits 0 to 255, stderr variants: result equals the model, one call, rules have exactly the five keys and a string pattern. (observed)
- **Spec source:** R-030, R-031, R-026, ADR f2c2 · **Run:** `S014_MODULE=<worktree>/skills/sdlc/branches.py S014_TESTKIT=<worktree>/skills/sdlc/test/testkit TESTKIT_SEED=20261010 node --test .sdlc/slices/S-014/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs`
- Evidence (property-run): property VS-2..5

```text
seed=20261010 runs=1500 failures=0
```

- Full text: [verification/r0/contract-0.md](../../slices/S-014/verification/r0/contract-0.md)

</details>

### VS-3 · Null body, empty object, null or empty regex give no rule
Profiles: contract. Risk: Bodies: null, {}, branch_name_regex null, branch_name_regex empty string. Each gives no rules, no note, unchecked false, and an empty list for each sample. Try a regex of only spaces: record what the code does.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-contract-4/p0 | null, {}, null regex and empty regex give no rule | PASS | `.sdlc/slices/S-014/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs:114` |
| TC-contract-5/p0 | A whitespace-only regex (spec silent) | PASS | `.sdlc/slices/S-014/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs:127` |

<details>
<summary>Case detail (2 cases)</summary>

#### TC-contract-4/p0 · null, {}, null regex and empty regex give no rule · PASS
- **Given** A scratch repo with forge set as the case says and a glab shim that logs cwd and argv **When** read_rules(repo, samples) runs through python3 -I, with the shim first on PATH **Then** Each gives rules [], notes [], unchecked false and an empty list per sample.
- **Expected** Each gives rules [], notes [], unchecked false and an empty list per sample. **Actual** Each gives rules [], notes [], unchecked false and an empty list per sample. (observed)
- **Spec source:** R-030 acceptance · **Run:** `S014_MODULE=<worktree>/skills/sdlc/branches.py S014_TESTKIT=<worktree>/skills/sdlc/test/testkit TESTKIT_SEED=20261010 node --test .sdlc/slices/S-014/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs`
- Evidence (log): [run log](../../slices/S-014/verification/r0/logs/contract-0-run.txt)
- Full text: [verification/r0/contract-0.md](../../slices/S-014/verification/r0/contract-0.md)

#### TC-contract-5/p0 · A whitespace-only regex (spec silent) · PASS
- **Given** A scratch repo with forge set as the case says and a glab shim that logs cwd and argv **When** read_rules(repo, samples) runs through python3 -I, with the shim first on PATH **Then** The code treats it as a rule with pattern of three spaces. The spec defines only an empty regex. Recorded as a seed.
- **Expected** The code treats it as a rule with pattern of three spaces. The spec defines only an empty regex. Recorded as a seed. **Actual** The code treats it as a rule with pattern of three spaces. The spec defines only an empty regex. Recorded as a seed. (observed)
- **Spec source:** R-030 quote (empty regex only) · **Run:** `S014_MODULE=<worktree>/skills/sdlc/branches.py S014_TESTKIT=<worktree>/skills/sdlc/test/testkit TESTKIT_SEED=20261010 node --test .sdlc/slices/S-014/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs`
- Evidence (log): [run log](../../slices/S-014/verification/r0/logs/contract-0-run.txt)
- Full text: [verification/r0/contract-0.md](../../slices/S-014/verification/r0/contract-0.md)

</details>

### VS-4 · A JSON error body with exit 0 is no rule. A non-zero exit is a failure
Profiles: contract, security. Risk: Exit 0 with {"message": "404 Project Not Found"} gives no rule and no note. Exit 1 with the same body on stdout gives the rules unknown note. The split follows ADR f2c2. Try exit 2 and exit 127.

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-contract-6/p0 | Exit 0 with a JSON error body is no rule. Exit 1, 2, 127 are a failure | PASS | `.sdlc/slices/S-014/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs:133` |
| TC-security-2 | Exit 0 with a JSON error body is no rule; exit 1, 2, 127, 255 are failures | PASS | `.sdlc/slices/S-014/verification/r0/tests/security-0/read-rules.verify-security.test.mjs:90` |

<details>
<summary>Case detail (2 cases)</summary>

#### TC-contract-6/p0 · Exit 0 with a JSON error body is no rule. Exit 1, 2, 127 are a failure · PASS
- **Given** A scratch repo with forge set as the case says and a glab shim that logs cwd and argv **When** read_rules(repo, samples) runs through python3 -I, with the shim first on PATH **Then** Exit 0 gives no rule, no note, unchecked false. A non-zero exit gives one note rules unknown on gitlab: denied and unchecked true.
- **Expected** Exit 0 gives no rule, no note, unchecked false. A non-zero exit gives one note rules unknown on gitlab: denied and unchecked true. **Actual** Exit 0 gives no rule, no note, unchecked false. A non-zero exit gives one note rules unknown on gitlab: denied and unchecked true. (observed)
- **Spec source:** R-030, R-031, ADR f2c2 · **Run:** `S014_MODULE=<worktree>/skills/sdlc/branches.py S014_TESTKIT=<worktree>/skills/sdlc/test/testkit TESTKIT_SEED=20261010 node --test .sdlc/slices/S-014/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs`
- Evidence (log): [run log](../../slices/S-014/verification/r0/logs/contract-0-run.txt)
- Full text: [verification/r0/contract-0.md](../../slices/S-014/verification/r0/contract-0.md)

#### TC-security-2 · Exit 0 with a JSON error body is no rule; exit 1, 2, 127, 255 are failures · PASS
- **Given** stub glab prints {message: 404 Project Not Found} **When** run with exit 0, then 1, 2, 127, 255 **Then** exit 0: no rules, no notes, unchecked false. Non-zero: one note, unchecked true
- **Expected** exit 0: no rules, no notes, unchecked false. Non-zero: one note, unchecked true **Actual** as expected; note is rules unknown on gitlab: glab exited with status <code>
- **Spec source:** R-030 acceptance, R-031 acceptance, ADR f2c2 · **Run:** `node --test .sdlc/slices/S-014/verification/r0/tests/security-0/read-rules.verify-security.test.mjs`
- Evidence (attack): [attack log](../../slices/S-014/verification/r0/logs/security-0-attacks.jsonl)
- Full text: [verification/r0/security-0.md](../../slices/S-014/verification/r0/security-0.md)

</details>

### VS-5 · A failing glab gives one note and unchecked samples
Profiles: contract, security. Risk: Exit 1 with stderr boom gives exactly one note, rules unknown on gitlab: boom. Rules and by_sample are empty and unchecked is true. Try empty stderr, multi-line stderr, very long stderr, control characters, invalid UTF-8 and NUL …

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-contract-7/p0 | Exit 1 with stderr boom | PASS | `.sdlc/slices/S-014/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs:146` |
| TC-contract-8/p0 | Empty, multi-line, 200000 char, control, NUL and unicode stderr never raise | PASS | `.sdlc/slices/S-014/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs:152` |
| TC-security-3 | Exit 1 with stderr boom gives the exact spec note | PASS | `.sdlc/slices/S-014/verification/r0/tests/security-0/read-rules.verify-security.test.mjs:114` |
| TC-security-4 | Hostile stderr (empty, multi-line, CRLF, 2 MB, control, NUL, invalid UTF-8, token-like) gives one note and never raises | PASS | `.sdlc/slices/S-014/verification/r0/tests/security-0/read-rules.verify-security.test.mjs:135` |
| TC-security-13 | A token in the glab body or env never reaches the result, stderr or the tree | PASS | `.sdlc/slices/S-014/verification/r0/tests/security-0/read-rules.verify-security.test.mjs:301` |

<details>
<summary>Case detail (5 cases)</summary>

#### TC-contract-7/p0 · Exit 1 with stderr boom · PASS
- **Given** A scratch repo with forge set as the case says and a glab shim that logs cwd and argv **When** read_rules(repo, samples) runs through python3 -I, with the shim first on PATH **Then** One note rules unknown on gitlab: boom. rules and by_sample empty. unchecked true. One call.
- **Expected** One note rules unknown on gitlab: boom. rules and by_sample empty. unchecked true. One call. **Actual** One note rules unknown on gitlab: boom. rules and by_sample empty. unchecked true. One call. (observed)
- **Spec source:** R-031 acceptance · **Run:** `S014_MODULE=<worktree>/skills/sdlc/branches.py S014_TESTKIT=<worktree>/skills/sdlc/test/testkit TESTKIT_SEED=20261010 node --test .sdlc/slices/S-014/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs`
- Evidence (log): [run log](../../slices/S-014/verification/r0/logs/contract-0-run.txt)
- Full text: [verification/r0/contract-0.md](../../slices/S-014/verification/r0/contract-0.md)

#### TC-contract-8/p0 · Empty, multi-line, 200000 char, control, NUL and unicode stderr never raise · PASS
- **Given** A scratch repo with forge set as the case says and a glab shim that logs cwd and argv **When** read_rules(repo, samples) runs through python3 -I, with the shim first on PATH **Then** Each gives one note with the prefix and unchecked true. Empty stderr still gives a reason (glab exited with status 1).
- **Expected** Each gives one note with the prefix and unchecked true. Empty stderr still gives a reason (glab exited with status 1). **Actual** Each gives one note with the prefix and unchecked true. Empty stderr still gives a reason (glab exited with status 1). (observed)
- **Spec source:** R-031 acceptance · **Run:** `S014_MODULE=<worktree>/skills/sdlc/branches.py S014_TESTKIT=<worktree>/skills/sdlc/test/testkit TESTKIT_SEED=20261010 node --test .sdlc/slices/S-014/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs`
- Evidence (log): stderr note lengths

```text
lengths [50,50,42,200025,38,28,35,30]; multi-line stderr keeps its newlines in the note; a 100000 char stderr gives a 100025 char note
```

- Full text: [verification/r0/contract-0.md](../../slices/S-014/verification/r0/contract-0.md)

#### TC-security-3 · Exit 1 with stderr boom gives the exact spec note · PASS
- **Given** stub glab exit 1, stderr boom **When** read_rules(repo, [a, b]) **Then** notes equal [rules unknown on gitlab: boom]; rules, by_sample empty; unchecked true
- **Expected** notes equal [rules unknown on gitlab: boom]; rules, by_sample empty; unchecked true **Actual** as expected
- **Spec source:** R-031 acceptance · **Run:** `node --test .sdlc/slices/S-014/verification/r0/tests/security-0/read-rules.verify-security.test.mjs`
- Evidence (attack): [attack log](../../slices/S-014/verification/r0/logs/security-0-attacks.jsonl)
- Full text: [verification/r0/security-0.md](../../slices/S-014/verification/r0/security-0.md)

#### TC-security-4 · Hostile stderr (empty, multi-line, CRLF, 2 MB, control, NUL, invalid UTF-8, token-like) gives one note and never raises · PASS
- **Given** stub glab exit 1 with each stderr **When** read_rules **Then** one note starting rules unknown on gitlab:, unchecked true, valid shape
- **Expected** one note starting rules unknown on gitlab:, unchecked true, valid shape **Actual** all 8 held. See seeds for line, length and control character findings
- **Spec source:** R-031 acceptance · **Run:** `node --test .sdlc/slices/S-014/verification/r0/tests/security-0/read-rules.verify-security.test.mjs`
- Evidence (attack): [attack log](../../slices/S-014/verification/r0/logs/security-0-attacks.jsonl)
- Full text: [verification/r0/security-0.md](../../slices/S-014/verification/r0/security-0.md)

#### TC-security-13 · A token in the glab body or env never reaches the result, stderr or the tree · PASS
- **Given** body holds private_token, env holds GITLAB_TOKEN **When** read_rules **Then** neither value appears; tree unchanged
- **Expected** neither value appears; tree unchanged **Actual** as expected
- **Spec source:** R-031 acceptance · **Run:** `node --test .sdlc/slices/S-014/verification/r0/tests/security-0/read-rules.verify-security.test.mjs`
- Evidence (attack): [attack log](../../slices/S-014/verification/r0/logs/security-0-attacks.jsonl)
- Full text: [verification/r0/security-0.md](../../slices/S-014/verification/r0/security-0.md)

</details>

### VS-6 · No forge makes no call
Profiles: contract, cli. Risk: forge empty string, forge key absent, forge null, an unknown forge value and a config that is not valid JSON. No gh or glab call in any case. The result has no rules, no notes, empty by_sample and unchecked true. Check that a gh …

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-contract-9/p0 | No forge makes no call | PASS | `.sdlc/slices/S-014/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs:181` |
| TC-contract-10/p0 | A repo with no .sdlc/config.json makes no call | PASS | `.sdlc/slices/S-014/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs:203` |
| TC-security-11 | No forge makes no call for absent, empty, null, unknown, wrong-case and padded forge values | PASS | `.sdlc/slices/S-014/verification/r0/tests/security-0/read-rules.verify-security.test.mjs:278` |
| TC-security-12 | Seed probe: a config that is not valid JSON | PASS | `.sdlc/slices/S-014/verification/r0/tests/security-0/read-rules.verify-security.test.mjs:332` |
| TC-cli-1 | Six forge values make no gh or glab call | PASS | `.sdlc/slices/S-014/verification/r0/tests/cli-0/read-rules.verify-cli.test.mjs:1 (VS-6 no forge value)` |
| TC-cli-2 | No .sdlc config at all makes no call | PASS | `.sdlc/slices/S-014/verification/r0/tests/cli-0/read-rules.verify-cli.test.mjs:1 (VS-6 no sdlc config)` |
| TC-cli-3 | Invalid JSON config makes no call | PASS | `.sdlc/slices/S-014/verification/r0/tests/cli-0/read-rules.verify-cli.test.mjs:1 (VS-6 config that is not valid JSON)` |
| TC-cli-12 | gitlab forge with no samples is shaped | PASS | `.sdlc/slices/S-014/verification/r0/tests/cli-0/read-rules.verify-cli.test.mjs:1 (VS-6 forge gitlab with no samples)` |

<details>
<summary>Case detail (8 cases)</summary>

#### TC-contract-9/p0 · No forge makes no call · PASS
- **Given** A scratch repo with forge set as the case says and a glab shim that logs cwd and argv **When** read_rules(repo, samples) runs through python3 -I, with the shim first on PATH **Then** For forge empty, absent, null, 5, [], unknown, config [] or null and no config file: 0 calls from gh and glab shims, no rules, no notes, empty by_sample, unchecked true. A config that is not valid JSON makes read_rules raise Fail, and it makes no call.
- **Expected** For forge empty, absent, null, 5, [], unknown, config [] or null and no config file: 0 calls from gh and glab shims, no rules, no notes, empty by_sample, unchecked true. A config that is not valid JSON makes read_rules raise Fail, and it makes no call. **Actual** For forge empty, absent, null, 5, [], unknown, config [] or null and no config file: 0 calls from gh and glab shims, no rules, no notes, empty by_sample, unchecked true. A config that is not valid JSON makes read_rules raise Fail, and it makes no call. (observed)
- **Spec source:** R-032 acceptance · **Run:** `S014_MODULE=<worktree>/skills/sdlc/branches.py S014_TESTKIT=<worktree>/skills/sdlc/test/testkit TESTKIT_SEED=20261010 node --test .sdlc/slices/S-014/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs`
- Evidence (log): [run log](../../slices/S-014/verification/r0/logs/contract-0-run.txt)
- Full text: [verification/r0/contract-0.md](../../slices/S-014/verification/r0/contract-0.md)

#### TC-contract-10/p0 · A repo with no .sdlc/config.json makes no call · PASS
- **Given** A scratch repo with forge set as the case says and a glab shim that logs cwd and argv **When** read_rules(repo, samples) runs through python3 -I, with the shim first on PATH **Then** 0 calls, unchecked true.
- **Expected** 0 calls, unchecked true. **Actual** 0 calls, unchecked true. (observed)
- **Spec source:** R-032 acceptance · **Run:** `S014_MODULE=<worktree>/skills/sdlc/branches.py S014_TESTKIT=<worktree>/skills/sdlc/test/testkit TESTKIT_SEED=20261010 node --test .sdlc/slices/S-014/verification/r0/tests/contract-0/read-rules.verify-contract.test.mjs`
- Evidence (log): [run log](../../slices/S-014/verification/r0/logs/contract-0-run.txt)
- Full text: [verification/r0/contract-0.md](../../slices/S-014/verification/r0/contract-0.md)

#### TC-security-11 · No forge makes no call for absent, empty, null, unknown, wrong-case and padded forge values · PASS
- **Given** gh and glab stubs on PATH **When** read_rules with 7 config variants **Then** no call to either tool; no rules, no notes, empty by_sample, unchecked true
- **Expected** no call to either tool; no rules, no notes, empty by_sample, unchecked true **Actual** as expected
- **Spec source:** R-032 acceptance · **Run:** `node --test .sdlc/slices/S-014/verification/r0/tests/security-0/read-rules.verify-security.test.mjs`
- Evidence (attack): [attack log](../../slices/S-014/verification/r0/logs/security-0-attacks.jsonl)
- Full text: [verification/r0/security-0.md](../../slices/S-014/verification/r0/security-0.md)

#### TC-security-12 · Seed probe: a config that is not valid JSON · PASS
- **Given** gh and glab stubs on PATH, config.json holds {not json **When** read_rules **Then** no call
- **Expected** no call **Actual** no call made; read_rules raises Fail (the repo's config loader convention). Filed as a seed
- **Spec source:** none in the spec: seed · **Run:** `node --test .sdlc/slices/S-014/verification/r0/tests/security-0/read-rules.verify-security.test.mjs`
- Evidence (attack): [attack log](../../slices/S-014/verification/r0/logs/security-0-attacks.jsonl)
- Full text: [verification/r0/security-0.md](../../slices/S-014/verification/r0/security-0.md)

#### TC-cli-1 · Six forge values make no gh or glab call · PASS
- **Given** config forge is empty, absent, null, bitbucket, GitHub or 7; gh and glab stubs on PATH **When** python3 runs read_rules on two samples **Then** no rules, no notes, empty by_sample, unchecked true, zero stub calls, tree unchanged
- **Expected** no rules, no notes, empty by_sample, unchecked true, zero stub calls, tree unchanged **Actual** All six gave the empty shape; gh and glab call counts were 0; tree unchanged
- **Spec source:** R-032 acceptance · **Run:** `SDLC_REPO=$PWD node --test .sdlc/slices/S-014/verification/r0/tests/cli-0/read-rules.verify-cli.test.mjs`
- Evidence (transcript): [run log](../../slices/S-014/verification/r0/logs/cli-0-run.txt)
- Full text: [verification/r0/cli-0.md](../../slices/S-014/verification/r0/cli-0.md)

#### TC-cli-2 · No .sdlc config at all makes no call · PASS
- **Given** repo with no .sdlc **When** read_rules **Then** empty shape, no call
- **Expected** empty shape, no call **Actual** Empty shape, unchecked true, 0 calls
- **Spec source:** R-032 quote · **Run:** `SDLC_REPO=$PWD node --test .sdlc/slices/S-014/verification/r0/tests/cli-0/read-rules.verify-cli.test.mjs`
- Evidence (transcript): [run log](../../slices/S-014/verification/r0/logs/cli-0-run.txt)
- Full text: [verification/r0/cli-0.md](../../slices/S-014/verification/r0/cli-0.md)

#### TC-cli-3 · Invalid JSON config makes no call · PASS
- **Given** config.json holds '{ not json' **When** read_rules **Then** no gh or glab call
- **Expected** no gh or glab call **Actual** 0 calls. read_rules raises Fail 'config.json is not valid JSON' instead of the empty shape (seed, no spec source)
- **Spec source:** none: spec states no behavior for an invalid config · **Run:** `SDLC_REPO=$PWD node --test .sdlc/slices/S-014/verification/r0/tests/cli-0/read-rules.verify-cli.test.mjs`
- Evidence (transcript): [run log](../../slices/S-014/verification/r0/logs/cli-0-run.txt)
- Full text: [verification/r0/cli-0.md](../../slices/S-014/verification/r0/cli-0.md)

#### TC-cli-12 · gitlab forge with no samples is shaped · PASS
- **Given** glab returns a regex **When** read_rules with [] **Then** valid shape
- **Expected** valid shape **Actual** rules holds one rule, by_sample empty, unchecked false
- **Spec source:** R-030 · **Run:** `SDLC_REPO=$PWD node --test .sdlc/slices/S-014/verification/r0/tests/cli-0/read-rules.verify-cli.test.mjs`
- Evidence (transcript): [run log](../../slices/S-014/verification/r0/logs/cli-0-run.txt)
- Full text: [verification/r0/cli-0.md](../../slices/S-014/verification/r0/cli-0.md)

</details>

### VS-7 · Hostile or odd glab output never breaks the shape
Profiles: security, contract. Risk: Stdout: a JSON array, a string, a number, true, deeply nested JSON, a very large body, branch_name_regex that is a number, a list or an object, a regex with invalid RE2 syntax, a regex with control characters or NUL. Each must gi…

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-contract-1/p1 | 44 odd glab bodies keep the result shape | PASS | `.sdlc/slices/S-014/verification/r0/tests/contract-1/read-rules.verify-contract.test.mjs:83` |
| TC-contract-2/p1 | Property: 1500 random glab bodies against a model written from the spec | PASS | `.sdlc/slices/S-014/verification/r0/tests/contract-1/read-rules.verify-contract.test.mjs:160` |
| TC-contract-3/p1 | Property: gitlab_rule is total and matches the model for 2000 values | PASS | `.sdlc/slices/S-014/verification/r0/tests/contract-1/read-rules.verify-contract.test.mjs:182` |
| TC-contract-4/p1 | Probe: failure notes for odd stderr | PASS | `.sdlc/slices/S-014/verification/r0/tests/contract-1/read-rules.verify-contract.test.mjs:202` |
| TC-contract-5/p1 | Exit codes 1, 2, 127 and 255 with a JSON error body on stdout; exit 0 with the same body | PASS | `.sdlc/slices/S-014/verification/r0/tests/contract-1/read-rules.verify-contract.test.mjs:220` |
| TC-contract-6/p1 | One glab call with the literal argv and the repo as cwd, for hostile sample names | PASS | `.sdlc/slices/S-014/verification/r0/tests/contract-1/read-rules.verify-contract.test.mjs:233` |
| TC-contract-13/p1 | Determinism and input immutability | PASS | `.sdlc/slices/S-014/verification/r0/tests/contract-1/read-rules.verify-contract.test.mjs:400` |
| TC-security-5 | 29 odd stdout bodies keep the result shape | PASS | `.sdlc/slices/S-014/verification/r0/tests/security-0/read-rules.verify-security.test.mjs:190` |
| TC-security-6 | A valid regex round-trips as the exact pattern with the five keys | PASS | `.sdlc/slices/S-014/verification/r0/tests/security-0/read-rules.verify-security.test.mjs:210` |

<details>
<summary>Case detail (9 cases)</summary>

#### TC-contract-1/p1 · 44 odd glab bodies keep the result shape · PASS
- **Given** a gitlab repo and a glab shim that prints each body: array, string, number, bool, null, 100000 nested arrays, regex as number, list, object, invalid RE2, NUL, control chars, lone surrogate, 1 MB regex, NaN, BOM, two documents, empty output, 8 MB body, 2M-entry array **When** read_rules(repo, [feat/a, feat/b]) runs for each body **Then** each result has the five top keys; every rule has exactly the five spec keys with the right types; a non-string regex gives no rule; a string regex gives one rule; unparseable output gives one note and unchecked true
- **Expected** each result has the five top keys; every rule has exactly the five spec keys with the right types; a non-string regex gives no rule; a string regex gives one rule; unparseable output gives one note and unchecked true **Actual** 44 of 44 cases match. No exception. Probe: a regex of only spaces gives a rule (not covered by the spec).
- **Spec source:** R-030 acceptance; R-026 acceptance · **Run:** `VERIFY_WORKTREE=<worktree of sdlc/S-014> TESTKIT_SEED=14001 node --test --test-reporter=spec .sdlc/slices/S-014/verification/r0/tests/contract-1/read-rules.verify-contract.test.mjs --test-name-pattern=TC-contract-1:`
- Evidence (log): examples run

```text
VS-7 examples: 44 cases, probes: whitespace-only regex: rules=[{"source":"gitlab","kind":"regex","pattern":"   ","negate":false,"label":"push rule"}] unchecked=false
```

- Full text: [verification/r0/contract-1.md](../../slices/S-014/verification/r0/contract-1.md)

#### TC-contract-2/p1 · Property: 1500 random glab bodies against a model written from the spec · PASS
- **Given** a seeded generator of JSON bodies (null, {}, odd regex types, invalid regexes, extra keys, bad text) and sample lists **When** read_rules runs through a glab shim for each body **Then** one regex rule exactly when branch_name_regex is a non-empty string; no rule and no note for other parsed values; one note and unchecked for unparseable text
- **Expected** one regex rule exactly when branch_name_regex is a non-empty string; no rule and no note for other parsed values; one note and unchecked for unparseable text **Actual** 0 violations in 1500 runs
- **Spec source:** R-030 acceptance · **Run:** `VERIFY_WORKTREE=<worktree of sdlc/S-014> TESTKIT_SEED=14001 node --test --test-reporter=spec .sdlc/slices/S-014/verification/r0/tests/contract-1/read-rules.verify-contract.test.mjs --test-name-pattern=TC-contract-2:`
- Evidence (property-run): glab body property

```text
property glab body: seed=14001 runs=1500 violations=0
```

- Full text: [verification/r0/contract-1.md](../../slices/S-014/verification/r0/contract-1.md)

#### TC-contract-3/p1 · Property: gitlab_rule is total and matches the model for 2000 values · PASS
- **Given** the pure function gitlab_rule and 2000 generated values **When** gitlab_rule(value) runs through pycall **Then** returns the one regex rule for a non-empty string regex in a dict, else None; never raises
- **Expected** returns the one regex rule for a non-empty string regex in a dict, else None; never raises **Actual** 0 violations in 2000 runs
- **Spec source:** R-030 acceptance · **Run:** `VERIFY_WORKTREE=<worktree of sdlc/S-014> TESTKIT_SEED=14001 node --test --test-reporter=spec .sdlc/slices/S-014/verification/r0/tests/contract-1/read-rules.verify-contract.test.mjs --test-name-pattern=TC-contract-3:`
- Evidence (property-run): gitlab_rule property

```text
property gitlab_rule: seed=14002 runs=2000 violations=0
```

- Full text: [verification/r0/contract-1.md](../../slices/S-014/verification/r0/contract-1.md)

#### TC-contract-4/p1 · Probe: failure notes for odd stderr · PASS
- **Given** glab exits 1 with stderr: boom, empty, multi-line, 200000 characters, control characters, NUL, CR LF, U+2028 **When** read_rules runs **Then** one note starting rules unknown on gitlab:, empty rules and by_sample, unchecked true, no exception
- **Expected** one note starting rules unknown on gitlab:, empty rules and by_sample, unchecked true, no exception **Actual** All 10 give that shape. The note keeps line breaks and NUL from stderr in 3 cases, and a 200000 character stderr gives a 200025 character note. The spec states no limit, so these go to seeds.
- **Spec source:** R-031 acceptance · **Run:** `VERIFY_WORKTREE=<worktree of sdlc/S-014> TESTKIT_SEED=14001 node --test --test-reporter=spec .sdlc/slices/S-014/verification/r0/tests/contract-1/read-rules.verify-contract.test.mjs --test-name-pattern=TC-contract-4:`
- Evidence (log): note lengths

```text
note lengths: 29,50,30,200025,33,37,35,34,28,28; multi-line notes: 3
```

- Full text: [verification/r0/contract-1.md](../../slices/S-014/verification/r0/contract-1.md)

#### TC-contract-5/p1 · Exit codes 1, 2, 127 and 255 with a JSON error body on stdout; exit 0 with the same body · PASS
- **Given** a glab shim that prints {"message": "404 Project Not Found"} **When** read_rules runs for each exit code **Then** non-zero exit gives the rules unknown note and unchecked true; exit 0 gives no rule, no note and unchecked false (ADR f2c2)
- **Expected** non-zero exit gives the rules unknown note and unchecked true; exit 0 gives no rule, no note and unchecked false (ADR f2c2) **Actual** matches for all five
- **Spec source:** R-030, R-031 acceptance; ADR f2c2 · **Run:** `VERIFY_WORKTREE=<worktree of sdlc/S-014> TESTKIT_SEED=14001 node --test --test-reporter=spec .sdlc/slices/S-014/verification/r0/tests/contract-1/read-rules.verify-contract.test.mjs --test-name-pattern=TC-contract-5:`
- Evidence (log): test result

```text
pass: TC-contract-5
```

- Full text: [verification/r0/contract-1.md](../../slices/S-014/verification/r0/contract-1.md)

#### TC-contract-6/p1 · One glab call with the literal argv and the repo as cwd, for hostile sample names · PASS
- **Given** samples --help, -x, $(touch pwn), a b, empty, newline, unicode, 50000 characters, ../../etc **When** read_rules runs once **Then** one call; argv is api projects/:fullpath/push_rule; cwd is the repo; no sample reaches argv; by_sample has one key per distinct sample; no file pwn
- **Expected** one call; argv is api projects/:fullpath/push_rule; cwd is the repo; no sample reaches argv; by_sample has one key per distinct sample; no file pwn **Actual** matches
- **Spec source:** R-030 acceptance · **Run:** `VERIFY_WORKTREE=<worktree of sdlc/S-014> TESTKIT_SEED=14001 node --test --test-reporter=spec .sdlc/slices/S-014/verification/r0/tests/contract-1/read-rules.verify-contract.test.mjs --test-name-pattern=TC-contract-6:`
- Evidence (log): test result

```text
pass: TC-contract-6
```

- Full text: [verification/r0/contract-1.md](../../slices/S-014/verification/r0/contract-1.md)

#### TC-contract-13/p1 · Determinism and input immutability · PASS
- **Given** a glab shim that prints a regex body **When** read_rules runs twice with the same samples list **Then** equal results; the samples list is unchanged
- **Expected** equal results; the samples list is unchanged **Actual** matches. Probe: by_sample lists and the rule dicts are shared between samples and rules (spec states no immutability, so a seed).
- **Spec source:** R-030 acceptance · **Run:** `VERIFY_WORKTREE=<worktree of sdlc/S-014> TESTKIT_SEED=14001 node --test --test-reporter=spec .sdlc/slices/S-014/verification/r0/tests/contract-1/read-rules.verify-contract.test.mjs --test-name-pattern=TC-contract-13:`
- Evidence (log): aliasing probe

```text
aliasing probe: {"b_list_aliased":true,"b_label":"mutated","samples":["a","b"]}
```

- Full text: [verification/r0/contract-1.md](../../slices/S-014/verification/r0/contract-1.md)

#### TC-security-5 · 29 odd stdout bodies keep the result shape · PASS
- **Given** stub glab exit 0 with array, string, number, true, false, null, non-string regex (number, list, object, true), spaces, invalid RE2, lookahead, NUL/ESC, lone surrogate, BOM, NaN, duplicate keys, extra keys, 100000-deep array and object, 20 MB body, 1 MB regex, huge int, empty, partial, trailing garb… **When** read_rules **Then** no exception; any rule has exactly the five keys with right types; non-string regex gives no rule; unparseable output gives the note
- **Expected** no exception; any rule has exactly the five keys with right types; non-string regex gives no rule; unparseable output gives the note **Actual** all 29 held. A regex of only spaces, invalid RE2, NUL or lone surrogate gives one rule with a string pattern
- **Spec source:** R-026 acceptance, R-030 acceptance · **Run:** `node --test .sdlc/slices/S-014/verification/r0/tests/security-0/read-rules.verify-security.test.mjs`
- Evidence (attack): [attack log](../../slices/S-014/verification/r0/logs/security-0-attacks.jsonl)
- Full text: [verification/r0/security-0.md](../../slices/S-014/verification/r0/security-0.md)

#### TC-security-6 · A valid regex round-trips as the exact pattern with the five keys · PASS
- **Given** stub glab prints a regex **When** read_rules **Then** rule equals {source gitlab, kind regex, pattern, negate false, label push rule}; by_sample holds it
- **Expected** rule equals {source gitlab, kind regex, pattern, negate false, label push rule}; by_sample holds it **Actual** as expected
- **Spec source:** R-026 acceptance · **Run:** `node --test .sdlc/slices/S-014/verification/r0/tests/security-0/read-rules.verify-security.test.mjs`
- Evidence (attack): [attack log](../../slices/S-014/verification/r0/logs/security-0-attacks.jsonl)
- Full text: [verification/r0/security-0.md](../../slices/S-014/verification/r0/security-0.md)

</details>

### VS-8 · Missing, slow or non-JSON glab is a failure, not a crash
Profiles: security, cli. Risk: PATH with python3 and git only gives the rules unknown note. A glab that sleeps past FORGE_TIMEOUT gives the note and no hang. A glab that prints non-JSON, empty output or a partial JSON gives the note. No child process stays ali…

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-security-7 | Missing glab gives the note and no side effect | PASS | `.sdlc/slices/S-014/verification/r0/tests/security-0/read-rules.verify-security.test.mjs:220` |
| TC-security-8 | Empty, non-JSON and partial JSON output give the not JSON note | PASS | `.sdlc/slices/S-014/verification/r0/tests/security-0/read-rules.verify-security.test.mjs:233` |
| TC-security-9 | A stalled glab hits the timeout, gives the note, leaves no child | PASS | `.sdlc/slices/S-014/verification/r0/tests/security-0/read-rules.verify-security.test.mjs:249` |
| TC-security-10 | Seed probe: a glab that forks a grandchild leaves a process after the timeout | PASS | `.sdlc/slices/S-014/verification/r0/tests/security-0/read-rules.verify-security.test.mjs:266` |
| TC-cli-4 | PATH with only python3 and git gives the unknown note | PASS | `.sdlc/slices/S-014/verification/r0/tests/cli-0/read-rules.verify-cli.test.mjs:1 (VS-8 PATH with python3 and git only)` |
| TC-cli-5 | Slow glab: timeout gives the note, no hang | PASS | `.sdlc/slices/S-014/verification/r0/tests/cli-0/read-rules.verify-cli.test.mjs:1 (VS-8 glab slower than FORGE_TIMEOUT)` |
| TC-cli-6 | Stalled glab (exec sleep 600) leaves no child | PASS | `.sdlc/slices/S-014/verification/r0/tests/cli-0/read-rules.verify-cli.test.mjs:1 (VS-8 glab that stalls)` |
| TC-cli-7 | Non-JSON, empty and partial JSON output give one note | PASS | `.sdlc/slices/S-014/verification/r0/tests/cli-0/read-rules.verify-cli.test.mjs:1 (VS-8 non-JSON/empty/partial)` |
| TC-cli-8 | Exit 127 and exit 2 (with JSON body) give one note | PASS | `.sdlc/slices/S-014/verification/r0/tests/cli-0/read-rules.verify-cli.test.mjs:1 (VS-8 exit 127 / exit 2)` |
| TC-cli-9 | NUL and invalid UTF-8 in stderr do not raise | PASS | `.sdlc/slices/S-014/verification/r0/tests/cli-0/read-rules.verify-cli.test.mjs:1 (VS-8 NUL / bad utf8 stderr)` |
| TC-cli-10 | Long multi-line stderr is passed through | PASS | `.sdlc/slices/S-014/verification/r0/tests/cli-0/read-rules.verify-cli.test.mjs:1 (VS-8 long and multi-line stderr)` |
| TC-cli-11 | Repo path with spaces and unicode: argv and cwd right | PASS | `.sdlc/slices/S-014/verification/r0/tests/cli-0/read-rules.verify-cli.test.mjs:1 (VS-8 success path argv and cwd)` |

<details>
<summary>Case detail (12 cases)</summary>

#### TC-security-7 · Missing glab gives the note and no side effect · PASS
- **Given** PATH holds only python3 and git **When** read_rules **Then** one note, unchecked true, scratch tree and git refs unchanged
- **Expected** one note, unchecked true, scratch tree and git refs unchanged **Actual** note: rules unknown on gitlab: [Errno 2] No such file or directory: 'glab'; tree diff empty
- **Spec source:** R-031 acceptance · **Run:** `node --test .sdlc/slices/S-014/verification/r0/tests/security-0/read-rules.verify-security.test.mjs`
- Evidence (attack): [attack log](../../slices/S-014/verification/r0/logs/security-0-attacks.jsonl)
- Full text: [verification/r0/security-0.md](../../slices/S-014/verification/r0/security-0.md)

#### TC-security-8 · Empty, non-JSON and partial JSON output give the not JSON note · PASS
- **Given** stub glab exit 0 with each output **When** read_rules **Then** note rules unknown on gitlab: glab printed output that is not JSON
- **Expected** note rules unknown on gitlab: glab printed output that is not JSON **Actual** as expected
- **Spec source:** R-031 acceptance · **Run:** `node --test .sdlc/slices/S-014/verification/r0/tests/security-0/read-rules.verify-security.test.mjs`
- Evidence (attack): [attack log](../../slices/S-014/verification/r0/logs/security-0-attacks.jsonl)
- Full text: [verification/r0/security-0.md](../../slices/S-014/verification/r0/security-0.md)

#### TC-security-9 · A stalled glab hits the timeout, gives the note, leaves no child · PASS
- **Given** stub glab does exec sleep 600; FORGE_TIMEOUT set to 1 **When** read_rules **Then** note, no hang, no process left, tree unchanged
- **Expected** note, no hang, no process left, tree unchanged **Actual** returned in 1037 ms; no process with the stub path left; tree unchanged
- **Spec source:** R-031 acceptance · **Run:** `node --test .sdlc/slices/S-014/verification/r0/tests/security-0/read-rules.verify-security.test.mjs`
- Evidence (attack): [attack log](../../slices/S-014/verification/r0/logs/security-0-attacks.jsonl)
- Full text: [verification/r0/security-0.md](../../slices/S-014/verification/r0/security-0.md)

#### TC-security-10 · Seed probe: a glab that forks a grandchild leaves a process after the timeout · PASS
- **Given** stub glab sleeps 25 s in a child of its shell; FORGE_TIMEOUT 1 **When** read_rules **Then** no process left
- **Expected** no process left **Actual** note returned. The grandchild sleep stayed alive after the timeout. Out of scope, filed as a seed. The seed test fails by design
- **Spec source:** none in the spec: seed · **Run:** `node --test .sdlc/slices/S-014/verification/r0/tests/security-0/read-rules.verify-security.test.mjs`
- Evidence (attack): [attack log](../../slices/S-014/verification/r0/logs/security-0-attacks.jsonl)
- Full text: [verification/r0/security-0.md](../../slices/S-014/verification/r0/security-0.md)

#### TC-cli-4 · PATH with only python3 and git gives the unknown note · PASS
- **Given** forge gitlab, no glab on PATH **When** read_rules two samples **Then** one note rules unknown on gitlab: <reason>, no rules, unchecked true, tree unchanged
- **Expected** one note rules unknown on gitlab: <reason>, no rules, unchecked true, tree unchanged **Actual** Note: rules unknown on gitlab: [Errno 2] No such file or directory: 'glab'; unchecked true; tree unchanged
- **Spec source:** R-031 acceptance · **Run:** `SDLC_REPO=$PWD node --test .sdlc/slices/S-014/verification/r0/tests/cli-0/read-rules.verify-cli.test.mjs`
- Evidence (transcript): [run log](../../slices/S-014/verification/r0/logs/cli-0-run.txt)
- Full text: [verification/r0/cli-0.md](../../slices/S-014/verification/r0/cli-0.md)

#### TC-cli-5 · Slow glab: timeout gives the note, no hang · PASS
- **Given** glab shim sleeps 30 s; FORGE_TIMEOUT 1 **When** read_rules **Then** note, returned in under 10 s, no child alive
- **Expected** note, returned in under 10 s, no child alive **Actual** Returned in 1052 ms with the timeout note; the sleeper pid was gone; tree unchanged
- **Spec source:** R-031 quote · **Run:** `SDLC_REPO=$PWD node --test .sdlc/slices/S-014/verification/r0/tests/cli-0/read-rules.verify-cli.test.mjs`
- Evidence (transcript): [run log](../../slices/S-014/verification/r0/logs/cli-0-run.txt)
- Full text: [verification/r0/cli-0.md](../../slices/S-014/verification/r0/cli-0.md)

#### TC-cli-6 · Stalled glab (exec sleep 600) leaves no child · PASS
- **Given** glab stub with stall **When** read_rules, timeout 1 **Then** note; no sleep 600 process
- **Expected** note; no sleep 600 process **Actual** Note given; no sleep 600 process found
- **Spec source:** R-031 quote · **Run:** `SDLC_REPO=$PWD node --test .sdlc/slices/S-014/verification/r0/tests/cli-0/read-rules.verify-cli.test.mjs`
- Evidence (transcript): [run log](../../slices/S-014/verification/r0/logs/cli-0-run.txt)
- Full text: [verification/r0/cli-0.md](../../slices/S-014/verification/r0/cli-0.md)

#### TC-cli-7 · Non-JSON, empty and partial JSON output give one note · PASS
- **Given** glab exits 0 with each body **When** read_rules **Then** one note, unchecked true, one glab call
- **Expected** one note, unchecked true, one glab call **Actual** All three gave 'glab printed output that is not JSON'
- **Spec source:** R-031 acceptance and ADR f2c2 · **Run:** `SDLC_REPO=$PWD node --test .sdlc/slices/S-014/verification/r0/tests/cli-0/read-rules.verify-cli.test.mjs`
- Evidence (transcript): [run log](../../slices/S-014/verification/r0/logs/cli-0-run.txt)
- Full text: [verification/r0/cli-0.md](../../slices/S-014/verification/r0/cli-0.md)

#### TC-cli-8 · Exit 127 and exit 2 (with JSON body) give one note · PASS
- **Given** glab exits 127; glab exits 2 with a JSON body **When** read_rules **Then** one note each, rules empty
- **Expected** one note each, rules empty **Actual** Notes 'glab exited with status 127' and '... 2'
- **Spec source:** R-031 acceptance and ADR f2c2 · **Run:** `SDLC_REPO=$PWD node --test .sdlc/slices/S-014/verification/r0/tests/cli-0/read-rules.verify-cli.test.mjs`
- Evidence (transcript): [run log](../../slices/S-014/verification/r0/logs/cli-0-run.txt)
- Full text: [verification/r0/cli-0.md](../../slices/S-014/verification/r0/cli-0.md)

#### TC-cli-9 · NUL and invalid UTF-8 in stderr do not raise · PASS
- **Given** glab exits 1 with NUL, ESC and 0xff bytes in stderr **When** read_rules **Then** one note, no exception
- **Expected** one note, no exception **Actual** One note; NUL and ESC kept in the text, bad bytes replaced; no exception
- **Spec source:** R-031 quote · **Run:** `SDLC_REPO=$PWD node --test .sdlc/slices/S-014/verification/r0/tests/cli-0/read-rules.verify-cli.test.mjs`
- Evidence (transcript): [run log](../../slices/S-014/verification/r0/logs/cli-0-run.txt)
- Full text: [verification/r0/cli-0.md](../../slices/S-014/verification/r0/cli-0.md)

#### TC-cli-10 · Long multi-line stderr is passed through · PASS
- **Given** glab exits 1 with 200 KB and newlines on stderr **When** read_rules **Then** one note starting with the stderr (spec: <stderr>)
- **Expected** one note starting with the stderr (spec: <stderr>) **Actual** One note; it holds the whole stderr, 200037 chars, with newlines (seed: not one line, not bounded)
- **Spec source:** R-031 quote ('<stderr>') · **Run:** `SDLC_REPO=$PWD node --test .sdlc/slices/S-014/verification/r0/tests/cli-0/read-rules.verify-cli.test.mjs`
- Evidence (transcript): [run log](../../slices/S-014/verification/r0/logs/cli-0-run.txt)
- Full text: [verification/r0/cli-0.md](../../slices/S-014/verification/r0/cli-0.md)

#### TC-cli-11 · Repo path with spaces and unicode: argv and cwd right · PASS
- **Given** repo dir 'rép o é 日本' **When** read_rules three samples **Then** one glab call, argv api projects/:fullpath/push_rule, cwd the repo
- **Expected** one glab call, argv api projects/:fullpath/push_rule, cwd the repo **Actual** One call; argv and cwd right; unchecked false
- **Spec source:** R-030 · **Run:** `SDLC_REPO=$PWD node --test .sdlc/slices/S-014/verification/r0/tests/cli-0/read-rules.verify-cli.test.mjs`
- Evidence (transcript): [run log](../../slices/S-014/verification/r0/logs/cli-0-run.txt)
- Full text: [verification/r0/cli-0.md](../../slices/S-014/verification/r0/cli-0.md)

</details>

### VS-9 · The GitHub branch is unchanged after the shared-helper refactor
Profiles: contract. Risk: Run the S-013 GitHub cases: two operators, negate true and false, a failing gh, a missing gh. Results equal the results before the refactor. Check that FORGE_TIMEOUT applies to gh too, and that GH_PROMPT_DISABLED stays set for gh…

| Case | What it proves | Result | Test |
|---|---|---|---|
| TC-contract-7/p1 | S-013 GitHub cases give the same results before and after the refactor | PASS | `.sdlc/slices/S-014/verification/r0/tests/contract-1/read-rules.verify-contract.test.mjs:252` |
| TC-contract-8/p1 | Property: 1200 random gh scenarios give equal results on the S-013 and S-014 code | PASS | `.sdlc/slices/S-014/verification/r0/tests/contract-1/read-rules.verify-contract.test.mjs:301` |
| TC-contract-9/p1 | FORGE_TIMEOUT stops a slow gh and a slow glab; GH_PROMPT_DISABLED stays 1 | PASS | `.sdlc/slices/S-014/verification/r0/tests/contract-1/read-rules.verify-contract.test.mjs:320` |
| TC-contract-10/p1 | A missing gh is a note, not a crash | PASS | `.sdlc/slices/S-014/verification/r0/tests/contract-1/read-rules.verify-contract.test.mjs:360` |
| TC-contract-11/p1 | gh is called once per sample with the quoted path, in the repo; glab is not called | PASS | `.sdlc/slices/S-014/verification/r0/tests/contract-1/read-rules.verify-contract.test.mjs:370` |
| TC-contract-12/p1 | Surface of branches.py after the refactor | PASS | `.sdlc/slices/S-014/verification/r0/tests/contract-1/read-rules.verify-contract.test.mjs:385` |

<details>
<summary>Case detail (6 cases)</summary>

#### TC-contract-7/p1 · S-013 GitHub cases give the same results before and after the refactor · PASS
- **Given** the S-013 version of branches.py (commit e575c1b) and the S-014 version, one gh shim; two operators, negate true and false, a skipped non-pattern rule, a failure on the second sample, a failure with empty stderr, a JSON object, non-JSON output, no samples **When** read_rules runs on both versions **Then** equal results; exact S-013 notes
- **Expected** equal results; exact S-013 notes **Actual** 7 of 7 scenarios equal; rules, by_sample, notes and unchecked as before
- **Spec source:** R-026 acceptance · **Run:** `VERIFY_WORKTREE=<worktree of sdlc/S-014> TESTKIT_SEED=14001 node --test --test-reporter=spec .sdlc/slices/S-014/verification/r0/tests/contract-1/read-rules.verify-contract.test.mjs --test-name-pattern=TC-contract-7:`
- Evidence (log): test result

```text
pass: TC-contract-7
```

- Full text: [verification/r0/contract-1.md](../../slices/S-014/verification/r0/contract-1.md)

#### TC-contract-8/p1 · Property: 1200 random gh scenarios give equal results on the S-013 and S-014 code · PASS
- **Given** a seeded generator of gh outputs: rule lists, other rule types, junk entries, exit codes, bad JSON, 0 to 4 samples, up to 4 steps **When** read_rules runs on both versions through the same shim **Then** equal results; for well-formed rules, exactly the five keys, a kind among the four values, a string pattern
- **Expected** equal results; for well-formed rules, exactly the five keys, a kind among the four values, a string pattern **Actual** 0 differences in 1200 runs; no shape violation for well-formed rules. 177 runs with malformed gh rules (no parameters) give kind null and pattern null in both versions (seed).
- **Spec source:** R-026 acceptance · **Run:** `VERIFY_WORKTREE=<worktree of sdlc/S-014> TESTKIT_SEED=14001 node --test --test-reporter=spec .sdlc/slices/S-014/verification/r0/tests/contract-1/read-rules.verify-contract.test.mjs --test-name-pattern=TC-contract-8:`
- Evidence (property-run): gh differential

```text
property gh differential: seed=14003 runs=1200 violations=0 malformed-gh-rule-probes=177 first=#7 kind null
```

- Full text: [verification/r0/contract-1.md](../../slices/S-014/verification/r0/contract-1.md)

#### TC-contract-9/p1 · FORGE_TIMEOUT stops a slow gh and a slow glab; GH_PROMPT_DISABLED stays 1 · PASS
- **Given** FORGE_TIMEOUT set to 1, a shim that sleeps 6 s; a parent env with GH_PROMPT_DISABLED=0 **When** read_rules runs for github and for gitlab **Then** one note, unchecked true, return after about 1 s; the shim sees GH_PROMPT_DISABLED=1
- **Expected** one note, unchecked true, return after about 1 s; the shim sees GH_PROMPT_DISABLED=1 **Actual** github 1.004 s, gitlab 1.005 s; the shim saw 1 for both
- **Spec source:** R-031 acceptance; plan VS-9 notes · **Run:** `VERIFY_WORKTREE=<worktree of sdlc/S-014> TESTKIT_SEED=14001 node --test --test-reporter=spec .sdlc/slices/S-014/verification/r0/tests/contract-1/read-rules.verify-contract.test.mjs --test-name-pattern=TC-contract-9:`
- Evidence (measurement): timeouts and env

```text
timeouts: {"github":1.0039777755737305,"gitlab":1.0049958229064941}; GH_PROMPT_DISABLED seen by shim with parent value 0: {"github":["1"],"gitlab":["1"]}
```

- Full text: [verification/r0/contract-1.md](../../slices/S-014/verification/r0/contract-1.md)

#### TC-contract-10/p1 · A missing gh is a note, not a crash · PASS
- **Given** PATH with python3 and git only **When** read_rules runs on a github repo **Then** one note starting rules unknown on github:, no rules, unchecked true
- **Expected** one note starting rules unknown on github:, no rules, unchecked true **Actual** matches
- **Spec source:** R-026; S-013 behavior · **Run:** `VERIFY_WORKTREE=<worktree of sdlc/S-014> TESTKIT_SEED=14001 node --test --test-reporter=spec .sdlc/slices/S-014/verification/r0/tests/contract-1/read-rules.verify-contract.test.mjs --test-name-pattern=TC-contract-10:`
- Evidence (log): test result

```text
pass: TC-contract-10
```

- Full text: [verification/r0/contract-1.md](../../slices/S-014/verification/r0/contract-1.md)

#### TC-contract-11/p1 · gh is called once per sample with the quoted path, in the repo; glab is not called · PASS
- **Given** a gh shim and a glab shim on PATH; samples with spaces, slash, hash, unicode, --help **When** read_rules runs on a github repo **Then** four gh calls with argv api repos/{owner}/{repo}/rules/branches/<quoted>; no glab call
- **Expected** four gh calls with argv api repos/{owner}/{repo}/rules/branches/<quoted>; no glab call **Actual** matches
- **Spec source:** R-026; S-013 behavior · **Run:** `VERIFY_WORKTREE=<worktree of sdlc/S-014> TESTKIT_SEED=14001 node --test --test-reporter=spec .sdlc/slices/S-014/verification/r0/tests/contract-1/read-rules.verify-contract.test.mjs --test-name-pattern=TC-contract-11:`
- Evidence (log): test result

```text
pass: TC-contract-11
```

- Full text: [verification/r0/contract-1.md](../../slices/S-014/verification/r0/contract-1.md)

#### TC-contract-12/p1 · Surface of branches.py after the refactor · PASS
- **Given** branches.py loaded by path with python3 -I **When** list the names and the signature **Then** read_rules(repo, samples); FORGE_TIMEOUT present; GH_TIMEOUT removed; stdlib imports only
- **Expected** read_rules(repo, samples); FORGE_TIMEOUT present; GH_TIMEOUT removed; stdlib imports only **Actual** matches. New helpers: _run_forge_cli, _glab_push_rule, _collect_rules, gitlab_rule, make_rule, RULE_KEYS.
- **Spec source:** plan Files section · **Run:** `VERIFY_WORKTREE=<worktree of sdlc/S-014> TESTKIT_SEED=14001 node --test --test-reporter=spec .sdlc/slices/S-014/verification/r0/tests/contract-1/read-rules.verify-contract.test.mjs --test-name-pattern=TC-contract-12:`
- Evidence (log): surface listing

```text
read_rules(repo, samples) FORGE_TIMEOUT=60 has FORGE_TIMEOUT=true has GH_TIMEOUT=false
imports: import argparse import json import os import re import subprocess import sys import urllib.parse from datetime import datetime, timezone
```

- Full text: [verification/r0/contract-1.md](../../slices/S-014/verification/r0/contract-1.md)

</details>

## How it was attacked
One security session ran in round 0. The charter: explore the `glab` argv and cwd boundary, the stdout and stderr text, the timeout, and the no-forge and config paths for hostile input. The threat model trusts `glab` as a local tool and does not trust its output text or the sample names. The session tried 58 attacks: 51 held, 0 broke, 7 were out of scope. The out-of-scope attacks are the seed probes: unbounded stderr, a forked grandchild, an invalid config and a spaces-only regex. The spec states no limit for them.

<details>
<summary>Attack table (58 attacks)</summary>

| Input | Expected | Observed | Result |
|---|---|---|---|
| {"samples": 1} | valid result shape, no exception, no side effect | {"calls": 1, "argv": ["api", "projects/:fullpath/push_rule"]} | held |
| {"samples": 3} | valid result shape, no exception, no side effect | {"calls": 1, "argv": ["api", "projects/:fullpath/push_rule"]} | held |
| {"samples": 50} | valid result shape, no exception, no side effect | {"calls": 1, "argv": ["api", "projects/:fullpath/push_rule"]} | held |
| {"samples": 7} | valid result shape, no exception, no side effect | {"calls": 1, "argv": ["api", "projects/:fullpath/push_rule"]} | held |
| {"message": "404 Project Not Found"} | valid result shape, no exception, no side effect | {"forge": "gitlab", "rules": [], "by_sample": {"a": [], "b": []}, "notes": [], "unchecked": false} | held |
| {"message": "404 Project Not Found"} | valid result shape, no exception, no side effect | ["rules unknown on gitlab: glab exited with status 1"] | held |
| {"message": "404 Project Not Found"} | valid result shape, no exception, no side effect | ["rules unknown on gitlab: glab exited with status 2"] | held |
| {"message": "404 Project Not Found"} | valid result shape, no exception, no side effect | ["rules unknown on gitlab: glab exited with status 127"] | held |
| {"message": "404 Project Not Found"} | valid result shape, no exception, no side effect | ["rules unknown on gitlab: glab exited with status 255"] | held |
| {"stderrBytes": 0} | valid result shape, no exception, no side effect | {"noteLen": 50, "lines": 1, "hasCtl": false} | held |
| {"stderrBytes": 18} | valid result shape, no exception, no side effect | {"noteLen": 42, "lines": 3, "hasCtl": false} | out-of-scope |
| {"stderrBytes": 6} | valid result shape, no exception, no side effect | {"noteLen": 28, "lines": 2, "hasCtl": false} | out-of-scope |
| {"stderrBytes": 2000000} | valid result shape, no exception, no side effect | {"noteLen": 2000025, "lines": 1, "hasCtl": false} | out-of-scope |
| {"stderrBytes": 16} | valid result shape, no exception, no side effect | {"noteLen": 41, "lines": 1, "hasCtl": true} | out-of-scope |
| {"stderrBytes": 3} | valid result shape, no exception, no side effect | {"noteLen": 28, "lines": 1, "hasCtl": true} | out-of-scope |
| {"stderrBytes": 6} | valid result shape, no exception, no side effect | {"noteLen": 31, "lines": 1, "hasCtl": false} | held |
| {"stderrBytes": 28} | valid result shape, no exception, no side effect | {"noteLen": 53, "lines": 1, "hasCtl": false} | held |
| {"stdoutBytes": 2} | valid result shape, no exception, no side effect | {"rules": 0, "unchecked": false, "note": ""} | held |
| {"stdoutBytes": 28} | valid result shape, no exception, no side effect | {"rules": 0, "unchecked": false, "note": ""} | held |
| {"stdoutBytes": 7} | valid result shape, no exception, no side effect | {"rules": 0, "unchecked": false, "note": ""} | held |
| {"stdoutBytes": 2} | valid result shape, no exception, no side effect | {"rules": 0, "unchecked": false, "note": ""} | held |
| {"stdoutBytes": 4} | valid result shape, no exception, no side effect | {"rules": 0, "unchecked": false, "note": ""} | held |
| {"stdoutBytes": 5} | valid result shape, no exception, no side effect | {"rules": 0, "unchecked": false, "note": ""} | held |
| {"stdoutBytes": 4} | valid result shape, no exception, no side effect | {"rules": 0, "unchecked": false, "note": ""} | held |
| {"stdoutBytes": 24} | valid result shape, no exception, no side effect | {"rules": 0, "unchecked": false, "note": ""} | held |
| {"stdoutBytes": 29} | valid result shape, no exception, no side effect | {"rules": 0, "unchecked": false, "note": ""} | held |
| {"stdoutBytes": 30} | valid result shape, no exception, no side effect | {"rules": 0, "unchecked": false, "note": ""} | held |
| {"stdoutBytes": 27} | valid result shape, no exception, no side effect | {"rules": 0, "unchecked": false, "note": ""} | held |
| {"stdoutBytes": 28} | valid result shape, no exception, no side effect | {"rules": 1, "unchecked": false, "note": ""} | held |
| {"stdoutBytes": 27} | valid result shape, no exception, no side effect | {"rules": 1, "unchecked": false, "note": ""} | held |
| {"stdoutBytes": 31} | valid result shape, no exception, no side effect | {"rules": 1, "unchecked": false, "note": ""} | held |
| {"stdoutBytes": 41} | valid result shape, no exception, no side effect | {"rules": 1, "unchecked": false, "note": ""} | held |
| {"stdoutBytes": 31} | valid result shape, no exception, no side effect | {"rules": 1, "unchecked": false, "note": ""} | held |
| {"stdoutBytes": 28} | valid result shape, no exception, no side effect | {"rules": 0, "unchecked": true, "note": "rules unknown on gitlab: glab printed output that is not JSON"} | held |
| {"stdoutBytes": 26} | valid result shape, no exception, no side effect | {"rules": 0, "unchecked": false, "note": ""} | held |
| {"stdoutBytes": 52} | valid result shape, no exception, no side effect | {"rules": 0, "unchecked": false, "note": ""} | held |
| {"stdoutBytes": 97} | valid result shape, no exception, no side effect | {"rules": 1, "unchecked": false, "note": ""} | held |
| {"stdoutBytes": 200000} | valid result shape, no exception, no side effect | {"rules": 0, "unchecked": false, "note": ""} | held |
| {"stdoutBytes": 600001} | valid result shape, no exception, no side effect | {"rules": 0, "unchecked": false, "note": ""} | held |
| {"stdoutBytes": 20000035} | valid result shape, no exception, no side effect | {"rules": 1, "unchecked": false, "note": ""} | held |
| {"stdoutBytes": 1000024} | valid result shape, no exception, no side effect | {"rules": 1, "unchecked": false, "note": ""} | held |
| {"stdoutBytes": 100024} | valid result shape, no exception, no side effect | {"rules": 0, "unchecked": false, "note": ""} | held |
| {"stdoutBytes": 0} | valid result shape, no exception, no side effect | {"rules": 0, "unchecked": true, "note": "rules unknown on gitlab: glab printed output that is not JSON"} | held |
| {"stdoutBytes": 25} | valid result shape, no exception, no side effect | {"rules": 0, "unchecked": true, "note": "rules unknown on gitlab: glab printed output that is not JSON"} | held |
| {"stdoutBytes": 35} | valid result shape, no exception, no side effect | {"rules": 0, "unchecked": true, "note": "rules unknown on gitlab: glab printed output that is not JSON"} | held |
| {"stdoutBytes": 28} | valid result shape, no exception, no side effect | {"rules": 0, "unchecked": true, "note": "rules unknown on gitlab: glab printed output that is not JSON"} | held |
| {} | valid result shape, no exception, no side effect | ["rules unknown on gitlab: [Errno 2] No such file or directory: 'glab'"] | held |
| {"timeout": 1} | valid result shape, no exception, no side effect | {"ms": 1036, "note": "rules unknown on gitlab: Command '['glab', 'api', 'projects/:fullpath/push_rule']' time… | held |
| {"timeout": 1} | valid result shape, no exception, no side effect | {"leftover": 1} | out-of-scope |
| {} | valid result shape, no exception, no side effect | {"forge": "", "unchecked": true} | held |
| {} | valid result shape, no exception, no side effect | {"forge": "", "unchecked": true} | held |
| {} | valid result shape, no exception, no side effect | {"forge": "", "unchecked": true} | held |
| {} | valid result shape, no exception, no side effect | {"forge": "bitbucket", "unchecked": true} | held |
| {} | valid result shape, no exception, no side effect | {"forge": "GitLab", "unchecked": true} | held |
| {} | valid result shape, no exception, no side effect | {"forge": "gitlab ", "unchecked": true} | held |
| {} | valid result shape, no exception, no side effect | {"forge": "\"gitlab\"", "unchecked": true} | held |
| {} | valid result shape, no exception, no side effect | ["api", "repos/{owner}/{repo}/rules/branches/a%2Fb%20c%3Fx%3D1%26y%23z"] | held |
| {} | valid result shape, no exception, no side effect | {"exc": "EXCFail:/var/folders/b_/kllw7bcd59sbstn3r2yv6r6m0000gp/T/sdl"} | out-of-scope |

</details>

## Defects found on the way
- **Blocking defects:** none. No verifier, no core verifier and no reviewer found one, so no fix commit exists in round 0.

**Seeds** (open, non-blocking):

| Seed | Found by | File |
|---|---|---|
| Failure note keeps raw stderr: newlines, control characters, NUL and any length (200 KB to 2 MB tested) | verify-contract, verify-security, verify-cli | `skills/sdlc/branches.py` |
| Timeout kills only the direct `glab` process; a forked grandchild stays alive | verify-security | `skills/sdlc/branches.py` |
| `read_rules` raises `Fail` when `.sdlc/config.json` is not valid JSON; the caller must catch it | verify-contract, verify-security, verify-cli | `skills/sdlc/branches.py` |
| A `branch_name_regex` of only spaces, or with invalid RE2 syntax, becomes a rule | verify-contract, verify-security | `skills/sdlc/branches.py` |
| A `gh` rule with no parameters gives `kind` null and `pattern` null (S-013 code, unchanged) | verify-contract | `skills/sdlc/branches.py` |
| `by_sample` entries share one list and one rule object | verify-contract | `skills/sdlc/branches.py` |
| A forge regex can run slowly on a hostile pattern | review-security, review-architecture | `skills/sdlc/branches.py` |
| `GH_PROMPT_DISABLED` is set for `glab` calls; harmless | review-architecture | `skills/sdlc/branches.py` |
| `_collect_rules` returns nested tuples with a `None` sentinel; two loops handle errors | review-architecture | `skills/sdlc/branches.py` |
| Spec wording: a glab "error" means no rule, which conflicts with R-031 (ADR f2c2; proposals filed) | planner | `docs/superpowers/specs/2026-10-08-branch-format-design.md` |
| `glab-stub` cannot report leftover child processes | verify-security | `skills/sdlc/test/testkit/stub-server.mjs` |
| `FORGE_TIMEOUT` and `gitlab_rule` are new public names, not in spec section 3 | verify-contract | `skills/sdlc/branches.py` |

## Appendix
- Toolkit tools used: `cli-runner`, `attack-corpus`, `property` (all under `skills/sdlc/test/testkit/`), and `glab-stub` (`skills/sdlc/test/testkit/glab-stub.mjs`, built on `stub-server.mjs`). The plan marked `glab-stub` as missing; the slice added it.
- Plan: [plan-r0.md](../../slices/S-014/verification/plan-r0.md), [plan-r0.json](../../slices/S-014/verification/plan-r0.json)
- Round 0 contract part 0: [contract-0.md](../../slices/S-014/verification/r0/contract-0.md), [contract-0.json](../../slices/S-014/verification/r0/contract-0.json)
- Round 0 contract part 1: [contract-1.md](../../slices/S-014/verification/r0/contract-1.md), [contract-1.json](../../slices/S-014/verification/r0/contract-1.json)
- Round 0 security part 0: [security-0.md](../../slices/S-014/verification/r0/security-0.md), [security-0.json](../../slices/S-014/verification/r0/security-0.json)
- Round 0 cli part 0: [cli-0.md](../../slices/S-014/verification/r0/cli-0.md), [cli-0.json](../../slices/S-014/verification/r0/cli-0.json)
- Core verifiers: [spec fidelity](../../slices/S-014/verify-spec-fidelity-r0.md), [regression](../../slices/S-014/verify-regression-r0.md), [Gate](../../slices/S-014/gate-r0.md)
- Reviews: [architecture](../../slices/S-014/review-architecture-r0.md), [security](../../slices/S-014/review-security-r0.md), [test quality](../../slices/S-014/review-test-quality-r0.md)
- Missing sources: no `failures.md` exists, because no slice step failed.
