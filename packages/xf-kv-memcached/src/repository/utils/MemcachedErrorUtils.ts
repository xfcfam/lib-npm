import { KeyValueException, ConnectionException } from '@xfcfam/xf-kv'

/** Shape of errors raised by `memjs` (mostly plain `Error`s). */
interface MemcachedLikeError {
  code?: string
  message?: string
}

/**
 * Access-Layer Utility — translates `memjs` / Memcached client errors
 * into the typed Exceptions of `@xfcfam/xf-kv`. Non-instantiable,
 * static-only, no I/O.
 */
export class MemcachedErrorUtils {
  private constructor() {}

  /**
   * Map a Memcached client error to a `KeyValueException`. Transport
   * failures become a {@link ConnectionException}; anything already
   * typed or unrecognised is returned unchanged. `memjs` often raises
   * plain `Error`s, so the message is inspected as a fallback.
   */
  static translate(err: unknown): unknown {
    if (err instanceof KeyValueException) return err
    if (!MemcachedErrorUtils.isErrorLike(err)) return err
    const message = err.message ?? 'Memcached error'
    if (MemcachedErrorUtils.isTransportCode(err.code) || /ECONN|ENOTFOUND|ETIMEDOUT|timeout|connect/i.test(message)) {
      return new ConnectionException(message, { cause: err })
    }
    return err
  }

  private static isErrorLike(err: unknown): err is MemcachedLikeError {
    return typeof err === 'object' && err !== null
  }

  private static isTransportCode(code: string | undefined): boolean {
    if (code === undefined) return false
    return (
      code === 'ECONNREFUSED' ||
      code === 'ENOTFOUND' ||
      code === 'ETIMEDOUT' ||
      code === 'ECONNRESET' ||
      code === 'EHOSTUNREACH' ||
      code === 'EAI_AGAIN'
    )
  }
}
