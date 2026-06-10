import { UserBusiness } from './logic/UserBusiness'

/**
 * Business Layer Injection — canonical XF singleton.
 *
 * Access pattern from the Interaction Layer:
 *   `B.userBusiness.register(...)`.
 */
export class B {
  private constructor() {}

  static readonly userBusiness = new UserBusiness()

  static async init(): Promise<void> {
    await B.userBusiness.init()
  }

  static async terminate(): Promise<void> {
    await B.userBusiness.terminate()
  }
}
