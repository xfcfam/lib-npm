/**
 * Developer-chosen value codec: how a stored value is encoded to the
 * string the backend holds, and decoded back. Mirrors the
 * parser/serializer hook of `@xfcfam/xf-rest` and `ObjectRestService`
 * in `@xfcfam/xf-server-http`. The default is JSON — see
 * {@link CodecUtils.json}. A dumb strategy carrier (no dependencies).
 *
 * @typeParam V  The value type stored by the repository.
 */
export interface Codec<V> {
  /** Encode a value to the string written to the store. */
  encode(value: V): string
  /** Decode a raw payload read from the store back to a value. */
  decode(raw: string): V
}
