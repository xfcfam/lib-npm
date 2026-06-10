/**
 * Injection component of the Business Layer (7.2).
 *
 * Every XF artefact has exactly three Injection components — one per
 * layer — and `B` is the canonical name for the Business-layer
 * injector. It is the sole entry point through which the Interaction
 * Layer reaches Business Logical components, via the canonical access
 * pattern:
 *
 * ```
 * B.<component>.<operation>()
 * ```
 *
 * In `@xfcfam/xf` core, `B` is a static singleton with a private
 * constructor: it cannot be instantiated and is not meant to be
 * subclassed. Consumer projects extend its static surface (via module
 * augmentation or direct assignment) to register their concrete
 * Business Logical components, and override {@link init} /
 * {@link terminate} to wire their lifecycle.
 *
 * The lifecycle is orchestrated by {@link XF.init} / {@link XF.terminate}.
 */
export class B {
  private constructor() {}

  /**
   * Lifecycle hook invoked by `XF.init()` between `R.init()` and
   * `A.init()`. Default implementation is a no-op; consumer projects
   * override or replace this to wire their Business components.
   *
   * @returns A promise that resolves once every Business is ready.
   */
  static async init(): Promise<void> {}

  /**
   * Lifecycle hook invoked by `XF.terminate()` between `A.terminate()`
   * and `R.terminate()`. Default implementation is a no-op; consumer
   * projects override or replace this to release Business resources.
   *
   * @returns A promise that resolves once every Business has shut down.
   */
  static async terminate(): Promise<void> {}
}
