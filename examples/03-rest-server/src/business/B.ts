import { UsersBusiness } from './logic/UsersBusiness.js'
import { FilesBusiness } from './logic/FilesBusiness.js'

/**
 * Business Layer Injection. Holds the two domain Logicals that the
 * REST services delegate to.
 */
export class B {
  private constructor() {}

  static readonly usersBusiness = new UsersBusiness()
  static readonly filesBusiness = new FilesBusiness()

  static async init(): Promise<void> {
    await B.usersBusiness.init()
    await B.filesBusiness.init()
  }

  static async terminate(): Promise<void> {
    await B.filesBusiness.terminate()
    await B.usersBusiness.terminate()
  }
}
