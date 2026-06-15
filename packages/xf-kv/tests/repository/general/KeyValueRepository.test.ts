import { describe, it, expect, beforeEach } from 'vitest'
import {
  KeyValueRepository,
  CodecUtils,
  KeyValueException,
  ConnectionException,
  SerializationException,
  type KeyValueOptions,
} from '../../../index'

// ── In-memory test double: implements the *Raw primitives over a Map,
//    with optional expiry. Exposes `store` so tests can assert the raw
//    namespaced keys the base produced.
interface Cell { raw: string; exp?: number }

class MemStore<V = unknown> extends KeyValueRepository<V> {
  readonly store = new Map<string, Cell>()

  private fresh(k: string): Cell | undefined {
    const e = this.store.get(k)
    if (e === undefined) return undefined
    if (e.exp !== undefined && e.exp <= Date.now()) { this.store.delete(k); return undefined }
    return e
  }

  protected async getRaw(k: string) { return this.fresh(k)?.raw }
  protected async setRaw(k: string, raw: string, ttl?: number) {
    this.store.set(k, { raw, ...(ttl !== undefined ? { exp: Date.now() + ttl * 1000 } : {}) })
  }
  protected async deleteRaw(k: string) { return this.store.delete(k) }
  protected async hasRaw(k: string) { return this.fresh(k) !== undefined }
  protected async incrRaw(k: string, by: number) {
    const next = Number(this.fresh(k)?.raw ?? '0') + by
    this.store.set(k, { raw: String(next) })
    return next
  }
  protected async getManyRaw(keys: readonly string[]) { return keys.map((k) => this.fresh(k)?.raw) }
  protected async setManyRaw(entries: readonly { key: string; raw: string; ttl?: number }[]) {
    for (const e of entries) await this.setRaw(e.key, e.raw, e.ttl)
  }
  protected async ttlRaw(k: string) {
    const e = this.fresh(k)
    return e?.exp === undefined ? undefined : Math.ceil((e.exp - Date.now()) / 1000)
  }
  protected async clearRaw(prefix: string) {
    for (const k of [...this.store.keys()]) if (k.startsWith(prefix)) this.store.delete(k)
  }
}

const make = <V>(opts?: KeyValueOptions<V>) => new MemStore<V>(opts)

describe('KeyValueRepository — get / set with JSON codec + namespace', () => {
  let s: MemStore<{ id: number; name: string }>
  beforeEach(async () => { s = make({ namespace: 'sess' }); await s.init() })

  it('stores and reads a JSON value', async () => {
    await s.set('u1', { id: 1, name: 'Ada' })
    expect(await s.get('u1')).toEqual({ id: 1, name: 'Ada' })
  })
  it('namespaces the underlying key', async () => {
    await s.set('u1', { id: 1, name: 'Ada' })
    expect(s.store.has('sess:u1')).toBe(true)
  })
  it('returns undefined for a missing key', async () => {
    expect(await s.get('missing')).toBeUndefined()
  })
})

describe('KeyValueRepository — delete / has', () => {
  it('delete returns whether the key existed', async () => {
    const s = make(); await s.init()
    await s.set('k', 1)
    expect(await s.has('k')).toBe(true)
    expect(await s.delete('k')).toBe(true)
    expect(await s.delete('k')).toBe(false)
    expect(await s.has('k')).toBe(false)
  })
})

describe('KeyValueRepository — atomic counters', () => {
  it('increment and decrement return the new value', async () => {
    const s = make<number>(); await s.init()
    expect(await s.increment('hits')).toBe(1)
    expect(await s.increment('hits', 5)).toBe(6)
    expect(await s.decrement('hits', 2)).toBe(4)
  })
})

describe('KeyValueRepository — bulk', () => {
  it('setMany / getMany round-trip and omit absent keys', async () => {
    const s = make<number>(); await s.init()
    await s.setMany([{ key: 'a', value: 1 }, { key: 'b', value: 2, ttl: 100 }])
    const many = await s.getMany(['a', 'b', 'nope'])
    expect([...many.entries()]).toEqual([['a', 1], ['b', 2]])
    expect(many.has('nope')).toBe(false)
  })
})

describe('KeyValueRepository — TTL', () => {
  it('applies the default TTL and lets a per-call TTL override it', async () => {
    const s = make<string>({ defaultTtl: 50 }); await s.init()
    await s.set('x', 'y')
    const a = await s.ttl('x')
    expect(a).toBeGreaterThan(40)
    expect(a).toBeLessThanOrEqual(50)
    await s.set('z', 'w', 200)
    expect(await s.ttl('z')).toBeGreaterThan(150)
  })
  it('reports undefined TTL for a key without expiry', async () => {
    const s = make<string>(); await s.init()
    await s.set('k', 'v')
    expect(await s.ttl('k')).toBeUndefined()
  })
})

describe('KeyValueRepository — clear is scoped to the namespace', () => {
  it('wipes only keys under this namespace', async () => {
    const s = make<string>({ namespace: 'ns' }); await s.init()
    await s.set('k1', 'v1'); await s.set('k2', 'v2')
    s.store.set('other:k', { raw: '"x"' })
    await s.clear()
    expect(await s.get('k1')).toBeUndefined()
    expect(s.store.has('other:k')).toBe(true)
  })
})

describe('KeyValueRepository — codec & serialization errors', () => {
  it('the text codec stores strings verbatim', async () => {
    const s = make<string>({ codec: CodecUtils.text() }); await s.init()
    await s.set('s', 'plain')
    expect(s.store.get('s')?.raw).toBe('plain')
  })
  it('a decode failure raises SerializationException (a KeyValueException)', async () => {
    const s = make(); await s.init()
    s.store.set('broke', { raw: '{not json' })
    await expect(s.get('broke')).rejects.toBeInstanceOf(SerializationException)
    await expect(s.get('broke')).rejects.toBeInstanceOf(KeyValueException)
  })
})

describe('KeyValueRepository — error translation hook', () => {
  it('maps a client error to a typed ConnectionException', async () => {
    class Flaky extends MemStore {
      protected override async getRaw(): Promise<string | undefined> {
        throw Object.assign(new Error('refused'), { code: 'ECONNREFUSED' })
      }
      protected override translateError(err: unknown): unknown {
        return (err as { code?: string }).code === 'ECONNREFUSED'
          ? new ConnectionException('store unreachable', { cause: err })
          : err
      }
    }
    const f = new Flaky(); await f.init()
    await expect(f.get('x')).rejects.toBeInstanceOf(ConnectionException)
    await expect(f.get('x')).rejects.toBeInstanceOf(KeyValueException)
  })
})
