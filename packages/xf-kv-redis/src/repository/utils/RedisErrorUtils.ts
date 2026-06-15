import { KeyValueException, ConnectionException } from '@xfcfam/xf-kv'

/** Shape of the error objects `ioredis` raises (Node `errno`-style `code`). */
interface RedisLikeError {
  code?: string
  message?: string
}

/**
 * Access-Layer Utility — translates `ioredis` / Redis client errors into
 * the typed Exceptions of `@xfcfam/xf-kv`. Non-instantiable, static-only,
 * no I/O. `RedisKeyValueRepository` calls it from `translateError`.
 */
export class RedisErrorUtils {
  private constructor() {}

  /**
   * Map a Redis client error to a `KeyValueException`. Transport-level
   * failures (connection refused, DNS, reset, timeout) become a
   * {@link ConnectionException}; anything already typed, or otherwise
   * unrecognised, is returned unchanged.
   */
  static translate(err: unknown): unknown {
    if (err instanceof KeyValueException) return err
    if (!RedisErrorUtils.isErrorLike(err)) return err
    const message = err.message ?? 'Redis error'
    if (RedisErrorUtils.isTransportCode(err.code)) {
      return new ConnectionException(message, { cause: err })
    }
    return err
  }

  private static isErrorLike(err: unknown): err is RedisLikeError {
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
      code === 'EAI_AGAIN' ||
      code === 'EPIPE'
    )
  }
}
