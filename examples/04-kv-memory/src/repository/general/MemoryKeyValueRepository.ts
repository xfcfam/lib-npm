import { KeyValueRepository } from '@xfcfam/xf-kv'

/** Internal cell: the raw payload plus an optional absolute expiry (ms epoch). */
interface Cell {
  readonly raw: string
  readonly exp?: number
}

/**
 * Access-Layer Generalization — an **in-memory adapter** for
 * `@xfcfam/xf-kv`. Implements the `KeyValueRepository` raw primitives
 * over a process-local `Map`, with TTL expiry checked lazily on read.
 *
 * It demonstrates that the contract is backend-agnostic: this example
 * needs **no server**. For production, depend on `@xfcfam/xf-kv-redis`
 * or `@xfcfam/xf-kv-memcached` and extend those instead — the Business
 * and Interaction layers above stay unchanged.
 */
export abstract class MemoryKeyValueRepository<V = unknown> extends KeyValueRepository<V> {
  private readonly store = new Map<string, Cell>()

  override async init(): Promise<void> {}
  override async terminate(): Promise<void> { this.store.clear() }

  private fresh(key: string): Cell | undefined {
    const cell = this.store.get(key)
    if (cell === undefined) return undefined
    if (cell.exp !== undefined && cell.exp <= Date.now()) {
      this.store.delete(key)
      return undefined
    }
    return cell
  }

  protected async getRaw(key: string): Promise<string | undefined> {
    return this.fresh(key)?.raw
  }

  protected async setRaw(key: string, raw: string, ttl?: number): Promise<void> {
    this.store.set(key, { raw, ...(ttl !== undefined ? { exp: Date.now() + ttl * 1000 } : {}) })
  }

  protected async deleteRaw(key: string): Promise<boolean> {
    return this.store.delete(key)
  }

  protected async hasRaw(key: string): Promise<boolean> {
    return this.fresh(key) !== undefined
  }

  protected async incrRaw(key: string, by: number): Promise<number> {
    const next = Number(this.fresh(key)?.raw ?? '0') + by
    this.store.set(key, { raw: String(next) })
    return next
  }

  protected async getManyRaw(keys: readonly string[]): Promise<readonly (string | undefined)[]> {
    return keys.map((key) => this.fresh(key)?.raw)
  }

  protected async setManyRaw(entries: readonly { key: string; raw: string; ttl?: number }[]): Promise<void> {
    for (const e of entries) await this.setRaw(e.key, e.raw, e.ttl)
  }

  protected async ttlRaw(key: string): Promise<number | undefined> {
    const cell = this.fresh(key)
    return cell?.exp === undefined ? undefined : Math.ceil((cell.exp - Date.now()) / 1000)
  }

  protected async clearRaw(prefix: string): Promise<void> {
    for (const key of [...this.store.keys()]) {
      if (key.startsWith(prefix)) this.store.delete(key)
    }
  }
}
