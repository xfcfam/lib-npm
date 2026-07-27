---
"@xfcfam/xf-sql": minor
"@xfcfam/xf-sql-postgres": minor
---

Add `camelToSnake` to `DatabaseOptions` and `PostgresOptions`

Opt-in flag (default `false`) that bridges `camelCase` implementer code and a
`snake_case` schema — the usual Postgres convention — in both directions, by
installing Kysely's `CamelCasePlugin`.

Going in, every identifier Kysely puts in a query is written `snake_case`:
columns in `values(...)`, `set(...)`, `where(...)`, `select(...)` and
`orderBy(...)`, plus table names. Coming back, result row keys are mapped to
`camelCase`, so the objects handed to the Business Layer match the domain types
that describe them.

Both halves matter. Converting only on the way in leaves every read returning
`snake_case` keys into code that declares `camelCase` ones, and that does not
fail loudly — it silently yields `undefined`.

Raw `sql` fragments are not rewritten on the way in, since Kysely transforms
the query AST and a raw fragment is opaque to it; write those in `snake_case`.
Their results are still mapped on the way back like any other row, so a raw
query selecting `device_location_city` hands back `deviceLocationCity`.

Default `false` keeps existing implementers byte-identical on upgrade: with the
flag off no plugin is installed, so neither the generated SQL nor the shape of
returned rows changes.
