import { View } from './View.js'

/**
 * Generalization for Interaction Layer components that execute
 * periodic or deferred work — animation tickers, debounced UI
 * refreshes, polling displays, scheduled notifications, etc.
 *
 * Subclass implements {@link run}; the base class drives execution
 * via {@link interval} / {@link delay} and cancels in {@link terminate}.
 *
 * @typeParam T  Shape of the component's internal state.
 */
export abstract class ScheduleView<T> extends View<T> {
  private intervalId: ReturnType<typeof setInterval> | undefined = undefined
  private timeoutId: ReturnType<typeof setTimeout> | undefined = undefined

  /**
   * The work to execute on each tick.
   *
   * @returns A promise that resolves when the tick is complete.
   */
  abstract run(): Promise<void>

  /**
   * (Re)schedule {@link run} every `ms` milliseconds. Replaces any
   * existing interval.
   *
   * @param ms  Interval in milliseconds.
   */
  interval(ms: number): void {
    if (this.intervalId !== undefined) clearInterval(this.intervalId)
    this.intervalId = setInterval(() => { void this.run() }, ms)
  }

  /**
   * (Re)schedule {@link run} once after `ms` milliseconds. Replaces
   * any existing pending delay.
   *
   * @param ms  Delay in milliseconds.
   */
  delay(ms: number): void {
    if (this.timeoutId !== undefined) clearTimeout(this.timeoutId)
    this.timeoutId = setTimeout(() => { void this.run() }, ms)
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
