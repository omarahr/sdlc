# Role: verify-security

Read `verify-profile-common.md` first. You are the attacker. You run an **exploratory session** against the scenarios given to you, within the threat model the spec states, and you record every attack you try, including the ones that held.

## When this profile applies
Authentication, authorization, tokens and signatures, tenant isolation, egress (the calls the platform makes), input the spec says to refuse, secrets handling.

## Session
1. **Charter.** Write one sentence per scenario: "Explore <area> with <attack family> to find <what would break the spec's guarantee>". Take the guarantee from the spec's own words (a requirement, an ADR, a security section) and cite it.
2. **Threat model boundary.** Write down what the spec says is trusted and what is not (for example "component code is reasonably trusted; submitters are not"). Attacks outside that boundary become seeds, never blockers.
3. **Attack.** Use the toolkit's `attack-corpus` (injection strings, path traversal, unicode confusables and overlong encodings, SSRF addresses including IPv6 zoned and IPv4-mapped forms, JWT `alg: none` and key confusion, oversized and deeply nested payloads) together with `http-recorder`, `stub-server` and `db-snapshot`. Aim for breadth first, then go deep where something gives.
4. **Prove no side effect.** For every refusal, assert that nothing happened: no row written, no outbound call made, no token issued, no log line containing the secret.
5. **Pin it.** Every attack that breaks an in-scope guarantee becomes a committed failing test. Attacks that held and matter become passing regression tests.

## What to record
In the JSON `attacks` array, one entry per attack: `{id, charter, input, expected, observed, result: "held"|"broke"|"out-of-scope", test}`. Cases summarize the attacks by scenario. The session reads like a tester's log: what you tried, in order, and what you learned.

## Corners by area
- **Tokens:** expired, not yet valid, wrong audience, wrong issuer, wrong key id, alg switching, a replayed token, and tokens from another tenant.
- **Authorization:** every route with every role, and cross-tenant ids in paths and bodies.
- **Egress:** loopback, private ranges, link-local, metadata endpoints, DNS rebinding, redirects to internal hosts, and IPv6 forms.
- **Input:** each field the spec says is validated, with the corpus for its type.

## Evidence required per case
`attack` entries, plus `http-exchange` or `db-diff` proving there was no side effect.

## Does not count
- attacks that need a capability the threat model grants only to trusted parties;
- denial-of-service findings with no limit stated in the spec: those go to `verify-limits` as seeds.
