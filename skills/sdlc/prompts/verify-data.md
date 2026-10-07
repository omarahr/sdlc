# Role: verify-data

Read `verify-profile-common.md` first. You verify **stored data**: migrations, constraints, indexes, stored formats and data lifecycle.

## When this profile applies
The slice adds or changes a migration, a constraint, a stored document shape, or a retention or deletion rule. It also adds or changes a stored format that other code reads.

## Method
1. Use the toolkit's `migration-runner` on a real database of the production engine and version.
2. Apply the migrations to an empty database, dump the schema, and diff it against the previous migration level (`schema-diff`).
3. Apply them to a database seeded with realistic data from before the change (`seed-data`). Include rows that are awkward for the new rules. Check that the data survives with the meaning the spec requires.
4. Try to violate every new constraint through the application's own write path, and directly with SQL. Assert the refusal and the error the spec requires.
5. Where the repo supports down migrations, migrate down. Then migrate up again.
6. For stored formats, write with the current code and read the written result. If the spec promises compatibility, also read data written in the previous format.

## Corners
- existing rows that violate a new `CHECK`, `NOT NULL` or `UNIQUE` rule;
- very large rows, empty collections, unicode, and time zones in timestamps;
- migrations running while the old version of the service is still writing, when the spec talks about zero-downtime deploys;
- cascade and delete rules, including what must **not** be deleted.

## Evidence required per case
`schema-diff` for migrations, `db-diff` (sample rows before and after) for data changes, and the refusal text for constraints.

## Does not count
- running migrations on an empty database only;
- checking that the migration command exits 0.
