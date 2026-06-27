/**
 * Function that encodes a request body value into a transport-ready
 * `BodyInit` (string, `URLSearchParams`, `FormData`, `Blob`, …) that
 * `ky`/`fetch` can send verbatim. Serializers are pure functions of
 * their input — no I/O, no shared state.
 *
 * Serializers may be synchronous or return a promise. Asynchrony is
 * useful for serializers that lazily import a heavy dependency (e.g. an
 * XML or MessagePack encoder) the first time they run.
 */
export type Serializer = (body: unknown) => BodyInit | Promise<BodyInit>

/**
 * Static utility component for request-body serialization. Non-instantiable.
 *
 * The request-side mirror of {@link ParseUtils}: it provides the
 * canonical Content-Type → {@link Serializer} routing used by
 * `RestRepository` to encode outbound bodies, plus the built-in
 * serializers it falls back to. This is what makes the Repository
 * agnostic to the wire format — JSON is merely the default, not an
 * assumption baked into the transport.
 *
 * Implementer-defined serializers (XML, CSV, MessagePack, etc.) are
 * registered in `RestOptions.serializers` and override the routing for
 * their media type.
 */
export class SerializeUtils {
  private constructor() {}

  /**
   * Default serializer for `application/x-www-form-urlencoded`.
   * Accepts a `URLSearchParams` (returned as-is) or a flat record of
   * string-coercible values (`null`/`undefined` entries are dropped).
   */
  static readonly FormSerializer: Serializer = (body) => {
    if (body instanceof URLSearchParams) return body
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
      if (value !== undefined && value !== null) params.append(key, String(value))
    }
    return params
  }

  /** Default serializer for `text/*`. Returns strings verbatim; stringifies anything else. */
  static readonly TextSerializer: Serializer = (body) => (typeof body === 'string' ? body : String(body))

  /** Default serializer for `application/json` (and `*+json`). Returns the JSON text. */
  static readonly JsonSerializer: Serializer = (body) => JSON.stringify(body)

  /**
   * Returns `true` when `body` is already a transport-ready value that
   * `fetch`/`ky` can send as-is (and infer the Content-Type for):
   * `string`, `URLSearchParams`, `FormData`, `Blob`, `ArrayBuffer`, a
   * typed-array view, or a `ReadableStream`.
   *
   * Such bodies are passed straight through, never re-encoded as JSON.
   */
  static isEncoded(body: unknown): body is BodyInit {
    return (
      typeof body === 'string' ||
      body instanceof URLSearchParams ||
      body instanceof FormData ||
      body instanceof Blob ||
      body instanceof ArrayBuffer ||
      ArrayBuffer.isView(body) ||
      (typeof ReadableStream !== 'undefined' && body instanceof ReadableStream)
    )
  }

  /**
   * Select the appropriate {@link Serializer} for a given request
   * `Content-Type` header value. Mirrors {@link ParseUtils.pickParser}.
   *
   * Resolution order:
   *
   *   1. User-provided serializers in `custom` (exact, case-insensitive
   *      match on the media type — the part of `content-type` before
   *      any `;` parameters). User entries always win.
   *   2. Built-in form serializer for `application/x-www-form-urlencoded`.
   *   3. Built-in text serializer if the media type starts with `text/`.
   *   4. `undefined` — no special encoding. The caller falls back to its
   *      default policy: pass an already-encoded body through, otherwise
   *      JSON-serialize a plain object/array. (JSON is intentionally NOT
   *      returned here so it keeps flowing through `ky`'s `json` option.)
   *
   * @param contentType  Raw value of the `Content-Type` request header.
   * @param custom       Optional user-provided serializer overrides /
   *                     additions. Keys are case-insensitive media types.
   */
  static pickSerializer(contentType: string, custom: Record<string, Serializer> = {}): Serializer | undefined {
    const head = (contentType.split(';')[0] ?? '').trim().toLowerCase()

    for (const key of Object.keys(custom)) {
      if (key.toLowerCase() === head) return custom[key]!
    }

    if (head === 'application/x-www-form-urlencoded') return SerializeUtils.FormSerializer
    if (head.startsWith('text/')) return SerializeUtils.TextSerializer
    return undefined
  }
}
