# S-014 verification plan, round 0

Risk: medium. A misread push rule hides the one GitLab constraint and passes names it rejects.

## Scenarios

| Id | Title | Requirements | Profiles |
|---|---|---|---|
| VS-1 | One glab call serves many samples, run in the repo | R-030 | contract, security |
| VS-2 | A branch_name_regex gives one regex rule with the spec keys | R-030, R-026 | contract |
| VS-3 | Null body, empty object, null or empty regex give no rule | R-030 | contract |
| VS-4 | A JSON error body with exit 0 is no rule. A non-zero exit is a failure | R-030, R-031 | contract, security |
| VS-5 | A failing glab gives one note and unchecked samples | R-031 | contract, security |
| VS-6 | No forge makes no call | R-032 | contract, cli |
| VS-7 | Hostile or odd glab output never breaks the shape | R-030, R-026 | security, contract |
| VS-8 | Missing, slow or non-JSON glab is a failure, not a crash | R-031 | security, cli |
| VS-9 | The GitHub branch is unchanged after the shared-helper refactor | R-026 | contract |

## Notes per scenario

- VS-1: Risk: one call per sample, a wrong argv, or a wrong cwd. Try 1, 3 and 50 samples. The argv must be api projects/:fullpath/push_rule. The cwd must be the repo. A branch name in the samples must never reach the argv.
- VS-2: Body with branch_name_regex gives one rule with exactly source, kind, pattern, negate, label. Values: gitlab, regex, the regex text, false, push rule. by_sample holds the rule under every sample. rules holds it once. unchecked is false and notes is empty.
- VS-3: Bodies: null, {}, branch_name_regex null, branch_name_regex empty string. Each gives no rules, no note, unchecked false, and an empty list for each sample. Try a regex of only spaces: record what the code does.
- VS-4: Exit 0 with {"message": "404 Project Not Found"} gives no rule and no note. Exit 1 with the same body on stdout gives the rules unknown note. The split follows ADR f2c2. Try exit 2 and exit 127.
- VS-5: Exit 1 with stderr boom gives exactly one note, rules unknown on gitlab: boom. Rules and by_sample are empty and unchecked is true. Try empty stderr, multi-line stderr, very long stderr, control characters, invalid UTF-8 and NUL in stderr. The note must stay one line, with a bounded length, and must not raise.
- VS-6: forge empty string, forge key absent, forge null, an unknown forge value and a config that is not valid JSON. No gh or glab call in any case. The result has no rules, no notes, empty by_sample and unchecked true. Check that a gh shim and a glab shim log no call.
- VS-7: Stdout: a JSON array, a string, a number, true, deeply nested JSON, a very large body, branch_name_regex that is a number, a list or an object, a regex with invalid RE2 syntax, a regex with control characters or NUL. Each must give a valid result shape and no exception. Every rule that is returned has exactly the five spec keys with the right types. A regex that is not a string gives no rule or a failure note, never a rule with a non-string pattern.
- VS-8: PATH with python3 and git only gives the rules unknown note. A glab that sleeps past FORGE_TIMEOUT gives the note and no hang. A glab that prints non-JSON, empty output or a partial JSON gives the note. No child process stays alive after the timeout. The scratch tree and the git refs are unchanged.
- VS-9: Run the S-013 GitHub cases: two operators, negate true and false, a failing gh, a missing gh. Results equal the results before the refactor. Check that FORGE_TIMEOUT applies to gh too, and that GH_PROMPT_DISABLED stays set for gh. Every rule from both sources has exactly the five spec keys and kind is one of the four values.

## Tools

| Id | Profile | Purpose | Exists |
|---|---|---|---|
| cli-runner | cli | Run branches.py from a scratch repo with a controlled env and a tree diff | yes |
| attack-corpus | security | Hostile strings for glab stderr and regex values | yes |
| property | contract | Seeded generator for read_rules calls and bodies through pycall.py | yes |
| glab-stub | security | A glab shim like the gh stub: canned stdout, stderr, exit code, sleep, and a log of cwd and argv. The stub-server file covers gh only | no |

## Coverage

| Requirement | Scenarios |
|---|---|
| R-026 | VS-2, VS-7, VS-9 |
| R-030 | VS-1, VS-2, VS-3, VS-4, VS-7 |
| R-031 | VS-4, VS-5, VS-8 |
| R-032 | VS-6 |

## Notes

No HTTP or UI boundary. The boundary is a Python function that runs glab as a child process. The limits profile is not tagged: the spec states no number. The timeout is a concern for VS-8. The spec wording an error means no rule in R-030 conflicts with R-031. The plan follows ADR f2c2: exit 0 with a JSON error body is no rule, and a non-zero exit is a note.
