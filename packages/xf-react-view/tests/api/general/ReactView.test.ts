import { describe, it, expect } from 'vitest'
import { ReactView } from '../../../index'

// A stand-in for a peer-developer base class (e.g. React.Component).
// Carries its own constructor, members, and React-style lifecycle so we
// can assert the mixin preserves and bridges them — without pulling in
// the real `react` dependency.
class PeerComponent<S = unknown> {
  state: S
  mountCalls = 0
  unmountCalls = 0
  constructor(state: S) {
    this.state = state
  }
  setState(next: S): void {
    this.state = next
  }
  componentDidMount(): void {
    this.mountCalls++
  }
  componentWillUnmount(): void {
    this.unmountCalls++
  }
}

describe('ReactView', () => {
  it('preserves the peer base constructor and members', () => {
    class UserView extends ReactView(PeerComponent<{ name: string }>) {
      override async init() {}
      override async terminate() {}
    }
    const v = new UserView({ name: 'Alice' })
    expect(v.state).toEqual({ name: 'Alice' })
    v.setState({ name: 'Bob' })
    expect(v.state).toEqual({ name: 'Bob' })
  })

  it('forwards constructor arguments to the peer base (mixin pattern)', () => {
    // Mirrors the canonical Tagged(User) mixin example: the subclass
    // passes args straight through `super(...)` to the peer base.
    class User {
      name: string
      constructor(name: string) {
        this.name = name
      }
    }
    class Foo extends ReactView(User) {
      tag = 'user-foo'
      constructor(name: string) {
        super(name)
      }
      override async init() {}
      override async terminate() {}
    }
    const foo = new Foo('Alice')
    expect(foo.name).toBe('Alice')
    expect(foo.tag).toBe('user-foo')
  })

  it('contributes the XF View lifecycle (init / terminate)', async () => {
    const order: string[] = []
    class UserView extends ReactView(PeerComponent<null>) {
      constructor() {
        super(null)
      }
      override async init() {
        order.push('init')
      }
      override async terminate() {
        order.push('terminate')
      }
    }
    const v = new UserView()
    await v.init()
    await v.terminate()
    expect(order).toEqual(['init', 'terminate'])
  })

  it('default lifecycle hooks are no-ops that resolve', async () => {
    class BareView extends ReactView(PeerComponent<null>) {
      constructor() {
        super(null)
      }
    }
    const v = new BareView()
    await expect(v.init()).resolves.toBeUndefined()
    await expect(v.terminate()).resolves.toBeUndefined()
  })

  it('bridges componentDidMount → init and delegates to the base', () => {
    let inited = 0
    class UserView extends ReactView(PeerComponent<null>) {
      constructor() {
        super(null)
      }
      override async init() {
        inited++
      }
      override async terminate() {}
    }
    const v = new UserView()
    v.componentDidMount()
    expect(v.mountCalls).toBe(1) // base lifecycle still ran
    expect(inited).toBe(1) // XF init fired
  })

  it('bridges componentWillUnmount → terminate and delegates to the base', () => {
    let terminated = 0
    class UserView extends ReactView(PeerComponent<null>) {
      constructor() {
        super(null)
      }
      override async init() {}
      override async terminate() {
        terminated++
      }
    }
    const v = new UserView()
    v.componentWillUnmount()
    expect(v.unmountCalls).toBe(1) // base lifecycle still ran
    expect(terminated).toBe(1) // XF terminate fired
  })

  it('is inert when the peer base has no React lifecycle', () => {
    class Plain {
      value = 42
    }
    class PlainView extends ReactView(Plain) {
      override async init() {}
      override async terminate() {}
    }
    const v = new PlainView()
    expect(() => v.componentDidMount()).not.toThrow()
    expect(() => v.componentWillUnmount()).not.toThrow()
    expect(v.value).toBe(42)
  })
})
