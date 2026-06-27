/**
 * `@xfcfam/xf-sql` — SQL Access Layer Generalization for the XF
 * Architecture Model.
 *
 * Encapsulates the [Kysely](https://kysely.dev) query builder behind
 * an XF-canonical Generalization (`DatabaseRepository`) plus a
 * transaction-aware specialisation (`TransactionalDatabaseRepository`)
 * and a typed Exception hierarchy.
 *
 * xf-sql is **dialect-agnostic**: pair it with one of the dialect
 * adapter packages (`@xfcfam/xf-sql-postgres`,
 * `@xfcfam/xf-sql-mysql`, …) or supply any Kysely `Dialect` directly.
 *
 * Peer dependency: `@xfcfam/xf`. `kysely` is a direct (bundled) dependency.
 */

// ── Access — base ─────────────────────────────────────────
export { DatabaseRepository } from './src/repository/general/DatabaseRepository.js'
export type { DatabaseOptions } from './src/repository/general/DatabaseRepository.js'
export type { Filters, Pagination, PageOptions, Primitive } from './src/repository/transfers/Crud.js'
export { TransactionalDatabaseRepository } from './src/repository/general/TransactionalDatabaseRepository.js'

// ── Access — structs (Exceptions) ─────────────────────────
export { DatabaseException }            from './src/repository/transfers/DatabaseException.js'
export { ConnectionException }          from './src/repository/transfers/ConnectionException.js'
export { UniqueViolationException }     from './src/repository/transfers/UniqueViolationException.js'
export { ForeignKeyViolationException } from './src/repository/transfers/ForeignKeyViolationException.js'
export { CheckViolationException }      from './src/repository/transfers/CheckViolationException.js'
export { NotNullViolationException }    from './src/repository/transfers/NotNullViolationException.js'
export { DeadlockException }            from './src/repository/transfers/DeadlockException.js'
