
## Fix round 1
- Contract and security verifiers refuted R-035: a deeply nested pattern makes `re.compile` raise RecursionError, and `judge` raised it.
- Fix: `regex_error` and `_raw_result` now catch RecursionError. The sample is unevaluated with a note.
- Fix: `judge` no longer replaces a first failing rule that has no label with a later label.
- Promoted both cases to `skills/sdlc/test/branches.test.mjs` as T-R-035e and T-R-035f.
- Not changed: NUL, lone-surrogate and non-string samples raise Fail or TypeError. R-035 does not cover them.

## Fix round 2
- Contract and security verifiers refuted R-035: re.compile raises OverflowError for a repeat count above the C limit.
- Fix: regex_error and _raw_result now catch OverflowError with re.error and RecursionError.
- Promoted the case as T-R-035g in skills/sdlc/test/branches.test.mjs.
