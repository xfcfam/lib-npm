import { TransactionalDatabaseRepository } from '@xfcfam/xf-sql'
import { PostgresDialect } from 'kysely'
import { Pool, type PoolConfig } from 'pg'
import { PostgresErrorUtils } from '../utils/PostgresErrorUtils.js'

/**
 * Configuration accepted by {@link PostgresDatabaseRepository}'s
 * constructor.
 *
 * Either provide a `connectionString` (the simplest path), a full
 * `pg.PoolConfig`, or both — they are merged with the connection
 * string taking precedence for connection coordinates.
 */
export interface PostgresOptions {
  /** Postgres connection string (`postgres://user:pass@host:port/db?…`). */
  connectionString?: string
  /** Extra `pg.PoolConfig` fields: `max`, `idleTimeoutMillis`, `ssl`, … */
  pool?: PoolConfig
}

/**
 * Ready-to-use Generalization for the Access Layer when the backing
 * store is **PostgreSQL**.
 *
 * Wraps `kysely`'s `PostgresDialect` over the `pg` driver behind a
 * single XF-canonical class. The implementer's concrete Logical
 * extends this and exposes domain-meaningful methods that compose
 * queries against `this.db`. Transactions via `this.transaction(...)`,
 * one-shot error translation via `this.exec(...)`.
 *
 * The default `translateError` maps Postgres SQLSTATE codes to the
 * typed Exceptions exported from `@xfcfam/xf-sql`
 * (`UniqueViolationException`, `ForeignKeyViolationException`,
 * `CheckViolationException`, `NotNullViolationException`,
 * `DeadlockException`) and transport-level errors (`ECONNREFUSED`,
 * `ETIMEDOUT`, …) to `ConnectionException`. The implementer's
 * Business Layer never sees `pg` types.
 *
 * @typeParam Schema  Implementer-defined TypeScript interface mapping
 *                    table names to their column shapes.
 *
 * @example
 * ```ts
 * import { PostgresDatabaseRepository } from '@xfcfam/xf-sql-postgres'
 * import { UniqueViolationException } from '@xfcfam/xf-sql'
 *
 * interface Schema {
 *   users: { id: number; name: string; email: string; created_at: Date }
 * }
 *
 * export class UsersDb extends PostgresDatabaseRepository<Schema> {
 *   constructor() {
 *     super({
 *       connectionString: process.env.DATABASE_URL!,
 *       pool: { max: 10, idleTimeoutMillis: 30_000 },
 *     })
 *   }
 *   async init()      { await super.init() }       // ← required
 *   async terminate() { await super.terminate() }  // ← required
 *
 *   getUser(id: number) {
 *     return this.exec(() =>
 *       this.db.selectFrom('users').where('id', '=', id).selectAll().executeTakeFirstOrThrow()
 *     )
 *   }
 *
 *   async createUser(input: { name: string; email: string }) {
 *     try {
 *       return await this.exec(() =>
 *         this.db.insertInto('users').values({ ...input, created_at: new Date() }).returningAll().executeTakeFirstOrThrow()
 *       )
 *     } catch (err) {
 *       if (err instanceof UniqueViolationException && err.column === 'email') {
 *         throw new DomainError('Email already registered')
 *       }
 *       throw err
 *     }
 *   }
 * }
 * ```
 */
export abstract class PostgresDatabaseRepository<Schema = unknown>
  extends TransactionalDatabaseRepository<Schema>
{
  constructor(options: PostgresOptions) {
    const poolConfig: PoolConfig = { ...options.pool }
    if (options.connectionString !== undefined) {
      poolConfig.connectionString = options.connectionString
    }
    const pool = new Pool(poolConfig)
    super({ dialect: new PostgresDialect({ pool }) })
  }

  /**
   * Translate `pg` / Kysely driver errors into the typed Exceptions
   * exported from `@xfcfam/xf-sql`. Delegates to
   * {@link PostgresErrorUtils.translate}.
   *
   * Subclasses may override to layer additional mappings on top, but
   * should `return super.translateError(err)` for unrecognised
   * errors so the base policy still applies.
   */
  protected override translateError(err: unknown): unknown {
    return PostgresErrorUtils.translate(err)
  }
}
