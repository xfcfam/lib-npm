# `@xfcfam/xf-sql`

This changelog is maintained by [Changesets](https://github.com/changesets/changesets).
Do not edit manually — `pnpm version-packages` regenerates it from
the `.md` files in `.changeset/`.

## 0.1.0

Initial public release.

- `DatabaseRepository<Schema>` — Access Layer Generalization
  encapsulating [Kysely](https://kysely.dev). Constructor accepts
  any Kysely `Dialect`. Protected `db: Kysely<Schema>` getter.
  `exec(op)` wrapper for automatic error translation via
  `translateError`.
- `TransactionalDatabaseRepository<Schema>` — adds
  `transaction(callback)`: commits on success, rolls back on throw,
  routes errors through `translateError`.
- Typed Exception hierarchy: `DatabaseException` (base),
  `ConnectionException`, `UniqueViolationException`,
  `ForeignKeyViolationException`, `CheckViolationException`,
  `NotNullViolationException`, `DeadlockException`. All carry
  structured details (constraint, table, column, cause) where the
  driver exposes them.
- Peer dependencies on `@xfcfam/xf` and `kysely`.
