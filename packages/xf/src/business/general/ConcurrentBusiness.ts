import { Business } from './Business.js'

/**
 * Generalization for Business Layer components that orchestrate batches
 * of async work with bounded concurrency — running N operations in
 * parallel while never exceeding a configured ceiling.
 *
 * Concurrency is a policy decision (how aggressively to fan out, how
 * many simultaneous outbound requests are acceptable) rather than a
 * transport concern, so this Generalization lives in Business.
 * Individual operations typically delegate to `R.<repo>.<op>`.
 *
 * Subclasses override {@link maxConcurrency} to set the ceiling and
 * call {@link parallel} with the batch of work.
 *
 * @typeParam T  Shape of the component's internal domain state.
 *
 * @example
 * ```ts
 * import { ConcurrentBusiness } from '@xfcfam/xf'
 * import { R } from '../R.js'
 * import { User } from '../transfers/User.js'
 *
 * export class UserBatchBusiness extends ConcurrentBusiness<null> {
 *   constructor() { super(null) }
 *   protected override readonly maxConcurrency = 8
 *
 *   loadMany(ids: string[]): Promise<User[]> {
 *     return this.parallel(ids.map(id => () => R.userRepository.getUser(id)))
 *   }
 * }
 * ```
 */
export abstract class ConcurrentBusiness<T> extends Business<T> {
  /**
   * Maximum number of operations that may run simultaneously inside a
   * single {@link parallel} call. Default `1` (sequential). Override in
   * the subclass to fan out.
   */
  protected readonly maxConcurrency: number = 1

  /**
   * Run `tasks` with concurrency bounded by {@link maxConcurrency}.
   * Results are returned in the same order as `tasks`. Fails fast on
   * the first rejection — in-flight tasks are not cancelled.
   *
   * @typeParam R  Return type of each task.
   * @param tasks  Array of zero-argument async producers.
   * @returns      The resolved values in input order.
   * @throws       The first rejection encountered across the batch.
   */
  protected async parallel<R>(tasks: ReadonlyArray<() => Promise<R>>): Promise<R[]> {
    const limit = Math.max(1, this.maxConcurrency)
    if (limit >= tasks.length) return Promise.all(tasks.map(t => t()))
    const results: R[] = new Array(tasks.length)
    let nextIndex = 0
    const worker = async (): Promise<void> => {
      while (true) {
        const idx = nextIndex++
        if (idx >= tasks.length) return
        results[idx] = await tasks[idx]!()
      }
    }
    await Promise.all(Array.from({ length: limit }, worker))
    return results
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
