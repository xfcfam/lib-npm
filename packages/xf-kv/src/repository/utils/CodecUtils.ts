import type { Codec } from '../transfers/Codec.js'

/**
 * Access-Layer Utility — built-in value {@link Codec}s. Non-instantiable,
 * static-only, stateless, no I/O. A `KeyValueRepository` defaults to
 * {@link CodecUtils.json}; pass another via `KeyValueOptions.codec`.
 */
export class CodecUtils {
  private constructor() {}

  /** JSON codec (the default): `JSON.stringify` / `JSON.parse`. */
  static json<V>(): Codec<V> {
    return {
      encode: (value) => JSON.stringify(value),
      decode: (raw) => JSON.parse(raw) as V,
    }
  }

  /** Identity codec for values already in string form (no transform). */
  static text(): Codec<string> {
    return {
      encode: (value) => value,
      decode: (raw) => raw,
    }
  }
}
