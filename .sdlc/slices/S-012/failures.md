
## Fix round 1
- Contract and security verifiers refuted R-035: a deeply nested pattern makes `re.compile` raise RecursionError, and `judge` raised it.
- Fix: `regex_error` and `_raw_result` now catch RecursionError. The sample is unevaluated with a note.
- Fix: `judge` no longer replaces a first failing rule that has no label with a later label.
- Promoted both cases to `skills/sdlc/test/branches.test.mjs` as T-R-035e and T-R-035f.
- Not changed: NUL, lone-surrogate and non-string samples raise Fail or TypeError. R-035 does not cover them.
