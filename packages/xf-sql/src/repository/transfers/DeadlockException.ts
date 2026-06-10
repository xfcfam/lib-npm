import { DatabaseException } from './DatabaseException.js'

/**
 * Thrown when the database detects a deadlock and aborts one of the
 * conflicting transactions.
 *
 * Deadlocks are typically retryable — the transaction can be re-run
 * and will usually succeed once the conflicting party has finished.
 * Pair with `RetryableRepository.withRetry` or
 * `RetryRestRepository`-style policies in your Logical.
 */
export class DeadlockException extends DatabaseException {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'DeadlockException'
  }
}
