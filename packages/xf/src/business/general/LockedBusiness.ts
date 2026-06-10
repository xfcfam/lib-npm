import { Business } from './Business.js'

/**
 * Generalization for Business Layer components that serialise critical
 * sections — operations that must not overlap with each other.
 *
 * Mutual exclusion is a domain concern (defining what counts as a
 * critical section is a business rule), so this Generalization lives
 * in Business. Subclasses wrap any non-reentrant operation in
 * {@link withLock}; callers are queued and processed in FIFO order.
 *
 * Locks are scoped to the instance — every `LockedBusiness` subclass
 * has its own independent queue.
 *
 * @typeParam T  Shape of the component's internal domain state.
 *
 * @example
 * ```ts
 * import { LockedBusiness } from '@xfcfam/xf'
 * import { R } from '../R.js'
 *
 * interface CounterState { value: number }
 *
 * export class CounterBusiness extends LockedBusiness<CounterState> {
 *   constructor() { super({ value: 0 }) }
 *
 *   increment(): Promise<number> {
 *     return this.withLock(async () => {
 *       const current = await R.counterRepository.read()
 *       const next = current + 1
 *       await R.counterRepository.write(next)
 *       this.state.value = next
 *       return next
 *     })
 *   }
 * }
 * ```
 */
export abstract class LockedBusiness<T> extends Business<T> {
  private locked = false
  private waiters: Array<() => void> = []

  /**
   * Run `op` while holding the lock — no other `withLock` body on this
   * instance runs concurrently. Operations are processed in call order.
   * The lock is always released, even if `op` throws.
   *
   * @typeParam R  Return type of `op`.
   * @param op     Async operation to run exclusively.
   * @returns      The value resolved by `op`.
   * @throws       Whatever `op` throws.
   */
  protected async withLock<R>(op: () => Promise<R>): Promise<R> {
    if (this.locked) {
      await new Promise<void>(resolve => this.waiters.push(resolve))
    } else {
      this.locked = true
    }
    try {
      return await op()
    } finally {
      const next = this.waiters.shift()
      if (next) next()
      else this.locked = false
    }
  }

  /**
   * No-op. Override to add setup.
   *
   * @returns A resolved promise.
   */
  async init(): Promise<void> {}

  /**
   * No-op. Override to add teardown.
   *
   * @returns A resolved promise.
   */
  async terminate(): Promise<void> {}
}
