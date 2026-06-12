import { UserService } from './logic/service/UserService.js'

/**
 * Interaction Layer Injection — canonical XF singleton.
 *
 * Access pattern from external callers (router, CLI, GUI root):
 *   `A.userService.getUser(1)`.
 */
export class A {
  private constructor() {}

  static readonly userService = new UserService()

  static async init(): Promise<void> {
    await A.userService.init()
  }

  static async terminate(): Promise<void> {
    await A.userService.terminate()
  }
}
