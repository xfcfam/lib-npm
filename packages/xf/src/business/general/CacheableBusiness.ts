import { Business } from './Business.js'

interface CacheEntry<V> { value: V; expiresAt: number }

/**
 * Generalization for Business Layer components that memoise the result
 * of an expensive lookup — typically a downstream Repository call —
 * with optional TTL eviction.
 *
 * Caching is a domain decision (when to recompute, when to invalidate)
 * rather than a transport concern, so this Generalization lives in the
 * Business Layer. The subclass owns the lookup ({@link fetch}) and
 * usually delegates it to a Repository via `R.<repo>.<op>`; the base
 * class owns the cache.
 *
 * The cache IS the component's state (`Map<K, CacheEntry<V>>`) —
 * there is no separate auxiliary field.
 *
 * Extension point: subclasses may override the protected hook
 * {@link onEntryChanged} to react to every cache mutation without
 * having to override `get` / `refresh` / `invalidate` individually.
 * This is what {@link ObservableCacheableBusiness} uses internally.
 *
 * @typeParam K  Cache key type (any `Map`-key, including objects).
 * @typeParam V  Cached value type.
 *
 * @example
 * ```ts
 * import { CacheableBusiness } from '@xfcfam/xf'
 * import { R } from '../R.js'
 * import { User } from '../transfers/User.js'
 *
 * export class UserBusiness extends CacheableBusiness<string, User> {
 *   protected fetch(id: string): Promise<User> {
 *     return R.userRepository.getUser(id)
 *   }
 * }
 * ```
 */
export abstract class CacheableBusiness<K, V> extends Business<Map<K, CacheEntry<V>>> {
  /** Default entry TTL in ms. `Infinity` (default) keeps entries until invalidated. */
  protected readonly defaultTtlMs: number = Infinity

  constructor() {
    super(new Map())
  }

  /**
   * Subclass-supplied lookup invoked on cache miss / refresh.
   *
   * @param key  The key to look up.
   * @returns    The fresh value for `key`.
   */
  protected abstract fetch(key: K): Promise<V>

  /**
   * Hook invoked after an entry is created, refreshed or invalidated.
   * Default no-op. Subclasses overriding this MUST keep it
   * side-effect-only — do NOT mutate the cache from inside, or you
   * will recurse.
   *
   * @param key    The affected key.
   * @param value  The new value, or `undefined` if the entry was invalidated.
   */
  protected onEntryChanged(_key: K, _value: V | undefined): void {}

  /**
   * Return cached value if fresh; otherwise call {@link refresh}.
   *
   * @param key    The key to look up.
   * @param ttlMs  TTL for the entry on a cache miss (overrides {@link defaultTtlMs}).
   * @returns      The cached or freshly-fetched value.
   */
  async get(key: K, ttlMs?: number): Promise<V> {
    const cached = this.state.get(key)
    if (cached !== undefined && cached.expiresAt > Date.now()) return cached.value
    return this.refresh(key, ttlMs)
  }

  /**
   * Force-fetch `key` via {@link fetch} and update the cache, ignoring
   * any existing entry.
   *
   * @param key    The key to refresh.
   * @param ttlMs  TTL for the refreshed entry (overrides {@link defaultTtlMs}).
   * @returns      The new value.
   */
  async refresh(key: K, ttlMs?: number): Promise<V> {
    const ttl = ttlMs ?? this.defaultTtlMs
    const value = await this.fetch(key)
    this.state.set(key, {
      value,
      expiresAt: ttl === Infinity ? Number.POSITIVE_INFINITY : Date.now() + ttl
    })
    this.onEntryChanged(key, value)
    return value
  }

  /**
   * Force-fetch every currently cached key in parallel. Fails fast on
   * the first error (entries that did succeed are already updated).
   *
   * @param ttlMs  TTL applied to every refreshed entry (overrides {@link defaultTtlMs}).
   * @returns      A promise that resolves once every refresh has settled.
   * @throws       The first rejection encountered across the parallel refreshes.
   */
  async refreshAll(ttlMs?: number): Promise<void> {
    const keys = [...this.state.keys()]
    await Promise.all(keys.map(k => this.refresh(k, ttlMs)))
  }

  /**
   * Peek at the cache without triggering {@link fetch}.
   *
   * @param key  The key to inspect.
   * @returns    The cached value if fresh, `undefined` if absent or expired.
   */
  getCached(key: K): V | undefined {
    const entry = this.state.get(key)
    if (entry === undefined || entry.expiresAt <= Date.now()) return undefined
    return entry.value
  }

  /**
   * Drop one entry, or the whole cache if `key` is omitted.
   *
   * @param key  The key to invalidate. Omit to clear the entire cache.
   */
  invalidate(key?: K): void {
    if (key === undefined) {
      const keys = [...this.state.keys()]
      this.state.clear()
      for (const k of keys) this.onEntryChanged(k, undefined)
    } else if (this.state.delete(key)) {
      this.onEntryChanged(key, undefined)
    }
  }

  /**
   * No-op. Override to add setup.
   *
   * @returns A resolved promise.
   */
  async init(): Promise<void> {}

  /**
   * Clears the cache.
   *
   * @returns A resolved promise.
   */
  async terminate(): Promise<void> {
    this.state.clear()
  }
}
