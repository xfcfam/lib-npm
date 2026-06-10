/**
 * Injection component of the Access Layer (7.1).
 *
 * Every XF artefact has exactly three Injection components — one per
 * layer — and `R` is the canonical name for the Access-layer injector.
 * It is the sole entry point through which external code (the Business
 * Layer, in practice) reaches Repository Logical components, via the
 * canonical access pattern:
 *
 * ```
 * R.<component>.<operation>()
 * ```
 *
 * In `@xfcfam/xf` core, `R` is a static singleton with a private
 * constructor: it cannot be instantiated and is not meant to be
 * subclassed. Consumer projects extend its static surface (via module
 * augmentation or direct assignment) to register their concrete
 * Repository Logical components, and override {@link init} /
 * {@link terminate} to wire their lifecycle.
 *
 * The lifecycle is orchestrated by {@link XF.init} / {@link XF.terminate}.
 *
 * @example
 * ```ts
 * // In the consumer project: repository/R.ts
 * import { R as XFR } from '@xfcfam/xf'
 * import { UserRepository } from './logic/remote/UserRepository.js'
 *
 * declare module '@xfcfam/xf' {
 *   namespace R { let userRepository: UserRepository }
 * }
 * ;(R as any).userRepository = new UserRepository()
 * const _origInit = XFR.init
 * XFR.init = async () => { await _origInit(); await R.userRepository.init() }
 * ```
 */
export class R {
  private constructor() {}

  /**
   * Lifecycle hook invoked by `XF.init()` before `B.init()`. Default
   * implementation is a no-op; consumer projects override or replace
   * this to wire their Repositories.
   *
   * @returns A promise that resolves once every Repository is ready.
   */
  static async init(): Promise<void> {}

  /**
   * Lifecycle hook invoked by `XF.terminate()` after `B.terminate()`.
   * Default implementation is a no-op; consumer projects override or
   * replace this to release Repository resources.
   *
   * @returns A promise that resolves once every Repository has shut down.
   */
  static async terminate(): Promise<void> {}
}
