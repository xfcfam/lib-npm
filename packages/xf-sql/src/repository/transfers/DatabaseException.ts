/**
 * Base type for every database-related error raised through xf-sql.
 *
 * Every concrete dialect-specific Exception in `@xfcfam/xf-sql` is a
 * subclass of `DatabaseException`. Consumers can branch on the
 * specific subclass (e.g. `UniqueViolationException`) or fall back to
 * `instanceof DatabaseException` to catch any DB-originated error.
 */
export class DatabaseException extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'DatabaseException'
  }
}
