import type { Request } from './Request.js'

/**
 * Thrown by `RestRepository` when the remote server returns a
 * non-2xx response.
 *
 * `RestException` always carries the HTTP `status`, the server's
 * `statusText`, the parsed response `body` (best-effort: JSON when the
 * `content-type` advertises it, plain text otherwise), and the
 * originating `request`. Use these fields to branch handling by
 * status code or to surface server-provided error details to the
 * Business Layer.
 *
 * @example
 * ```ts
 * try {
 *   await this.userRest.get('/users/123')
 * } catch (err) {
 *   if (err instanceof RestException && err.status === 404) {
 *     return null
 *   }
 *   throw err
 * }
 * ```
 */
export class RestException extends Error {
  /** HTTP status code returned by the server. */
  readonly status: number
  /** HTTP status text returned by the server. */
  readonly statusText: string
  /** Parsed response body (JSON when possible, otherwise raw text). */
  readonly body: unknown
  /** The originating request, after `interceptor` transformations. */
  readonly request: Request

  constructor(status: number, statusText: string, body: unknown, request: Request) {
    super(`HTTP ${status} ${statusText} — ${request.method} ${request.path}`)
    this.name = 'RestException'
    this.status = status
    this.statusText = statusText
    this.body = body
    this.request = request
  }
}
