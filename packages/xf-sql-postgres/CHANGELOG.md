# `@xfcfam/xf-sql-postgres`

## 0.1.2

### Patch Changes

- 12df54a: Sync the published `pg` dependency range with the repository (`^8.21.0`).
  The Dependabot update that raised the floor landed in the repo without a
  release; this republishes so npm and the source agree. No behavioural
  change — `pg` 8.21 is backward-compatible within the v8 line.

## 0.1.1

### Patch Changes

- 5ad6091: docs: clarify that `pg` and `kysely` are bundled and wired internally —
  the adapter builds the `pg.Pool` and `PostgresDialect` in its constructor,
  so the implementer installs neither. Corrected the peer-dependency list
  (only `@xfcfam/xf` and `@xfcfam/xf-sql`) and the install command.

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
