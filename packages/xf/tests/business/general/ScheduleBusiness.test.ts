import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ScheduleBusiness } from '../../../index'

class Ticker extends ScheduleBusiness<null> {
  runs = 0
  errors: unknown[] = []
  shouldThrow = false
  constructor() { super(null) }
  async run(): Promise<void> {
    this.runs++
    if (this.shouldThrow) throw new Error('tick failed')
  }
  protected override onError(error: unknown): void { this.errors.push(error) }
  start(ms: number, immediate = false) { this.interval(ms, immediate) }
  startDelay(ms: number) { this.delay(ms) }
}

describe('ScheduleBusiness', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('interval(ms) runs on each elapsed period', async () => {
    const t = new Ticker()
    t.start(1000)
    expect(t.runs).toBe(0)
    await vi.advanceTimersByTimeAsync(3000)
    expect(t.runs).toBe(3)
    await t.terminate()
  })

  it('interval(ms, true) runs one tick immediately', async () => {
    const t = new Ticker()
    t.start(1000, true)
    await vi.advanceTimersByTimeAsync(0)
    expect(t.runs).toBe(1)
    await vi.advanceTimersByTimeAsync(1000)
    expect(t.runs).toBe(2)
    await t.terminate()
  })

  it('a rejecting run() is routed to onError and never aborts the schedule', async () => {
    const t = new Ticker()
    t.shouldThrow = true
    t.start(1000)
    await vi.advanceTimersByTimeAsync(2000)
    expect(t.errors).toHaveLength(2)              // both ticks caught
    expect((t.errors[0] as Error).message).toBe('tick failed')
    await t.terminate()
  })

  it('delay(ms) runs exactly once', async () => {
    const t = new Ticker()
    t.startDelay(500)
    await vi.advanceTimersByTimeAsync(2000)
    expect(t.runs).toBe(1)
    await t.terminate()
  })

  it('terminate() cancels a pending interval', async () => {
    const t = new Ticker()
    t.start(1000)
    await t.terminate()
    await vi.advanceTimersByTimeAsync(5000)
    expect(t.runs).toBe(0)
  })
})
