import { Repository } from '@xfcfam/xf'
import type { Codec } from '../transfers/Codec.js'
import type { Entry } from '../transfers/Entry.js'
import { CodecUtils } from '../utils/CodecUtils.js'
import { KeyUtils } from '../utils/KeyUtils.js'
import { SerializationException } from '../transfers/SerializationException.js'

/** A raw entry as handed to {@link KeyValueRepository.setManyRaw}. */
interface RawEntry {
  readonly key: string
  readonly raw: string
  readonly ttl?: number
}

/**
 * Configuration accepted by a {@link KeyValueRepository}. All keys are
 * optional; sensible defaults (no namespace, JSON codec, no expiry) are
 * wired automatically.
 *
 * @typeParam V  The value type stored by the repository.
 */
export interface KeyValueOptions<V = unknown> {
  /** Prefix applied to every key, isolating this store in a shared backend. Default: none. */
  readonly namespace?: string
  /** Value codec (encode/decode). Default: JSON ({@link CodecUtils.json}). */
  readonly codec?: Codec<V>
  /** Default TTL in seconds for writes that don't pass one. Default: none (no expiry). */
  readonly defaultTtl?: number
}

/**
 * Access-Layer Generalization — the **transport-agnostic key-value /
 * cache store contract**. The KV counterpart of `DatabaseRepository`
 * (SQL) and `ServerBusiness` (inbound servers): one lifecycle, one
 * operation surface, regardless of backend.
 *
 * Concrete adapters — `@xfcfam/xf-kv-redis`, `@xfcfam/xf-kv-memcached` —
 * implement the protected `*Raw` primitives over their client. This
 * base layers three cross-cutting concerns on top, so every adapter
 * gets them for free:
 *
 *  1. **Namespacing** — every key is prefixed via {@link KeyUtils}.
 *  2. **Serialisation** — values pass through a developer-chosen
 *     {@link Codec} (JSON by default); failures raise
 *     {@link SerializationException}.
 *  3. **Error translation** — client errors flow through
 *     {@link translateError} (overridden by the adapter) so the
 *     Business layer only ever sees typed `KeyValueException`s.
 *
 * The implementer's concrete Logical extends an **adapter**, not this
 * class, and names it by **domain** with the canonical Access suffix —
 * `SessionRepository`, not `RedisRepository` or `SessionStore`.
 *
 * @example
 * ```ts
 * import { RedisKeyValueRepository } from '@xfcfam/xf-kv-redis'
 *
 * export class SessionRepository extends RedisKeyValueRepository<Session> {
 *   constructor() { super({ url: process.env.REDIS_URL, namespace: 'sess', defaultTtl: 3600 }) }
 *   override async init()      { await super.init() }
 *   override async terminate() { await super.terminate() }
 * }
 * // R.sessions.set(id, session)  ·  R.sessions.get(id)
 * ```
 *
 * @typeParam V  The value type stored. Keys are always `string` (external
 *               stores index by string), unlike the core
 *               `CacheableBusiness<K, V>` in-memory cache.
 */
export abstract class KeyValueRepository<V = unknown> extends Repository<null> {
  /** Key prefix isolating this store (empty = no namespace). */
  protected readonly namespace: string
  /** Value codec applied on every read and write. */
  protected readonly codec: Codec<V>
  /** Default TTL (seconds) for writes without an explicit one. */
  protected readonly defaultTtl: number | undefined

  constructor(options: KeyValueOptions<V> = {}) {
    super(null)
    this.namespace = options.namespace ?? ''
    this.codec = options.codec ?? CodecUtils.json<V>()
    this.defaultTtl = options.defaultTtl
  }

  /** Open the connection to the store. Adapters override (call `super.init()` first). */
  async init(): Promise<void> {}

  /** Close the connection to the store. Adapters override (call `super.terminate()` last). */
  async terminate(): Promise<void> {}

  // ─── Public operations ─────────────────────────────────────

  /** Read a value. Resolves `undefined` when the key is absent. */
  async get(key: string): Promise<V | undefined> {
    const raw = await this.exec(() => this.getRaw(this.k(key)))
    return raw === undefined ? undefined : this.decode(raw)
  }

  /** Write a value, with an optional TTL (seconds) overriding the default. */
  async set(key: string, value: V, ttl?: number): Promise<void> {
    const raw = this.encode(value)
    const effective = ttl ?? this.defaultTtl
    await this.exec(() => this.setRaw(this.k(key), raw, effective))
  }

  /** Delete a key. Resolves `true` if it existed. */
  async delete(key: string): Promise<boolean> {
    return this.exec(() => this.deleteRaw(this.k(key)))
  }

  /** Whether a key exists. */
  async has(key: string): Promise<boolean> {
    return this.exec(() => this.hasRaw(this.k(key)))
  }

  /** Atomically add `by` (default 1) to a numeric counter; resolves the new value. */
  async increment(key: string, by = 1): Promise<number> {
    return this.exec(() => this.incrRaw(this.k(key), by))
  }

  /** Atomically subtract `by` (default 1) from a numeric counter; resolves the new value. */
  async decrement(key: string, by = 1): Promise<number> {
    return this.exec(() => this.incrRaw(this.k(key), -by))
  }

  /** Read many keys at once. The result map omits absent keys. */
  async getMany(keys: readonly string[]): Promise<Map<string, V>> {
    const raws = await this.exec(() => this.getManyRaw(keys.map((key) => this.k(key))))
    const out = new Map<string, V>()
    keys.forEach((key, i) => {
      const raw = raws[i]
      if (raw !== undefined) out.set(key, this.decode(raw))
    })
    return out
  }

  /** Write many entries at once, each with an optional per-entry TTL. */
  async setMany(entries: readonly Entry<V>[]): Promise<void> {
    const raws: RawEntry[] = entries.map((e) => {
      const effective = e.ttl ?? this.defaultTtl
      return {
        key: this.k(e.key),
        raw: this.encode(e.value),
        ...(effective !== undefined ? { ttl: effective } : {}),
      }
    })
    await this.exec(() => this.setManyRaw(raws))
  }

  /** Remaining time-to-live of a key in seconds, or `undefined` if none / absent. */
  async ttl(key: string): Promise<number | undefined> {
    return this.exec(() => this.ttlRaw(this.k(key)))
  }

  /** Delete every key in this repository's namespace. */
  async clear(): Promise<void> {
    await this.exec(() => this.clearRaw(KeyUtils.prefix(this.namespace)))
  }

  // ─── Error translation hook (adapters override) ────────────

  /**
   * Map an adapter / client error to a `KeyValueException` subtype.
   * Default is identity; the adapter overrides it (e.g.
   * `RedisErrorUtils.translate`). Called automatically by every public
   * operation.
   */
  protected translateError(err: unknown): unknown {
    return err
  }

  // ─── Raw primitives implemented by the adapter ─────────────

  /** Adapter primitive — read the raw stored payload, or `undefined`. */
  protected abstract getRaw(key: string): Promise<string | undefined>
  /** Adapter primitive — write a raw payload, with optional TTL (seconds). */
  protected abstract setRaw(key: string, raw: string, ttl?: number): Promise<void>
  /** Adapter primitive — delete a key; resolve `true` if it existed. */
  protected abstract deleteRaw(key: string): Promise<boolean>
  /** Adapter primitive — whether a key exists. */
  protected abstract hasRaw(key: string): Promise<boolean>
  /** Adapter primitive — atomic add (`by` may be negative); resolve the new value. */
  protected abstract incrRaw(key: string, by: number): Promise<number>
  /** Adapter primitive — batched read; one slot per input key (absent → `undefined`). */
  protected abstract getManyRaw(keys: readonly string[]): Promise<readonly (string | undefined)[]>
  /** Adapter primitive — batched write. */
  protected abstract setManyRaw(entries: readonly RawEntry[]): Promise<void>
  /** Adapter primitive — remaining TTL (seconds) of a key, or `undefined`. */
  protected abstract ttlRaw(key: string): Promise<number | undefined>
  /** Adapter primitive — delete every key under `prefix`. */
  protected abstract clearRaw(prefix: string): Promise<void>

  // ─── Internals ─────────────────────────────────────────────

  private k(key: string): string {
    return KeyUtils.namespaced(this.namespace, key)
  }

  private encode(value: V): string {
    try {
      return this.codec.encode(value)
    } catch (err) {
      throw new SerializationException('Failed to encode value', { cause: err })
    }
  }

  private decode(raw: string): V {
    try {
      return this.codec.decode(raw)
    } catch (err) {
      throw new SerializationException('Failed to decode stored value', { cause: err })
    }
  }

  private async exec<R>(op: () => Promise<R>): Promise<R> {
    try {
      return await op()
    } catch (err) {
      throw this.translateError(err)
    }
  }
}
