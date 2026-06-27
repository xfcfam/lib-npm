---
"@xfcfam/xf-sql-postgres": minor
---

Inherit the built-in CRUD surface from `@xfcfam/xf-sql` 0.2.0

`PostgresDatabaseRepository` (through `DatabaseRepository`) now exposes the
stringly-typed CRUD helpers — `findById` · `findOne` · `find` · `insert` ·
`insertMany` · `update` · `updateMany` · `delete` · `deleteMany` · `exists` ·
`count` · `pluck` · `keymap` · `group` · `paginate` · `run` · `query` ·
`scalar`. No API of its own changes; the `@xfcfam/xf-sql` peer dependency
moves to `^0.2.0`.
