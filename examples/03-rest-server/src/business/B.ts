import { ServerBusiness } from './logic/ServerBusiness.js'
import { UserBusiness } from './logic/UserBusiness.js'
import { FileBusiness } from './logic/FileBusiness.js'

/**
 * Business Layer Injection. Holds the two domain Logicals and the
 * server orchestrator that the REST services push routes to.
 */
export class B {
  private constructor() {}

  static readonly server        = new ServerBusiness()
  static readonly user = new UserBusiness()
  static readonly file = new FileBusiness()

  static async init(): Promise<void> {
    await B.server.init()
    await B.user.init()
    await B.file.init()
  }

  static async terminate(): Promise<void> {
    await B.file.terminate()
    await B.user.terminate()
    await B.server.terminate()
  }
}
