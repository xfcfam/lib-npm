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
  /**
   * Request body. Encoded according to the request's `Content-Type`
   * and the body's runtime type (see `SerializeUtils`): a plain
   * object/array defaults to JSON; a `URLSearchParams`, `FormData`,
   * `Blob`, typed array, string or stream is sent as-is; an explicit
   * `Content-Type` (e.g. `application/x-www-form-urlencoded`) selects
   * the matching serializer.
   */
  body?: unknown
  /**
   * When `true`, the response `body` is delivered as the raw
   * `ReadableStream<Uint8Array>` (not buffered or parsed), preserving
   * streaming downloads and server-sent events. Default `false`
   * (header-based parsing of the full body).
   */
  stream?: boolean
}
