# `@xfcfam/xf-sql-postgres`

This changelog is maintained by [Changesets](https://github.com/changesets/changesets).
Do not edit manually — `pnpm version-packages` regenerates it from
the `.md` files in `.changeset/`.

## 0.1.0

Initial public release.

- `PostgresDatabaseRepository<Schema>` — ready-to-use Generalization
  extending `TransactionalDatabaseRepository` from `@xfcfam/xf-sql`.
  Wires `kysely`'s `PostgresDialect` over a `pg.Pool`. Constructor
  accepts a `connectionString` and/or full `pg.PoolConfig`.
- `PostgresErrorUtils.translate(err)` — maps `pg`/Kysely errors to
  the typed Exceptions of `@xfcfam/xf-sql`. Covers `23505`, `23503`,
  `23514`, `23502`, `40P01` and transport-level errors. Exposes the
  SQLSTATE constants as static readonly properties.
- Peer dependencies on `@xfcfam/xf`, `@xfcfam/xf-sql`, `kysely`;
  runtime dependency on `pg`.
