import { describe, it, expect } from 'vitest'
import { EventSourcedBusiness } from '../../../index'

interface CartState { items: Record<string, number> }
type CartEvent =
  | { kind: 'add'; sku: string; qty: number }
  | { kind: 'clear' }

class CartBusiness extends EventSourcedBusiness<CartState, CartEvent> {
  constructor() { super({ items: {} }) }
  protected apply(state: CartState, e: CartEvent): CartState {
    if (e.kind === 'clear') return { items: {} }
    return { items: { ...state.items, [e.sku]: (state.items[e.sku] ?? 0) + e.qty } }
  }
}

describe('EventSourcedBusiness', () => {
  it('record() appends event and advances state via the reducer', async () => {
    const c = new CartBusiness()
    await c.init()
    c.record({ kind: 'add', sku: 'A', qty: 2 })
    c.record({ kind: 'add', sku: 'B', qty: 1 })
    expect((c as any).state.items).toEqual({ A: 2, B: 1 })
    expect(c.snapshot()).toHaveLength(2)
    await c.terminate()
  })

  it('snapshot() returns an immutable copy of the log', async () => {
    const c = new CartBusiness()
    await c.init()
    c.record({ kind: 'add', sku: 'X', qty: 1 })
    const snap = c.snapshot()
    expect(snap).toHaveLength(1)
    // Mutating the returned array must not affect internal state
    ;(snap as any).push({ kind: 'clear' })
    expect(c.snapshot()).toHaveLength(1)
    await c.terminate()
  })

  it('replay() rebuilds state from a known event sequence', async () => {
    const c = new CartBusiness()
    await c.init()
    c.replay([
      { kind: 'add', sku: 'A', qty: 5 },
      { kind: 'add', sku: 'A', qty: 3 },
    ], { items: {} })
    expect((c as any).state.items).toEqual({ A: 8 })
    expect(c.snapshot()).toHaveLength(2)
    await c.terminate()
  })

  it('throws on record() if init() was not called', () => {
    const c = new CartBusiness()
    expect(() => c.record({ kind: 'clear' })).toThrow(/init\(\) was not called/)
  })

  it('terminate() clears the log', async () => {
    const c = new CartBusiness()
    await c.init()
    c.record({ kind: 'add', sku: 'A', qty: 1 })
    await c.terminate()
    expect(c.snapshot()).toEqual([])
  })
})
