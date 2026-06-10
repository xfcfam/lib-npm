/**
 * The HTTP verbs supported by `RestRepository`.
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

/**
 * Normalised description of a single REST call.
 *
 * Carried as input to `RestRepository.call()` and exposed to the
 * `interceptor` / `onRequest` hooks so they can read or transform the
 * request before it is dispatched. `Request` is a Transfer object in
 * XF terms — pure data, no logic.
 *
 * The `path` is appended to the `baseUrl` configured on the
 * Repository. Leading slashes are tolerated and stripped before
 * dispatch.
 */
export interface Request {
  /** HTTP verb. */
  method: HttpMethod
  /** Path appended to `baseUrl`. */
  path: string
  /** Query-string parameters. `undefined` values are dropped. */
  query?: Record<string, string | number | boolean | undefined>
  /** Per-request headers. Merged on top of `defaultHeaders`. */
  headers?: Record<string, string>
  /** Request body. Serialised as JSON. */
  body?: unknown
}
