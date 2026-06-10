import { DatabaseException } from './DatabaseException.js'

/**
 * Thrown when an INSERT or UPDATE violates a CHECK constraint.
 *
 * The constraint name (when exposed by the driver) often matches the
 * named CHECK in the schema, e.g. `users_age_positive_check`.
 */
export class CheckViolationException extends DatabaseException {
  /** Name of the violated CHECK constraint, if known. */
  readonly constraint?: string
  /** Table where the violation occurred, if known. */
  readonly table?: string

  constructor(
    message: string,
    details: { constraint?: string; table?: string; cause?: unknown } = {},
  ) {
    super(message, { cause: details.cause })
    this.name = 'CheckViolationException'
    if (details.constraint !== undefined) this.constraint = details.constraint
    if (details.table      !== undefined) this.table      = details.table
  }
}
