import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ObservableScheduleBusiness } from '../../../index'

interface State { value: number }

/** Publishes a state change on each tick. */
class Refresher extends ObservableScheduleBusiness<State> {
  next = 0
  constructor() { super({ value: 0 }) }
  get data(): State { return this.state }            // component opts in to publishing
  async run(): Promise<void> { this.notify({ value: ++this.next }) }
  start(ms: number, immediate = false) { this.interval(ms, immediate) }
}

/** Ticks but never publishes a state change. */
class Silent extends ObservableScheduleBusiness<State> {
  ticks = 0
  constructor() { super({ value: 0 }) }
  async run(): Promise<void> { this.ticks++ }        // no notify -> no observer fire
  start(ms: number) { this.interval(ms) }
}

describe('ObservableScheduleBusiness', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('notifies observers when run() publishes a state change', async () => {
    const b = new Refresher()
    const seen: State[] = []
    b.observe(s => seen.push(s))
    b.start(1000)
    await vi.advanceTimersByTimeAsync(2000)
    expect(seen).toEqual([{ value: 1 }, { value: 2 }])
    await b.terminate()
  })

  it('does NOT notify on a tick that publishes nothing (a tick is not a state change)', async () => {
    const b = new Silent()
    let calls = 0
    b.observe(() => calls++)
    b.start(1000)
    await vi.advanceTimersByTimeAsync(3000)
    expect(b.ticks).toBe(3)        // it did run three times
    expect(calls).toBe(0)          // but observers were never notified
    await b.terminate()
  })

  it('exposes published state via an opt-in accessor', async () => {
    const b = new Refresher()
    b.start(1000, true)
    await vi.advanceTimersByTimeAsync(0)
    expect(b.data).toEqual({ value: 1 })
    await b.terminate()
  })

  it('observe(observer, true) fires immediately with the current state', async () => {
    const b = new Refresher()
    b.notify({ value: 9 })                            // set state (no observers yet)
    const seen: State[] = []
    b.observe(s => seen.push(s), true)
    expect(seen).toEqual([{ value: 9 }])
    await b.terminate()
  })

  it('terminate() drops observers and cancels the schedule', async () => {
    const b = new Refresher()
    let calls = 0
    b.observe(() => calls++)
    b.start(1000)
    await b.terminate()
    await vi.advanceTimersByTimeAsync(3000)
    expect(calls).toBe(0)
  })
})
