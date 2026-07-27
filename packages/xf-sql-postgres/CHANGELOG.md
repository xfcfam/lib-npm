# `@xfcfam/xf-sql-postgres`

## 1.2.0

### Minor Changes

- 46d209f: Add `camelToSnake` to `DatabaseOptions` and `PostgresOptions`

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

## 1.1.0

## 1.0.0

### Patch Changes

- Updated dependencies [80407e6]
  - @xfcfam/xf@1.0.0
  - @xfcfam/xf-sql@1.0.0

## 0.2.1

### Patch Changes

- Updated dependencies
  - @xfcfam/xf@0.3.0
  - @xfcfam/xf-sql@1.0.0

## 0.2.0

### Minor Changes

- Inherit the built-in CRUD surface from `@xfcfam/xf-sql` 0.2.0

  `PostgresDatabaseRepository` (through `DatabaseRepository`) now exposes the
  stringly-typed CRUD helpers — `findById` · `findOne` · `find` · `insert` ·
  `insertMany` · `update` · `updateMany` · `delete` · `deleteMany` · `exists` ·
  `count` · `pluck` · `keymap` · `group` · `paginate` · `run` · `query` ·
  `scalar`. No API of its own changes; the `@xfcfam/xf-sql` peer dependency
  moves to `^0.2.0`.

### Patch Changes

- Updated dependencies
  - @xfcfam/xf-sql@0.2.0

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
