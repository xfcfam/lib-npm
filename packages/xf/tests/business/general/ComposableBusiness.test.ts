import { describe, it, expect } from 'vitest'
import { Business, ComposableBusiness, ObservableBusiness, EventSourcedBusiness } from '../../../index'

interface State { value: number }

describe('ComposableBusiness.compose', () => {
  it('preserves the constructor signature of the first ctor', async () => {
    class JobBusiness extends ComposableBusiness.compose(
      ObservableBusiness<State>,
      EventSourcedBusiness<State, { v: number }>,
    ) {
      constructor() { super({ value: 0 }) }
      protected apply(s: State, e: { v: number }): State { return { value: s.value + e.v } }
    }
    const job = new JobBusiness()
    await job.init()
    expect((job as any).state.value).toBe(0)
    await job.terminate()
  })

  it('runs init() in argument order — first via super, then rest', async () => {
    const order: string[] = []

    abstract class A extends Business<null> {
      async init() { order.push('A.init') }
      async terminate() { order.push('A.terminate') }
    }
    abstract class B extends Business<null> {
      async init() { order.push('B.init') }
      async terminate() { order.push('B.terminate') }
    }
    abstract class C extends Business<null> {
      async init() { order.push('C.init') }
      async terminate() { order.push('C.terminate') }
    }

    class Composed extends ComposableBusiness.compose(A, B, C) {
      constructor() { super(null) }
    }

    const c = new Composed()
    await c.init()
    expect(order).toEqual(['A.init', 'B.init', 'C.init'])

    order.length = 0
    await c.terminate()
    // terminate reverse order: rest reversed first, then first
    expect(order).toEqual(['C.terminate', 'B.terminate', 'A.terminate'])
  })

  it('skips init/terminate steps for ctors without their own implementation', async () => {
    const calls: string[] = []

    abstract class WithInit extends Business<null> {
      async init() { calls.push('init') }
      async terminate() { calls.push('terminate') }
    }
    abstract class NoLifecycle extends Business<null> {
      // No own init/terminate. Inherits abstract from Business<null>.
      doSomething() { calls.push('doSomething') }
    }

    class Composed extends ComposableBusiness.compose(WithInit, NoLifecycle) {
      constructor() { super(null) }
    }
    const c = new Composed()
    await c.init()
    expect(calls).toEqual(['init'])
    ;(c as any).doSomething()
    expect(calls).toEqual(['init', 'doSomething'])
  })

  it('copies non-lifecycle methods from rest ctors to the composed prototype', async () => {
    abstract class Foo extends Business<null> {
      async init() {}
      async terminate() {}
      foo() { return 'foo-result' }
    }
    abstract class Bar extends Business<null> {
      async init() {}
      async terminate() {}
      bar() { return 'bar-result' }
    }

    class Composed extends ComposableBusiness.compose(Foo, Bar) {
      constructor() { super(null) }
    }
    const c = new Composed()
    expect((c as any).foo()).toBe('foo-result')
    expect((c as any).bar()).toBe('bar-result')
  })

  it('on method-name collision, the rightmost ctor wins', async () => {
    abstract class Foo extends Business<null> {
      async init() {}
      async terminate() {}
      hello() { return 'foo' }
    }
    abstract class Bar extends Business<null> {
      async init() {}
      async terminate() {}
      hello() { return 'bar' }
    }

    class Composed extends ComposableBusiness.compose(Foo, Bar) {
      constructor() { super(null) }
    }
    const c = new Composed()
    expect((c as any).hello()).toBe('bar')
  })

  it('init order is preserved: super.init() runs first, then user setup', async () => {
    const order: string[] = []

    abstract class Step1 extends Business<null> {
      async init() { order.push('Step1.init') }
      async terminate() {}
    }
    abstract class Step2 extends Business<null> {
      async init() { order.push('Step2.init') }
      async terminate() {}
    }

    class UserClass extends ComposableBusiness.compose(Step1, Step2) {
      constructor() { super(null) }
      async init() {
        await super.init()
        order.push('user.init')
      }
    }
    await new UserClass().init()
    expect(order).toEqual(['Step1.init', 'Step2.init', 'user.init'])
  })
})
