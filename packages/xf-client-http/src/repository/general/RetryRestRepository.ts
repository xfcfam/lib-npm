import type { RetryOptions } from '@xfcfam/xf'
import { RestRepository } from './RestRepository.js'
import { RestException } from '../transfers/RestException.js'
import { ConnectionException } from '../transfers/ConnectionException.js'

/**
 * Ready-to-use Generalization that adds retry semantics to
 * {@link RestRepository}.
 *
 * Provides everything {@link RestRepository} does (REST verbs,
 * interceptors, response parsing, reviver pipeline, error
 * translation) plus a built-in retry surface:
 *
 * - `withRetry(op, opts?)` — wrap a fallible operation with
 *   exponential-backoff retries.
 * - `shouldRetry(err)` — decide whether a given failure is worth
 *   retrying. Pre-implemented with a sensible default (see below);
 *   override in your Logical only if you need a different policy.
 *
 * The constructor signature is inherited from {@link RestRepository}:
 * `(baseUrl, options?)`. No extra wiring is required.
 *
 * ──────────────────────────────────────────────────────────────────
 *  Default retry policy
 * ──────────────────────────────────────────────────────────────────
 *
 * `shouldRetry` is pre-implemented to match what most production REST
 * clients want:
 *
 *   • {@link RestException} with status `429` (Too Many Requests) →
 *     retry. The server is asking us to back off.
 *   • {@link RestException} with status `>= 500` (server errors) →
 *     retry. Transient failure on the remote side.
 *   • {@link RestException} with any other status (4xx other than
 *     429) → DO NOT retry. The request itself is wrong; retrying
 *     won't fix it.
 *   • {@link ConnectionException} (network, DNS, TLS, timeout) →
 *     retry. The remote was unreachable, not malfunctioning.
 *   • Anything else (programming errors, type errors, etc.) →
 *     DO NOT retry. Failing fast surfaces bugs.
 *
 * Override `shouldRetry` if you need a different policy — for
 * instance, to retry on `408 Request Timeout`, or to suppress retries
 * for specific endpoints by inspecting `err.request`.
 *
 * @example
 * ```ts
 * import { RetryRestRepository } from '@xfcfam/xf-rest'
 * import { User } from '../transfers/User.js'
 *
 * export class UsersRestRepository extends RetryRestRepository {
 *   constructor() {
 *     super('https://api.example.com', {
 *       defaultHeaders: { Accept: 'application/json' },
 *       timeout: 10_000,
 *     })
 *   }
 *
 *   // shouldRetry is inherited with a sensible default — no override needed.
 *
 *   async getUser(id: string): Promise<User> {
 *     const res = await this.withRetry(() => this.get<User>(`/users/${id}`),
 *                                      { maxAttempts: 4, baseMs: 200 })
 *     return res.body
 *   }
 * }
 * ```
 */
export abstract class RetryRestRepository extends RestRepository {
  /**
   * Retry policy specialised for REST errors. See the class JSDoc
   * for the full contract. Subclasses may override to change the
   * policy (for instance, to retry `408 Request Timeout` too, or to
   * suppress retries for specific endpoints).
   */
  protected shouldRetry(err: unknown): boolean {
    if (err instanceof RestException) {
      return err.status === 429 || err.status >= 500
    }
    return err instanceof ConnectionException
  }

  /**
   * Execute `op` with retry semantics. Returns the first successful
   * result; if all attempts fail (or {@link shouldRetry} returns
   * `false`), throws the last error.
   *
   * Uses exponential backoff: each attempt waits `baseMs * factor^n`,
   * optionally multiplied by a random jitter factor in `[0.5, 1.5)`.
   *
   * @param op    Async operation to attempt.
   * @param opts  Retry policy overrides.
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
