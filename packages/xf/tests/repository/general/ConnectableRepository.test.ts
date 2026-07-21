import { describe, it, expect, vi } from 'vitest'
import { ConnectableRepository } from '../../../index'

class FakeConnection extends ConnectableRepository<null> {
  errors: unknown[] = []

  constructor() { super(null) }

  async init(): Promise<void> { await this.markConnected() }
  async terminate(): Promise<void> { await this.markDisconnected() }

  /** Test seam: simulate a connection drop followed by a reconnect. */
  async drop(): Promise<void> { await this.markDisconnected() }
  async raise(): Promise<void> { await this.markConnected() }

  async purge(): Promise<void> { this.clearConnectionListeners() }

  protected override onListenerError(error: unknown): void { this.errors.push(error) }
}

describe('ConnectableRepository', () => {
  it('starts disconnected', () => {
    expect(new FakeConnection().isConnected()).toBe(false)
  })

  it('fires listeners registered before the connection opens', async () => {
    const repo = new FakeConnection()
    const listener = vi.fn()
    repo.onConnect(listener)

    expect(listener).not.toHaveBeenCalled()
    await repo.init()

    expect(listener).toHaveBeenCalledTimes(1)
    expect(repo.isConnected()).toBe(true)
  })

  it('fires a listener registered AFTER the connection is already open', async () => {
    // The regression this class exists for: XF runs R.init() before B.init(),
    // so a Business always subscribes late. A plain emitter would drop this.
    const repo = new FakeConnection()
    await repo.init()

    const listener = vi.fn()
    repo.onConnect(listener)

    await vi.waitFor(() => expect(listener).toHaveBeenCalledTimes(1))
  })

  it('awaits async listeners in registration order', async () => {
    const repo = new FakeConnection()
    const order: string[] = []
    repo.onConnect(async () => {
      await new Promise((r) => setTimeout(r, 10))
      order.push('slow')
    })
    repo.onConnect(() => { order.push('fast') })

    await repo.init()

    expect(order).toEqual(['slow', 'fast'])
  })

  it('isolates a throwing listener and routes it to onListenerError', async () => {
    const repo = new FakeConnection()
    const boom = new Error('listener exploded')
    const survivor = vi.fn()
    repo.onConnect(() => { throw boom })
    repo.onConnect(survivor)

    await repo.init()

    expect(survivor).toHaveBeenCalledTimes(1)
    expect(repo.errors).toEqual([boom])
    expect(repo.isConnected()).toBe(true)
  })

  it('isolates a rejecting async listener', async () => {
    const repo = new FakeConnection()
    const boom = new Error('async explosion')
    repo.onConnect(async () => { throw boom })

    await expect(repo.init()).resolves.toBeUndefined()
    expect(repo.errors).toEqual([boom])
  })

  it('routes the failure of a late listener to onListenerError too', async () => {
    const repo = new FakeConnection()
    await repo.init()
    const boom = new Error('late explosion')

    repo.onConnect(() => { throw boom })

    await vi.waitFor(() => expect(repo.errors).toEqual([boom]))
  })

  it('re-fires connect listeners on every reconnect', async () => {
    const repo = new FakeConnection()
    const listener = vi.fn()
    repo.onConnect(listener)

    await repo.init()
    await repo.drop()
    await repo.raise()

    expect(listener).toHaveBeenCalledTimes(2)
  })

  it('markConnected / markDisconnected are idempotent', async () => {
    const repo = new FakeConnection()
    const onUp = vi.fn()
    const onDown = vi.fn()
    repo.onConnect(onUp)
    repo.onDisconnect(onDown)

    await repo.init()
    await repo.init()
    expect(onUp).toHaveBeenCalledTimes(1)

    await repo.terminate()
    await repo.terminate()
    expect(onDown).toHaveBeenCalledTimes(1)
  })

  it('does not replay disconnect to a listener registered while disconnected', async () => {
    const repo = new FakeConnection()
    const listener = vi.fn()

    repo.onDisconnect(listener)
    expect(listener).not.toHaveBeenCalled()

    await repo.init()
    expect(listener).not.toHaveBeenCalled()

    await repo.terminate()
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('remove() unregisters a listener by id', async () => {
    const repo = new FakeConnection()
    const listener = vi.fn()
    const id = repo.onConnect(listener)

    repo.remove(id)
    await repo.init()

    expect(listener).not.toHaveBeenCalled()
  })

  it('clearConnectionListeners() drops every listener', async () => {
    const repo = new FakeConnection()
    const onUp = vi.fn()
    const onDown = vi.fn()
    repo.onConnect(onUp)
    repo.onDisconnect(onDown)

    await repo.purge()
    await repo.init()
    await repo.terminate()

    expect(onUp).not.toHaveBeenCalled()
    expect(onDown).not.toHaveBeenCalled()
  })

  it('a listener registered during a connect transition is not invoked twice', async () => {
    const repo = new FakeConnection()
    const nested = vi.fn()
    repo.onConnect(() => { repo.onConnect(nested) })

    await repo.init()

    // The snapshot taken by markConnected excludes it; the latch then fires it
    // immediately on registration. Exactly once, either way.
    await vi.waitFor(() => expect(nested).toHaveBeenCalledTimes(1))
  })
})
