import { StatelessRepository } from './StatelessRepository.js'

/**
 * Generalization for Access Layer components that read time from the
 * runtime clock.
 *
 * Wrapping `Date.now()` / `setTimeout` behind a Repository lets you
 * substitute a controllable clock in tests — a `FakeClock` subclass
 * overrides {@link now} and {@link sleep} to advance deterministically
 * — without leaking that concern into Business.
 *
 * Default implementations delegate to the system clock. Subclass and
 * override only what you need to fake.
 *
 * @example
 * ```ts
 * import { ClockRepository } from '@xfcfam/xf'
 *
 * // Production: empty subclass — uses the real clock.
 * export class SystemClock extends ClockRepository {}
 *
 * // Tests: deterministic.
 * export class FakeClock extends ClockRepository {
 *   private t = 0
 *   override now(): number { return this.t }
 *   override async sleep(ms: number): Promise<void> { this.t += ms }
 * }
 * ```
 */
export abstract class ClockRepository extends StatelessRepository {
  /**
   * Current time in milliseconds since the Unix epoch.
   *
   * @returns The current Unix timestamp in milliseconds.
   */
  now(): number {
    return Date.now()
  }

  /**
   * Current time as an ISO 8601 string (`YYYY-MM-DDTHH:mm:ss.sssZ`).
   *
   * @returns The current time formatted as ISO 8601.
   */
  nowIso(): string {
    return new Date(this.now()).toISOString()
  }

  /**
   * Resolve after `ms` milliseconds.
   *
   * @param ms  Delay in milliseconds.
   * @returns   A promise that resolves once the delay has elapsed.
   */
  async sleep(ms: number): Promise<void> {
    await new Promise<void>(resolve => setTimeout(resolve, ms))
  }

  /**
   * No-op. Override to add setup.
   *
   * @returns A resolved promise.
   */
  async init(): Promise<void> {}

  /**
   * No-op. Override to add teardown.
   *
   * @returns A resolved promise.
   */
  async terminate(): Promise<void> {}
}
