import { Repository, NotInitializedException } from '@xfcfam/xf'
import { Kysely, sql, type Dialect } from 'kysely'
import type { Filters, PageOptions, Pagination, Primitive } from '../transfers/Crud.js'

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
      await this.onError('exec', err)
      throw this.translateError(err)
    }
  }

  // ─── Built-in CRUD operations ─────────────────────────────
  //
  // A stringly-typed convenience surface (table name + filter objects)
  // built on top of `this.db` — the data-layer analogue of
  // `RestRepository`'s verb helpers (`get` / `post` / …) over `call`.
  // It does NOT require the typed `Schema`, so a subclass can use it
  // with `Schema = unknown`; the typed `this.db` remains available for
  // bespoke queries (joins, window functions, vector search, …).
  // All operations route through `exec()` for error translation.

  /** Fetch a single row by primary key. `undefined` if not found. */
  async findById<T = any>(table: string, id: Primitive, idColumn = 'id'): Promise<T | undefined> {
    return this.exec(async () =>
      (await this.crud.selectFrom(table).selectAll().where(idColumn, '=', id as any).executeTakeFirst()) as T | undefined)
  }

  /** Fetch the first row matching the filters. `undefined` if none. */
  async findOne<T = any>(table: string, filters?: Filters): Promise<T | undefined> {
    return this.exec(async () =>
      (await this.filter(this.crud.selectFrom(table).selectAll(), filters).limit(1).executeTakeFirst()) as T | undefined)
  }

  /** Fetch all rows matching the filters (all rows when no filters). */
  async find<T = any>(table: string, filters?: Filters): Promise<T[]> {
    return this.exec(async () =>
      (await this.filter(this.crud.selectFrom(table).selectAll(), filters).execute()) as T[])
  }

  /** Insert one row and return it. */
  async insert<T = any>(table: string, values: Record<string, unknown>): Promise<T> {
    return this.exec(async () =>
      (await this.crud.insertInto(table).values(values).returningAll().executeTakeFirstOrThrow()) as T)
  }

  /** Insert many rows and return them. Empty input is a no-op (`[]`). */
  async insertMany<T = any>(table: string, values: ReadonlyArray<Record<string, unknown>>): Promise<T[]> {
    if (values.length === 0) return []
    return this.exec(async () =>
      (await this.crud.insertInto(table).values(values as any).returningAll().execute()) as T[])
  }

  /** Update a single row by primary key and return it. */
  async update<T = any>(table: string, id: Primitive, patch: Record<string, unknown>, idColumn = 'id'): Promise<T> {
    return this.exec(async () =>
      (await this.crud.updateTable(table).set(patch).where(idColumn, '=', id as any).returningAll().executeTakeFirstOrThrow()) as T)
  }

  /** Update every row matching the filters and return them. */
  async updateMany<T = any>(table: string, filters: Filters, patch: Record<string, unknown>): Promise<T[]> {
    return this.exec(async () =>
      (await this.filter(this.crud.updateTable(table).set(patch), filters).returningAll().execute()) as T[])
  }

  /** Delete a single row by primary key and return it. */
  async delete<T = any>(table: string, id: Primitive, idColumn = 'id'): Promise<T> {
    return this.exec(async () =>
      (await this.crud.deleteFrom(table).where(idColumn, '=', id as any).returningAll().executeTakeFirstOrThrow()) as T)
  }

  /** Delete every row matching the filters and return them. */
  async deleteMany<T = any>(table: string, filters: Filters): Promise<T[]> {
    return this.exec(async () =>
      (await this.filter(this.crud.deleteFrom(table), filters).returningAll().execute()) as T[])
  }

  /** Whether any row matches the filters. */
  async exists(table: string, filters?: Filters): Promise<boolean> {
    return this.exec(async () => {
      const row = await this.filter(this.crud.selectFrom(table).select(sql`1`.as('exists')), filters).limit(1).executeTakeFirst()
      return row !== undefined
    })
  }

  /** Count the rows matching the filters. */
  async count(table: string, filters?: Filters): Promise<number> {
    return this.exec(async () => {
      const row: any = await this.filter(this.crud.selectFrom(table).select((eb: any) => eb.fn.countAll().as('count')), filters).executeTakeFirst()
      return Number(row?.count ?? 0)
    })
  }

  /** Project a single column to an array of its values. */
  async pluck<V = Primitive>(table: string, column: string, filters?: Filters): Promise<V[]> {
    return this.exec(async () => {
      const rows: any[] = await this.filter(this.crud.selectFrom(table).select(column), filters).execute()
      return rows.map((r) => r[column]) as V[]
    })
  }

  /** Build a `{ key: value }` map from two columns. Last wins on duplicate keys. */
  async keymap<V = any>(table: string, key: string, value: string, filters?: Filters): Promise<Record<string, V>> {
    return this.exec(async () => {
      const rows: any[] = await this.filter(this.crud.selectFrom(table).select([key, value]), filters).execute()
      const out: Record<string, V> = {}
      for (const r of rows) out[String(r[key])] = r[value]
      return out
    })
  }

  /** Build a `{ key: value[] }` map grouping `value`s by `key`. */
  async group<V = any>(table: string, key: string, value: string, filters?: Filters): Promise<Record<string, V[]>> {
    return this.exec(async () => {
      const rows: any[] = await this.filter(this.crud.selectFrom(table).select([key, value]), filters).execute()
      const out: Record<string, V[]> = {}
      for (const r of rows) (out[String(r[key])] ??= []).push(r[value])
      return out
    })
  }

  /** Fetch a page of rows plus the unpaged total. */
  async paginate<T = any>(table: string, options: PageOptions): Promise<Pagination<T>> {
    const size = options.size ?? 20
    const page = options.page ?? 0
    return this.exec(async () => {
      const pageQuery = this.filter(
        this.crud.selectFrom(table).selectAll().orderBy(options.orderBy, options.direction ?? 'asc').limit(size).offset(page * size),
        options.filters,
      ).execute()
      const countQuery = this.filter(
        this.crud.selectFrom(table).select((eb: any) => eb.fn.countAll().as('count')),
        options.filters,
      ).executeTakeFirst()
      const [elements, countRow] = await Promise.all([pageQuery, countQuery])
      return { total: Number((countRow as any)?.count ?? 0), elements: elements as T[] }
    })
  }

  /** Call a SQL table function (`SELECT * FROM fn(args)`) and return the rows. */
  async run<T = any>(fn: string, params: ReadonlyArray<unknown> = []): Promise<T[]> {
    return this.exec(async () => {
      const args = sql.join(params.map((p) => sql`${p}`))
      const result = await sql<T>`select * from ${sql.ref(fn)}(${args})`.execute(this.crud)
      return result.rows as T[]
    })
  }

  /** Run raw SQL (positional `$1…$n` parameters, repeats allowed) and return the rows. */
  async query<T = any>(rawSql: string, params: ReadonlyArray<unknown> = []): Promise<T[]> {
    return this.exec(async () => {
      const result = await this.bindRaw(rawSql, params).execute(this.crud)
      return result.rows as T[]
    })
  }

  /** Run raw SQL and return the first value of the first row (or `undefined`). */
  async scalar<V = Primitive>(rawSql: string, params: ReadonlyArray<unknown> = []): Promise<V | undefined> {
    return this.exec(async () => {
      const result = await this.bindRaw(rawSql, params).execute(this.crud)
      const row = result.rows[0] as Record<string, unknown> | undefined
      if (row === undefined) return undefined
      return Object.values(row)[0] as V
    })
  }

  /** Untyped Kysely handle for the dynamic CRUD helpers. */
  private get crud(): Kysely<any> {
    return this.db as unknown as Kysely<any>
  }

  /** Chain equality filters onto a query builder. */
  private filter<QB>(qb: QB, filters?: Filters): QB {
    if (filters === undefined) return qb
    let out: any = qb
    for (const [col, val] of Object.entries(filters)) {
      if (val === null) out = out.where(col, 'is', null)
      else if (Array.isArray(val)) out = val.length === 0 ? out.where(sql`1 = 0`) : out.where(col, 'in', val)
      else out = out.where(col, '=', val)
    }
    return out as QB
  }

  /** Turn a raw `$n`-parameterised SQL string into a Kysely bound `sql` fragment. */
  private bindRaw(rawSql: string, params: ReadonlyArray<unknown>) {
    const strings: string[] = []
    const values: unknown[] = []
    let last = 0
    const re = /\$(\d+)/g
    let m: RegExpExecArray | null
    while ((m = re.exec(rawSql)) !== null) {
      strings.push(rawSql.slice(last, m.index))
      values.push(params[Number(m[1]) - 1])
      last = m.index + m[0].length
    }
    strings.push(rawSql.slice(last))
    const fragments = Object.assign([...strings], { raw: [...strings] }) as unknown as TemplateStringsArray
    return sql(fragments, ...values)
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
   *
   * The hook may be `async` — the `exec()` call site `await`s it, so
   * an async override is fully observed before the error is rethrown.
   * Note: the Kysely log callback (`'query'` source) is synchronous by
   * Kysely's API contract and cannot `await` the hook; async overrides
   * that target only that source will execute fire-and-forget from that
   * path. If reliable async observability of query-level Kysely errors
   * is required, wrap the hook body with its own error handling.
   */
  protected onError(_operation: string, _error: unknown): void | Promise<void> {}
}
