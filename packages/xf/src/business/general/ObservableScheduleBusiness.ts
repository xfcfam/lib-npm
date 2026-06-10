import { ScheduleBusiness } from './ScheduleBusiness.js'

/**
 * Generalization combining scheduling with observation. Subclasses
 * implement only {@link run} — same contract as
 * {@link ScheduleBusiness} — and observers fire automatically after
 * every successful tick.
 *
 * If you also want to notify outside of ticks (mid-run intermediate
 * updates, for instance), call {@link notify} explicitly.
 *
 * @typeParam T  Shape of the component's internal domain state.
 *
 * @example
 * ```ts
 * import { ObservableScheduleBusiness } from '@xfcfam/xf'
 * import { R } from '../R.js'
 *
 * interface PriceState { last: number; updatedAt: number }
 *
 * export class PriceBusiness extends ObservableScheduleBusiness<PriceState> {
 *   constructor() { super({ last: 0, updatedAt: 0 }) }
 *   async init() { this.interval(60_000) }
 *
 *   async run(): Promise<void> {
 *     this.state = { last: await R.priceFeed.fetchLast(), updatedAt: Date.now() }
 *     // observers fire automatically after this returns
 *   }
 * }
 *
 * priceBiz.observe(state => render(state))
 * ```
 */
export abstract class ObservableScheduleBusiness<T> extends ScheduleBusiness<T> {
  private nextId = 0
  private observers = new Map<number, (state: T) => void>()

  /**
   * Register an observer.
   *
   * @param observer  Callback invoked with the current state after each tick
   *                  (and on manual {@link notify}).
   * @returns         An id usable in {@link remove}.
   */
  observe(observer: (state: T) => void): number {
    const id = ++this.nextId
    this.observers.set(id, observer)
    return id
  }

  /**
   * Unregister an observer.
   *
   * @param id  The id previously returned by {@link observe}.
   */
  remove(id: number): void {
    this.observers.delete(id)
  }

  /**
   * Invoke every registered observer with the current state. Called
   * automatically after each successful tick.
   */
  notify(): void {
    this.observers.forEach(observer => observer(this.state))
  }

  /**
   * Bridge: fan every successful tick out to all observers.
   */
  protected override onTickComplete(): void {
    this.notify()
  }

  /**
   * Drops observers (after the base class cancels any pending schedule).
   *
   * @returns A resolved promise.
   */
  override async terminate(): Promise<void> {
    await super.terminate()
    this.observers.clear()
  }
}
