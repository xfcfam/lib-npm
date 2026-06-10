import { DatabaseException } from './DatabaseException.js'

/**
 * Thrown when an INSERT, UPDATE or DELETE violates a FOREIGN KEY
 * constraint.
 *
 * Common scenarios: inserting a row that references a non-existent
 * parent; deleting a row that is still referenced by children.
 */
export class ForeignKeyViolationException extends DatabaseException {
  /** Name of the violated foreign-key constraint, if known. */
  readonly constraint?: string
  /** Table where the violation occurred, if known. */
  readonly table?: string

  constructor(
    message: string,
    details: { constraint?: string; table?: string; cause?: unknown } = {},
  ) {
    super(message, { cause: details.cause })
    this.name = 'ForeignKeyViolationException'
    if (details.constraint !== undefined) this.constraint = details.constraint
    if (details.table      !== undefined) this.table      = details.table
  }
}
