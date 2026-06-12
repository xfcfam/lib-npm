/**
 * Base Generalization for the Interaction Layer (7.3) — systemic services.
 *
 * `Service<T>` is the canonical XF Generalization for non-graphical,
 * systemic Interaction Layer Logical components (the `Service` suffix):
 * service endpoints, event handlers, CLI commands, cron handlers, and
 * the like. It is structurally identical to its sibling {@link View};
 * the distinction is purely semantic — `View` denotes GUI / presentation
 * components, `Service` denotes systemic ones — so that the two canonical
 * Interaction suffixes (`View` and `Service`) each have a dedicated base.
 *
 * Like `View`, a `Service` carries its local orchestration state and
 * declares the mandatory lifecycle hooks (`init` / `terminate`) that the
 * injection `A` orchestrates. The Interaction Layer owns the entry points
 * of the artefact: a `Service` orchestrates Business operations on behalf
 * of an external caller and MUST NOT access the Access Layer directly.
 *
 * @typeParam T  Shape of the component's internal state. Use `null` (and
 *               extend {@link StatelessService}) when the component
 *               carries no state.
 *
 * @example
 * ```ts
 * import { Service } from '@xfcfam/xf'
 *
 * interface GatewayState { openConnections: number }
 *
 * export class GatewayService extends Service<GatewayState> {
 *   constructor() { super({ openConnections: 0 }) }
 *   async init()      { ... }
 *   async terminate() { ... }
 * }
 * ```
 */
export abstract class Service<T> {
  /** Local interaction state. Protected — accessible only to subclasses. */
  protected state: T

  /**
   * @param state  Initial state for the component.
   */
  constructor(state: T) {
    this.state = state
  }

  /**
   * Acquire resources / start the service. Invoked once on bootstrap.
   *
   * @returns A promise that resolves once the component is ready.
   */
  abstract init(): Promise<void>

  /**
   * Release resources / stop the service. Invoked once on shutdown.
   *
   * @returns A promise that resolves once the component has shut down.
   */
  abstract terminate(): Promise<void>
}
