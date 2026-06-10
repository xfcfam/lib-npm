import type { HttpMethod } from './HttpMethod.js'

/**
 * Interaction-layer Transfer — a single incoming HTTP request as seen
 * by a `RestService` handler.
 *
 * `body` is parameterised so each handler can declare its expected
 * shape. By default it is `unknown` — at the `RestService` level the
 * body arrives as a raw stream or `Uint8Array`; the
 * `ObjectRestService` subclass parses it according to the
 * `Content-Type` and surfaces it as a typed object.
 *
 * Streaming uploads are first-class: when the underlying transport
 * supplies the body as a `ReadableStream<Uint8Array>`, it is carried
 * through here without buffering. The handler decides whether to
 * consume it incrementally or to read it into memory.
 */
export interface HttpRequest<TBody = unknown> {
  /** HTTP method. */
  readonly method: HttpMethod
  /** Resolved path (after route matching). */
  readonly path: string
  /** Route parameters extracted from the path (`/users/:id` → `{ id: '42' }`). */
  readonly params: Readonly<Record<string, string>>
  /** Query-string parameters. */
  readonly query: Readonly<Record<string, string | readonly string[]>>
  /** Lowercased header name → value (or array for repeated headers). */
  readonly headers: Readonly<Record<string, string | readonly string[]>>
  /**
   * Request body. May be `null`, a `Uint8Array`, a
   * `ReadableStream<Uint8Array>` for incremental consumption, or any
   * parsed value when an `ObjectRestService` has run its parsers.
   */
  readonly body: TBody
}
