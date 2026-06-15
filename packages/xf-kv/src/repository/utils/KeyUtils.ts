/**
 * Access-Layer Utility — pure helpers for key **namespacing**. A
 * namespace keeps the keys of independent stores from colliding in a
 * shared backend (`'sess:abc'` vs `'rate:abc'`). Non-instantiable,
 * static-only, stateless, no I/O.
 */
export class KeyUtils {
  private constructor() {}

  /** Separator between a namespace and the user key. */
  static readonly SEPARATOR = ':'

  /**
   * Prefix `key` with `namespace` (`('sess', 'abc') → 'sess:abc'`). An
   * empty namespace returns the key unchanged.
   */
  static namespaced(namespace: string, key: string): string {
    return namespace.length === 0 ? key : `${namespace}${KeyUtils.SEPARATOR}${key}`
  }

  /**
   * The prefix matching every key of `namespace` — used by `clear()` /
   * scan operations. Empty namespace → empty prefix (matches the whole
   * backend; adapters must guard against an unscoped wipe).
   */
  static prefix(namespace: string): string {
    return namespace.length === 0 ? '' : `${namespace}${KeyUtils.SEPARATOR}`
  }

  /**
   * Strip the namespace prefix from a stored key, recovering the user
   * key. Returns the key unchanged when it doesn't carry the prefix.
   */
  static strip(namespace: string, key: string): string {
    const p = KeyUtils.prefix(namespace)
    return p.length > 0 && key.startsWith(p) ? key.slice(p.length) : key
  }
}
