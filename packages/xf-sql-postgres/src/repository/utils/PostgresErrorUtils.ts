import {
  DatabaseException,
  ConnectionException,
  UniqueViolationException,
  ForeignKeyViolationException,
  CheckViolationException,
  NotNullViolationException,
  DeadlockException,
} from '@xfcfam/xf-sql'

/**
 * Shape of the error object thrown by `pg` (and propagated by
 * Kysely's `PostgresDialect`) when a database returns an error.
 *
 * `pg` attaches non-standard fields directly to the Error instance:
 * the SQLSTATE `code` (e.g. `"23505"`), and where applicable
 * `table`, `column`, `constraint`, `detail`.
 */
interface PostgresLikeError {
  code?: string
  table?: string
  column?: string
  constraint?: string
  detail?: string
  message?: string
}

/**
 * Static utility component that translates Postgres / `pg` driver
 * errors into the typed Exceptions exported from `@xfcfam/xf-sql`.
 *
 * The translation is based on the SQLSTATE code attached to the
 * error by `pg` (see
 * [Postgres docs](https://www.postgresql.org/docs/current/errcodes-appendix.html)).
 *
 * Non-instantiable. All members are static.
 */
export class PostgresErrorUtils {
  private constructor() {}

  /** Class 23 — integrity constraint violation: unique. */
  static readonly SQLSTATE_UNIQUE_VIOLATION      = '23505'
  /** Class 23 — integrity constraint violation: foreign key. */
  static readonly SQLSTATE_FOREIGN_KEY_VIOLATION = '23503'
  /** Class 23 — integrity constraint violation: check. */
  static readonly SQLSTATE_CHECK_VIOLATION       = '23514'
  /** Class 23 — integrity constraint violation: not null. */
  static readonly SQLSTATE_NOT_NULL_VIOLATION    = '23502'
  /** Class 40 — transaction rollback: deadlock detected. */
  static readonly SQLSTATE_DEADLOCK_DETECTED     = '40P01'

  /**
   * Translate any `pg` / Kysely error to the corresponding `@xfcfam/xf-sql`
   * Exception. Returns the input unchanged when:
   *
   * - The error is already a `DatabaseException` (already translated).
   * - The error has no SQLSTATE `code` and isn't a recognised
   *   transport-level failure.
   *
   * @example
   * ```ts
   * try {
   *   await this.db.insertInto('users').values(input).execute()
   * } catch (err) {
   *   throw PostgresErrorUtils.translate(err)
   * }
   * ```
   *
   * (`PostgresDatabaseRepository` overrides `translateError` to call
   * this automatically — you don't need to wrap manually if you
   * extend it.)
   */
  static translate(err: unknown): unknown {
    if (err instanceof DatabaseException) return err
    if (!PostgresErrorUtils.isErrorLike(err)) return err

    const message = err.message ?? 'Database error'

    // Connection-level errors do not have a SQLSTATE; pg sets `code`
    // to a Node errno like 'ECONNREFUSED' or 'ENOTFOUND'.
    if (PostgresErrorUtils.isTransportCode(err.code)) {
      return new ConnectionException(message, { cause: err })
    }

    switch (err.code) {
      case PostgresErrorUtils.SQLSTATE_UNIQUE_VIOLATION:
        return new UniqueViolationException(message, {
          ...(err.constraint !== undefined ? { constraint: err.constraint } : {}),
          ...(err.table      !== undefined ? { table:      err.table }      : {}),
          ...(err.column     !== undefined ? { column:     err.column }     : {}),
          cause: err,
        })

      case PostgresErrorUtils.SQLSTATE_FOREIGN_KEY_VIOLATION:
        return new ForeignKeyViolationException(message, {
          ...(err.constraint !== undefined ? { constraint: err.constraint } : {}),
          ...(err.table      !== undefined ? { table:      err.table }      : {}),
          cause: err,
        })

      case PostgresErrorUtils.SQLSTATE_CHECK_VIOLATION:
        return new CheckViolationException(message, {
          ...(err.constraint !== undefined ? { constraint: err.constraint } : {}),
          ...(err.table      !== undefined ? { table:      err.table }      : {}),
          cause: err,
        })

      case PostgresErrorUtils.SQLSTATE_NOT_NULL_VIOLATION:
        return new NotNullViolationException(message, {
          ...(err.table  !== undefined ? { table:  err.table }  : {}),
          ...(err.column !== undefined ? { column: err.column } : {}),
          cause: err,
        })

      case PostgresErrorUtils.SQLSTATE_DEADLOCK_DETECTED:
        return new DeadlockException(message, { cause: err })

      default:
        return err
    }
  }

  private static isErrorLike(err: unknown): err is PostgresLikeError {
    return typeof err === 'object' && err !== null
  }

  private static isTransportCode(code: string | undefined): boolean {
    if (code === undefined) return false
    return (
      code === 'ECONNREFUSED' ||
      code === 'ENOTFOUND' ||
      code === 'ETIMEDOUT' ||
      code === 'ECONNRESET' ||
      code === 'EHOSTUNREACH' ||
      code === 'EAI_AGAIN'
    )
  }
}
