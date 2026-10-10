# Scenarios for M-1: The branch format owns every loop branch name

Each scenario is a black-box check through `branches.py`, the scripts, the loop script or the shipped documents. `$SK` is `skills/sdlc`.

| id | area | category | requirements | intent | source |
|---|---|---|---|---|---|
| SC-M-1-001 | names | happy | R-003, R-004, R-005, R-006... | Default-format name for every kind except state | §1 table: "`branches.py name --kind run --n 1` under the default format prints `sdlc/run-1`" and the same for the other kinds |
| SC-M-1-002 | names | happy | R-008, R-018 | State tail makes a UTC timestamp and honors an explicit ts | §1 table: "`state-<UTC timestamp, %Y%m%d%H%M%S>`"; R-008 acceptance: "An explicit ts part is used as given" |
| SC-M-1-003 | names | boundary | R-011, R-019, R-142 | Literal text and lowercase placeholder | §1: "`{name:lower}` lowercases the tail ... The literal text keeps its case." and "`feature/PROJ-123-{name}` names the first slice `feature/PROJ-123-S-001`" |
| SC-M-1-004 | names | data-integrity | R-019, R-068 | Name then parse round-trip for 8 kinds by 3 formats | R-019 acceptance: "Every name output parses back to the same kind and parts." |
| SC-M-1-005 | names | invalid-input | R-001, R-017 | validate_format rejection table | R-017 acceptance: "validate_format rejects `{name}{name}`, `sdlc/`, `sdlc/{ name }`, and `sdlc/{name}..`. It accepts `sdlc/{name}` and `feature/PROJ-1-{name}`." |
| SC-M-1-006 | names | invalid-input | R-017, R-150 | Invalid-ref literals are rejected with git's reason | Edge cases: "A literal part that makes an invalid ref: `validate_format` rejects the format at pre-flight with `git check-ref-format`'s reason." |
| SC-M-1-007 | names | boundary | R-002, R-016 | Config format resolution and the default | R-016 acceptance: "load_format returns the config value when it is non-empty. It returns `sdlc/{name}` when the key is missing, empty, or the file is absent." |
| SC-M-1-008 | names | happy | R-015, R-012 | Flag beats config beats default | R-015 acceptance: "A repo with `branchFormat: \"feature/PROJ-1-{name}\"` and `--format \"sdlc/{name}\"` names `sdlc/S-001`. Without `--format` it names `feature/PROJ-1... |
| SC-M-1-009 | names | invalid-input | R-099, R-014, R-018 | Missing or bad parts fail cleanly | R-099 acceptance: "`branches.py name --kind e2e-area --id M-1` with no `--area` exits 2 and prints one JSON object with `ok: false` and a non-empty `error`. No traceba... |
| SC-M-1-010 | names | invalid-input | R-088, R-014 | Argument errors become JSON with exit 2 | R-088 acceptance: "Each command accepts the flags its line names." and R-014: "exit 2 with `{\"ok\": false, \"error\": \"...\"}` on bad input" |
| SC-M-1-011 | names | happy | R-098, R-013 | Scripts import branches from any cwd; module is stdlib only | R-098 acceptance: "Each of `next-action.py`, `state-write.py` and `janitor.py` runs with the working directory outside the skill directory, and its branch recognition ... |
| SC-M-1-012 | names | security | R-017, R-142 | Hostile ids and formats do not escape or corrupt output | Intent §1: "exactly one placeholder ... no whitespace"; shell and JSON metacharacters must not break the one-JSON-object contract |
| SC-M-1-013 | names | limits | R-016, R-055 | Odd config value types do not crash the module | R-055 acceptance: "A missing or empty value falls back to `sdlc/{name}`." Non-string config values are outside the spec |
| SC-M-1-014 | parse-list | happy | R-102, R-103, R-104, R-105... | Each table row classifies | §2 parse table rows 1 to 8 and R-023: "parse of `sdlc/run-2` gives kind `run` and `n: 2`. ... Of `sdlc/M-1-e2e-api` gives `id` and `area`." |
| SC-M-1-015 | parse-list | boundary | R-022, R-070, R-105 | Precedence corners | R-022 acceptance: "`S-fix-M-1-2` is a slice. `M-1-e2e-api` is an e2e-area. `S-001-v0-http-api-0` is verify with profile `http-api`. An area with dashes parses whole: `... |
| SC-M-1-016 | parse-list | invalid-input | R-021, R-101, R-118 | Foreign branches give null | R-021 acceptance: "parse returns null for `main`, for `feature/PROJ-1-foo` under `feature/PROJ-1-{name}`, and for `sdlc/feature-x` under the default."; R-118: "`featur... |
| SC-M-1-017 | parse-list | limits | R-106, R-102 | Digit-count limits and odd digits | R-106 acceptance: "A 13-digit tail returns None." and R-102: "'sdlc/run-x' returns None." |
| SC-M-1-018 | parse-list | boundary | R-103, R-104 | Milestone, e2e and e2e-area rows stay apart | R-103: "'sdlc/M-2-e2e' does not match this row." R-104: "'sdlc/M-2-e2e-api' does not match this row." |
| SC-M-1-019 | parse-list | happy | R-024, R-070, R-086 | Lowercase format resolves ids against the ledger | R-024 acceptance: "`parse(\"feature/PROJ-1-{name:lower}\", \"feature/proj-1-s-001\", ids=[\"S-001\"])` gives `id: \"S-001\"` and `known: true`. An id absent from the l... |
| SC-M-1-020 | parse-list | ordering | R-025, R-094 | List sorts numerically and filters by kind | R-025 acceptance: "`list --kind run` sorts by `n`." R-094: "`sdlc/S-001-attempt-2` precedes `sdlc/S-001-attempt-10`." |
| SC-M-1-021 | parse-list | data-integrity | R-025, R-085 | Old-format branches are invisible under a new format | Edge cases: "An old run's branches under the default when the new run gets a derived format: the new run's `list` and `parse` do not see them" |
| SC-M-1-022 | parse-list | failure-injection | R-025 | List on non-git and unborn repos | ADR-20261009-182641-decision-judge-S-010-e3f4: "list fails on a non-git repo and gives an empty list for a repo with no commits" |
| SC-M-1-023 | parse-list | i18n-rtl | R-025, R-053 | Non-ASCII branch names are foreign | §2 parse table row 8: slice regex `^(S-[A-Za-z0-9-]+)$`; a tail matching none of the rows "is not a loop branch: `None`" |
| SC-M-1-024 | parse-list | concurrency | R-024, R-054 | Parallel reads do not corrupt or mutate refs | §2: "Every command prints one JSON object"; name, parse and list only print |
| SC-M-1-025 | preflight | happy | R-041, R-151, R-091 | No forge, no rules, default verdict | R-151 acceptance: "On a repo with no config format and no forge rules, preflight prints ok true with format `sdlc/{name}` and derived false." |
| SC-M-1-026 | preflight | happy | R-039, R-136, R-137 | Sample kinds by mode | R-039 acceptance: "`--mode pr` samples slice, state, e2e. `--mode stack` samples run, milestone, slice. `--mode mr` and `--mode direct` sample none of the loop's kinds." |
| SC-M-1-027 | preflight | invalid-input | R-039 | Unknown mode | §4 step 2 lists modes pr, stack, mr, direct; any other mode is bad input (R-014) |
| SC-M-1-028 | preflight | happy | R-027, R-028, R-029, R-140 | One gh call per sample with %2F encoding | §3: "`gh api \"repos/{owner}/{repo}/rules/branches/<sample>\"` with `/` in the sample encoded as `%2F`" |
| SC-M-1-029 | preflight | boundary | R-028, R-100 | GitHub rule parsing and labels | R-028 acceptance: "yields only the pattern rules. negate defaults to false. The label falls back from `parameters.name` to `ruleset <id>` to `branch_name_pattern`." |
| SC-M-1-030 | preflight | happy | R-042, R-123, R-124, R-125... | Derivation for the three simple operators | §4 derivation table: starts_with P gives P+sdlc/{name}; ends_with S gives sdlc/{name}+S; contains C gives sdlc/+C+/{name} |
| SC-M-1-031 | preflight | happy | R-097, R-012, R-038 | Derived format sticks across a resume | R-097 acceptance: "A first run whose pre-flight derives `feature/sdlc/{name}` records `branchFormat: \"feature/sdlc/{name}\"` in the worktree's `.sdlc/config.json`. A ... |
| SC-M-1-032 | preflight | boundary | R-038, R-042 | A given format is never replaced by a derivation | §4 step 5: derivation happens only "when `given` is false"; R-042 acceptance: "A given format, a negated rule, a regex or several rules does not derive." |
| SC-M-1-033 | preflight | happy | R-043, R-122 | Regex failure gives a usable suggestion | R-122 acceptance: "A regex rule the default format fails ... the suggestion carries a `--branch-format` line of the shape `<literal>/{name}`." |
| SC-M-1-034 | preflight | happy | R-091 | Regex the default satisfies | R-091 acceptance: "One regex rule that the default format satisfies: preflight exits 0, prints `ok: true`, `format` `sdlc/{name}`, and `derived: false`." |
| SC-M-1-035 | preflight | invalid-input | R-092, R-087 | Several or negated rules do not derive | R-092 acceptance: "Two rules and no format given: `ok` is false, `derived` is false, every failing sample carries its rule's label, and `suggestion` contains `--branch... |
| SC-M-1-036 | preflight | invalid-input | R-040, R-037, R-043 | Working-branch check only in mr mode | R-040 acceptance: "`--mode mr --branch X` adds a `working` sample named X, evaluated as given. `--mode pr --branch X` adds no `working` sample." R-037: "`bad..name` ..... |
| SC-M-1-037 | preflight | boundary | R-033, R-034, R-095, R-127 | evaluate operator matrix | R-033 acceptance: "The comparisons are case-sensitive: `Feature/` does not match `feature/x` under starts_with." R-127: "A regex rule is unanchored: pattern `feature` ... |
| SC-M-1-038 | preflight | boundary | R-036, R-035 | Sample verdict combination | R-036 acceptance: "One False makes the sample fail. All True makes it pass. No failure plus one None makes it `unevaluated`." |
| SC-M-1-039 | scripts | happy | R-053, R-054, R-055, R-076... | next-action recognizes branches under a custom format | §7: "`active_branch(repo, current)`: enumerate `refs/heads/` ... keep those `parse` classifies as `slice`"; R-054 acceptance names the five recognitions |
| SC-M-1-040 | scripts | idempotency-retry | R-053, R-055, R-077 | Default format keeps old decisions; calls are repeatable | R-077 acceptance: "The full suite passes with no branchFormat set, including the existing next-action tests." |
| SC-M-1-041 | scripts | happy | R-056, R-096, R-078, R-023 | state-write creates and finds branches under a custom format | R-056 acceptance: "Under `branchFormat: \"feature/PROJ-1-{name}\"`, state-write.py creates the slice and milestone branches as `feature/PROJ-1-S-001` and `feature/PROJ... |
| SC-M-1-042 | scripts | data-integrity | R-057, R-138, R-058 | Prune and run-branch classification by kind | R-138 acceptance: "prune_stale_milestone_branches treats only branches that parse to `milestone` as milestone branches. ... A foreign branch is neither." R-058: "confi... |
| SC-M-1-043 | scripts | happy | R-083 | Conditional adaptation of loop-economy commands | Assumptions: "`ship-prune` and `collect-verification` in `state-write.py` ... adapts ... to `branches.parse`." R-083 acceptance: "A test asserts a verify tail and an a... |
| SC-M-1-044 | scripts | happy | R-060, R-079, R-086, R-139 | Janitor sweeps only eligible verify branches | R-060 acceptance: "Under a custom format it sweeps only verify branches whose id is unknown or whose status is done or rejected. It never deletes run, attempt, or any ... |
| SC-M-1-045 | scripts | boundary | R-060, R-139 | Janitor under the default and its protected shapes | R-139 acceptance: "A repo with no branchFormat makes it sweep under `sdlc/{name}`." ADR-20261010-051411-decision-judge-S-024-9f6d: "Janitor keeps a verify-shaped branc... |
| SC-M-1-046 | scripts | failure-injection | R-060, R-139 | Janitor with corrupt state deletes nothing | §7 janitor: "swept only when it parses to `verify`, its `id` is unknown to the ledger or its status is `done` or `rejected`" |
| SC-M-1-047 | scripts | data-integrity | R-050, R-051, R-075, R-116 | Loop script and module name verify branches alike | R-075 acceptance: "`rt.I.branchName` and `branches.py name` equal for the three formats and the verify tail." |
| SC-M-1-048 | scripts | boundary | R-050 | JS replace special patterns in tails | §6: branchName replaces the placeholder with the tail, lowercased for {name:lower} |
| SC-M-1-049 | scripts | happy | R-052 | env-detector receives the format | R-052 acceptance: "The env-detector invocation in sdlc-loop.js passes `branchFormat: A.branchFormat \|\| null`." |
| SC-M-1-050 | scripts | security | R-119, R-120 | Verify and e2e-area branches never reach the remote | ADR-20261010-005045-human-S-005b-1073 (OVERRIDE): "It asserts that the remote holds no branch that `branches.py parse` classifies as verify, and that the shim saw no p... |
| SC-M-1-051 | docs | data-integrity | R-063, R-080, R-146, R-143... | No prompt spells a loop branch, and the guard bites | R-063 acceptance: "Every prompt file and SKILL.md matches no `(?<![.\w])sdlc/(?!tracker\|STOP)` outside fenced blocks that quote `branches.py` output." (scan skips `sd... |
| SC-M-1-052 | docs | happy | R-062, R-089, R-090, R-110... | _common.md table matches the real commands | §8: "`_common.md` gains a section" listing eight placeholders with their commands |
| SC-M-1-053 | docs | happy | R-045, R-046, R-047, R-048... | SKILL.md driver text follows the spec | §5: SKILL.md Commands table gains `--branch-format "<format>"`; Pre-flight Branch format bullet; Run worktree names the run branch through the module; Launch passes br... |
| SC-M-1-054 | docs | happy | R-064, R-065, R-134, R-135... | Prompt contents for config, schema and cleanup | §8: env-detector takes `branchFormat`; state-schema documents `"branchFormat": "sdlc/{name}"`; commit-state uses placeholders; slicer writes `branch: <slice branch>` |
| SC-M-1-055 | docs | happy | R-066, R-067 | README and STE gate | §9: "`README.md`: the Usage table gets the `--branch-format \"<format>\"` flag with one example; a short **Branch names** paragraph ... the Development tree lists `bra... |
| SC-M-1-056 | docs | boundary | R-082, R-067 | STE checker catches long sentences | R-082 acceptance: "The STE test runs over every prompt the change edits and passes." |
| SC-M-1-057 | docs | data-integrity | R-068, R-069, R-070, R-071... | Whole suite passes and holds the spec's named tests | §Testing lists the test cases of branches.test.mjs, next-action.test.mjs, scripts.test.mjs and prompts.test.mjs |
| SC-M-1-058 | docs | idempotency-retry | R-136, R-137 | Preflight is repeatable and read-only | §4: "`branches.py preflight` ... Exit 0 when `ok`, 1 when not"; preflight reads rules and prints a verdict |
| SC-M-1-059 | faults | failure-injection | R-029, R-084 | gh exits 1 | §3: "A `gh api` failure ... is one note, `rules unknown on github: <stderr>`, and the samples are `unchecked`." |
| SC-M-1-060 | faults | failure-injection | R-084 | gh absent | R-084 acceptance: "With `gh` absent from `PATH` on a github-mode repo, preflight prints `ok: true`, one note, and every sample `unchecked`." |
| SC-M-1-061 | faults | failure-injection | R-031, R-084 | glab exits 1 or is absent | R-031 acceptance: "A glab shim that exits 1 gives one note starting `rules unknown on gitlab:` and every sample `unchecked`." |
| SC-M-1-062 | faults | boundary | R-030, R-031, R-140 | glab body shapes | ADR-20261009-211706-decision-judge-S-014-e148: "A successful glab read with no rule gives unchecked false"; §3: null body, empty branch_name_regex mean no rule |
| SC-M-1-063 | faults | failure-injection | R-035, R-036 | Uncompilable regex | R-035 acceptance: "A rule whose pattern Python cannot compile gives None. The sample is `unevaluated` with a note starting `cannot evaluate`." |
| SC-M-1-064 | faults | failure-injection | R-029 | Slow, huge and malformed gh answers | §Assumptions: "A rules read that fails is a note, never a block" |
| SC-M-1-065 | faults | failure-injection | R-029, R-028 | Unexpected GitHub shapes | §3: "A `gh api` failure ... is one note"; "A rules read that fails is a note, never a block" (Assumptions) |
| SC-M-1-066 | faults | failure-injection | R-016, R-055, R-139 | Bad config files | R-098 and R-016: format lookups never crash a script when config is bad |
| SC-M-1-067 | faults | failure-injection | R-099, R-025 | Bad repo paths | R-014: exit 2 and one JSON object on bad input |
| SC-M-1-068 | faults | failure-injection | R-060, R-139 | Janitor with a failing git | §7 janitor: "a branch is swept only when it parses to `verify`"; janitor prints a note on early stop |
| SC-M-1-069 | faults | failure-injection | R-040, R-043 | check-ref-format unavailable | §2 preflight: `git check-ref-format` is used for every sample |
| SC-M-1-070 | faults | failure-injection | R-053, R-056 | Locked or mid-rebase repo | §2 and R-014: "exit 2 with `{\"ok\": false, \"error\": \"...\"}` on bad input"; state-write prints {ok:false,error} with exit 2 on Fail |
| SC-M-1-071 | names | boundary | R-020 | Import branches and call split('a/{name}.x') | R-020, spec §2 `split(fmt)`: split returns the literal prefix, the literal suffix and the lower flag |
| SC-M-1-072 | preflight | data-integrity | R-026 | Read rules through a gh shim that returns one rule of each pattern operator | R-026, spec §3 rule shape: each rule carries source, kind, pattern, negate and label |
| SC-M-1-073 | preflight | happy | R-044 | preflight on an ok case (no rules) | R-044, spec §4 output shape: ok, format, derived, forge, rules, samples, notes and suggestion; exit 0, 1 and 2 |
| SC-M-1-074 | scripts | happy | R-059 | Set branchFormat to feature/PROJ-1-{name} in .sdlc/config.json | R-059, spec §7: state-write.py main() derives fmt once from the config, with load_format as fallback, and passes it to the branch helpers |
| SC-M-1-075 | parse-list | data-integrity | R-019, R-042 | For formats sdlc/{name}-dev, sdlc/team-a/{name} and sdlc/{name}-attempt-1, run n | R-019 acceptance: "Every name output parses back to the same kind and parts."; spec §2 parse: a branch without the literal suffix gives null |
| SC-M-1-076 | names | data-integrity | R-019, R-022 | name --kind slice --id S-001-attempt-2 | R-019 and R-022: a printed branch parses back to the named kind and parts, or the name command refuses |
| SC-M-1-077 | names | boundary | R-008 | Run name --kind state under TZ=Pacific/Kiritimati and under TZ=America/Los_Angel | R-008 and spec §1: the state tail is a UTC timestamp; an explicit ts is used as given |
| SC-M-1-078 | preflight | security | R-037, R-040, R-043 | preflight --mode mr --branch with each of: -x, --help, empty string, 'a b', @, a | R-037, R-040 and R-043: in mr mode the working branch is checked with git check-ref-format |
| SC-M-1-079 | preflight | invalid-input | R-042 | gh shim returns a starts_with rule `feat {x}/`; run preflight --mode pr with no  | Spec §4 derivation and validate_format: a derived format must pass validate_format |
| SC-M-1-080 | parse-list | security | R-024, R-053 | Under feature/p-1-{name:lower}, parse branches with U+017F (long s) and U+212A ( | Spec §2 row 8: the slice tail matches [A-Za-z0-9-] only; look-alike unicode is not a loop branch |
| SC-M-1-081 | preflight | boundary | R-033, R-034 | Evaluate starts_with, ends_with and contains with patterns a.b, a+, (x, [ and a  | R-033 and R-034: rule patterns are literal text for starts_with, ends_with and contains |
| SC-M-1-082 | faults | failure-injection | R-044, R-084 | Bad ref name with the forge unknown fails; a good name is unchecked | ADR-20261009-215738-decision-judge-S-015-33cd and ADR S-015-r1f0 (forge unknown): a bad ref name still fails with rule `git check-ref-format`; a good name is `unchecked` |
| SC-M-1-083 | preflight | failure-injection | R-042, R-043, R-087 | Working-only failure with a derivable rule: no derived format, rename suggestion | ADR-20261009-223042-decision-judge-S-016-d001: a failure on the working branch alone, with a derivable rule, gives ok false and a rename suggestion |
| SC-M-1-084 | faults | failure-injection | R-035, R-036 | Rule of unknown kind gives a note and unevaluated samples | ADR-20261009-191759-decision-judge-S-011-6e23: a rule of unknown kind is not evaluated; it adds a note and the samples stay `unevaluated` |

## Coverage notes

- No earlier milestone is verified, so the campaign holds no regression smoke area.
- Slice S-028 and S-029 are rated low. SC-M-1-051 to SC-M-1-056 attack their prompt guards, README items and STE gate with mutated copies.
- Slice S-024 and S-033 are rated high. SC-M-1-042 and SC-M-1-044 to SC-M-1-046 cover the janitor and the state-write classification at their limits.
- R-119 is still `todo` and slice S-005b is parked. SC-M-1-050 checks the effect with a bare remote, as ADR-20261010-005045-human-S-005b-1073 orders. It can fail until S-005b lands.
- The scenarios have no UI channel. The milestone has `ui: false`.

## Critique responses

Revision 1 answers three critiques.

- spec-coverage: SC-M-1-071 to SC-M-1-074 cover R-020, R-026, R-044 and R-059. SC-M-1-025 now cites R-032.
- adversary: SC-M-1-075 to SC-M-1-081 cover the seven gaps. They cover suffix formats, colliding ids, clock edges, hostile branches, hostile rule patterns, look-alike unicode and literal patterns.
- observability: partial-state db checks are on the failure scenarios. SC-M-1-041 checks slices.json and the branch fields. The listed scenarios have stdout and stderr log checks. SC-M-1-025 and SC-M-1-026 check empty forge shim logs. SC-M-1-059 and SC-M-1-061 plant a secret in shim stderr. SC-M-1-044 to SC-M-1-046 and SC-M-1-068 check log.jsonl, slices.json and refs.

Revision 2 answers the observability critique (gaps A to H). No scenario was added. Each gap adds checks to existing scenarios.

- Gap A: SC-M-1-039 gains a logs check (empty stderr, no Traceback, one JSON object) and a db check (refs, slices.json, log.jsonl and config.json byte-equal; no gh write call).
- Gap B: SC-M-1-042 gains db, api and logs checks. Pruned branches are gone, state files are byte-equal, and the result names no foreign branch.
- Gap C: SC-M-1-074 gains a logs check and an invalid-branchFormat step. State-write exits 2 with `{"ok": false, "error": ...}` and stores nothing partial.
- Gap D: SC-M-1-043 gains logs and db checks on the branches deleted. SC-M-1-049 gains a check that config and repo stay unchanged and that the output has no Traceback.
- Gap E: SC-M-1-048 gains a node stderr check and a byte-for-byte comparison with branches.py for three formats and the `$&`, `$1`, `` $` `` and `$$` tails.
- Gap F: SC-M-1-051 to SC-M-1-057 gain a clean working tree check. SC-M-1-051, 055, 056 and 057 gain a runner stderr check. SC-M-1-057 checks that the TZ and cwd variants leave no new file.
- Gap G: SC-M-1-050 gains a db check that the state files agree with git ls-remote and that no recorded branch classifies as verify.
- Gap H: SC-M-1-063, 064 and 065 shims now print `token ghp_SECRET123` on stderr, and each has a logs check for the secret. SC-M-1-064 also checks that a 10 MB answer gives one note of bounded length. SC-M-1-060 states that no gh runs and no secret appears.

Revision 3 answers the spec-coverage and observability critiques.

- spec-coverage gap 1: SC-M-1-036 now has a step with no rule that expects `git check-ref-format`. A step with regex `^feat/.+` and `bad..name` expects `push rule`.
- spec-coverage gap 2: SC-M-1-082 covers a bad ref name when the forge is unknown.
- spec-coverage gap 3: SC-M-1-083 covers a working-only failure with a derivable rule.
- spec-coverage gap 4: SC-M-1-084 covers a rule of unknown kind.
- spec-coverage gap 5: SC-M-1-019 resolves milestone ids `M-1`, `M-1-e2e` and `M-2` under `{name:lower}`.
- observability 1: SC-M-1-006, 022, 027, 066, 069 and 070 check that refs, config and state files stay byte-equal. SC-M-1-071, 075 and 077 check that nothing is written.
- observability 2: SC-M-1-002 to 006, 008, 022, 024, 040, 041, 066, 067, 069 and 070 check for no Traceback and one JSON object. SC-M-1-069 and 070 check that the error text holds no home path and no token.
- observability 3: SC-M-1-012 and 078 plant `ghp_SECRET123` and an env value. They check that neither appears and that hostile text appears at most once.
- observability 4: SC-M-1-044, 045, 046, 066 and 070 check that the shim logs are empty and `git ls-remote` is unchanged.
- observability 5: SC-M-1-041 and 074 check that each ok:false result is one JSON object with a non-empty error and exit 2.
