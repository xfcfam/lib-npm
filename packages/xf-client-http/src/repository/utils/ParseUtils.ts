/**
 * Function that turns a raw response body (already decoded as UTF-8
 * text) into a structured value. Parsers are pure functions of their
 * input — no I/O, no shared state.
 *
 * Parsers may be synchronous or return a promise. Asynchrony is useful
 * for parsers that lazily import a heavy dependency (e.g. an XML or
 * CSV library) the first time they run.
 */
export type Parser = (raw: string) => unknown | Promise<unknown>

/**
 * Static utility component for response-body parsing. Non-instantiable.
 *
 * Provides the canonical content-type → {@link Parser} routing used by
 * `RestRepository`, plus the built-in parsers it falls back to.
 * Implementer-defined parsers (XML, CSV, MessagePack, etc.) are
 * registered in `RestOptions.parsers` and override the routing for
 * their media type.
 */
export class ParseUtils {
  private constructor() {}

  /** Default parser for `application/json`, `text/json` and any `*+json` media type. Returns `null` for an empty body. */
  static readonly JsonParser: Parser = (raw) => (raw.length === 0 ? null : JSON.parse(raw))

  /** Default parser for `text/*` and any unrecognised content type. Returns the raw body verbatim. */
  static readonly TextParser: Parser = (raw) => raw

  /**
   * Select the appropriate {@link Parser} for a given `Content-Type`
   * header value.
   *
   * Resolution order:
   *
   *   1. User-provided parsers in `custom` (exact, case-insensitive
   *      match on the media type — the part of `content-type` before
   *      any `;` parameters). User entries always win.
   *   2. Built-in JSON parser if the media type is `application/json`,
   *      `text/json`, or ends with `+json` (covers JSON:API, HAL+JSON,
   *      etc.).
   *   3. Built-in text parser if the media type starts with `text/`.
   *   4. Fallback: built-in text parser.
   *
   * @param contentType  Raw value of the `Content-Type` response header.
   * @param custom       Optional user-provided parser overrides /
   *                     additions. Keys are case-insensitive media types.
   */
  static pickParser(contentType: string, custom: Record<string, Parser> = {}): Parser {
    const head = (contentType.split(';')[0] ?? '').trim().toLowerCase()

    for (const key of Object.keys(custom)) {
      if (key.toLowerCase() === head) return custom[key]!
    }

    if (head === 'application/json' || head === 'text/json' || head.endsWith('+json')) {
      return ParseUtils.JsonParser
    }
    if (head.startsWith('text/')) return ParseUtils.TextParser
    return ParseUtils.TextParser
  }
}
