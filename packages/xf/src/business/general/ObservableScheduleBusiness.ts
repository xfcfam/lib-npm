import { ScheduleBusiness } from './ScheduleBusiness.js'

/**
 * Generalization that **composes** scheduling with observation — nothing
 * more. Scheduling and observation are orthogonal concerns: a tick
 * (periodic execution) is not, by itself, a state change. So this class
 * does **not** notify observers on every tick. Observers are notified
 * only when the component actually publishes a new state, by calling
 * {@link notify} — exactly the {@link ObservableBusiness} contract.
 *
 * The typical pattern: the scheduled {@link run} refreshes/recomputes the
 * state and calls `notify(newState)` when there is something new; a tick
 * that changes nothing notifies nobody.
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
 *     const last = await R.priceFeed.fetchLast()
 *     this.notify({ last, updatedAt: Date.now() })  // publish the state change
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
   * @param observer       Callback invoked with the current state on every {@link notify}.
   * @param runOnObserve   When `true`, also invoked immediately with the current state.
   * @returns              An id usable in {@link remove}.
   */
  observe(observer: (state: T) => void, runOnObserve = false): number {
    const id = ++this.nextId
    this.observers.set(id, observer)
    if (runOnObserve) { try { observer(this.state) } catch { /* observer errors are isolated */ } }
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
   * Publish a state change to every registered observer. If `data` is
   * provided it becomes the new state before observers run. Observer
   * errors are isolated. This is the only notification path — ticks do
   * not notify on their own.
   *
   * @param data  Optional new state to publish.
   */
  notify(data?: T): void {
    if (data !== undefined) this.state = data
    this.observers.forEach(observer => { try { observer(this.state) } catch { /* isolated */ } })
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
