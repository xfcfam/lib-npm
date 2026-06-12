---
"@xfcfam/xf-sql": patch
---

Upgrade `kysely` to `^0.29.2`. No code or API change in xf-sql: the
query-builder surface we expose (`Kysely`, `Dialect`, `Transaction`,
`DatabaseRepository`, `TransactionalDatabaseRepository`) is unaffected by
0.29's breaking changes, which concern migrations (`kysely/migration`),
the dropped CommonJS build, and the removed `sql.value`/`sql.literal`
helpers — none of which this package uses.
