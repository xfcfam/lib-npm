# `@xfcfam/xf-sql`

## 0.1.1

### Patch Changes

- 44c097b: Security: bump `kysely` to `^0.28.17` to pull in fixes for the SQL-injection
  advisories GHSA-wmrf-hv6w-mr66, GHSA-8cpq-38p9-67gx and GHSA-pv5w-4p9q-p3v2.
  The previous `^0.27.0` range pinned a vulnerable 0.27.x minor.

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
