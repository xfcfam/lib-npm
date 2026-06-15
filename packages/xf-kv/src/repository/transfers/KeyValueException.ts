/**
 * Base type for every error raised through `@xfcfam/xf-kv`.
 *
 * Concrete failures (`ConnectionException`, `SerializationException`)
 * and any adapter-specific Exception subclass extend this, so a
 * consumer can branch on the specific subclass or fall back to
 * `instanceof KeyValueException` to catch any store-originated error.
 */
export class KeyValueException extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'KeyValueException'
  }
}
