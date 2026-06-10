import { describe, it, expect } from 'vitest'
import { ObservableBusiness } from '../../../index'

interface State { count: number }

class CounterBusiness extends ObservableBusiness<State> {
  constructor() { super({ count: 0 }) }
  increment() { this.state = { count: this.state.count + 1 }; this.notify() }
}

describe('ObservableBusiness', () => {
  it('observe() returns a strictly increasing numeric id', async () => {
    const c = new CounterBusiness()
    await c.init()
    const id1 = c.observe(() => {})
    const id2 = c.observe(() => {})
    const id3 = c.observe(() => {})
    expect(id1).toBe(1)
    expect(id2).toBe(2)
    expect(id3).toBe(3)
    await c.terminate()
  })

  it('notify() invokes every registered observer with the current state', async () => {
    const c = new CounterBusiness()
    await c.init()
    const seen: State[] = []
    c.observe(s => { seen.push(s) })
    c.observe(s => { seen.push(s) })
    c.increment()
    expect(seen).toHaveLength(2)
    expect(seen[0]).toEqual({ count: 1 })
    expect(seen[1]).toEqual({ count: 1 })
    await c.terminate()
  })

  it('remove(id) deregisters an observer by id', async () => {
    const c = new CounterBusiness()
    await c.init()
    let calls = 0
    const id = c.observe(() => { calls++ })
    c.notify(); expect(calls).toBe(1)
    c.remove(id)
    c.notify(); expect(calls).toBe(1)  // unchanged
    await c.terminate()
  })

  it('remove() with an unknown id is a no-op', async () => {
    const c = new CounterBusiness()
    await c.init()
    expect(() => c.remove(999)).not.toThrow()
    await c.terminate()
  })

  it('throws on observe() if init() was not called', () => {
    const c = new CounterBusiness()
    expect(() => c.observe(() => {})).toThrow(/init\(\) was not called/)
  })

  it('terminate() releases observers', async () => {
    const c = new CounterBusiness()
    await c.init()
    let calls = 0
    c.observe(() => { calls++ })
    await c.terminate()
    // After terminate, notify should be silent (observers cleared)
    c.notify()
    expect(calls).toBe(0)
  })

  it('different instances have independent observer registries', async () => {
    const a = new CounterBusiness()
    const b = new CounterBusiness()
    await a.init()
    await b.init()
    const idA = a.observe(() => {})
    const idB = b.observe(() => {})
    // Both start their own counter from 1
    expect(idA).toBe(1)
    expect(idB).toBe(1)
    await a.terminate()
    await b.terminate()
  })
})
