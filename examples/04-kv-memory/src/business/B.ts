import { SessionBusiness } from './logic/SessionBusiness.js'

/**
 * Business Layer Injection. Owns the Business Logicals; the Interaction
 * layer reaches domain logic only through it: `B.session.login(...)`.
 */
export class B {
  private constructor() {}

  static readonly session = new SessionBusiness()

  static async init(): Promise<void> {
    await B.session.init()
  }

  static async terminate(): Promise<void> {
    await B.session.terminate()
  }
}
