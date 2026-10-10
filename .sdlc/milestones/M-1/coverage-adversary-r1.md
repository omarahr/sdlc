# Coverage critique for M-1, lens adversary, revision 1

Revision 1 adds SC-M-1-075 to SC-M-1-081. They close the seven gaps from revision 0.

- Suffix formats and overlapping prefix and suffix: SC-M-1-075.
- Colliding ids: SC-M-1-076.
- Clock edges for the state timestamp: SC-M-1-077.
- Hostile working branch names: SC-M-1-078.
- Hostile rule patterns in derivation: SC-M-1-079.
- Look-alike unicode: SC-M-1-080.
- Literal rule patterns: SC-M-1-081.

The plan also covers hostile ids, gh and glab faults, bad config, parallel reads and janitor with corrupt state.
The spec defines no further outcome for an attacker case.

## Verdict

`refuted: false`.
