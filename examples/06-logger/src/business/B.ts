import { GreeterBusiness } from './logic/GreeterBusiness.js'
import { AppFileTreeBusiness } from './logic/AppFileTreeBusiness.js'

/**
 * Business Layer Injection. `fileTree.init()` plants the rotating file
 * tree into `R.logger`, so it initialises before any Business logic runs.
 */
export class B {
  private constructor() {}

  static readonly fileTree = new AppFileTreeBusiness()
  static readonly greeter = new GreeterBusiness()

  static async init(): Promise<void> {
    await B.fileTree.init() // plants into R.logger
    await B.greeter.init()
  }

  static async terminate(): Promise<void> {
    await B.greeter.terminate()
    await B.fileTree.terminate()
  }
}
