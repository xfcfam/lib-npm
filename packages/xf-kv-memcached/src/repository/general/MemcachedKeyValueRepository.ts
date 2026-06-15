import { Client } from 'memjs'
import { KeyValueRepository, KeyValueException, ConnectionException, type KeyValueOptions } from '@xfcfam/xf-kv'
import { MemcachedErrorUtils } from '../utils/MemcachedErrorUtils.js'

/**
 * Configuration accepted by {@link MemcachedKeyValueRepository}. Extends
 * the base {@link KeyValueOptions} with the Memcached server list.
 */
export interface MemcachedOptions<V = unknown> extends KeyValueOptions<V> {
  /** Server(s), e.g. `"localhost:11211"` or `"a:11211,b:11211"`. Defaults to memjs env / localhost. */
  readonly servers?: string
}

/**
 * Access-Layer Generalization — the **Memcached** implementation of the
 * `@xfcfam/xf-kv` contract, over [`memjs`].
 *
 * **Boundary case.** Memcached is intentionally minimal, so two
 * operations of the contract cannot be honoured natively:
 *
 *  - **`ttl(key)`** — Memcached does not expose a key's remaining TTL;
 *    `ttlRaw` returns `undefined`.
 *  - **`clear()`** — Memcached has no key enumeration; a
 *    namespace-scoped wipe is impossible and `flush()` would erase the
 *    whole server. `clearRaw` therefore raises a `KeyValueException`.
 *
 * `increment` / `decrement` are native but **floor at 0** (Memcached
 * counters never go negative). Everything else maps directly.
 *
 * Use `@xfcfam/xf-kv-redis` when you need TTL introspection or scoped
 * clears.
 */
export abstract class MemcachedKeyValueRepository<V = unknown> extends KeyValueRepository<V> {
  private static readonly clients = new WeakMap<object, Client>()

  /** Connection options retained for {@link init}. */
  protected readonly memcachedOptions: MemcachedOptions<V>

  constructor(options: MemcachedOptions<V> = {}) {
    super(options)
    this.memcachedOptions = options
  }

  /** Open the `memjs` client from the `servers` option. */
  override async init(): Promise<void> {
    const client = Client.create(this.memcachedOptions.servers)
    MemcachedKeyValueRepository.clients.set(this, client)
  }

  /** Quit the `memjs` client and release it. */
  override async terminate(): Promise<void> {
    const client = MemcachedKeyValueRepository.clients.get(this)
    if (client !== undefined) {
      client.quit()
      MemcachedKeyValueRepository.clients.delete(this)
    }
  }

  /** Map `memjs` client errors to typed `@xfcfam/xf-kv` Exceptions. */
  protected override translateError(err: unknown): unknown {
    return MemcachedErrorUtils.translate(err)
  }

  // ─── Raw primitives ────────────────────────────────────────

  /** Read the raw payload, decoding the buffer as UTF-8, or `undefined`. */
  protected async getRaw(key: string): Promise<string | undefined> {
    const { value } = await this.client().get(key)
    return value === null ? undefined : value.toString('utf-8')
  }

  /** Write the raw payload, passing `expires` when a TTL is given. */
  protected async setRaw(key: string, raw: string, ttl?: number): Promise<void> {
    await this.client().set(key, raw, ttl !== undefined ? { expires: ttl } : {})
  }

  /** Delete a key; resolve `true` if it existed. */
  protected async deleteRaw(key: string): Promise<boolean> {
    return this.client().delete(key)
  }

  /** Whether a key exists (a `get` that returns a value). */
  protected async hasRaw(key: string): Promise<boolean> {
    const { value } = await this.client().get(key)
    return value !== null
  }

  /** Atomic add via native counters, flooring at 0 (`by` may be negative). */
  protected async incrRaw(key: string, by: number): Promise<number> {
    const client = this.client()
    const result = by >= 0
      ? await client.increment(key, by, { initial: by })
      : await client.decrement(key, -by, { initial: 0 })
    return result.value ?? 0
  }

  /** Batched read; one slot per input key (absent → `undefined`). */
  protected async getManyRaw(keys: readonly string[]): Promise<readonly (string | undefined)[]> {
    // memjs has no native multi-get — read sequentially.
    const out: (string | undefined)[] = []
    for (const key of keys) out.push(await this.getRaw(key))
    return out
  }

  /** Batched write (sequential `setRaw`, as `memjs` has no native multi-set). */
  protected async setManyRaw(entries: readonly { key: string; raw: string; ttl?: number }[]): Promise<void> {
    for (const e of entries) await this.setRaw(e.key, e.raw, e.ttl)
  }

  /** Always `undefined` — Memcached does not expose a key's remaining TTL. */
  protected async ttlRaw(_key: string): Promise<number | undefined> {
    // Memcached does not expose a key's remaining TTL.
    return undefined
  }

  /** Always raises — Memcached has no key enumeration for a scoped wipe. */
  protected async clearRaw(_prefix: string): Promise<void> {
    throw new KeyValueException(
      'clear() is not supported by Memcached: it has no key enumeration, and ' +
      'flush() would wipe the whole server. Track keys yourself, or use @xfcfam/xf-kv-redis.',
    )
  }

  // ─── Internals ─────────────────────────────────────────────

  private client(): Client {
    const client = MemcachedKeyValueRepository.clients.get(this)
    if (client === undefined) {
      throw new ConnectionException('Memcached client not initialised — call init() (or super.init()) first')
    }
    return client
  }
}
