/**
 * Injection component of the Interaction Layer (7.3).
 *
 * Every XF artefact has exactly three Injection components — one per
 * layer — and `A` is the canonical name for the Interaction-layer
 * injector. It is the sole entry point through which external callers
 * (HTTP routes, event listeners, UI roots, CLI parsers) reach
 * Interaction Logical components, via the canonical access pattern:
 *
 * ```
 * A.<component>.<operation>()
 * ```
 *
 * In `@xfcfam/xf` core, `A` is a static singleton with a private
 * constructor: it cannot be instantiated and is not meant to be
 * subclassed. Consumer projects extend its static surface (via module
 * augmentation or direct assignment) to register their concrete
 * Service / View Logical components, and override {@link init} /
 * {@link terminate} to wire their lifecycle.
 *
 * The lifecycle is orchestrated by {@link XF.init} / {@link XF.terminate}.
 */
export class A {
  private constructor() {}

  /**
   * Lifecycle hook invoked by `XF.init()` after `B.init()`. Default
   * implementation is a no-op; consumer projects override or replace
   * this to mount UI / register routes / etc.
   *
   * @returns A promise that resolves once every Interaction component is ready.
   */
  static async init(): Promise<void> {}

  /**
   * Lifecycle hook invoked by `XF.terminate()` before `B.terminate()`.
   * Default implementation is a no-op; consumer projects override or
   * replace this to unmount UI / unregister routes / etc.
   *
   * @returns A promise that resolves once every Interaction component has shut down.
   */
  static async terminate(): Promise<void> {}
}
