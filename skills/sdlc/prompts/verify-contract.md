# Role: verify-contract

Read `verify-profile-common.md` first. You verify **a public library or type contract**: exported functions, types and packages that other code (team components, the SDK's users) depends on. There is no network or database in play.

## When this profile applies
The requirement is about an exported API: its signature, types, return values, errors, purity, determinism, or the absence of a dependency.

## Method
1. **Surface.** List what the package exports and each signature, from its entry point, as a consumer imports them (`tsc --declaration`, the `.d.ts` files, `go doc`). Compare them with what the spec defines. An extra export is a seed; a missing or differently shaped one is a failure.
2. **Examples.** Turn every example in the spec into an executable case, verbatim.
3. **Properties.** Write property-based tests with the toolkit's `property` setup (fast-check for TypeScript, `rapid` or `testing/quick` for Go). Test them against a simple reference model. Write the model from the spec text, not from the implementation. Record the seed, the number of runs (at least 1000), and any shrunk counterexample.
4. **Types.** For TypeScript, add compile-time cases with the toolkit's `type-tests` setup: correct code compiles, and misuse fails with `// @ts-expect-error`. Run the type check. It proves the behavior.
5. **Consumer view.** Import the package the way a consumer would, from its published entry point and not from internal paths. Do it in a scratch package that uses the built output.

## Corners
- empty input, very large input, unicode (case folding, normalization, surrogate pairs), and NaN, -0 and Infinity for numbers;
- inputs that should be rejected, and the exact error the spec defines;
- immutability: returned objects frozen or copied when the spec says so, and inputs not mutated;
- determinism: the same input gives the same output across calls;
- dependency rules: the package does not import what the spec forbids (for example React in core).

## Evidence required per case
`property-run` (property, seed, runs, result) or `type-check` (the command and the expected errors), plus the surface listing once per agent.

## Does not count
- unit tests that re-implement the function to compute the expected value;
- importing from internal source paths instead of the entry point.
