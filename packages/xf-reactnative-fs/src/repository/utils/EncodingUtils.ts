/**
 * Static utility — text/byte encoding helpers operating only on in-memory
 * buffers. No I/O.
 *
 * The React Native counterpart of `@xfcfam/xf-fs`'s `EncodingUtils`. Adds
 * pure-JS **Base64** codecs (`toBase64` / `fromBase64`): React Native has
 * no `Buffer`, and `@dr.pogodin/react-native-fs` exchanges binary content
 * as Base64 strings, so byte I/O round-trips through these.
 */
export type Encoding = 'utf-8' | 'utf-16le' | 'utf-16be' | 'utf-8-bom'

const B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
const B64_LOOKUP: Readonly<Record<string, number>> = (() => {
  const map: Record<string, number> = {}
  for (let i = 0; i < B64_CHARS.length; i++) map[B64_CHARS.charAt(i)] = i
  return map
})()

export class EncodingUtils {
  private constructor() {}

  /** Detect a BOM-bearing encoding, or `'utf-8'` when no BOM is present. */
  static detect(bytes: Uint8Array): Encoding {
    if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
      return 'utf-8-bom'
    }
    if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) return 'utf-16le'
    if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) return 'utf-16be'
    return 'utf-8'
  }

  /** Remove a leading BOM if present. Safe to call unconditionally. */
  static stripBom(text: string): string {
    if (text.length > 0 && text.charCodeAt(0) === 0xfeff) return text.slice(1)
    return text
  }

  /** Encode a string as UTF-8 bytes. */
  static toBytes(text: string): Uint8Array {
    return new TextEncoder().encode(text)
  }

  /** Decode UTF-8 bytes into a string, stripping any leading BOM. */
  static fromBytes(bytes: Uint8Array): string {
    return EncodingUtils.stripBom(new TextDecoder('utf-8').decode(bytes))
  }

  /** UTF-8 byte length of a string (the `Buffer.byteLength` replacement). */
  static byteLength(text: string): number {
    return new TextEncoder().encode(text).byteLength
  }

  /** Encode bytes as a Base64 string (no line breaks). */
  static toBase64(bytes: Uint8Array): string {
    let out = ''
    const len = bytes.length
    for (let i = 0; i < len; i += 3) {
      const b0 = bytes[i] ?? 0
      const has1 = i + 1 < len
      const has2 = i + 2 < len
      const b1 = has1 ? (bytes[i + 1] ?? 0) : 0
      const b2 = has2 ? (bytes[i + 2] ?? 0) : 0
      out += B64_CHARS.charAt(b0 >> 2)
      out += B64_CHARS.charAt(((b0 & 0x03) << 4) | (b1 >> 4))
      out += has1 ? B64_CHARS.charAt(((b1 & 0x0f) << 2) | (b2 >> 6)) : '='
      out += has2 ? B64_CHARS.charAt(b2 & 0x3f) : '='
    }
    return out
  }

  /** Decode a Base64 string into bytes (ignores whitespace and padding). */
  static fromBase64(b64: string): Uint8Array {
    const clean = b64.replace(/[^A-Za-z0-9+/]/g, '')
    const len = Math.floor((clean.length * 3) / 4)
    const out = new Uint8Array(len)
    let p = 0
    for (let i = 0; i < clean.length; i += 4) {
      const c0 = B64_LOOKUP[clean.charAt(i)] ?? 0
      const c1 = B64_LOOKUP[clean.charAt(i + 1)] ?? 0
      const c2 = B64_LOOKUP[clean.charAt(i + 2)] ?? 0
      const c3 = B64_LOOKUP[clean.charAt(i + 3)] ?? 0
      const n = (c0 << 18) | (c1 << 12) | (c2 << 6) | c3
      if (p < len) out[p++] = (n >> 16) & 0xff
      if (p < len) out[p++] = (n >> 8) & 0xff
      if (p < len) out[p++] = n & 0xff
    }
    return out
  }
}
