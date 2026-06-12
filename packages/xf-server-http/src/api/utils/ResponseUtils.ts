/**
 * Static utility — classifiers for the `body` field of an
 * `HttpResponse` (or `HttpRequest`). Pure (no I/O).
 *
 * The XF doctrine for `xf-server` unifies `body` to a single type:
 * it may be a JS value (object/array/primitive), a `Uint8Array`, a
 * `ReadableStream<Uint8Array>`, a `string`, or null/undefined. The
 * pipeline treats each shape differently: object bodies are
 * serialised by `ObjectRestService`, streams are piped through,
 * bytes are written verbatim, strings are sent as text.
 *
 * Cross-cutting hooks (`onResponse` on either `RestService` or
 * `HttpServerBusiness`) need to branch on these cases — typically to
 * apply a wrapper envelope to object responses while letting
 * streams/files/bytes pass through. This Utility provides the
 * classifiers so the branching is a single readable line:
 *
 * ```ts
 * override async onResponse(_req, res) {
 *   if (!ResponseUtils.isObject(res.body)) return res   // stream / file / bytes
 *   return { ...res, body: { code: '0', description: 'OK', data: res.body } }
 * }
 * ```
 *
 * The classifier set is **exhaustive and disjoint** for non-`undefined`
 * bodies: every body is exactly one of stream / binary / textual / object.
 * `undefined` returns `false` from every classifier (no body to act on).
 */
export class ResponseUtils {
  private constructor() {}

  /**
   * True when `body` is a `ReadableStream<Uint8Array>` — the
   * streaming case (downloads, SSE, large exports).
   */
  static isStream(body: unknown): body is ReadableStream<Uint8Array> {
    return typeof body === 'object'
      && body !== null
      && typeof (body as { getReader?: unknown }).getReader === 'function'
  }

  /**
   * True when `body` is raw bytes — `Uint8Array` (covers
   * `Buffer` subtypes too, since `Buffer` extends `Uint8Array`).
   */
  static isBinary(body: unknown): body is Uint8Array {
    return body instanceof Uint8Array
  }

  /**
   * True when `body` is a plain string — sent as-is to the client.
   * Does NOT cover `string`-encoded JSON: by the time a wrapper hook
   * sees the response, an object body has not yet been serialised.
   */
  static isTextual(body: unknown): body is string {
    return typeof body === 'string'
  }

  /**
   * True when `body` is a JS value that will be JSON-serialised
   * downstream (object, array, number, boolean, or `null`). The
   * exception is `undefined`, which represents an empty response —
   * not a wrappable object.
   *
   * The check is **complementary** to {@link isStream},
   * {@link isBinary} and {@link isTextual}: if a body is not a
   * stream, not bytes and not a string, it is treated as an object.
   */
  static isObject(body: unknown): boolean {
    if (body === undefined) return false
    if (ResponseUtils.isStream(body)) return false
    if (ResponseUtils.isBinary(body)) return false
    if (ResponseUtils.isTextual(body)) return false
    return true
  }

  /** True when there is no body to send (`undefined` or empty status). */
  static isEmpty(body: unknown): boolean {
    return body === undefined
  }
}
