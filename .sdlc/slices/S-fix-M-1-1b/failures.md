
## Fix round 1
- verify-contract r0 refuted VS-7: name accepted a state ts that ends in a line feed (TC-contract-7, TC-contract-8).
- Cause: the parse patterns end in `$`, which matches before a final line feed, and name never compared a given ts.
- Fix: parse patterns end in `\Z`; name compares a given state ts. Three tests promoted into branches.test.mjs.
