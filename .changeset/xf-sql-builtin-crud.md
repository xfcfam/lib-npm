---
"@xfcfam/xf-sql": minor
---

Add a built-in CRUD operation set directly on `DatabaseRepository` — the
data-layer analogue of `RestRepository`'s verb helpers over `call`. A
stringly-typed convenience surface (table name + filter objects) built on
top of `this.db`, so it works without the typed Kysely `Schema`; the typed
`this.db` stays available for bespoke queries (joins, window functions,
vector search).

Operations: `findById`, `findOne`, `find`, `insert`, `insertMany`,
`update`, `updateMany`, `delete`, `deleteMany`, `exists`, `count`,
`pluck`, `keymap`, `group`, `paginate`, `run` (SQL table function),
`query` (raw `$1…$n`, repeats supported), `scalar`. Filters
`{ col: value | value[] | null }` map to `= / IN / IS NULL`. All route
through `exec()` for typed error translation. `@xfcfam/xf-sql-postgres`
inherits them via `PostgresDatabaseRepository`.
