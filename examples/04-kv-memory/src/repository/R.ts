import { SessionRepository } from './logic/local/SessionRepository.js'
import { MetricsRepository } from './logic/local/MetricsRepository.js'

/**
 * Access Layer Injection. Owns the two Access Logicals and is the only
 * conduit the Business layer uses to reach them: `R.sessions.get(...)`,
 * `R.metrics.increment(...)`.
 */
export class R {
  private constructor() {}

  static readonly sessions = new SessionRepository()
  static readonly metrics = new MetricsRepository()

  static async init(): Promise<void> {
    await R.sessions.init()
    await R.metrics.init()
  }

  static async terminate(): Promise<void> {
    await R.metrics.terminate()
    await R.sessions.terminate()
  }
}
