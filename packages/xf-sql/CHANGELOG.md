# `@xfcfam/xf-sql`

## 1.1.0

### Minor Changes

- ef38870: Add `ConnectableRepository`, a latched connection lifecycle for the Access Layer, and adopt it in `xf-sql`'s `DatabaseRepository`.

  XF bootstraps downwards — `R.init()` finishes before `B.init()` starts — so a Repository always connects _before_ any Business exists to hear about it. Subscribing to a plain connect event from `B.init()` therefore registers a callback for something that already happened: it never runs, nothing throws, and the state it was meant to populate stays empty. The bug is in the ordering, which is invisible at the call site.

  `ConnectableRepository` treats connection state as a latch rather than an event: `onConnect(listener)` fires immediately when the component is already connected, and again on every reconnect. Also provides `onDisconnect`, `isConnected()`, and idempotent `markConnected()` / `markDisconnected()` for subclasses. Listener failures are isolated and routed to the overridable `onListenerError` hook.

  `DatabaseRepository` now extends it and marks the transitions around its existing `onConnected` / `onDisconnected` subclass hooks, which keep their current meaning and firing order. No breaking change: subclasses that override the hooks are unaffected, and `onConnect` / `isConnected` are additive.

## 1.0.0

### Patch Changes

- Updated dependencies [80407e6]
  - @xfcfam/xf@1.0.0

## 0.2.1

### Patch Changes

- Updated dependencies
  - @xfcfam/xf@0.3.0

## 0.2.0

### Minor Changes

- Add a built-in CRUD operation set directly on `DatabaseRepository` — the
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

## 0.1.3

### Patch Changes

- 749913a: Upgrade `kysely` to `^0.29.2`. No code or API change in xf-sql: the
  query-builder surface we expose (`Kysely`, `Dialect`, `Transaction`,
  `DatabaseRepository`, `TransactionalDatabaseRepository`) is unaffected by
  0.29's breaking changes, which concern migrations (`kysely/migration`),
  the dropped CommonJS build, and the removed `sql.value`/`sql.literal`
  helpers — none of which this package uses.

## 0.1.2

### Patch Changes

- 5ad6091: docs: clarify that `kysely` is a bundled dependency you never install
  separately, and that dialect adapters bundle their own driver. Removed
  `kysely` and `pg` from the install instructions; noted that only the
  generic (bring-your-own-dialect) path needs a driver installed manually.

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
