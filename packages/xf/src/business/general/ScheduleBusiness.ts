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
   * Hook invoked when a {@link run} rejects. Default no-op (the error is
   * swallowed so a single failed tick never aborts the schedule). Override
   * to log or react.
   *
   * @param error  The rejection thrown by {@link run}.
   */
  protected onError(error: unknown): void {}

  /**
   * (Re)schedule {@link run} every `ms` milliseconds. Replaces any
   * existing interval.
   *
   * @param ms             Interval in milliseconds.
   * @param runImmediately When `true`, runs one tick now (before the first
   *                       interval elapses). Default `false`.
   */
  interval(ms: number, runImmediately = false): void {
    if (this.intervalId !== undefined) clearInterval(this.intervalId)
    if (runImmediately) void this.tick()
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
    try {
      await this.run()
      this.onTickComplete()
    } catch (error) {
      this.onError(error)
    }
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
