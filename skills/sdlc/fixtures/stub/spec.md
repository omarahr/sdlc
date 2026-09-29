# fx — spec

A TypeScript CLI for Node 20+, tested with vitest.

1. `fx <amount> <from> <to>` prints the converted amount rounded to 2 decimals, for example `fx 10 USD EUR` → `9.21`.
2. Rates come from a `RatesService` interface: `getRate(from: string, to: string): Promise<number>`.
3. The production `RatesService` calls `https://rates.internal.example/v1/rate?from=X&to=Y`. That service is only reachable from the corporate network, and tests must not require the network.
4. An unknown currency prints `fx: unknown currency <code>` to stderr and exits 2.
