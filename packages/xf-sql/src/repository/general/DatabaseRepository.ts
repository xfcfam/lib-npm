import { Repository, NotInitializedException } from '@xfcfam/xf'
import { Kysely, type Dialect } from 'kysely'

/**
 * Configuration accepted by {@link DatabaseRepository}'s constructor.
 *
 * The `dialect` is the only required field. Dialect adapter packages
 * such as `@xfcfam/xf-sql-postgres` build it for you behind a
 * higher-level options shape.
 */
export interface DatabaseOptions {
  /** Kysely Dialect implementation (Postgres, MySQL, SQLite, …). */
  dialect: Dialect
}

interface InternalState {
  db: Kysely<any>
}

/**
 * Base Generalization for the Access Layer when the underlying
 * external system is a SQL database.
 *
 * Encapsulates the [Kysely](https://kysely.dev) query builder behind
 * a single XF-canonical class. The implementer's concrete Logical
 * extends this (or a dialect-specific subclass such as
 * `PostgresDatabaseRepository`) and exposes domain-meaningful methods
 * that compose queries against `this.db`, a `Kysely<Schema>` bound
 * to the implementer's typed schema.
 *
 * Concrete dialect support lives in adapter packages — install one of
 * `@xfcfam/xf-sql-postgres`, `@xfcfam/xf-sql-mysql`, etc., or supply
 * any Kysely-compatible `Dialect` directly.
 *
 * ──────────────────────────────────────────────────────────────────
 *  IMPORTANT — Required configuration for subclasses
 * ──────────────────────────────────────────────────────────────────
 * The underlying Kysely instance is held in a static private WeakMap
 * and created inside {@link init}. If a subclass overrides `init()` /
 * `terminate()`, it MUST chain through `super`:
 *
 *   async init()      { await super.init();      // own setup }
 *   async terminate() { // own teardown;         await super.terminate() }
 *
 * Forgetting `super.init()` leaves `this.db` uninitialised and every
 * query will throw {@link NotInitializedException}.
 *
 * ──────────────────────────────────────────────────────────────────
 *  Overridable observation hooks
 * ──────────────────────────────────────────────────────────────────
 *  - {@link onConnected}     ← after `init()` creates the Kysely instance
 *  - {@link onDisconnected}  ← after `terminate()` destroys it
 *  - {@link onQuery}         ← for every query Kysely executes
 *  - {@link onError}         ← for every {@link exec}-wrapped operation that rejects
 *
 *  Transaction hooks ({@link onTransactionStart} / Commit / Rollback)
 *  live on {@link TransactionalDatabaseRepository}, the subclass that
 *  exposes explicit transaction control.
 *
 * ──────────────────────────────────────────────────────────────────
 *  Error translation
 * ──────────────────────────────────────────────────────────────────
 * Dialect-specific errors (driver Error objects) are not translated
 * by this class — it does not know about Postgres SQLSTATEs, MySQL
 * error numbers, etc. Use a dialect adapter subclass (such as
 * `PostgresDatabaseRepository`) or override {@link translateError}
 * yourself to map errors to the typed Exceptions exported from this
 * package (`UniqueViolationException`, etc.).
 *
 * @typeParam Schema  Implementer-defined TypeScript interface mapping
 *                    table names to their column shapes. See the
 *                    Kysely docs for the conventions on
 *                    `Generated`, `ColumnType`, etc.
 *
 * @example
 * ```ts
 * import { DatabaseRepository } from '@xfcfam/xf-sql'
 * import { PostgresDialect } from 'kysely'
 * import { Pool } from 'pg'
 *
 * interface Schema {
 *   users: { id: number; name: string; email: string }
 * }
 *
 * export class UsersDb extends DatabaseRepository<Schema> {
 *   constructor() {
 *     super({
 *       dialect: new PostgresDialect({
 *         pool: new Pool({ connectionString: process.env.DATABASE_URL }),
 *       }),
 *     })
 *   }
 *   async init()      { await super.init() }
 *   async terminate() { await super.terminate() }
 *
 *   getUser(id: number) {
 *     return this.db
 *       .selectFrom('users')
 *       .where('id', '=', id)
 *       .selectAll()
 *       .executeTakeFirstOrThrow()
 *   }
 * }
 * ```
 */
export abstract class DatabaseRepository<Schema = unknown> extends Repository<null> {
  private static readonly state = new WeakMap<object, InternalState>()

  /** Options provided at construction time. */
  protected readonly options: DatabaseOptions

  constructor(options: DatabaseOptions) {
    super(null)
    this.options = options
  }

  /**
   * Typed Kysely instance bound to `Schema`. Use it to compose queries:
   * `this.db.selectFrom('users')…`, `this.db.insertInto('users')…`.
   * Throws if {@link init} has not been called.
   */
  protected get db(): Kysely<Schema> {
    const s = DatabaseRepository.state.get(this)
    if (s === undefined) {
      throw new NotInitializedException('DatabaseRepository: init() was not called (or super.init() was skipped)')
    }
    return s.db as Kysely<Schema>
  }

  /**
   * Subclasses that override this method MUST call `await super.init()`
   * **first**; otherwise {@link db} will throw on use.
   */
  async init(): Promise<void> {
    const db = new Kysely<Schema>({
      dialect: this.options.dialect,
      log: (event) => {
        if (event.level === 'query') {
          this.onQuery(event.query.sql, event.query.parameters)
        } else if (event.level === 'error') {
          // Kysely-emitted query errors are also routed through onError
          // for symmetry with exec() failures.
          this.onError('query', event.error)
        }
      },
    })
    DatabaseRepository.state.set(this, { db })
    await this.onConnected()
  }

  /**
   * Subclasses that override this method MUST call `await super.terminate()`
   * **last** to release the connection pool held by the Kysely instance.
   */
  async terminate(): Promise<void> {
    const s = DatabaseRepository.state.get(this)
    if (s !== undefined) {
      await s.db.destroy()
      DatabaseRepository.state.delete(this)
      await this.onDisconnected()
    }
  }

  /**
   * Hook for dialect-specific error translation. Default
   * implementation is identity (returns the input unchanged).
   *
   * Dialect adapter subclasses (such as `PostgresDatabaseRepository`)
   * override this to map driver errors to the typed Exceptions
   * exported from this package.
   *
   * Called automatically by {@link exec}; not called for direct
   * `this.db.…` usage, where the implementer is responsible for
   * wrapping queries in `this.exec(...)`.
   */
  protected translateError(err: unknown): unknown {
    return err
  }

  /**
   * Execute an operation against the database, translating any
   * dialect-specific errors to xf-sql Exception types via
   * {@link translateError}.
   *
   * Use this whenever you need automatic error translation. For raw
   * Kysely access without translation, use {@link db} directly.
   *
   * @example
   * ```ts
   * async createUser(input: UserInput) {
   *   return this.exec(() =>
   *     this.db.insertInto('users').values(input).returningAll().executeTakeFirstOrThrow()
   *   )
   * }
   * ```
   */
  protected async exec<R>(op: () => Promise<R>): Promise<R> {
    try {
      return await op()
    } catch (err) {
      this.onError('exec', err)
      throw this.translateError(err)
    }
  }

  // ─── Overridable observation hooks ────────────────────────

  /**
   * Invoked after `init()` has created the Kysely instance. Default
   * no-op. Override for connection-open telemetry, schema migrations,
   * connection warmup, etc.
   */
  protected async onConnected(): Promise<void> {}

  /**
   * Invoked after `terminate()` has destroyed the Kysely instance.
   * Default no-op. Override for connection-close telemetry.
   */
  protected async onDisconnected(): Promise<void> {}

  /**
   * Invoked for every query Kysely executes (both standalone and
   * inside transactions). Receives the compiled SQL and the bound
   * parameters. Default no-op.
   *
   * Use for audit logging or query profiling. The hook runs
   * synchronously inside Kysely's pipeline — keep it cheap and avoid
   * blocking work.
   */
  protected onQuery(_sql: string, _params: readonly unknown[]): void {}

  /**
   * Invoked when an `exec()`-wrapped operation rejects, or when
   * Kysely emits a query-level error. The `operation` label
   * distinguishes the source (`'exec'`, `'query'`, or the value
   * supplied by a subclass). Default no-op.
   *
   * The hook fires before {@link translateError}; the (possibly
   * untranslated) error is still re-thrown to the caller.
   */
  protected onError(_operation: string, _error: unknown): void {}
}
