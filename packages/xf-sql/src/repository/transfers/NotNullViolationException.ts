import { DatabaseException } from './DatabaseException.js'

/**
 * Thrown when an INSERT or UPDATE attempts to set a NOT NULL column
 * to NULL.
 *
 * Almost always indicates a bug in the Repository or a missing input
 * validation at the Business Layer.
 */
export class NotNullViolationException extends DatabaseException {
  /** Table where the violation occurred, if known. */
  readonly table?: string
  /** Column that was set to NULL, if known. */
  readonly column?: string

  constructor(
    message: string,
    details: { table?: string; column?: string; cause?: unknown } = {},
  ) {
    super(message, { cause: details.cause })
    this.name = 'NotNullViolationException'
    if (details.table  !== undefined) this.table  = details.table
    if (details.column !== undefined) this.column = details.column
  }
}
