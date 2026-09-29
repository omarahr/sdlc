# hashtool — spec

A TypeScript CLI for Node 20+, tested with vitest.

1. `hashtool hash <text>` prints the lowercase hex SHA-256 of the UTF-8 text.
2. `hashtool verify <text> <hash>` exits 0 if the hash matches, else 1.
3. `hashtool invert <hash>` prints the original input text for any SHA-256 hash, within 1 second, for inputs of any length.
