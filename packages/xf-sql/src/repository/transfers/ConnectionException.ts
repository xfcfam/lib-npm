import { DatabaseException } from './DatabaseException.js'

/**
 * Thrown when the database is unreachable — DNS failure, TCP refused,
 * TLS handshake failure, statement / connection timeout, etc.
 *
 * The original transport error is preserved as the standard
 * `Error.cause`. Use this alongside `RetryableRepository.withRetry`
 * to back off and retry on transient transport failures.
 */
export class ConnectionException extends DatabaseException {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'ConnectionException'
  }
}
