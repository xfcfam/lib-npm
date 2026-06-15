import { R } from './repository/R.js'
import { B } from './business/B.js'
import { A } from './api/A.js'

/**
 * Start-point element — orchestrates the artefact lifecycle. `init`
 * ascends `R → B → A`; `terminate` descends `A → B → R`. The entry point
 * (`main.ts`) lives outside this root and only calls these two.
 */
export class XF {
  private constructor() {}

  static async init(): Promise<void> {
    await R.init()
    await B.init()
    await A.init()
  }

  static async terminate(): Promise<void> {
    await A.terminate()
    await B.terminate()
    await R.terminate()
  }
}
