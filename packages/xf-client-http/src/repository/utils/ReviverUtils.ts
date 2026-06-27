/**
 * Reviver signature, compatible with `JSON.parse`'s reviver:
 * called with the (string) key of each node and its parsed value,
 * returns the transformed value. At the root, the key is `""`.
 *
 * Revivers MUST be pure — no I/O, no shared state, no side effects.
 */
export type Reviver = (key: string, value: unknown) => unknown

/**
 * Static utility component for post-parse value revival. Non-instantiable.
 *
 * Provides the built-in {@link isoDateReviver}, the {@link composeRevivers}
 * combinator, and the tree-walker {@link walkReviver} that `RestRepository`
 * uses to apply `RestOptions.reviver` to parsed responses regardless of
 * format (JSON, XML, CSV, custom).
 */
export class ReviverUtils {
  private constructor() {}

  /**
   * Matches an ISO 8601 date or date-time string (with optional
   * milliseconds and offset).
   *
   *   2026-05-16
   *   2026-05-16T12:34:56Z
   *   2026-05-16T12:34:56.789+01:00
   */
  private static readonly ISO_DATE_REGEX =
    /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2}))?$/

  /**
   * Reviver that turns ISO 8601 date or date-time strings into native
   * `Date` instances. Other values are returned unchanged.
   */
  static readonly isoDateReviver: Reviver = (_key, value) => {
    if (typeof value === 'string' && ReviverUtils.ISO_DATE_REGEX.test(value)) {
      const ms = Date.parse(value)
      if (!isNaN(ms)) return new Date(ms)
    }
    return value
  }

  /**
   * Compose multiple revivers into one. They are applied left-to-right:
   * the output of `revivers[0]` becomes the input of `revivers[1]`, and
   * so on.
   */
  static composeRevivers(...revivers: Reviver[]): Reviver {
    return (key, value) => revivers.reduce((v, r) => r(key, v), value)
  }

  /**
   * Walk a parsed value tree and apply `reviver` to each node depth-first,
   * in `JSON.parse`-compatible order (children first, then their
   * container).
   *
   * @param value    Already-parsed value tree.
   * @param reviver  Reviver function to apply.
   * @returns The transformed tree.
   */
  static walkReviver(value: unknown, reviver: Reviver): unknown {
    return ReviverUtils.walk(value, reviver, '')
  }

  private static walk(value: unknown, reviver: Reviver, key: string): unknown {
    if (value === null || typeof value !== 'object') {
      return reviver(key, value)
    }
    if (Array.isArray(value)) {
      const out = value.map((v, i) => ReviverUtils.walk(v, reviver, String(i)))
      return reviver(key, out)
    }
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = ReviverUtils.walk(v, reviver, k)
    }
    return reviver(key, out)
  }
}
