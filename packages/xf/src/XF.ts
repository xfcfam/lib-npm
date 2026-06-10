import { R } from './repository/R.js'
import { B } from './business/B.js'
import { A } from './api/A.js'

/**
 * Optional architecture-level component. Orchestrates the lifecycle of
 * the three Injection components ({@link R}, {@link B}, {@link A}) for
 * a complete XF artefact.
 *
 * `XF` does not belong to any layer (see section 5 of the XF
 * specification) — it is a meta-component that sits above the layered
 * structure and is allowed to know about all three injectors. It is the
 * only place in an XF-compliant codebase where cross-layer awareness is
 * permitted.
 *
 * `XF` is a static singleton with a private constructor: it cannot be
 * instantiated and is not meant to be subclassed.
 *
 * Initialisation order is bottom-up; termination order is top-down.
 *
 * @example
 * ```ts
 * import { XF } from '@xfcfam/xf'
 *
 * async function main() {
 *   await XF.init()
 *   process.on('SIGTERM', async () => { await XF.terminate(); process.exit(0) })
 * }
 * void main()
 * ```
 */
export class XF {
  private constructor() {}

  /**
   * Bootstrap the artefact in dependency order: `R → B → A`.
   *
   * @returns A promise that resolves once every layer has finished initialising.
   */
  static async init(): Promise<void> {
    await R.init()
    await B.init()
    await A.init()
  }

  /**
   * Shut down the artefact in reverse dependency order: `A → B → R`.
   *
   * @returns A promise that resolves once every layer has finished terminating.
   */
  static async terminate(): Promise<void> {
    await A.terminate()
    await B.terminate()
    await R.terminate()
  }
}
