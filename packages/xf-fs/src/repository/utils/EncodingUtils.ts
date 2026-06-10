/**
 * Static utility — text encoding helpers operating only on in-memory
 * buffers. No I/O.
 *
 * Currently scoped to BOM detection / stripping and the canonical
 * UTF-8 / UTF-16 byte order marks. Detection beyond these (chardet-
 * style heuristics for Latin-1, Windows-1252, etc.) is out of scope
 * for v0 and lives behind a dedicated library if it's ever needed.
 */
export type Encoding = 'utf-8' | 'utf-16le' | 'utf-16be' | 'utf-8-bom'

export class EncodingUtils {
  private constructor() {}

  /**
   * Inspect the first few bytes of `bytes` and return the detected
   * BOM-bearing encoding, or `'utf-8'` when no BOM is present (the
   * default modern encoding).
   */
  static detect(bytes: Uint8Array): Encoding {
    if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
      return 'utf-8-bom'
    }
    if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) return 'utf-16le'
    if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) return 'utf-16be'
    return 'utf-8'
  }

  /**
   * Remove the BOM at the start of `text` if present. Safe to call
   * unconditionally — returns `text` unchanged when there's no BOM.
   */
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
}
