import { Repository } from './Repository.js'

/**
 * Options that govern a single {@link RetryableRepository.withRetry} call.
 */
export interface RetryOptions {
  /** Maximum number of attempts, including the first. Default `3`. */
  maxAttempts?: number
  /** Base delay before the second attempt, in milliseconds. Default `100`. */
  baseMs?: number
  /** Exponential factor applied between attempts. Default `2`. */
  factor?: number
  /** If `true`, multiplies each delay by a random factor in `[0.5, 1.5)`. Default `true`. */
  jitter?: boolean
}

/**
 * Generalization for Access Layer components that need to wrap risky
 * I/O operations with retry semantics.
 *
 * The concrete component invokes {@link withRetry} around any operation
 * that may fail transiently (network timeouts, rate limits, etc.). The
 * base class applies exponential backoff with optional jitter and gives
 * subclasses a hook ({@link shouldRetry}) to opt out of retrying for
 * non-transient errors (e.g. HTTP 4xx).
 *
 * @typeParam T  Shape of the component's internal state.
 *
 * @example
 * ```ts
 * import { RetryableRepository } from '@xfcfam/xf'
 *
 * export class PaymentRepository extends RetryableRepository<null> {
 *   constructor() { super(null) }
 *   async init()      {}
 *   async terminate() {}
 *   async charge(amount: number): Promise<string> {
 *     return this.withRetry(() => fetch('/pay', { method: 'POST' }).then(r => r.text()),
 *                           { maxAttempts: 5 })
 *   }
 *   protected override shouldRetry(err: unknown): boolean {
 *     return !(err instanceof TypeError) // don't retry programming errors
 *   }
 * }
 * ```
 */
export abstract class RetryableRepository<T> extends Repository<T> {
  /**
   * Decide whether a particular error is worth retrying. Default is
   * `true` (retry every failure). Override to skip non-transient
   * errors such as auth failures or validation errors.
   *
   * @param err  The error thrown by the last attempt.
   * @returns    `true` to attempt another retry, `false` to give up.
   */
  protected shouldRetry(_err: unknown): boolean {
    return true
  }

  /**
   * Run `op` with exponential-backoff retries.
   *
   * @typeParam R  Return type of `op`.
   * @param op     Async operation to attempt.
   * @param opts   Retry policy overrides. See {@link RetryOptions}.
   * @returns      The first successful result.
   * @throws       The last error if every attempt fails or {@link shouldRetry} returns `false`.
   */
  protected async withRetry<R>(op: () => Promise<R>, opts?: RetryOptions): Promise<R> {
    const max = opts?.maxAttempts ?? 3
    const base = opts?.baseMs ?? 100
    const factor = opts?.factor ?? 2
    const jitter = opts?.jitter ?? true

    let lastErr: unknown
    for (let attempt = 0; attempt < max; attempt++) {
      try {
        return await op()
      } catch (err) {
        lastErr = err
        if (attempt === max - 1 || !this.shouldRetry(err)) break
        const exp = base * Math.pow(factor, attempt)
        const delay = jitter ? exp * (0.5 + Math.random()) : exp
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
    throw lastErr
  }
}
