import { Business } from './Business.js'

/**
 * Generalization for Business Layer components whose state is derived
 * by folding an append-only log of domain events.
 *
 * Subclass implements the pure reducer {@link apply}; the base class
 * keeps the log and exposes {@link record}, {@link replay},
 * {@link snapshot}.
 *
 * @typeParam T  Shape of the component's internal domain state.
 * @typeParam E  Domain event type.
 */
export abstract class EventSourcedBusiness<T, E> extends Business<T> {
  private log: E[] = []

  /**
   * Pure reducer: given the current state and an event, returns the
   * next state. MUST NOT mutate `state` in place.
   *
   * @param state  The current state.
   * @param event  The event to apply.
   * @returns      The next state.
   */
  protected abstract apply(state: T, event: E): T

  /**
   * Append `event` to the log and advance `state` through {@link apply}.
   *
   * @param event  The event to record.
   */
  record(event: E): void {
    this.state = this.apply(this.state, event)
    this.log.push(event)
  }

  /**
   * Rebuild `state` by folding `events` from `initial`. Replaces the log.
   *
   * @param events   The events to replay, in order.
   * @param initial  The initial state to fold from.
   */
  replay(events: Iterable<E>, initial: T): void {
    let next = initial
    this.log.length = 0
    for (const e of events) {
      next = this.apply(next, e)
      this.log.push(e)
    }
    this.state = next
  }

  /**
   * Defensive copy of the event log.
   *
   * @returns A new array containing the log entries in insertion order.
   */
  snapshot(): readonly E[] {
    return [...this.log]
  }

  /**
   * No-op. Override to add setup.
   *
   * @returns A resolved promise.
   */
  async init(): Promise<void> {}

  /**
   * Clears the log.
   *
   * @returns A resolved promise.
   */
  async terminate(): Promise<void> {
    this.log.length = 0
  }
}
