import { Business } from './Business.js'

/**
 * Generalization for Business Layer components that execute periodic
 * or deferred domain work — recomputing aggregates, expiring sessions,
 * driving sagas, evaluating timers, etc.
 *
 * Subclass implements {@link run}; the base class drives execution
 * via {@link interval} / {@link delay} and cancels in {@link terminate}.
 *
 * Extension point: subclasses may override the protected hook
 * {@link onTickComplete} to react after every successful tick without
 * having to override the scheduling methods. This is what
 * {@link ObservableScheduleBusiness} uses internally.
 *
 * @typeParam T  Shape of the component's internal domain state.
 */
export abstract class ScheduleBusiness<T> extends Business<T> {
  private intervalId: ReturnType<typeof setInterval> | undefined = undefined
  private timeoutId: ReturnType<typeof setTimeout> | undefined = undefined

  /**
   * The work to execute on each tick.
   *
   * @returns A promise that resolves when the tick is complete.
   */
  abstract run(): Promise<void>

  /**
   * Hook invoked after every successful {@link run}. Default no-op.
   * NOT invoked if `run` rejects.
   */
  protected onTickComplete(): void {}

  /**
   * (Re)schedule {@link run} every `ms` milliseconds. Replaces any
   * existing interval.
   *
   * @param ms  Interval in milliseconds.
   */
  interval(ms: number): void {
    if (this.intervalId !== undefined) clearInterval(this.intervalId)
    this.intervalId = setInterval(() => { void this.tick() }, ms)
  }

  /**
   * (Re)schedule {@link run} once after `ms` milliseconds. Replaces
   * any existing pending delay.
   *
   * @param ms  Delay in milliseconds.
   */
  delay(ms: number): void {
    if (this.timeoutId !== undefined) clearTimeout(this.timeoutId)
    this.timeoutId = setTimeout(() => { void this.tick() }, ms)
  }

  private async tick(): Promise<void> {
    await this.run()
    this.onTickComplete()
  }

  /**
   * No-op. Override to add setup.
   *
   * @returns A resolved promise.
   */
  async init(): Promise<void> {}

  /**
   * Cancels any pending interval or timeout.
   *
   * @returns A resolved promise.
   */
  async terminate(): Promise<void> {
    if (this.intervalId !== undefined) { clearInterval(this.intervalId); this.intervalId = undefined }
    if (this.timeoutId  !== undefined) { clearTimeout(this.timeoutId);   this.timeoutId  = undefined }
  }
}
