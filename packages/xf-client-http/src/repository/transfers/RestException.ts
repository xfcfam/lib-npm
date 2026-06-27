import { ClientException } from '@xfcfam/xf-client'
import type { Request } from './Request.js'

/**
 * Thrown by `RestRepository` when the remote server answers with a
 * non-2xx response. The HTTP specialisation of `@xfcfam/xf-client`'s
 * {@link ClientException}: it adds the HTTP `status`, `statusText` and
 * response `headers` on top of the machine-readable `body`.
 *
 * A pure transport failure (no response at all) is a
 * `ConnectionException` instead.
 *
 * @example
 * ```ts
 * try {
 *   await this.userRest.get('/users/123')
 * } catch (err) {
 *   if (err instanceof RestException && err.status === 404) return null
 *   throw err
 * }
 * ```
 */
export class RestException extends ClientException {
  /** HTTP status code returned by the server. */
  readonly status: number
  /** HTTP status text returned by the server. */
  readonly statusText: string
  /** Response headers, lowercased name → value. */
  readonly headers: Readonly<Record<string, string>>
  /** The originating request, after any `onRequest` transformation. */
  readonly request: Request

  constructor(
    status: number,
    statusText: string,
    headers: Readonly<Record<string, string>>,
    body: unknown,
    request: Request,
  ) {
    super(`HTTP ${status} ${statusText} — ${request.method} ${request.path}`, body)
    this.name = 'RestException'
    this.status = status
    this.statusText = statusText
    this.headers = headers
    this.request = request
  }
}
