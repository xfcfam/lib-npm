import { DatabaseException } from './DatabaseException.js'

/**
 * Thrown when an INSERT or UPDATE violates a UNIQUE / PRIMARY KEY
 * constraint.
 *
 * Carries the violated constraint name plus the table / column when
 * the underlying driver exposes them, so the Business Layer can
 * surface a domain-meaningful error without parsing strings.
 *
 * @example
 * ```ts
 * try {
 *   await this.usersDb.createUser({ email: 'a@b.c', ... })
 * } catch (err) {
 *   if (err instanceof UniqueViolationException && err.column === 'email') {
 *     throw new DomainError('Email already registered')
 *   }
 *   throw err
 * }
 * ```
 */
export class UniqueViolationException extends DatabaseException {
  /** Name of the violated unique / primary-key constraint, if known. */
  readonly constraint?: string
  /** Table where the violation occurred, if known. */
  readonly table?: string
  /** Column involved in the violation, if known. */
  readonly column?: string

  constructor(
    message: string,
    details: { constraint?: string; table?: string; column?: string; cause?: unknown } = {},
  ) {
    super(message, { cause: details.cause })
    this.name = 'UniqueViolationException'
    if (details.constraint !== undefined) this.constraint = details.constraint
    if (details.table      !== undefined) this.table      = details.table
    if (details.column     !== undefined) this.column     = details.column
  }
}
