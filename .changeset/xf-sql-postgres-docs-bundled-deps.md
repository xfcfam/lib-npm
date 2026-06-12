---
"@xfcfam/xf-sql-postgres": patch
---

docs: clarify that `pg` and `kysely` are bundled and wired internally —
the adapter builds the `pg.Pool` and `PostgresDialect` in its constructor,
so the implementer installs neither. Corrected the peer-dependency list
(only `@xfcfam/xf` and `@xfcfam/xf-sql`) and the install command.
