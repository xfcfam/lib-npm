/**
 * Access-layer Transfer — the complete response returned by
 * `RestRepository.call()` (and the verb helpers). The client-side
 * counterpart of `@xfcfam/xf-server-http`'s `HttpResponse`: same shape
 * (`status` / `headers` / `body`), read on the client instead of
 * produced on the server.
 *
 * `body` preserves the response's nature:
 *
 *   - a parsed JS value (object, array, primitive) → header-based
 *     parsing by `Content-Type` via `ParseUtils` (plus the optional
 *     reviver). This is the default.
 *   - a `ReadableStream<Uint8Array>` → when the request opts into
 *     streaming (`Request.stream === true`); the body is NOT buffered
 *     or parsed, so downloads / SSE flow through chunk by chunk.
 *   - `null` → empty body (HTTP 204 or a zero-length response).
 *
 * Non-2xx responses do not arrive here: they are raised as a
 * `RestException` (which carries the same `status` / `headers` / `body`)
 * so retry and error handling stay exception-driven.
 */
export interface HttpResponse<TBody = unknown> {
  /** HTTP status code. */
  readonly status: number
  /** Response headers, lowercased name → value. */
  readonly headers: Readonly<Record<string, string>>
  /** Response body. See the interface docstring for the supported shapes. */
  readonly body: TBody
}
