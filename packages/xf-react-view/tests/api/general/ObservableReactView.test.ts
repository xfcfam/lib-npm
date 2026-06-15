import { describe, it, expect } from 'vitest'
import { ObservableReactView } from '../../../index'

class PeerComponent<S> {
  state: S
  constructor(state: S) {
    this.state = state
  }
  setState(next: S): void {
    this.state = next
  }
}

interface State {
  count: number
}

class CounterView extends ObservableReactView<State>()(PeerComponent<State>) {
  constructor() {
    super({ count: 0 })
  }
  increment(): void {
    const next = { count: this.state.count + 1 }
    this.setState(next)
    this.notify(next)
  }
}

describe('ObservableReactView', () => {
  it('observe() returns a strictly increasing numeric id', () => {
    const c = new CounterView()
    expect(c.observe(() => {})).toBe(1)
    expect(c.observe(() => {})).toBe(2)
    expect(c.observe(() => {})).toBe(3)
  })

  it('notify() invokes every registered observer with the snapshot', () => {
    const c = new CounterView()
    const seen: State[] = []
    c.observe(s => seen.push(s))
    c.observe(s => seen.push(s))
    c.increment()
    expect(seen).toHaveLength(2)
    expect(seen[0]).toEqual({ count: 1 })
    expect(seen[1]).toEqual({ count: 1 })
  })

  it('remove(id) deregisters an observer by id', () => {
    const c = new CounterView()
    let calls = 0
    const id = c.observe(() => calls++)
    c.notify({ count: 1 })
    expect(calls).toBe(1)
    c.remove(id)
    c.notify({ count: 2 })
    expect(calls).toBe(1)
  })

  it('remove() with an unknown id is a no-op', () => {
    const c = new CounterView()
    expect(() => c.remove(999)).not.toThrow()
  })

  it('terminate() releases observers', async () => {
    const c = new CounterView()
    let calls = 0
    c.observe(() => calls++)
    await c.terminate()
    c.notify({ count: 1 })
    expect(calls).toBe(0)
  })

  it('different instances have independent observer registries', () => {
    const a = new CounterView()
    const b = new CounterView()
    expect(a.observe(() => {})).toBe(1)
    expect(b.observe(() => {})).toBe(1)
  })

  it('preserves the peer base members', () => {
    const c = new CounterView()
    expect(c.state).toEqual({ count: 0 })
    c.increment()
    expect(c.state).toEqual({ count: 1 })
  })

  it('bridges the React mount/unmount lifecycle to init/terminate', async () => {
    const events: string[] = []
    class BridgedView extends ObservableReactView<State>()(PeerComponent<State>) {
      constructor() {
        super({ count: 0 })
      }
      override async init(): Promise<void> {
        events.push('init')
      }
      override async terminate(): Promise<void> {
        await super.terminate()
        events.push('terminate')
      }
    }
    const v = new BridgedView() as BridgedView & {
      componentDidMount(): void
      componentWillUnmount(): void
    }
    v.componentDidMount()
    v.componentWillUnmount()
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(events).toEqual(['init', 'terminate'])
  })
})
