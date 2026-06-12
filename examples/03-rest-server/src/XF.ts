import { R } from './repository/R.js'
import { B } from './business/B.js'
import { A } from './api/A.js'

/**
 * Architecture orchestrator. Initialises the three layers bottom-up
 * (R → B → A) and tears them down top-down on terminate. Body
 * contains only the canonical delegations — no domain logic.
 *
 * The HTTP server lifecycle (`B.server.listen()` / `B.server.close()`)
 * is managed by the start-point (`main.ts`) around `XF.init()` and
 * `XF.terminate()` — the start-point is responsible for transport
 * startup after all layers are initialised.
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
