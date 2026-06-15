import { SessionService } from './logic/service/SessionService.js'

/**
 * Interaction Layer Injection. Owns the entry-point Services. The
 * start-point reaches them through it: `A.sessions.login(...)`.
 */
export class A {
  private constructor() {}

  static readonly sessions = new SessionService()

  static async init(): Promise<void> {
    await A.sessions.init()
  }

  static async terminate(): Promise<void> {
    await A.sessions.terminate()
  }
}
