import { KeyValueException } from './KeyValueException.js'

/**
 * Thrown when the key-value store is unreachable — DNS failure, TCP
 * refused, TLS handshake failure, command timeout, etc. The original
 * transport error is preserved as the standard `Error.cause`.
 *
 * Pair with `@xfcfam/xf`'s `RetryableRepository.withRetry` to back off
 * and retry on transient transport failures.
 */
export class ConnectionException extends KeyValueException {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'ConnectionException'
  }
}
