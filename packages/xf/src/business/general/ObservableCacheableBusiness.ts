import { CacheableBusiness } from './CacheableBusiness.js'

/**
 * Generalization combining caching with observation. Subclasses
 * implement only {@link fetch} — same contract as
 * {@link CacheableBusiness} — and gain two parallel observation surfaces:
 *
 * - **Whole-cache**: {@link observe} / {@link remove}. Observers are
 *   called with a projected `ReadonlyMap<K, V>` (without TTL metadata)
 *   on every entry change.
 * - **Single key**: {@link observeKey} / {@link removeKey}. Observers
 *   are called with `V | undefined` — `undefined` signals invalidation.
 *
 * Notifications are triggered by `get` (on miss), `refresh`,
 * `refreshAll`, and `invalidate`. Key identity follows `Map` semantics
 * (reference equality for objects, value equality for primitives).
 *
 * @typeParam K  Cache key type.
 * @typeParam V  Cached value type.
 *
 * @example
 * ```ts
 * import { ObservableCacheableBusiness } from '@xfcfam/xf'
 * import { R } from '../R.js'
 * import { User } from '../transfers/User.js'
 *
 * export class UserBusiness extends ObservableCacheableBusiness<string, User> {
 *   protected fetch(id: string): Promise<User> {
 *     return R.userRepository.getUser(id)
 *   }
 * }
 *
 * userBiz.observe(cache => console.log('size:', cache.size))
 * userBiz.observeKey('u-42', v => console.log('u-42 →', v))
 * await userBiz.get('u-42')        // → both observers fire
 * await userBiz.refresh('u-42')    // → both observers fire
 * userBiz.invalidate('u-42')       // → key observer fires with undefined
 * ```
 */
export abstract class ObservableCacheableBusiness<K, V> extends CacheableBusiness<K, V> {
  private nextStateObserverId = 0
  private stateObservers = new Map<number, (state: ReadonlyMap<K, V>) => void>()

  private nextKeyObserverId = 0
  private keyObservers = new Map<number, { key: K; cb: (value: V | undefined) => void }>()

  /**
   * Register a whole-cache observer.
   *
   * @param observer  Callback invoked with a snapshot of the cache on every entry change.
   * @returns         An id usable in {@link remove}.
   */
  observe(observer: (state: ReadonlyMap<K, V>) => void): number {
    const id = ++this.nextStateObserverId
    this.stateObservers.set(id, observer)
    return id
  }

  /**
   * Unregister a whole-cache observer.
   *
   * @param id  The id previously returned by {@link observe}.
   */
  remove(id: number): void {
    this.stateObservers.delete(id)
  }

  /**
   * Register a per-key observer.
   *
   * @param key       The key to watch. Object keys are compared by reference.
   * @param observer  Callback invoked with the new value, or `undefined` on invalidation.
   * @returns         An id usable in {@link removeKey}.
   */
  observeKey(key: K, observer: (value: V | undefined) => void): number {
    const id = ++this.nextKeyObserverId
    this.keyObservers.set(id, { key, cb: observer })
    return id
  }

  /**
   * Unregister a per-key observer.
   *
   * @param id  The id previously returned by {@link observeKey}.
   */
  removeKey(id: number): void {
    this.keyObservers.delete(id)
  }

  /**
   * Bridge: every cache mutation fans out to both observer pools.
   *
   * @param key    The affected key.
   * @param value  The new value, or `undefined` if the entry was invalidated.
   */
  protected override onEntryChanged(key: K, value: V | undefined): void {
    for (const sub of this.keyObservers.values()) {
      if (sub.key === key) sub.cb(value)
    }
    if (this.stateObservers.size > 0) {
      const projected = new Map<K, V>()
      for (const [k, entry] of this.state) projected.set(k, entry.value)
      this.stateObservers.forEach(observer => observer(projected))
    }
  }

  /**
   * Clears observers (after the base class clears the cache).
   *
   * @returns A resolved promise.
   */
  override async terminate(): Promise<void> {
    await super.terminate()
    this.stateObservers.clear()
    this.keyObservers.clear()
  }
}
