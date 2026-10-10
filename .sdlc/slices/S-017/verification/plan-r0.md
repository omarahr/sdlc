# Verification plan S-017 round 0

Risk: medium. The slice adds tests only, but preflight reads a forge response and decides a derived branch format.

## Scenarios
| Id | Title | Requirements | Profiles |
|---|---|---|---|
| VS-1 | One regex rule that the default satisfies gives ok and no derivation, through gh and glab | R-091 | cli, security |
| VS-2 | Two rules or a negated rule and no format give no derivation and a generic suggestion | R-092 | cli, security |
| VS-3 | A rule that targets only other branches leaves rules empty and the verdict ok | R-100 | cli, security |
| VS-4 | The seven preflight shim scenarios hold in one run | R-074 | cli, security, contract |
| VS-5 | A broken forge answer never corrupts the verdict or touches the repo | R-074, R-100 | security, cli |

## Notes
- VS-1: Try ^[a-z]+/.+ and near variants (anchors, case, a nested name). Check exit 0, ok true, format sdlc/{name}, derived false, empty suggestion, no failing sample, for both forges.
- VS-2: Try starts_with plus ends_with, a negated contains, and three rules. Check exit 1, derived false, suggestion has --branch-format, and every failing sample names its rule label. A negated rule must never produce a derived format.
- VS-3: Try a body of another rule type, an empty list, and a rule for one sample name only. Check rules empty, pass (not unchecked) samples, exit 0, and that only the matching sample can fail.
- VS-4: Cover no rules, starts_with derive, failing regex with suggestion, passing regex, forge shim exit 1 with rules unknown and unchecked samples, mr mode bad-name on glab, and invalid --format exit 2 with one JSON error. Check the JSON keys and exit codes at the public command boundary.
- VS-5: Try malformed JSON, a non-list body, a huge body, rule text with control characters, and a hanging shim. Check no crash, a clear unchecked or rules unknown result, and an unchanged repo tree.

## Tools
| Id | Profile | Purpose | Exists |
|---|---|---|---|
| cli-runner | cli | Run branches.py preflight in a scratch repo | True |
| stub-server | security | Serve canned forge responses | True |
| glab-stub | security | Shim glab with canned JSON | True |
| attack-corpus | security | Hostile forge bodies and branch names | True |

## Coverage
| Requirement | Scenarios |
|---|---|
| R-074 | VS-4, VS-5 |
| R-091 | VS-1 |
| R-092 | VS-2 |
| R-100 | VS-3, VS-5 |
