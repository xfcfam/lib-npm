import type { Request } from './Request.js'

/**
 * Thrown by `RestRepository` when the call could not reach the
 * server — DNS failure, connection refused, TLS handshake failure,
 * timeout, or any other transport-level error.
 *
 * The original error is preserved as the standard `Error.cause`
 * field. The {@link reason} flag distinguishes timeouts from other
 * connection failures, which is often enough to branch retry / circuit
 * breaker logic without inspecting the wrapped error.
 *
 * @example
 * ```ts
 * try {
 *   await this.userRest.get('/users/1')
 * } catch (err) {
 *   if (err instanceof ConnectionException && err.reason === 'timeout') {
 *     return this.withRetry(...)   // RetryableRepository compose
 *   }
 *   throw err
 * }
 * ```
 */
export class ConnectionException extends Error {
  /** The originating request, after `interceptor` transformations. */
  readonly request: Request
  /** Whether the failure was caused by a timeout or a generic network error. */
  readonly reason: 'timeout' | 'network'

  constructor(cause: unknown, request: Request, reason: 'timeout' | 'network' = 'network') {
    super(`Network ${reason} — ${request.method} ${request.path}`, { cause })
    this.name = 'ConnectionException'
    this.request = request
    this.reason = reason
  }
}
