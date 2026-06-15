import { Redis, type RedisOptions as IORedisOptions } from 'ioredis'
import { KeyValueRepository, ConnectionException, type KeyValueOptions } from '@xfcfam/xf-kv'
import { RedisErrorUtils } from '../utils/RedisErrorUtils.js'

/**
 * Configuration accepted by {@link RedisKeyValueRepository}. Extends the
 * base {@link KeyValueOptions} (namespace / codec / defaultTtl) with the
 * Redis connection coordinates.
 */
export interface RedisOptions<V = unknown> extends KeyValueOptions<V> {
  /** Connection string, e.g. `redis://localhost:6379`. */
  readonly url?: string
  /** Full `ioredis` options (merged with `url`, which wins for coordinates). */
  readonly redis?: IORedisOptions
}

/**
 * Access-Layer Generalization — the **Redis** implementation of the
 * `@xfcfam/xf-kv` contract, over [`ioredis`]. Implements the `*Raw`
 * primitives with native Redis commands (`GET`/`SET … EX`/`DEL`/
 * `EXISTS`/`INCRBY`/`MGET`/pipelined `SET`/`TTL`/`SCAN`+`DEL`) and maps
 * client errors to typed Exceptions via {@link RedisErrorUtils}.
 *
 * The implementer extends this and names the class by **domain**
 * (`SessionRepository`), not technology.
 *
 * @example
 * ```ts
 * export class SessionRepository extends RedisKeyValueRepository<Session> {
 *   constructor() { super({ url: process.env.REDIS_URL, namespace: 'sess', defaultTtl: 3600 }) }
 * }
 * ```
 */
export abstract class RedisKeyValueRepository<V = unknown> extends KeyValueRepository<V> {
  private static readonly clients = new WeakMap<object, Redis>()

  /** Connection options retained for {@link init}. */
  protected readonly redisOptions: RedisOptions<V>

  constructor(options: RedisOptions<V>) {
    super(options)
    this.redisOptions = options
  }

  /** Open the `ioredis` client from `url` / `redis` options. */
  override async init(): Promise<void> {
    const extra = this.redisOptions.redis ?? {}
    const client = this.redisOptions.url !== undefined
      ? new Redis(this.redisOptions.url, extra)
      : new Redis(extra)
    RedisKeyValueRepository.clients.set(this, client)
  }

  /** Quit the `ioredis` client and release it. */
  override async terminate(): Promise<void> {
    const client = RedisKeyValueRepository.clients.get(this)
    if (client !== undefined) {
      await client.quit()
      RedisKeyValueRepository.clients.delete(this)
    }
  }

  /** Map `ioredis` client errors to typed `@xfcfam/xf-kv` Exceptions. */
  protected override translateError(err: unknown): unknown {
    return RedisErrorUtils.translate(err)
  }

  // ─── Raw primitives ────────────────────────────────────────

  /** Read the raw payload via `GET`, or `undefined` when absent. */
  protected async getRaw(key: string): Promise<string | undefined> {
    return (await this.client().get(key)) ?? undefined
  }

  /** Write the raw payload via `SET`, adding `EX` when a TTL is given. */
  protected async setRaw(key: string, raw: string, ttl?: number): Promise<void> {
    if (ttl !== undefined) await this.client().set(key, raw, 'EX', ttl)
    else await this.client().set(key, raw)
  }

  /** Delete a key via `DEL`; resolve `true` if it existed. */
  protected async deleteRaw(key: string): Promise<boolean> {
    return (await this.client().del(key)) > 0
  }

  /** Whether a key exists via `EXISTS`. */
  protected async hasRaw(key: string): Promise<boolean> {
    return (await this.client().exists(key)) > 0
  }

  /** Atomic add via `INCRBY` (`by` may be negative); resolve the new value. */
  protected async incrRaw(key: string, by: number): Promise<number> {
    return this.client().incrby(key, by)
  }

  /** Batched read via `MGET`; one slot per input key (absent → `undefined`). */
  protected async getManyRaw(keys: readonly string[]): Promise<readonly (string | undefined)[]> {
    if (keys.length === 0) return []
    const values = await this.client().mget(...keys)
    return values.map((v: string | null) => v ?? undefined)
  }

  /** Batched write via a pipelined `SET` (with `EX` per entry when given). */
  protected async setManyRaw(entries: readonly { key: string; raw: string; ttl?: number }[]): Promise<void> {
    const pipeline = this.client().pipeline()
    for (const e of entries) {
      if (e.ttl !== undefined) pipeline.set(e.key, e.raw, 'EX', e.ttl)
      else pipeline.set(e.key, e.raw)
    }
    await pipeline.exec()
  }

  /** Remaining TTL via `TTL` (seconds), or `undefined` when none / missing. */
  protected async ttlRaw(key: string): Promise<number | undefined> {
    const seconds = await this.client().ttl(key)
    // ioredis: -1 = key exists without expiry, -2 = key missing.
    return seconds < 0 ? undefined : seconds
  }

  /** Delete every key under `prefix` via `SCAN`+`DEL` (guarded when unscoped). */
  protected async clearRaw(prefix: string): Promise<void> {
    if (prefix.length === 0) return // guard: never wipe an unscoped namespace
    const client = this.client()
    let cursor = '0'
    do {
      const [next, batch] = await client.scan(cursor, 'MATCH', `${prefix}*`, 'COUNT', 200)
      cursor = next
      if (batch.length > 0) await client.del(...batch)
    } while (cursor !== '0')
  }

  // ─── Internals ─────────────────────────────────────────────

  private client(): Redis {
    const client = RedisKeyValueRepository.clients.get(this)
    if (client === undefined) {
      throw new ConnectionException('Redis client not initialised — call init() (or super.init()) first')
    }
    return client
  }
}
